import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth-context";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { supabase } from "@/lib/supabase";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Pause, Play, Clock, Heart } from "lucide-react";
import { PauseEvent, Profile } from "@shared/schema";
import { formatDistanceToNow, format, differenceInMinutes } from "date-fns";

const PAUSE_DURATION_MS = 20 * 60 * 1000; // 20 minutes in milliseconds

export default function PauseButtonPage() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [reflection, setReflection] = useState("");
  const [showEndDialog, setShowEndDialog] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch partner profile
  const { data: partnerProfile } = useQuery<Profile>({
    queryKey: ["/api/profile/partner"],
    enabled: !!profile?.couple_id,
  });

  // Fetch active pause status
  const { data: activePauseData, isLoading } = useQuery<{
    active: boolean;
    pauseEvent: PauseEvent | null;
  }>({
    queryKey: [`/api/pause/active/${profile?.couple_id}`],
    enabled: !!profile?.couple_id,
    refetchInterval: 5000, // Refetch every 5 seconds as backup to realtime
  });

  // Fetch pause history
  const { data: pauseHistory } = useQuery<PauseEvent[]>({
    queryKey: [`/api/pause/history/${profile?.couple_id}`],
    enabled: !!profile?.couple_id,
  });

  // Setup Realtime subscription for instant sync
  useEffect(() => {
    if (!profile?.couple_id) return;

    // Subscribe to changes in pause events table
    const pauseChannel = supabase
      .channel(`pause-events-${profile.couple_id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "Couples_pause_events",
          filter: `couple_id=eq.${profile.couple_id}`,
        },
        (payload) => {
          console.log("Pause event change:", payload);
          // Invalidate queries to refetch latest data
          queryClient.invalidateQueries({
            queryKey: ["/api/pause/active", profile.couple_id],
          });
          queryClient.invalidateQueries({
            queryKey: ["/api/pause/history", profile.couple_id],
          });
        },
      )
      .subscribe();

    // Subscribe to changes in couples table (for active_pause_id updates)
    const coupleChannel = supabase
      .channel(`couple-${profile.couple_id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "Couples_couples",
          filter: `id=eq.${profile.couple_id}`,
        },
        (payload) => {
          console.log("Couple update:", payload);
          // Invalidate active pause query
          queryClient.invalidateQueries({
            queryKey: ["/api/pause/active", profile.couple_id],
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(pauseChannel);
      supabase.removeChannel(coupleChannel);
    };
  }, [profile?.couple_id]);

  // Update countdown timer
  useEffect(() => {
    if (
      !activePauseData?.active ||
      !activePauseData.pauseEvent ||
      !activePauseData.pauseEvent.started_at
    ) {
      setTimeRemaining(0);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    const calculateTimeRemaining = () => {
      const startTime = new Date(
        activePauseData.pauseEvent!.started_at!,
      ).getTime();
      const endTime = startTime + PAUSE_DURATION_MS;
      const now = Date.now();
      const remaining = Math.max(0, endTime - now);
      return remaining;
    };

    // Initial calculation
    setTimeRemaining(calculateTimeRemaining());

    // Update every second
    timerRef.current = setInterval(() => {
      const remaining = calculateTimeRemaining();
      setTimeRemaining(remaining);

      // Auto-end pause when timer expires
      if (remaining === 0 && timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
        // Auto-end the pause
        if (activePauseData.pauseEvent) {
          endPauseMutation.mutate({
            id: activePauseData.pauseEvent.id,
            reflection: "",
          });
        }
      }
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [activePauseData]);

  // Activate pause mutation
  const activatePauseMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/pause/activate", {
        couple_id: profile!.couple_id,
        initiated_by: user!.id,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/pause/active", profile?.couple_id],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/pause/history", profile?.couple_id],
      });
      toast({
        title: "Pause Activated",
        description: "Take 20 minutes to breathe and reflect.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to activate pause",
        variant: "destructive",
      });
    },
  });

  // End pause mutation
  const endPauseMutation = useMutation({
    mutationFn: async ({
      id,
      reflection,
    }: {
      id: string;
      reflection: string;
    }) => {
      const response = await apiRequest("POST", `/api/pause/end/${id}`, {
        reflection,
      });
      return response.json();
    },
    onSuccess: () => {
      setShowEndDialog(false);
      setReflection("");
      queryClient.invalidateQueries({
        queryKey: ["/api/pause/active", profile?.couple_id],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/pause/history", profile?.couple_id],
      });
      toast({
        title: "Pause Ended",
        description: "Welcome back. Take it slow.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to end pause",
        variant: "destructive",
      });
    },
  });

  const handleActivatePause = () => {
    activatePauseMutation.mutate();
  };

  const handleEndPause = () => {
    if (!activePauseData?.pauseEvent) return;
    endPauseMutation.mutate({
      id: activePauseData.pauseEvent.id,
      reflection: reflection,
    });
  };

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const getInitiatorName = (pauseEvent: PauseEvent) => {
    if (pauseEvent.initiated_by === user?.id) return "You";
    return partnerProfile?.full_name || "Partner";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" data-testid="loader-pause" />
      </div>
    );
  }

  const isActive = activePauseData?.active || false;
  const activePause = activePauseData?.pauseEvent;

  return (
    <div className="container max-w-5xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2" data-testid="text-page-title">
          Shared Pause Button
        </h1>
        <p
          className="text-muted-foreground"
          data-testid="text-page-description"
        >
          When tensions rise, either partner can activate a 20-minute pause to
          cool down and reflect. Both of you will see the same timer.
        </p>
      </div>

      {!isActive ? (
        <Card className="border-2" data-testid="card-activate-pause">
          <CardContent className="p-12 text-center space-y-6">
            <div className="flex justify-center">
              <div className="relative">
                <div className="absolute inset-0 animate-pulse bg-primary/20 rounded-full blur-xl" />
                <Button
                  size="lg"
                  onClick={handleActivatePause}
                  disabled={activatePauseMutation.isPending}
                  className="relative h-32 w-32 rounded-full text-lg font-semibold"
                  data-testid="button-activate-pause"
                >
                  {activatePauseMutation.isPending ? (
                    <Loader2 className="h-12 w-12 animate-spin" />
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <Pause className="h-12 w-12" />
                      <span>Pause</span>
                    </div>
                  )}
                </Button>
              </div>
            </div>
            <div>
              <h3
                className="text-xl font-semibold mb-2"
                data-testid="text-activate-title"
              >
                Take a Pause
              </h3>
              <p
                className="text-muted-foreground"
                data-testid="text-activate-description"
              >
                Activating this will start a 20-minute break for both you and
                your partner.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card
          className="border-2 border-primary"
          data-testid="card-active-pause"
        >
          <CardHeader>
            <div className="text-center space-y-2">
              <Badge
                variant="outline"
                className="mb-2"
                data-testid="badge-active-status"
              >
                Pause Active
              </Badge>
              <CardTitle className="text-3xl" data-testid="text-active-title">
                Take Time to Breathe
              </CardTitle>
              <CardDescription data-testid="text-active-description">
                Initiated by{" "}
                {activePause ? getInitiatorName(activePause) : "Partner"}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Countdown Timer */}
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-48 h-48 rounded-full bg-primary/10 border-4 border-primary/20">
                <div className="text-center">
                  <Clock className="h-12 w-12 mx-auto mb-2 text-primary" />
                  <p className="text-5xl font-bold" data-testid="text-timer">
                    {formatTime(timeRemaining)}
                  </p>
                  <p
                    className="text-sm text-muted-foreground mt-2"
                    data-testid="text-timer-label"
                  >
                    remaining
                  </p>
                </div>
              </div>
            </div>

            {/* Calming Message */}
            <div className="bg-muted p-6 rounded-lg text-center space-y-4">
              <Heart className="h-8 w-8 mx-auto text-primary" />
              <div>
                <p
                  className="text-lg font-medium mb-2"
                  data-testid="text-calm-message"
                >
                  This is a time to pause, not to solve
                </p>
                <p
                  className="text-sm text-muted-foreground"
                  data-testid="text-calm-subtitle"
                >
                  Take deep breaths. Go for a walk. The conversation can wait.
                </p>
              </div>
            </div>

            {/* End Pause Early Button */}
            <div className="flex justify-center">
              <AlertDialog open={showEndDialog} onOpenChange={setShowEndDialog}>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" data-testid="button-end-early">
                    <Play className="h-4 w-4 mr-2" />
                    End Pause Early
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent data-testid="dialog-end-pause">
                  <AlertDialogHeader>
                    <AlertDialogTitle data-testid="text-end-dialog-title">
                      End the pause early?
                    </AlertDialogTitle>
                    <AlertDialogDescription data-testid="text-end-dialog-description">
                      Are you sure you want to end this pause? It's best to use
                      the full 20 minutes to cool down.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <div className="py-4">
                    <Label htmlFor="reflection" data-testid="label-reflection">
                      Optional: What helped during this pause?
                    </Label>
                    <Textarea
                      id="reflection"
                      value={reflection}
                      onChange={(e) => setReflection(e.target.value)}
                      placeholder="e.g., I took a walk and realized I was really just tired..."
                      className="mt-2"
                      data-testid="input-reflection"
                    />
                  </div>
                  <AlertDialogFooter>
                    <AlertDialogCancel data-testid="button-cancel-end">
                      Continue Pause
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleEndPause}
                      disabled={endPauseMutation.isPending}
                      data-testid="button-confirm-end"
                    >
                      {endPauseMutation.isPending && (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      )}
                      End Pause
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pause History */}
      <div>
        <h2
          className="text-2xl font-bold mb-4"
          data-testid="text-history-title"
        >
          Pause History
        </h2>
        {pauseHistory && pauseHistory.length > 0 ? (
          <div className="space-y-4">
            {pauseHistory.map((pause) => {
              const duration =
                pause.duration_minutes ||
                (pause.ended_at && pause.started_at
                  ? differenceInMinutes(
                      new Date(pause.ended_at),
                      new Date(pause.started_at),
                    )
                  : null);

              return (
                <Card key={pause.id} data-testid={`card-pause-${pause.id}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle
                          className="text-lg"
                          data-testid={`text-pause-title-${pause.id}`}
                        >
                          <Clock className="h-4 w-4 inline mr-2" />
                          Pause by {getInitiatorName(pause)}
                        </CardTitle>
                        <CardDescription
                          data-testid={`text-pause-date-${pause.id}`}
                        >
                          {pause.started_at
                            ? format(new Date(pause.started_at), "PPp")
                            : "Unknown"}
                        </CardDescription>
                      </div>
                      <div className="text-right">
                        <Badge
                          variant={pause.ended_at ? "default" : "secondary"}
                          data-testid={`badge-pause-status-${pause.id}`}
                        >
                          {pause.ended_at ? "Completed" : "Active"}
                        </Badge>
                        {duration !== null && (
                          <p
                            className="text-sm text-muted-foreground mt-1"
                            data-testid={`text-pause-duration-${pause.id}`}
                          >
                            {duration} minutes
                          </p>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  {pause.reflection && (
                    <CardContent
                      data-testid={`container-reflection-${pause.id}`}
                    >
                      <p className="text-sm font-medium mb-1">Reflection:</p>
                      <p
                        className="text-sm text-muted-foreground"
                        data-testid={`text-reflection-${pause.id}`}
                      >
                        {pause.reflection}
                      </p>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        ) : (
          <Card data-testid="card-no-pauses">
            <CardContent className="p-12 text-center">
              <Pause className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground" data-testid="text-no-pauses">
                No pauses yet. The pause button is here when you need it.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

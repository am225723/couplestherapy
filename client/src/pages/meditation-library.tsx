import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { Play, CheckCircle, Clock, Heart } from "lucide-react";

const CATEGORY_CONFIG = {};

interface Meditation {
  id: string;
  title: string;
  description: string;
  duration_mins: number;
  category: keyof typeof CATEGORY_CONFIG;
  audio_url: string | null;
  transcript: string | null;
  is_active: boolean;
  created_at: string;
}

interface MeditationSession {
  id: string;
  meditation_id: string;
  user_id: string;
  completed: boolean;
  feedback: string | null;
  created_at: string;
  completed_at: string | null;
  meditation: Meditation;
}

export default function MeditationLibraryPage() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [activeMeditation, setActiveMeditation] = useState<Meditation | null>(
    null,
  );
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");

  // Fetch meditations
  const { data: meditations = [], isLoading: meditationsLoading } = useQuery<
    Meditation[]
  >({
    queryKey: ["/api/meditations"],
  });

  // Fetch sessions
  const { data: sessions = [], isLoading: sessionsLoading } = useQuery<
    MeditationSession[]
  >({
    queryKey: ["/api/meditation/sessions", profile?.couple_id],
    enabled: !!profile?.couple_id,
  });

  // Start session mutation
  const startSessionMutation = useMutation({
    mutationFn: async (meditation_id: string) => {
      const response = await apiRequest("POST", "/api/meditation/session", {
        meditation_id,
      });
      return response.json();
    },
    onSuccess: (data) => {
      setSessionId(data.id);
      toast({
        title: "Meditation Started",
        description: "Take your time and be present.",
      });
    },
  });

  // Complete session mutation
  const completeSessionMutation = useMutation({
    mutationFn: async ({ id, feedback }: { id: string; feedback: string }) => {
      const response = await apiRequest(
        "PATCH",
        `/api/meditation/session/${id}/complete`,
        { feedback },
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/meditation/sessions", profile?.couple_id],
      });
      toast({
        title: "Session Complete",
        description: "Great work on nurturing your connection.",
      });
      setActiveMeditation(null);
      setSessionId(null);
      setFeedback("");
    },
  });

  const handleStartMeditation = (meditation: Meditation) => {
    setActiveMeditation(meditation);
    startSessionMutation.mutate(meditation.id);
  };

  const handleCompleteMeditation = () => {
    if (!sessionId) return;
    completeSessionMutation.mutate({ id: sessionId, feedback });
  };

  // Group meditations by category
  const meditationsByCategory = meditations.reduce(
    (acc, med) => {
      if (!acc[med.category]) acc[med.category] = [];
      acc[med.category].push(med);
      return acc;
    },
    {} as Record<string, Meditation[]>,
  );

  // Calculate stats
  const completedSessions = sessions.filter((s) => s.completed).length;
  const totalMinutes = sessions
    .filter((s) => s.completed)
    .reduce((sum, s) => sum + (s.meditation.duration_mins || 0), 0);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Couples Meditation Library</h1>
        <p className="text-muted-foreground mt-2">
          Guided meditations to deepen your connection, practice mindfulness,
          and nurture compassion.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card data-testid="card-sessions-completed">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              Sessions Completed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className="text-2xl font-bold"
              data-testid="text-completed-sessions"
            >
              {completedSessions}
            </div>
          </CardContent>
        </Card>
        <Card data-testid="card-total-minutes">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Total Minutes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className="text-2xl font-bold"
              data-testid="text-total-minutes"
            >
              {totalMinutes}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Meditation */}
      {activeMeditation && (
        <Card className="border-2 border-primary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="w-5 h-5 text-primary" />
              {activeMeditation.title}
            </CardTitle>
            <CardDescription>{activeMeditation.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge data-testid="badge-category">
                {activeMeditation.category}
              </Badge>
              <Badge variant="outline" data-testid="badge-duration">
                <Clock className="w-3 h-3 mr-1" />
                {activeMeditation.duration_mins} mins
              </Badge>
            </div>

            <div className="p-4 bg-muted rounded-md">
              <p className="text-sm">
                Find a comfortable position together or separately. Set aside
                this time for mindfulness and connection. When you're ready,
                click complete to reflect on your experience.
              </p>
            </div>

            <div>
              <label className="text-sm font-medium">
                How was your experience?
              </label>
              <Textarea
                data-testid="textarea-feedback"
                placeholder="Reflect on your meditation..."
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                className="mt-1"
              />
            </div>

            <Button
              data-testid="button-complete-meditation"
              onClick={handleCompleteMeditation}
              disabled={completeSessionMutation.isPending}
              className="w-full"
            >
              {completeSessionMutation.isPending
                ? "Completing..."
                : "Complete Session"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Meditation Library */}
      {!activeMeditation && (
        <div className="space-y-6">
          {Object.entries(meditationsByCategory).map(([category, meds]) => (
            <Card key={category} data-testid={`category-card-${category}`}>
              <CardHeader>
                <CardTitle>{category}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {meds.map((meditation) => (
                  <div
                    key={meditation.id}
                    className="border rounded-md p-4 flex items-center justify-between hover-elevate"
                    data-testid={`meditation-${meditation.id}`}
                  >
                    <div className="flex-1">
                      <h3
                        className="font-semibold"
                        data-testid={`text-title-${meditation.id}`}
                      >
                        {meditation.title}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {meditation.description}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge
                          variant="outline"
                          className="text-xs"
                          data-testid={`badge-duration-${meditation.id}`}
                        >
                          <Clock className="w-3 h-3 mr-1" />
                          {meditation.duration_mins} mins
                        </Badge>
                      </div>
                    </div>
                    <Button
                      data-testid={`button-start-${meditation.id}`}
                      onClick={() => handleStartMeditation(meditation)}
                      disabled={startSessionMutation.isPending}
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Start
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Recent Sessions */}
      {sessions.length > 0 && !activeMeditation && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Sessions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {sessions.slice(0, 5).map((session) => (
              <div
                key={session.id}
                className="border rounded-md p-3"
                data-testid={`session-${session.id}`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{session.meditation.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(session.created_at), "MMM d, h:mm a")}
                    </p>
                  </div>
                  {session.completed && (
                    <Badge
                      variant="default"
                      className="bg-green-600"
                      data-testid={`badge-completed-${session.id}`}
                    >
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Completed
                    </Badge>
                  )}
                </div>
                {session.feedback && (
                  <p className="text-sm mt-2">{session.feedback}</p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

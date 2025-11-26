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
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { AlertCircle, ThumbsUp, ThumbsDown, CheckCircle } from "lucide-react";

const HORSEMEN_CONFIG = {
  criticism: {
    name: "Criticism",
    color: "bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200",
    description: "Attacking your partner's character",
    antidote: "Gentle Start-Up: Express feelings and needs without blame",
  },
  contempt: {
    name: "Contempt",
    color:
      "bg-purple-100 dark:bg-purple-900/20 text-purple-800 dark:text-purple-200",
    description: "Treating your partner with disrespect",
    antidote: "Build a Culture of Appreciation: Express gratitude and fondness",
  },
  defensiveness: {
    name: "Defensiveness",
    color:
      "bg-orange-100 dark:bg-orange-900/20 text-orange-800 dark:text-orange-200",
    description: "Making excuses or playing the victim",
    antidote: "Take Responsibility: Accept your partner's perspective",
  },
  stonewalling: {
    name: "Stonewalling",
    color: "bg-gray-100 dark:bg-gray-900/20 text-gray-800 dark:text-gray-200",
    description: "Withdrawing from the conversation",
    antidote: "Self-Soothing: Take a break and return when calm",
  },
};

type HorsemanType = keyof typeof HORSEMEN_CONFIG;

interface HorsemenIncident {
  id: string;
  couple_id: string;
  reporter_id: string;
  horseman_type: HorsemanType;
  situation: string;
  notes: string;
  partner_validated: boolean | null;
  antidote_practiced: boolean;
  created_at: string;
}

export default function FourHorsemenPage() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [selectedHorseman, setSelectedHorseman] = useState<HorsemanType | null>(
    null,
  );
  const [situation, setSituation] = useState("");
  const [notes, setNotes] = useState("");

  // Fetch incidents
  const { data: incidents = [], isLoading } = useQuery<HorsemenIncident[]>({
    queryKey: ["/api/horsemen", profile?.couple_id],
    enabled: !!profile?.couple_id,
  });

  // Create incident mutation
  const createIncidentMutation = useMutation({
    mutationFn: async (data: {
      horseman_type: HorsemanType;
      situation: string;
      notes: string;
    }) => {
      const response = await apiRequest("POST", "/api/horsemen/incident", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/horsemen", profile?.couple_id],
      });
      toast({
        title: "Incident Logged",
        description: "Your awareness is the first step to change.",
      });
      setSelectedHorseman(null);
      setSituation("");
      setNotes("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to log incident",
        variant: "destructive",
      });
    },
  });

  // Validate mutation
  const validateMutation = useMutation({
    mutationFn: async ({
      id,
      partner_validated,
    }: {
      id: string;
      partner_validated: boolean;
    }) => {
      const response = await apiRequest(
        "PATCH",
        `/api/horsemen/${id}/validate`,
        { partner_validated },
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/horsemen", profile?.couple_id],
      });
    },
  });

  // Antidote mutation
  const antidoteMutation = useMutation({
    mutationFn: async ({
      id,
      antidote_practiced,
    }: {
      id: string;
      antidote_practiced: boolean;
    }) => {
      const response = await apiRequest(
        "PATCH",
        `/api/horsemen/${id}/antidote`,
        { antidote_practiced },
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/horsemen", profile?.couple_id],
      });
      toast({
        title: "Antidote Practiced!",
        description: "Great work on repairing the interaction.",
      });
    },
  });

  const handleSubmit = () => {
    if (!selectedHorseman) return;

    createIncidentMutation.mutate({
      horseman_type: selectedHorseman,
      situation,
      notes,
    });
  };

  // Calculate stats
  const stats = incidents.reduce(
    (acc, incident) => {
      acc[incident.horseman_type] = (acc[incident.horseman_type] || 0) + 1;
      return acc;
    },
    {} as Record<HorsemanType, number>,
  );

  const antidotePracticed = incidents.filter(
    (i) => i.antidote_practiced,
  ).length;
  const totalIncidents = incidents.length;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Gottman Four Horsemen Tracker</h1>
        <p className="text-muted-foreground mt-2">
          The Four Horsemen are communication patterns that predict relationship
          distress. Awareness is the first step to change.
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {Object.entries(HORSEMEN_CONFIG).map(([key, config]) => (
          <Card key={key} data-testid={`stat-card-${key}`}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                {config.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className="text-2xl font-bold"
                data-testid={`text-stat-${key}`}
              >
                {stats[key as HorsemanType] || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                incidents logged
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Antidote Success Rate */}
      {totalIncidents > 0 && (
        <Card data-testid="card-antidote-success">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              Antidote Success
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className="text-3xl font-bold text-green-600"
              data-testid="text-success-rate"
            >
              {Math.round((antidotePracticed / totalIncidents) * 100)}%
            </div>
            <p className="text-sm text-muted-foreground">
              {antidotePracticed} of {totalIncidents} incidents used the
              antidote
            </p>
          </CardContent>
        </Card>
      )}

      {/* Log Incident */}
      <Card>
        <CardHeader>
          <CardTitle>Log a Horseman Incident</CardTitle>
          <CardDescription>
            Select which horseman occurred, describe the situation, and commit
            to practicing the antidote.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(HORSEMEN_CONFIG).map(([key, config]) => (
              <Button
                key={key}
                data-testid={`button-select-${key}`}
                variant={selectedHorseman === key ? "default" : "outline"}
                className="h-auto py-4 flex-col items-start"
                onClick={() => setSelectedHorseman(key as HorsemanType)}
              >
                <div className="flex items-center gap-2 w-full">
                  <span className="font-semibold">{config.name}</span>
                </div>
                <p className="text-xs text-left mt-1">{config.description}</p>
              </Button>
            ))}
          </div>

          {selectedHorseman && (
            <>
              <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-md">
                <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                  Antidote: {HORSEMEN_CONFIG[selectedHorseman].antidote}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium">What happened?</label>
                <Textarea
                  data-testid="textarea-situation"
                  placeholder="Describe the situation..."
                  value={situation}
                  onChange={(e) => setSituation(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Notes (optional)</label>
                <Textarea
                  data-testid="textarea-notes"
                  placeholder="Any additional thoughts..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="mt-1"
                />
              </div>

              <Button
                data-testid="button-log-incident"
                onClick={handleSubmit}
                disabled={createIncidentMutation.isPending}
                className="w-full"
              >
                {createIncidentMutation.isPending
                  ? "Logging..."
                  : "Log Incident"}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Incident History */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Incidents</CardTitle>
          <CardDescription>
            Track patterns and practice antidotes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : incidents.length === 0 ? (
            <p className="text-muted-foreground">No incidents logged yet.</p>
          ) : (
            incidents.map((incident) => (
              <div
                key={incident.id}
                className="border rounded-md p-4 space-y-2"
                data-testid={`incident-${incident.id}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Badge
                      className={HORSEMEN_CONFIG[incident.horseman_type].color}
                      data-testid={`badge-horseman-${incident.id}`}
                    >
                      {HORSEMEN_CONFIG[incident.horseman_type].name}
                    </Badge>
                    <span
                      className="text-sm text-muted-foreground"
                      data-testid={`text-date-${incident.id}`}
                    >
                      {format(new Date(incident.created_at), "MMM d, h:mm a")}
                    </span>
                  </div>
                </div>

                {incident.situation && (
                  <p className="text-sm">{incident.situation}</p>
                )}

                <div className="flex items-center gap-2 pt-2">
                  {incident.partner_validated === null &&
                    incident.reporter_id !== profile?.id && (
                      <>
                        <Button
                          data-testid={`button-validate-yes-${incident.id}`}
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            validateMutation.mutate({
                              id: incident.id,
                              partner_validated: true,
                            })
                          }
                        >
                          <ThumbsUp className="w-4 h-4 mr-1" />I noticed this
                          too
                        </Button>
                        <Button
                          data-testid={`button-validate-no-${incident.id}`}
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            validateMutation.mutate({
                              id: incident.id,
                              partner_validated: false,
                            })
                          }
                        >
                          <ThumbsDown className="w-4 h-4 mr-1" />I didn't notice
                        </Button>
                      </>
                    )}

                  {incident.partner_validated !== null && (
                    <Badge
                      variant={
                        incident.partner_validated ? "default" : "secondary"
                      }
                    >
                      Partner{" "}
                      {incident.partner_validated ? "validated" : "disagreed"}
                    </Badge>
                  )}

                  {!incident.antidote_practiced && (
                    <Button
                      data-testid={`button-practice-antidote-${incident.id}`}
                      size="sm"
                      onClick={() =>
                        antidoteMutation.mutate({
                          id: incident.id,
                          antidote_practiced: true,
                        })
                      }
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />I practiced the
                      antidote
                    </Button>
                  )}

                  {incident.antidote_practiced && (
                    <Badge
                      variant="default"
                      className="bg-green-600"
                      data-testid={`badge-practiced-${incident.id}`}
                    >
                      Antidote Practiced
                    </Badge>
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

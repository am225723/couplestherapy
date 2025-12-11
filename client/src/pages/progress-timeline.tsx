import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Loader2,
  AlertCircle,
  Heart,
  Link2,
  Compass,
  Calendar,
  CheckCircle2,
  TrendingUp,
  Star,
  Clock,
  MessageSquare,
  Target,
} from "lucide-react";

interface TimelineEvent {
  id: string;
  type: "assessment" | "milestone" | "activity" | "session";
  title: string;
  description: string;
  date: string;
  icon: typeof Heart;
  iconColor: string;
  user?: string;
  category?: string;
}

interface ProfileWithCouple {
  couple_id?: string;
  full_name?: string;
  [key: string]: any;
}

export default function ProgressTimelinePage() {
  const { profile } = useAuth();
  const coupleId = (profile as ProfileWithCouple)?.couple_id;

  const timelineQuery = useQuery<TimelineEvent[]>({
    queryKey: ["/api/timeline", coupleId],
    queryFn: async () => {
      if (!coupleId) return [];

      const events: TimelineEvent[] = [];

      const { data: couple } = await supabase
        .from("Couples_couples")
        .select("partner1_id, partner2_id, created_at")
        .eq("id", coupleId)
        .single();

      if (!couple) return [];

      events.push({
        id: "couple-created",
        type: "milestone",
        title: "Journey Started",
        description: "You and your partner began your ALEIC journey together",
        date: couple.created_at,
        icon: Star,
        iconColor: "text-yellow-500",
        category: "milestone",
      });

      const { data: profiles } = await supabase
        .from("Couples_profiles")
        .select("id, full_name")
        .in("id", [couple.partner1_id, couple.partner2_id]);

      const getPartnerName = (id: string) =>
        profiles?.find((p) => p.id === id)?.full_name || "Partner";

      const [loveLanguages, attachments, enneagrams, checkins, goals, gratitude] = await Promise.all([
        supabase
          .from("Couples_love_languages")
          .select("id, user_id, primary_language, created_at")
          .in("user_id", [couple.partner1_id, couple.partner2_id])
          .order("created_at", { ascending: true }),
        supabase
          .from("Couples_attachment_results")
          .select("id, user_id, attachment_style, created_at")
          .in("user_id", [couple.partner1_id, couple.partner2_id])
          .order("created_at", { ascending: true }),
        supabase
          .from("Couples_enneagram_results")
          .select("id, user_id, dominant_type, created_at")
          .in("user_id", [couple.partner1_id, couple.partner2_id])
          .order("created_at", { ascending: true }),
        supabase
          .from("Couples_weekly_checkins")
          .select("id, user_id, created_at")
          .in("user_id", [couple.partner1_id, couple.partner2_id])
          .order("created_at", { ascending: true })
          .limit(20),
        supabase
          .from("Couples_shared_goals")
          .select("id, title, status, created_at, completed_at")
          .eq("couple_id", coupleId)
          .order("created_at", { ascending: true }),
        supabase
          .from("Couples_gratitude_entries")
          .select("id, user_id, created_at")
          .in("user_id", [couple.partner1_id, couple.partner2_id])
          .order("created_at", { ascending: true })
          .limit(20),
      ]);

      loveLanguages.data?.forEach((ll) => {
        events.push({
          id: `love-language-${ll.id}`,
          type: "assessment",
          title: "Love Language Discovered",
          description: `${getPartnerName(ll.user_id)}'s primary love language is ${ll.primary_language}`,
          date: ll.created_at,
          icon: Heart,
          iconColor: "text-red-500",
          user: getPartnerName(ll.user_id),
          category: "assessment",
        });
      });

      attachments.data?.forEach((att) => {
        events.push({
          id: `attachment-${att.id}`,
          type: "assessment",
          title: "Attachment Style Identified",
          description: `${getPartnerName(att.user_id)} discovered their ${att.attachment_style} attachment style`,
          date: att.created_at,
          icon: Link2,
          iconColor: "text-blue-500",
          user: getPartnerName(att.user_id),
          category: "assessment",
        });
      });

      enneagrams.data?.forEach((enn) => {
        events.push({
          id: `enneagram-${enn.id}`,
          type: "assessment",
          title: "Enneagram Type Revealed",
          description: `${getPartnerName(enn.user_id)} is Type ${enn.dominant_type}`,
          date: enn.created_at,
          icon: Compass,
          iconColor: "text-purple-500",
          user: getPartnerName(enn.user_id),
          category: "assessment",
        });
      });

      const checkinCount = checkins.data?.length || 0;
      if (checkinCount >= 1 && checkins.data?.[0]?.created_at) {
        events.push({
          id: "milestone-first-checkin",
          type: "milestone",
          title: "First Weekly Check-in",
          description: "Completed your first weekly relationship check-in",
          date: checkins.data[0].created_at,
          icon: CheckCircle2,
          iconColor: "text-green-500",
          category: "milestone",
        });
      }
      if (checkinCount >= 4 && checkins.data?.[3]?.created_at) {
        events.push({
          id: "milestone-month-checkins",
          type: "milestone",
          title: "One Month of Check-ins",
          description: "You've maintained weekly check-ins for a month!",
          date: checkins.data[3].created_at,
          icon: TrendingUp,
          iconColor: "text-green-500",
          category: "milestone",
        });
      }

      goals.data?.forEach((goal) => {
        if (goal.status === "completed") {
          const completionDate = goal.completed_at || goal.created_at;
          if (completionDate) {
            events.push({
              id: `goal-completed-${goal.id}`,
              type: "milestone",
              title: "Goal Achieved",
              description: `Completed shared goal: "${goal.title}"`,
              date: completionDate,
              icon: Target,
              iconColor: "text-amber-500",
              category: "activity",
            });
          }
        }
      });

      const gratitudeCount = gratitude.data?.length || 0;
      if (gratitudeCount >= 10 && gratitude.data?.[9]?.created_at) {
        events.push({
          id: "milestone-gratitude-10",
          type: "milestone",
          title: "Gratitude Champion",
          description: "Shared 10 gratitude entries with your partner",
          date: gratitude.data[9].created_at,
          icon: Heart,
          iconColor: "text-pink-500",
          category: "milestone",
        });
      }

      events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      return events;
    },
    enabled: !!coupleId,
    staleTime: 1000 * 60 * 10,
  });

  if (timelineQuery.isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading your journey...</p>
        </div>
      </div>
    );
  }

  const events = timelineQuery.data || [];

  if (events.length === 0) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No timeline events yet. Complete assessments and activities to see your progress.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const assessmentEvents = events.filter((e) => e.type === "assessment");
  const milestoneEvents = events.filter((e) => e.type === "milestone");

  return (
    <div className="min-h-screen bg-background">
      <div className="relative h-48 overflow-hidden bg-gradient-to-br from-primary/20 via-accent/20 to-primary/10">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center space-y-3 px-4">
            <div className="flex items-center justify-center gap-3">
              <Clock className="h-10 w-10 text-primary" />
              <h1 className="text-4xl font-bold" data-testid="text-page-title">
                Your Journey Together
              </h1>
            </div>
            <p className="text-lg text-muted-foreground max-w-2xl">
              A timeline of your relationship growth and achievements
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6 -mt-8 space-y-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card data-testid="card-stat-events">
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-primary">{events.length}</div>
              <div className="text-sm text-muted-foreground">Total Events</div>
            </CardContent>
          </Card>
          <Card data-testid="card-stat-assessments">
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-blue-500">{assessmentEvents.length}</div>
              <div className="text-sm text-muted-foreground">Assessments</div>
            </CardContent>
          </Card>
          <Card data-testid="card-stat-milestones">
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-amber-500">{milestoneEvents.length}</div>
              <div className="text-sm text-muted-foreground">Milestones</div>
            </CardContent>
          </Card>
          <Card data-testid="card-stat-days">
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-green-500">
                {events.length > 0
                  ? Math.ceil(
                      (Date.now() - new Date(events[events.length - 1].date).getTime()) /
                        (1000 * 60 * 60 * 24)
                    )
                  : 0}
              </div>
              <div className="text-sm text-muted-foreground">Days Together</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Progress Timeline
            </CardTitle>
            <CardDescription>Your relationship milestones and achievements</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />

              <div className="space-y-6">
                {events.map((event, idx) => (
                  <div
                    key={event.id}
                    className="relative pl-10"
                    data-testid={`timeline-event-${idx}`}
                  >
                    <div
                      className={`absolute left-0 w-8 h-8 rounded-full flex items-center justify-center bg-background border-2 border-border ${event.iconColor}`}
                    >
                      <event.icon className="w-4 h-4" />
                    </div>

                    <div className="pb-6">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div>
                          <h3 className="font-semibold">{event.title}</h3>
                          <p className="text-sm text-muted-foreground">{event.description}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            <Calendar className="w-3 h-3 mr-1" />
                            {new Date(event.date).toLocaleDateString()}
                          </Badge>
                          {event.user && (
                            <Badge variant="secondary" className="text-xs">
                              {event.user}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

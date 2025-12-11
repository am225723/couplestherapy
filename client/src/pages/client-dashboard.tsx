import { useEffect, useState } from "react";
import { Link } from "wouter";
import {
  GlassCard,
  GlassCardContent,
  GlassCardDescription,
  GlassCardHeader,
  GlassCardTitle,
} from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Heart,
  MessageCircle,
  Target,
  Sparkles,
  Coffee,
  ClipboardList,
  Mic,
  Loader2,
  ArrowRight,
  Calendar,
  TrendingUp,
  AlertTriangle,
  BookOpen,
  Activity,
  Compass,
  Baby,
  Lightbulb,
  Trash2,
  User,
  CheckCircle2,
  FileText,
  Link as LinkIcon,
} from "lucide-react";
import { LoveLanguage } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  aiFunctions,
  ExerciseRecommendationsResponse,
} from "@/lib/ai-functions";

// --- FIXED IMPORTS START ---
import RGL from "react-grid-layout";
const { Responsive, WidthProvider } = RGL;
// --- FIXED IMPORTS END ---

const GridLayout = WidthProvider(Responsive);

function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export default function ClientDashboard() {
  const { profile } = useAuth();
  const [loveLanguages, setLoveLanguages] = useState<LoveLanguage[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const [layout, setLayout] = useState<any[]>([]);
  const [widgets, setWidgets] = useState({
    "date-night": true,
    "checkin-history": true,
    "therapist-thoughts": true,
    "daily-suggestion": true,
    "ai-suggestions": true,
    "love-languages": true,
  });

  // AI Exercise Recommendations query - uses Supabase Edge Function
  const recommendationsQuery = useQuery<ExerciseRecommendationsResponse>({
    queryKey: ["ai-exercise-recommendations", profile?.couple_id],
    queryFn: () => aiFunctions.getExerciseRecommendations(),
    enabled: !!profile?.couple_id,
    staleTime: 1000 * 60 * 30, // 30 minutes
    retry: 1,
  });

  // Dashboard customization query
  const customizationQuery = useQuery<{
    widget_order: string[];
    enabled_widgets: Record<string, boolean>;
    widget_sizes?: Record<string, "small" | "medium" | "large">;
    widget_content_overrides?: Record<string, {
      title?: string;
      description?: string;
      showMessages?: boolean;
      showTodos?: boolean;
      showResources?: boolean;
    }>;
  }>({
    queryKey: [`/api/dashboard-customization/couple/${profile?.couple_id}`],
    enabled: !!profile?.couple_id,
  });

  // Get content overrides for therapist thoughts card
  const therapistCardOverrides = customizationQuery.data?.widget_content_overrides?.["therapist-thoughts"] || {};
  const therapistCardTitle = therapistCardOverrides.title || "From Your Therapist";
  const therapistCardDescription = therapistCardOverrides.description || "Messages, to-dos, and resources from your therapy sessions";

  // Therapist thoughts query (includes todos, messages, file references)
  const therapistThoughtsQuery = useQuery<
    {
      id: string;
      title: string;
      content: string | null;
      created_at: string;
      individual_id: string | null;
      thought_type: "todo" | "message" | "file_reference";
      file_reference: string | null;
      priority: "low" | "medium" | "high" | null;
      is_completed: boolean | null;
      audience: "couple" | "individual";
    }[]
  >({
    queryKey: ["/api/therapist-thoughts/client/messages"],
    enabled: !!profile?.couple_id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Daily suggestion query
  const today = new Date().toISOString().split("T")[0];
  const dailySuggestionQuery = useQuery<{
    id: string;
    completed: boolean;
    suggestion: {
      id: string;
      category: string;
      title: string;
      description: string;
      action_prompt: string | null;
    } | null;
  } | null>({
    queryKey: ["/api/daily-suggestion", profile?.couple_id],
    queryFn: async () => {
      if (!profile?.couple_id) return null;
      const { data, error } = await supabase
        .from("Couples_suggestion_history")
        .select("id, completed, suggestion:Couples_daily_suggestions(id, category, title, description, action_prompt)")
        .eq("couple_id", profile.couple_id)
        .eq("shown_date", today)
        .single();
      if (error && error.code !== "PGRST116") throw error;
      if (!data) return null;
      const suggestionData = Array.isArray(data.suggestion) ? data.suggestion[0] : data.suggestion;
      return {
        id: data.id,
        completed: data.completed,
        suggestion: suggestionData ? {
          id: suggestionData.id,
          category: suggestionData.category,
          title: suggestionData.title,
          description: suggestionData.description,
          action_prompt: suggestionData.action_prompt,
        } : null,
      };
    },
    enabled: !!profile?.couple_id,
    staleTime: 1000 * 60 * 60, // 1 hour
  });

  // Delete love language mutation
  const deleteLoveLanguageMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/love-languages/user/${id}`);
    },
    onSuccess: async (_data, deletedId) => {
      // Optimistically update local state
      setLoveLanguages((prev) => prev.filter((lang) => lang.id !== deletedId));

      toast({
        title: "Deleted",
        description:
          "Your love language result has been deleted. You can retake the quiz anytime.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete love language result",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (profile?.couple_id) {
      fetchLoveLanguages();
    }
  }, [profile?.couple_id]);

  const fetchLoveLanguages = async () => {
    if (!profile?.couple_id) return;

    try {
      const { data: coupleData } = await supabase
        .from("Couples_couples")
        .select("partner1_id, partner2_id")
        .eq("id", profile.couple_id)
        .single();

      if (coupleData) {
        const { data } = await supabase
          .from("Couples_love_languages")
          .select("*")
          .in("user_id", [coupleData.partner1_id, coupleData.partner2_id]);

        setLoveLanguages(data || []);
      }
    } catch (error) {
      console.error("Error fetching love languages:", error);
    } finally {
      setLoading(false);
    }
  };

  const allActivities = [
    {
      widgetId: "weekly-checkin",
      title: "Weekly Check-In",
      description: "Private reflection on your week together",
      icon: ClipboardList,
      path: "/weekly-checkin",
    },
    {
      widgetId: "gratitude",
      title: "Gratitude Log",
      description: "Share moments of appreciation",
      icon: Sparkles,
      path: "/gratitude",
    },
    {
      widgetId: "shared-goals",
      title: "Shared Goals",
      description: "Track your journey together",
      icon: Target,
      path: "/goals",
    },
    {
      widgetId: "rituals",
      title: "Rituals of Connection",
      description: "Build daily moments together",
      icon: Coffee,
      path: "/rituals",
    },
    {
      widgetId: "conversations",
      title: "Hold Me Tight",
      description: "Deepen emotional connection",
      icon: MessageCircle,
      path: "/conversation",
    },
    {
      widgetId: "voice-memos",
      title: "Voice Memos",
      description: "Send voice messages to your partner",
      icon: Mic,
      path: "/voice-memos",
    },
    {
      widgetId: "four-horsemen",
      title: "Four Horsemen Tracker",
      description: "Identify and transform conflict patterns",
      icon: AlertTriangle,
      path: "/four-horsemen",
    },
    {
      widgetId: "demon-dialogues",
      title: "Demon Dialogues",
      description: "Recognize and break negative cycles (EFT)",
      icon: MessageCircle,
      path: "/demon-dialogues",
    },
    {
      widgetId: "meditation",
      title: "Meditation Library",
      description: "Guided meditations for connection",
      icon: BookOpen,
      path: "/meditation-library",
    },
    {
      widgetId: "intimacy",
      title: "Intimacy Mapping",
      description: "Track five dimensions of intimacy",
      icon: Activity,
      path: "/intimacy-mapping",
    },
    {
      widgetId: "values",
      title: "Values & Vision",
      description: "Share dreams and create your future",
      icon: Compass,
      path: "/values-vision",
    },
    {
      widgetId: "parenting",
      title: "Parenting as Partners",
      description: "Align on parenting and protect couple time",
      icon: Baby,
      path: "/parenting-partners",
    },
    {
      widgetId: "love-languages",
      title: "Love Language Quiz",
      description: "Discover how you give and receive love",
      icon: Heart,
      path: "/love-language-quiz",
    },
    {
      widgetId: "love-map",
      title: "Love Map Quiz",
      description: "Explore your partner's inner world",
      icon: Heart,
      path: "/love-map",
    },
    {
      widgetId: "calendar",
      title: "Shared Calendar",
      description: "Keep track of important dates together",
      icon: Calendar,
      path: "/calendar",
    },
  ];

  // Filter and order activities based on therapist customization
  const activities = (() => {
    const customization = customizationQuery.data;
    if (!customization) {
      return allActivities; // Show all if no customization
    }

    const { widget_order, enabled_widgets } = customization;

    // Filter to only enabled widgets
    const enabledActivities = allActivities.filter((activity) => {
      // If widget not in enabled_widgets, default to true (show it)
      return enabled_widgets[activity.widgetId] !== false;
    });

    // Sort by widget_order
    return enabledActivities.sort((a, b) => {
      const indexA = widget_order.indexOf(a.widgetId);
      const indexB = widget_order.indexOf(b.widgetId);
      // If not in order array, put at end
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    });
  })();

  useEffect(() => {
    const columns = window.innerWidth < 768 ? 1 : 3;
    const initialLayout = activities.map((activity, i) => ({
      i: activity.widgetId,
      x: (i % columns) * 4,
      y: Math.floor(i / columns) * 2,
      w: 4,
      h: 2,
    }));
    setLayout(initialLayout);
  }, [activities]);

  const onLayoutChange = (newLayout: any) => {
    setLayout(newLayout);
  };

  // Check if a widget is enabled (default true if not specified)
  const isWidgetEnabled = (widgetId: string): boolean => {
    const customization = customizationQuery.data;
    if (!customization?.enabled_widgets) return true;
    return customization.enabled_widgets[widgetId] !== false;
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-7xl mx-auto px-4 pb-12 space-y-12">
        <div className="text-center pt-16">
          <h1 className="text-5xl font-bold">Welcome Back</h1>
          <p className="text-xl text-muted-foreground mt-2">
            Continue your journey of connection and growth
          </p>
        </div>

        <div className="p-4 rounded-lg bg-card border">
          <h3 className="text-lg font-semibold mb-2">Customize Dashboard</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Object.keys(widgets).map((widget) => (
              <div key={widget} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id={widget}
                  checked={widgets[widget as keyof typeof widgets]}
                  onChange={() =>
                    setWidgets((prev) => ({
                      ...prev,
                      [widget]: !prev[widget as keyof typeof widgets],
                    }))
                  }
                />
                <label htmlFor={widget} className="text-sm capitalize">
                  {widget.replace(/-/g, " ")}
                </label>
              </div>
            ))}
          </div>
        </div>

        {widgets["date-night"] && (
          <Link href="/date-night">
            <GlassCard data-testid="card-date-night-featured">
              <GlassCardHeader>
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <GlassCardTitle className="flex items-center gap-2 text-2xl">
                      <Sparkles className="h-6 w-6 text-primary" />
                      Date Night Generator
                    </GlassCardTitle>
                    <GlassCardDescription className="text-base mt-2">
                      Plan a meaningful date with AI-powered suggestions tailored
                      to your preferences
                    </GlassCardDescription>
                  </div>
                  <div className="flex items-center gap-2 text-primary">
                    <span className="font-medium">Start Planning</span>
                    <ArrowRight className="h-5 w-5" />
                  </div>
                </div>
              </GlassCardHeader>
            </GlassCard>
          </Link>
        )}

        {widgets["checkin-history"] && (
          <Link href="/checkin-history">
            <GlassCard data-testid="card-checkin-history">
              <GlassCardHeader>
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <GlassCardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-primary" />
                      Check-In History
                    </GlassCardTitle>
                    <GlassCardDescription>
                      Review your weekly reflections and track your progress over
                      time
                    </GlassCardDescription>
                  </div>
                  <div className="flex items-center gap-2 text-primary">
                    <TrendingUp className="h-5 w-5" />
                    <span className="font-medium">View Timeline</span>
                    <ArrowRight className="h-4 w-4" />
                  </div>
                </div>
              </GlassCardHeader>
            </GlassCard>
          </Link>
        )}

        {widgets["therapist-thoughts"] && therapistThoughtsQuery.isSuccess &&
          therapistThoughtsQuery.data &&
          (() => {
            // Filter thoughts based on visibility settings
            const filteredThoughts = therapistThoughtsQuery.data.filter((thought) => {
              if (thought.thought_type === "message" && therapistCardOverrides.showMessages === false) return false;
              if (thought.thought_type === "todo" && therapistCardOverrides.showTodos === false) return false;
              if (thought.thought_type === "file_reference" && therapistCardOverrides.showResources === false) return false;
              return true;
            });
            
            if (filteredThoughts.length === 0) return null;
            
            return (
              <GlassCard data-testid="card-therapist-thoughts">
                <GlassCardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <GlassCardTitle className="flex items-center gap-2">
                        <MessageCircle className="h-5 w-5 text-primary" />
                        {therapistCardTitle}
                      </GlassCardTitle>
                      <GlassCardDescription>
                        {therapistCardDescription}
                      </GlassCardDescription>
                    </div>
                    <Link href="/therapist-thoughts">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-primary"
                        data-testid="button-view-all-messages"
                      >
                        View All
                        <ArrowRight className="ml-1 h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </GlassCardHeader>
                <GlassCardContent className="space-y-3">
                  {filteredThoughts.slice(0, 4).map((thought) => (
                    <div
                      key={thought.id}
                      className="p-3 bg-background/80 rounded-lg border border-border/50"
                      data-testid={`thought-item-${thought.id}`}
                    >
                      <div className="flex items-start gap-2">
                        <div className="mt-0.5">
                          {thought.thought_type === "todo" ? (
                            <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                          ) : thought.thought_type === "file_reference" ? (
                            <FileText className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                          ) : (
                            <MessageCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <p className="font-medium text-sm">
                              {thought.title || "Untitled"}
                            </p>
                            <Badge
                              variant="outline"
                              className="text-xs h-5 px-1.5"
                            >
                              {thought.thought_type === "todo"
                                ? "To-Do"
                                : thought.thought_type === "file_reference"
                                  ? "Resource"
                                  : "Message"}
                            </Badge>
                            {thought.audience === "individual" && (
                              <Badge
                                variant="secondary"
                                className="text-xs h-5 px-1.5 flex items-center gap-1"
                              >
                                <User className="h-3 w-3" />
                                Just for you
                              </Badge>
                            )}
                          </div>
                          {thought.content && (
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {thought.content}
                            </p>
                          )}
                          {thought.file_reference &&
                            isValidUrl(thought.file_reference) && (
                              <a
                                href={thought.file_reference}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-primary hover:underline inline-flex items-center gap-1 mt-1"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <LinkIcon className="h-3 w-3" />
                                Open Link
                              </a>
                            )}
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(thought.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </GlassCardContent>
              </GlassCard>
            );
          })()}

        {widgets["daily-suggestion"] && dailySuggestionQuery.isSuccess && dailySuggestionQuery.data?.suggestion && (
          <Link href="/daily-suggestion">
            <GlassCard data-testid="card-daily-suggestion">
              <GlassCardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <GlassCardTitle className="text-base flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Today's Suggestion
                  </GlassCardTitle>
                  <Badge
                    variant={dailySuggestionQuery.data.completed ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {dailySuggestionQuery.data.completed ? "Completed" : dailySuggestionQuery.data.suggestion.category}
                  </Badge>
                </div>
              </GlassCardHeader>
              <GlassCardContent>
                <p className="font-medium text-sm mb-1">
                  {dailySuggestionQuery.data.suggestion.title}
                </p>
                <p className="text-xs text-muted-foreground mb-2">
                  {dailySuggestionQuery.data.suggestion.description}
                </p>
                {dailySuggestionQuery.data.suggestion.action_prompt && (
                  <p className="text-xs text-primary flex items-center gap-1.5">
                    <Lightbulb className="h-3 w-3" />
                    {dailySuggestionQuery.data.suggestion.action_prompt}
                  </p>
                )}
              </GlassCardContent>
            </GlassCard>
          </Link>
        )}

        {widgets["ai-suggestions"] && (
          <>
            {recommendationsQuery.isSuccess && recommendationsQuery.data && (
              <GlassCard data-testid="card-ai-recommendations">
                <GlassCardHeader className="pb-3">
                  <GlassCardTitle className="text-base flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    Suggested For You
                  </GlassCardTitle>
                </GlassCardHeader>
                <GlassCardContent className="space-y-3">
                  {recommendationsQuery.data.recommendations.map(
                    (rec: any, idx: number) => (
                      <div
                        key={idx}
                        className="p-3 rounded-lg bg-background/50 border border-border/30"
                        data-testid={`recommendation-${idx}`}
                      >
                        <p className="font-medium text-sm mb-1">{rec.tool_name}</p>
                        <p className="text-xs text-muted-foreground mb-2">
                          {rec.rationale}
                        </p>
                        <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                          <Lightbulb className="h-3 w-3" />
                          {rec.suggested_action}
                        </p>
                      </div>
                    ),
                  )}
                </GlassCardContent>
              </GlassCard>
            )}

            {recommendationsQuery.isLoading && (
              <GlassCard data-testid="card-recommendations-loading">
                <GlassCardContent className="py-12 flex items-center justify-center">
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Getting personalized recommendations...</span>
                  </div>
                </GlassCardContent>
              </GlassCard>
            )}

            {recommendationsQuery.isError && (
              <Alert
                variant="destructive"
                data-testid="alert-recommendations-error"
              >
                <AlertDescription>
                  Failed to load recommendations. Please try refreshing the page.
                </AlertDescription>
              </Alert>
            )}
          </>
        )}

        {widgets["love-languages"] && !loading && loveLanguages.length > 0 && (
          <GlassCard>
            <GlassCardHeader>
              <GlassCardTitle className="flex items-center gap-2">
                <Heart className="h-5 w-5 text-primary" />
                Your Love Languages
              </GlassCardTitle>
              <GlassCardDescription>
                Understanding how you both give and receive love
              </GlassCardDescription>
            </GlassCardHeader>
            <GlassCardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {loveLanguages.map((lang) => (
                  <div key={lang.id} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-lg">
                        {lang.user_id === profile?.id ? "You" : "Your Partner"}
                      </p>
                      {lang.user_id === profile?.id && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              data-testid={`button-delete-love-language-${lang.id}`}
                              disabled={deleteLoveLanguageMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Delete Love Language Result?
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently delete your love language
                                quiz result. You can always retake the quiz to
                                generate new results.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel data-testid="button-cancel-delete">
                                Cancel
                              </AlertDialogCancel>
                              <AlertDialogAction
                                data-testid="button-confirm-delete"
                                onClick={() =>
                                  deleteLoveLanguageMutation.mutate(lang.id)
                                }
                                className="bg-destructive hover:bg-destructive/90"
                              >
                                {deleteLoveLanguageMutation.isPending ? (
                                  <>
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    Deleting...
                                  </>
                                ) : (
                                  "Delete"
                                )}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          Primary:
                        </span>
                        <span className="font-medium text-primary">
                          {lang.primary_language}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          Secondary:
                        </span>
                        <span className="font-medium text-secondary-foreground">
                          {lang.secondary_language}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </GlassCardContent>
          </GlassCard>
        )}

        <div>
          <h2 className="text-3xl font-bold mb-6">Your Activities</h2>
          <GridLayout
            className="layout"
            layout={layout}
            cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
            rowHeight={100}
            onLayoutChange={onLayoutChange}
          >
            {activities.map((activity) => {
              const Icon = activity.icon;
              return (
                <div key={activity.widgetId} data-grid={layout.find(l => l.i === activity.widgetId) || { w: 4, h: 2 }}>
                  <Link to={activity.path}>
                    <GlassCard className="h-full">
                      <GlassCardHeader>
                        <div
                          className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4"
                        >
                          <Icon className="h-6 w-6 text-primary" />
                        </div>
                        <GlassCardTitle className="text-xl">
                          {activity.title}
                        </GlassCardTitle>
                        <GlassCardDescription>{activity.description}</GlassCardDescription>
                      </GlassCardHeader>
                      <GlassCardContent>
                        <div className="flex items-center text-sm text-primary font-medium">
                          Get started
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </div>
                      </GlassCardContent>
                    </GlassCard>
                  </Link>
                </div>
              );
            })}
          </GridLayout>
        </div>
      </div>
    </div>
  );
}

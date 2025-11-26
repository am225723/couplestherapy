import { useEffect, useState } from "react";
import { Link } from "wouter";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
  ChevronDown,
  Trash2,
} from "lucide-react";
import { LoveLanguage } from "@shared/schema";
import clientHeroImage from "@assets/generated_images/Client_app_hero_image_9fd4eaf0.png";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function ClientDashboard() {
  const { profile } = useAuth();
  const [loveLanguages, setLoveLanguages] = useState<LoveLanguage[]>([]);
  const [loading, setLoading] = useState(true);
  const [recommendationsOpen, setRecommendationsOpen] = useState(true);
  const { toast } = useToast();

  // AI Exercise Recommendations query
  const recommendationsQuery = useQuery({
    queryKey: ["/api/ai/exercise-recommendations"],
    enabled: !!profile?.couple_id,
    staleTime: 1000 * 60 * 30, // 30 minutes
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

  const activities = [
    {
      title: "Weekly Check-In",
      description: "Private reflection on your week together",
      icon: ClipboardList,
      path: "/weekly-checkin",
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Gratitude Log",
      description: "Share moments of appreciation",
      icon: Sparkles,
      path: "/gratitude",
      color: "text-accent-foreground",
      bgColor: "bg-accent/30",
    },
    {
      title: "Shared Goals",
      description: "Track your journey together",
      icon: Target,
      path: "/goals",
      color: "text-secondary-foreground",
      bgColor: "bg-secondary/30",
    },
    {
      title: "Rituals of Connection",
      description: "Build daily moments together",
      icon: Coffee,
      path: "/rituals",
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Hold Me Tight",
      description: "Deepen emotional connection",
      icon: MessageCircle,
      path: "/conversation",
      color: "text-destructive",
      bgColor: "bg-destructive/10",
    },
    {
      title: "Voice Memos",
      description: "Send voice messages to your partner",
      icon: Mic,
      path: "/voice-memos",
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Four Horsemen Tracker",
      description: "Identify and transform conflict patterns",
      icon: AlertTriangle,
      path: "/four-horsemen",
      color: "text-destructive",
      bgColor: "bg-destructive/10",
    },
    {
      title: "Demon Dialogues",
      description: "Recognize and break negative cycles (EFT)",
      icon: MessageCircle,
      path: "/demon-dialogues",
      color: "text-purple-600 dark:text-purple-400",
      bgColor: "bg-purple-100 dark:bg-purple-900/20",
    },
    {
      title: "Meditation Library",
      description: "Guided meditations for connection",
      icon: BookOpen,
      path: "/meditation-library",
      color: "text-green-600 dark:text-green-400",
      bgColor: "bg-green-100 dark:bg-green-900/20",
    },
    {
      title: "Intimacy Mapping",
      description: "Track five dimensions of intimacy",
      icon: Activity,
      path: "/intimacy-mapping",
      color: "text-pink-600 dark:text-pink-400",
      bgColor: "bg-pink-100 dark:bg-pink-900/20",
    },
    {
      title: "Values & Vision",
      description: "Share dreams and create your future",
      icon: Compass,
      path: "/values-vision",
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-100 dark:bg-blue-900/20",
    },
    {
      title: "Parenting as Partners",
      description: "Align on parenting and protect couple time",
      icon: Baby,
      path: "/parenting-partners",
      color: "text-amber-600 dark:text-amber-400",
      bgColor: "bg-amber-100 dark:bg-amber-900/20",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="relative h-80 overflow-hidden">
        <img
          src={clientHeroImage}
          alt="Couples connecting"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-primary/40 to-accent/30"></div>
        <div className="relative h-full flex items-center justify-center text-center px-4">
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-3">
              <Heart className="h-12 w-12 text-white" />
              <h1 className="text-5xl font-bold text-white">Welcome Back</h1>
            </div>
            <p className="text-xl text-white/90">
              Continue your journey of connection and growth
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 -mt-16 pb-12 space-y-12">
        <Link href="/date-night">
          <Card
            className="shadow-lg hover-elevate active-elevate-2 cursor-pointer border-primary/20 bg-gradient-to-br from-primary/5 to-accent/10"
            data-testid="card-date-night-featured"
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-2xl">
                    <Sparkles className="h-6 w-6 text-primary" />
                    Date Night Generator
                  </CardTitle>
                  <CardDescription className="text-base mt-2">
                    Plan a meaningful date with AI-powered suggestions tailored
                    to your preferences
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2 text-primary">
                  <span className="font-medium">Start Planning</span>
                  <ArrowRight className="h-5 w-5" />
                </div>
              </div>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/checkin-history">
          <Card
            className="shadow-lg hover-elevate active-elevate-2 cursor-pointer border-primary/20"
            data-testid="card-checkin-history"
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-primary" />
                    Check-In History
                  </CardTitle>
                  <CardDescription>
                    Review your weekly reflections and track your progress over
                    time
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2 text-primary">
                  <TrendingUp className="h-5 w-5" />
                  <span className="font-medium">View Timeline</span>
                  <ArrowRight className="h-4 w-4" />
                </div>
              </div>
            </CardHeader>
          </Card>
        </Link>

        {recommendationsQuery.isSuccess && recommendationsQuery.data && (
          <Card
            className="shadow-lg border-amber-500/20 bg-gradient-to-br from-amber-50/50 to-yellow-50/50 dark:from-amber-950/20 dark:to-yellow-950/20"
            data-testid="card-ai-recommendations"
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Lightbulb className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    Personalized Therapy Tool Recommendations for You and Your
                    Partner
                  </CardTitle>
                  <CardDescription>
                    AI-powered suggestions based on your recent activity
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="text-xs">
                  {
                    recommendationsQuery.data.activity_summary.not_started
                      .length
                  }{" "}
                  Not Started
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {
                    recommendationsQuery.data.activity_summary.underutilized
                      .length
                  }{" "}
                  Underutilized
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  {recommendationsQuery.data.activity_summary.active.length}{" "}
                  Active
                </Badge>
              </div>

              <Collapsible
                open={recommendationsOpen}
                onOpenChange={setRecommendationsOpen}
              >
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full justify-between"
                    data-testid="button-toggle-recommendations"
                  >
                    <span className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                      {recommendationsQuery.data.recommendations.length}{" "}
                      Recommendations for You
                    </span>
                    <ChevronDown
                      className={`h-4 w-4 transition-transform ${recommendationsOpen ? "rotate-180" : ""}`}
                    />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent
                  className="space-y-4 pt-4"
                  data-testid="container-recommendations"
                >
                  {recommendationsQuery.data.recommendations.map(
                    (rec: any, idx: number) => (
                      <Card
                        key={idx}
                        className="border-amber-200/50 dark:border-amber-800/50"
                      >
                        <CardHeader>
                          <CardTitle className="text-lg">
                            {rec.tool_name}
                          </CardTitle>
                          <CardDescription>{rec.rationale}</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400 font-medium">
                            <Lightbulb className="h-4 w-4" />
                            {rec.suggested_action}
                          </div>
                        </CardContent>
                      </Card>
                    ),
                  )}
                </CollapsibleContent>
              </Collapsible>
            </CardContent>
          </Card>
        )}

        {recommendationsQuery.isLoading && (
          <Card
            className="shadow-lg"
            data-testid="card-recommendations-loading"
          >
            <CardContent className="py-12 flex items-center justify-center">
              <div className="flex items-center gap-3 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Getting personalized recommendations...</span>
              </div>
            </CardContent>
          </Card>
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

        {!loading && loveLanguages.length > 0 && (
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="h-5 w-5 text-primary" />
                Your Love Languages
              </CardTitle>
              <CardDescription>
                Understanding how you both give and receive love
              </CardDescription>
            </CardHeader>
            <CardContent>
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
            </CardContent>
          </Card>
        )}

        <div>
          <h2 className="text-3xl font-bold mb-6">Your Activities</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activities.map((activity) => {
              const Icon = activity.icon;
              return (
                <Link key={activity.path} href={activity.path}>
                  <Card className="hover-elevate active-elevate-2 cursor-pointer h-full transition-all">
                    <CardHeader>
                      <div
                        className={`w-12 h-12 rounded-lg ${activity.bgColor} flex items-center justify-center mb-4`}
                      >
                        <Icon className={`h-6 w-6 ${activity.color}`} />
                      </div>
                      <CardTitle className="text-xl">
                        {activity.title}
                      </CardTitle>
                      <CardDescription>{activity.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center text-sm text-primary font-medium">
                        Get started
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

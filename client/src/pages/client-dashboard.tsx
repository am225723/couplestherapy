import { useEffect, useState, useCallback } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "react-beautiful-dnd";
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
  BookOpen,
  Activity,
  Compass,
  Lightbulb,
  Trash2,
  User,
  Users,
  CheckCircle2,
  FileText,
  Link as LinkIcon,
  Link2,
  Pause,
  BookMarked,
  Smile,
  Brain,
  CheckSquare,
  ListTodo,
  DollarSign,
  Zap,
  Clock,
  Scale,
  MessageSquare,
  Settings2,
  Eye,
  EyeOff,
  GripVertical,
  Moon,
  Sun,
} from "lucide-react";
import { LoveLanguage } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { aiFunctions, ExerciseRecommendationsResponse } from "@/lib/ai-functions";
import { LuxuryWidget, FeatureCard, StatWidget } from "@/components/luxury-widget";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/theme-provider";

function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

const widgetVariants: Record<string, "default" | "primary" | "accent" | "success" | "warning"> = {
  "weekly-checkin": "primary",
  "love-languages": "accent",
  "gratitude": "success",
  "shared-goals": "primary",
  "voice-memos": "default",
  "calendar": "primary",
  "rituals": "accent",
  "conversations": "success",
  "love-map": "warning",
  "therapist-thoughts": "accent",
  "compatibility": "accent",
  "progress-timeline": "primary",
  "growth-plan": "warning",
  "attachment": "primary",
  "enneagram": "accent",
  "messages": "primary",
  "echo-empathy": "success",
  "conflict": "warning",
  "pause": "default",
  "journal": "success",
  "mood": "warning",
  "ifs": "accent",
  "chores": "success",
  "todos": "default",
  "financial": "success",
  "daily-tips": "warning",
};

export default function ClientDashboard() {
  const { profile } = useAuth();
  const { theme, setTheme } = useTheme();
  const [loveLanguages, setLoveLanguages] = useState<LoveLanguage[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);
  const [localWidgetOrder, setLocalWidgetOrder] = useState<string[]>([]);
  const { toast } = useToast();

  const recommendationsQuery = useQuery<ExerciseRecommendationsResponse>({
    queryKey: ["ai-exercise-recommendations", profile?.couple_id],
    queryFn: () => aiFunctions.getExerciseRecommendations(),
    enabled: !!profile?.couple_id,
    staleTime: 1000 * 60 * 30,
    retry: 1,
  });

  const customizationQuery = useQuery<{
    widget_order: string[];
    enabled_widgets: Record<string, boolean>;
    widget_sizes?: Record<string, "small" | "medium" | "large">;
    widget_content_overrides?: Record<string, any>;
  }>({
    queryKey: [`/api/dashboard-customization/couple/${profile?.couple_id}`],
    enabled: !!profile?.couple_id,
  });

  const therapistCardOverrides = customizationQuery.data?.widget_content_overrides?.["therapist-thoughts"] || {};
  const therapistCardTitle = therapistCardOverrides.title || "From Your Therapist";
  const therapistCardDescription = therapistCardOverrides.description || "Messages, to-dos, and resources";

  const therapistThoughtsQuery = useQuery<any[]>({
    queryKey: ["/api/therapist-thoughts/client/messages"],
    enabled: !!profile?.couple_id,
    staleTime: 1000 * 60 * 5,
  });

  const today = new Date().toISOString().split("T")[0];
  const dailySuggestionQuery = useQuery<any>({
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
      return { id: data.id, completed: data.completed, suggestion: suggestionData };
    },
    enabled: !!profile?.couple_id,
    staleTime: 1000 * 60 * 60,
  });

  const deleteLoveLanguageMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/love-languages/user/${id}`);
    },
    onSuccess: async (_data, deletedId) => {
      setLoveLanguages((prev) => prev.filter((lang) => lang.id !== deletedId));
      toast({ title: "Deleted", description: "Your love language result has been deleted." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message || "Failed to delete", variant: "destructive" });
    },
  });

  useEffect(() => {
    if (profile?.couple_id) {
      fetchLoveLanguages();
    }
  }, [profile?.couple_id]);

  useEffect(() => {
    if (customizationQuery.data?.widget_order) {
      setLocalWidgetOrder(customizationQuery.data.widget_order);
    }
  }, [customizationQuery.data?.widget_order]);

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

  type WidgetType = "standard" | "therapist" | "suggestion" | "ai" | "love-results";
  
  const allWidgets: Array<{
    widgetId: string;
    title: string;
    description: string;
    icon: LucideIcon;
    path: string;
    size: "sm" | "md" | "lg" | "xl";
    type?: WidgetType;
  }> = [
    { widgetId: "therapist-card", title: "From Your Therapist", description: "Messages and tasks from your therapist", icon: MessageCircle, path: "/therapist-thoughts", size: "lg", type: "therapist" },
    { widgetId: "daily-suggestion", title: "Today's Suggestion", description: "Your daily activity", icon: Sparkles, path: "/daily-suggestion", size: "md", type: "suggestion" },
    { widgetId: "ai-suggestions", title: "Suggested For You", description: "AI-powered recommendations", icon: Sparkles, path: "#", size: "md", type: "ai" },
    { widgetId: "date-night", title: "Date Night", description: "Plan meaningful dates with AI", icon: Sparkles, path: "/date-night", size: "lg" },
    { widgetId: "checkin-history", title: "Check-In History", description: "Review your weekly progress", icon: TrendingUp, path: "/checkin-history", size: "lg" },
    { widgetId: "love-results", title: "Your Love Languages", description: "How you give and receive love", icon: Heart, path: "/love-languages", size: "lg", type: "love-results" },
    { widgetId: "weekly-checkin", title: "Weekly Check-In", description: "Reflect on your week together", icon: ClipboardList, path: "/weekly-checkin", size: "sm" },
    { widgetId: "love-languages", title: "Love Languages", description: "Discover how you give and receive love", icon: Heart, path: "/love-languages", size: "sm" },
    { widgetId: "gratitude", title: "Gratitude Log", description: "Share appreciation for each other", icon: Coffee, path: "/gratitude", size: "sm" },
    { widgetId: "shared-goals", title: "Shared Goals", description: "Set and track goals together", icon: Target, path: "/shared-goals", size: "sm" },
    { widgetId: "voice-memos", title: "Voice Memos", description: "Send loving voice messages", icon: Mic, path: "/voice-memos", size: "sm" },
    { widgetId: "calendar", title: "Shared Calendar", description: "Stay in sync", icon: Calendar, path: "/shared-calendar", size: "sm" },
    { widgetId: "rituals", title: "Rituals", description: "Build meaningful traditions", icon: BookOpen, path: "/rituals", size: "sm" },
    { widgetId: "conversations", title: "Hold Me Tight", description: "Deepen emotional bonds", icon: Activity, path: "/hold-me-tight", size: "sm" },
    { widgetId: "love-map", title: "Love Map Quiz", description: "Know each other deeply", icon: Compass, path: "/love-map", size: "sm" },
    { widgetId: "therapist-thoughts", title: "Therapist Notes", description: "Messages from your therapist", icon: MessageSquare, path: "/therapist-thoughts", size: "sm" },
    { widgetId: "compatibility", title: "Compatibility", description: "View compatibility insights", icon: Heart, path: "/couple-compatibility", size: "sm" },
    { widgetId: "progress-timeline", title: "Progress", description: "Your relationship journey", icon: Clock, path: "/progress-timeline", size: "sm" },
    { widgetId: "growth-plan", title: "Growth Plan", description: "AI-powered exercises", icon: Zap, path: "/growth-plan", size: "sm" },
    { widgetId: "attachment", title: "Attachment", description: "Understand your patterns", icon: Link2, path: "/attachment-assessment", size: "sm" },
    { widgetId: "enneagram", title: "Enneagram", description: "Personality insights", icon: Compass, path: "/enneagram-assessment", size: "sm" },
    { widgetId: "messages", title: "Messages", description: "Secure messaging", icon: MessageCircle, path: "/messages", size: "sm" },
    { widgetId: "echo-empathy", title: "Echo & Empathy", description: "Practice listening", icon: Users, path: "/echo-empathy", size: "sm" },
    { widgetId: "conflict", title: "Conflict Tools", description: "Resolve with I-Statements", icon: Scale, path: "/conflict-resolution", size: "sm" },
    { widgetId: "pause", title: "Pause", description: "Take a mindful break", icon: Pause, path: "/pause", size: "sm" },
    { widgetId: "journal", title: "Journal", description: "Write together", icon: BookMarked, path: "/couple-journal", size: "sm" },
    { widgetId: "mood", title: "Mood", description: "Track wellbeing", icon: Smile, path: "/mood-tracker", size: "sm" },
    { widgetId: "ifs", title: "IFS", description: "Internal Family Systems", icon: Brain, path: "/ifs-intro", size: "sm" },
    { widgetId: "chores", title: "Chores", description: "Task management", icon: CheckSquare, path: "/chores", size: "sm" },
    { widgetId: "todos", title: "To-Dos", description: "Shared tasks", icon: ListTodo, path: "/shared-todos", size: "sm" },
    { widgetId: "financial", title: "Financial", description: "Money tools", icon: DollarSign, path: "/financial-toolkit", size: "sm" },
    { widgetId: "daily-tips", title: "Daily Tips", description: "Relationship tips", icon: Lightbulb, path: "/daily-tips", size: "sm" },
  ];

  const isWidgetEnabled = (widgetId: string): boolean => {
    const customization = customizationQuery.data;
    if (!customization?.enabled_widgets) return true;
    return customization.enabled_widgets[widgetId] !== false;
  };

  const toggleWidget = useCallback(async (widgetId: string) => {
    const currentEnabled = isWidgetEnabled(widgetId);
    const newEnabled = { ...customizationQuery.data?.enabled_widgets, [widgetId]: !currentEnabled };
    try {
      await apiRequest("PATCH", `/api/dashboard-customization/couple/${profile?.couple_id}`, {
        enabled_widgets: newEnabled,
      });
      queryClient.invalidateQueries({ queryKey: [`/api/dashboard-customization/couple/${profile?.couple_id}`] });
    } catch (error) {
      toast({ title: "Error", description: "Failed to update widget visibility", variant: "destructive" });
    }
  }, [customizationQuery.data, profile?.couple_id, toast]);

  const handleDragEnd = useCallback(async (result: DropResult) => {
    if (!result.destination) return;
    const items = Array.from(localWidgetOrder.length > 0 ? localWidgetOrder : allWidgets.map(a => a.widgetId));
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    setLocalWidgetOrder(items);
    try {
      await apiRequest("PATCH", `/api/dashboard-customization/couple/${profile?.couple_id}`, {
        widget_order: items,
      });
      queryClient.invalidateQueries({ queryKey: [`/api/dashboard-customization/couple/${profile?.couple_id}`] });
    } catch (error) {
      toast({ title: "Error", description: "Failed to save order", variant: "destructive" });
    }
  }, [localWidgetOrder, allWidgets, profile?.couple_id, toast]);

  const orderedWidgets = (() => {
    const order = localWidgetOrder.length > 0 ? localWidgetOrder : customizationQuery.data?.widget_order || [];
    const enabledWidgets = allWidgets.filter((a) => isWidgetEnabled(a.widgetId));
    if (order.length === 0) return enabledWidgets;
    return enabledWidgets.sort((a, b) => {
      const indexA = order.indexOf(a.widgetId);
      const indexB = order.indexOf(b.widgetId);
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    });
  })();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 glass-card border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Heart className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight">Welcome back</h1>
              <p className="text-xs text-muted-foreground">{profile?.full_name || "Your Journey"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="rounded-xl h-11 w-11"
              data-testid="button-theme-toggle"
            >
              {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 rounded-xl" data-testid="button-customize">
                  <Settings2 className="h-4 w-4" />
                  <span className="hidden sm:inline">Customize</span>
                </Button>
              </SheetTrigger>
              <SheetContent className="w-full sm:max-w-md">
                <SheetHeader>
                  <SheetTitle>Customize Dashboard</SheetTitle>
                  <SheetDescription>Show, hide, or rearrange your widgets</SheetDescription>
                </SheetHeader>
                <div className="mt-6 space-y-6">
                  <div className="flex items-center justify-between p-4 rounded-xl bg-muted/50">
                    <div>
                      <p className="text-sm font-medium">Edit Mode</p>
                      <p className="text-xs text-muted-foreground">Drag to rearrange</p>
                    </div>
                    <Switch checked={isEditMode} onCheckedChange={setIsEditMode} data-testid="switch-edit-mode" />
                  </div>
                  <ScrollArea className="h-[calc(100vh-280px)]">
                    <div className="space-y-2 pr-4">
                      {allWidgets.map((widget) => (
                        <div
                          key={widget.widgetId}
                          className={cn(
                            "flex items-center justify-between p-3 rounded-xl border",
                            "transition-luxury",
                            !isWidgetEnabled(widget.widgetId) && "opacity-50",
                            widget.size === "lg" && "bg-primary/5"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <GripVertical className="h-4 w-4 text-muted-foreground" />
                            <widget.icon className="h-4 w-4 text-muted-foreground" />
                            <div className="flex flex-col">
                              <span className="text-sm">{widget.title}</span>
                              {widget.size === "lg" && (
                                <span className="text-xs text-muted-foreground">Featured</span>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => toggleWidget(widget.widgetId)}
                            className="p-2 rounded-lg hover:bg-muted transition-colors touch-target"
                            data-testid={`toggle-${widget.widgetId}`}
                          >
                            {isWidgetEnabled(widget.widgetId) ? (
                              <Eye className="h-4 w-4 text-primary" />
                            ) : (
                              <EyeOff className="h-4 w-4 text-muted-foreground" />
                            )}
                          </button>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-8">
        <section>
          <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
            <h2 className="text-2xl font-bold tracking-tight">Your Dashboard</h2>
            {isEditMode && (
              <Badge variant="secondary" className="gap-1">
                <GripVertical className="h-3 w-3" />
                Drag to reorder
              </Badge>
            )}
          </div>

          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="widgets" direction="horizontal">
              {(provided) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className="bento-grid"
                >
                  {orderedWidgets.map((widget, index) => {
                    const Icon = widget.icon;
                    const variant = widgetVariants[widget.widgetId] || "default";
                    const widgetSizeClass = widget.size === "lg" ? "widget-lg" : widget.size === "md" ? "widget-md" : "widget-sm";

                    const renderSpecialWidget = () => {
                      if (widget.type === "therapist") {
                        const hasData = therapistThoughtsQuery.isSuccess && therapistThoughtsQuery.data?.length > 0;
                        return (
                          <Card className="glass-card border-none overflow-hidden h-full" data-testid="card-therapist">
                            <div className="gradient-animate" />
                            <CardHeader className="relative z-10 pb-2">
                              <div className="flex items-center justify-between flex-wrap gap-2">
                                <CardTitle className="flex items-center gap-2 text-sm">
                                  <MessageCircle className="h-4 w-4 text-primary" />
                                  {therapistCardTitle}
                                </CardTitle>
                                <Link href="/therapist-thoughts">
                                  <Button variant="ghost" size="sm" className="text-xs h-7" data-testid="button-view-all">
                                    View <ArrowRight className="ml-1 h-3 w-3" />
                                  </Button>
                                </Link>
                              </div>
                            </CardHeader>
                            <CardContent className="relative z-10 space-y-2">
                              {therapistThoughtsQuery.isLoading ? (
                                <div className="p-2 rounded-lg bg-background/60 backdrop-blur-sm border border-border/30 animate-pulse">
                                  <div className="h-4 bg-muted rounded w-3/4" />
                                </div>
                              ) : hasData ? (
                                therapistThoughtsQuery.data.slice(0, 2).map((thought: any) => (
                                  <div key={thought.id} className="p-2 rounded-lg bg-background/60 backdrop-blur-sm border border-border/30">
                                    <div className="flex items-start gap-2">
                                      <div className="mt-0.5">
                                        {thought.thought_type === "todo" ? (
                                          <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                                        ) : (
                                          <MessageCircle className="h-3 w-3 text-primary" />
                                        )}
                                      </div>
                                      <p className="text-xs line-clamp-1">{thought.title || thought.content}</p>
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <p className="text-xs text-muted-foreground text-center py-2">No messages yet</p>
                              )}
                            </CardContent>
                          </Card>
                        );
                      }

                      if (widget.type === "suggestion") {
                        const hasData = dailySuggestionQuery.isSuccess && dailySuggestionQuery.data?.suggestion;
                        return (
                          <Link href="/daily-suggestion" className="block h-full">
                            <Card className="glass-card border-none overflow-hidden cursor-pointer h-full luxury-widget" data-testid="card-suggestion">
                              <div className="gradient-animate bg-gradient-to-br from-emerald-500/10 to-teal-500/8" />
                              <CardHeader className="relative z-10 pb-2">
                                <div className="flex items-center justify-between flex-wrap gap-2">
                                  <CardTitle className="text-sm flex items-center gap-2">
                                    <Sparkles className="h-4 w-4 text-emerald-500" />
                                    Today's Suggestion
                                  </CardTitle>
                                  {hasData && (
                                    <Badge variant={dailySuggestionQuery.data.completed ? "default" : "secondary"} className="text-xs">
                                      {dailySuggestionQuery.data.completed ? "Done" : dailySuggestionQuery.data.suggestion.category}
                                    </Badge>
                                  )}
                                </div>
                              </CardHeader>
                              <CardContent className="relative z-10">
                                {dailySuggestionQuery.isLoading ? (
                                  <div className="animate-pulse space-y-2">
                                    <div className="h-4 bg-muted rounded w-3/4" />
                                    <div className="h-3 bg-muted rounded w-1/2" />
                                  </div>
                                ) : hasData ? (
                                  <>
                                    <p className="font-semibold text-sm">{dailySuggestionQuery.data.suggestion.title}</p>
                                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{dailySuggestionQuery.data.suggestion.description}</p>
                                  </>
                                ) : (
                                  <p className="text-xs text-muted-foreground text-center py-2">Check back tomorrow</p>
                                )}
                              </CardContent>
                            </Card>
                          </Link>
                        );
                      }

                      if (widget.type === "ai") {
                        const hasData = recommendationsQuery.isSuccess && recommendationsQuery.data?.recommendations?.length > 0;
                        return (
                          <Card className="glass-card border-none overflow-hidden h-full" data-testid="card-ai">
                            <div className="gradient-animate bg-gradient-to-br from-amber-500/10 to-orange-500/8" />
                            <CardHeader className="relative z-10 pb-2">
                              <CardTitle className="text-sm flex items-center gap-2">
                                <Sparkles className="h-4 w-4 text-amber-500" />
                                Suggested For You
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="relative z-10 space-y-2">
                              {recommendationsQuery.isLoading ? (
                                <div className="animate-pulse space-y-2">
                                  <div className="h-4 bg-muted rounded w-full" />
                                  <div className="h-3 bg-muted rounded w-3/4" />
                                </div>
                              ) : hasData ? (
                                recommendationsQuery.data.recommendations.slice(0, 2).map((rec: any, idx: number) => (
                                  <div key={idx} className="p-2 rounded-lg bg-background/60 backdrop-blur-sm border border-border/30">
                                    <p className="font-medium text-xs">{rec.tool_name}</p>
                                    <p className="text-xs text-muted-foreground line-clamp-1">{rec.rationale}</p>
                                  </div>
                                ))
                              ) : (
                                <p className="text-xs text-muted-foreground text-center py-2">Complete assessments for suggestions</p>
                              )}
                            </CardContent>
                          </Card>
                        );
                      }

                      if (widget.type === "love-results") {
                        const hasData = !loading && loveLanguages.length > 0;
                        return (
                          <Link href="/love-languages" className="block h-full">
                            <Card className="glass-card border-none overflow-hidden h-full cursor-pointer luxury-widget">
                              <div className="gradient-animate bg-gradient-to-br from-rose-500/8 to-pink-500/6" />
                              <CardHeader className="relative z-10 pb-2">
                                <CardTitle className="flex items-center gap-2 text-sm">
                                  <Heart className="h-4 w-4 text-rose-500" />
                                  Your Love Languages
                                </CardTitle>
                              </CardHeader>
                              <CardContent className="relative z-10">
                                {loading ? (
                                  <div className="animate-pulse grid grid-cols-2 gap-2">
                                    <div className="h-12 bg-muted rounded" />
                                    <div className="h-12 bg-muted rounded" />
                                  </div>
                                ) : hasData ? (
                                  <div className="grid grid-cols-2 gap-2">
                                    {loveLanguages.slice(0, 2).map((lang) => (
                                      <div key={lang.id} className="p-2 rounded-lg bg-background/60 backdrop-blur-sm border border-border/30">
                                        <p className="text-xs font-medium">{lang.user_id === profile?.id ? "You" : "Partner"}</p>
                                        <p className="text-xs text-muted-foreground">{lang.primary_language}</p>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-xs text-muted-foreground text-center py-2">Take the quiz to discover your love languages</p>
                                )}
                              </CardContent>
                            </Card>
                          </Link>
                        );
                      }

                      return null;
                    };

                    const specialContent = widget.type ? renderSpecialWidget() : null;

                    if (isEditMode) {
                      return (
                        <Draggable key={widget.widgetId} draggableId={widget.widgetId} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={cn(
                                widgetSizeClass,
                                snapshot.isDragging && "z-50"
                              )}
                            >
                              {widget.type ? specialContent : (
                                <LuxuryWidget
                                  title={widget.title}
                                  description={widget.description}
                                  icon={Icon}
                                  path={widget.path}
                                  variant={variant}
                                  size={widget.size}
                                  isDragging={snapshot.isDragging}
                                  data-testid={`widget-${widget.widgetId}`}
                                />
                              )}
                            </div>
                          )}
                        </Draggable>
                      );
                    }

                    return (
                      <div key={widget.widgetId} className={widgetSizeClass}>
                        {widget.type ? specialContent : (
                          <LuxuryWidget
                            title={widget.title}
                            description={widget.description}
                            icon={Icon}
                            path={widget.path}
                            variant={variant}
                            size={widget.size}
                            data-testid={`widget-${widget.widgetId}`}
                          />
                        )}
                      </div>
                    );
                  })}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        </section>
      </main>
    </div>
  );
}

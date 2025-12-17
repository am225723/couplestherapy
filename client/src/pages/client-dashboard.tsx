import { useEffect, useState, useCallback, useRef } from "react";
import { Link, useLocation, useSearch } from "wouter";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "@hello-pangea/dnd";
import type { LucideIcon } from "lucide-react";
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
  Home,
  LogOut,
  ChevronDown,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { LoveLanguage } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { invokeDashboardCustomization, type DashboardCustomization } from "@/lib/dashboard-api";
import { aiFunctions, ExerciseRecommendationsResponse } from "@/lib/ai-functions";
import { LuxuryWidget, FeatureCard, StatWidget } from "@/components/luxury-widget";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/theme-provider";
import heroBackground from "@assets/download_1765665015150.jpg";

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
  const { user, profile } = useAuth();
  const { theme, setTheme } = useTheme();
  const [loveLanguages, setLoveLanguages] = useState<LoveLanguage[]>([]);
  const [loading, setLoading] = useState(true);
  const searchString = useSearch();
  const [, navigate] = useLocation();
  
  const isEditMode = new URLSearchParams(searchString).get("edit") === "true";
  
  const exitEditMode = useCallback(() => {
    navigate("/dashboard");
  }, [navigate]);
  
  const [localWidgetOrder, setLocalWidgetOrder] = useState<string[]>([]);
  const [resizingWidget, setResizingWidget] = useState<string | null>(null);
  const [previewSize, setPreviewSize] = useState<{ widgetId: string; cols: 1 | 2 | 3 } | null>(null);
  const resizeStartRef = useRef<{ x: number; cols: 1 | 2 } | null>(null);
  const { toast } = useToast();

  const recommendationsQuery = useQuery<ExerciseRecommendationsResponse>({
    queryKey: ["ai-exercise-recommendations", profile?.couple_id],
    queryFn: () => aiFunctions.getExerciseRecommendations(),
    enabled: !!profile?.couple_id,
    staleTime: 1000 * 60 * 30,
    retry: 1,
  });

  const customizationQuery = useQuery<DashboardCustomization>({
    queryKey: [`/api/dashboard-customization/couple/${profile?.couple_id}`],
    queryFn: () => {
      if (!profile?.couple_id) throw new Error("No couple ID");
      return invokeDashboardCustomization(profile.couple_id, "GET");
    },
    enabled: !!profile?.couple_id,
  });

  type WidgetSize = { cols: 1 | 2 | 3; rows: 1 | 2 };

  const SIZE_OPTIONS: Array<{ cols: 1 | 2 | 3; rows: 1 | 2; label: string }> = [
    { cols: 1, rows: 1, label: "1×1" },
    { cols: 1, rows: 2, label: "1×2" },
    { cols: 2, rows: 1, label: "2×1" },
    { cols: 2, rows: 2, label: "2×2" },
    { cols: 3, rows: 1, label: "3×1" },
    { cols: 3, rows: 2, label: "3×2" },
  ];
  type LegacySize = "small" | "medium" | "large";

  const normalizeWidgetSize = (raw: unknown): WidgetSize => {
    if (typeof raw === "string") {
      return { cols: 1, rows: 1 };
    }
    if (raw && typeof raw === "object") {
      const r = raw as any;
      const cols = r.cols === 3 ? 3 : r.cols === 2 ? 2 : 1;
      const rows = r.rows === 2 ? 2 : 1;
      return { cols, rows };
    }
    return { cols: 1, rows: 1 };
  };

  const getWidgetSize = (widgetId: string): WidgetSize => {
    const raw = customizationQuery.data?.widget_sizes?.[widgetId];
    const baseSize = normalizeWidgetSize(raw);
    if (previewSize && previewSize.widgetId === widgetId) {
      return { cols: previewSize.cols, rows: baseSize.rows };
    }
    return baseSize;
  };

  const updateWidgetSize = async (widgetId: string, cols: 1 | 2 | 3, rows: 1 | 2) => {
    if (!profile?.couple_id) return;
    
    const queryKey = [`/api/dashboard-customization/couple/${profile.couple_id}`];
    const previousData = queryClient.getQueryData<DashboardCustomization>(queryKey);
    
    const currentSizes = previousData?.widget_sizes || {};
    const newSizes = { ...currentSizes, [widgetId]: { cols, rows } };
    
    queryClient.setQueryData(queryKey, {
      ...previousData,
      widget_sizes: newSizes,
    });
    
    try {
      await invokeDashboardCustomization(profile.couple_id, "PATCH", {
        widget_sizes: newSizes,
      });
      queryClient.invalidateQueries({ queryKey });
      toast({ title: "Widget resized", description: "Your layout has been saved" });
    } catch (error: any) {
      console.error("[Client Dashboard] Failed to resize widget:", error.message);
      queryClient.setQueryData(queryKey, previousData);
      toast({ title: "Error", description: error.message || "Failed to resize widget", variant: "destructive" });
    }
  };

  const handleResizeStart = useCallback((e: React.PointerEvent, widgetId: string, currentCols: 1 | 2) => {
    e.preventDefault();
    e.stopPropagation();
    setResizingWidget(widgetId);
    setPreviewSize({ widgetId, cols: currentCols });
    resizeStartRef.current = { x: e.clientX, cols: currentCols };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const handleResizeMove = useCallback((e: React.PointerEvent, widgetId: string) => {
    if (!resizingWidget || !resizeStartRef.current || resizingWidget !== widgetId) return;
    e.preventDefault();
    e.stopPropagation();
    
    const deltaX = e.clientX - resizeStartRef.current.x;
    const threshold = 60;
    const startCols = resizeStartRef.current.cols;
    
    let newCols: 1 | 2 = startCols;
    if (startCols === 1 && deltaX > threshold) {
      newCols = 2;
    } else if (startCols === 2 && deltaX < -threshold) {
      newCols = 1;
    }
    
    if (previewSize?.cols !== newCols) {
      setPreviewSize({ widgetId, cols: newCols });
    }
  }, [resizingWidget, previewSize]);

  const handleResizeEnd = useCallback((e: React.PointerEvent, widgetId: string, currentRows: 1 | 2) => {
    if (!resizingWidget || !resizeStartRef.current) return;
    e.preventDefault();
    e.stopPropagation();
    
    const startCols = resizeStartRef.current.cols;
    const newCols = previewSize?.cols || startCols;
    
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    setResizingWidget(null);
    resizeStartRef.current = null;
    setPreviewSize(null);
    
    if (newCols !== startCols) {
      updateWidgetSize(widgetId, newCols, currentRows);
    }
  }, [resizingWidget, previewSize]);

  const therapistCardOverrides = customizationQuery.data?.widget_content_overrides?.["therapist-thoughts"] || {};
  const therapistCardTitle = therapistCardOverrides.title || "From Your Therapist";
  const therapistCardDescription = therapistCardOverrides.description || "Messages, to-dos, and resources";

  const therapistThoughtsQuery = useQuery<any[]>({
    queryKey: ["/api/therapist-thoughts/client/messages"],
    enabled: !!profile?.couple_id,
    staleTime: 1000 * 60 * 5,
  });

  const dailySuggestionQuery = useQuery<any>({
    queryKey: [`/api/daily-tips/couple/${profile?.couple_id}/today`],
    enabled: !!profile?.couple_id,
    staleTime: 1000 * 60 * 60,
  });

  const attachmentQuery = useQuery<any[]>({
    queryKey: ["/api/attachment/couple/assessments", profile?.couple_id],
    queryFn: async () => {
      if (!profile?.couple_id) return [];
      const { data: coupleData } = await supabase
        .from("Couples_couples")
        .select("partner1_id, partner2_id")
        .eq("id", profile.couple_id)
        .single();
      if (!coupleData) return [];
      const { data } = await supabase
        .from("Couples_attachment_assessments")
        .select("*")
        .in("user_id", [coupleData.partner1_id, coupleData.partner2_id])
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!profile?.couple_id,
    staleTime: 1000 * 60 * 30,
  });

  const enneagramQuery = useQuery<any[]>({
    queryKey: ["/api/enneagram/couple/assessments", profile?.couple_id],
    queryFn: async () => {
      if (!profile?.couple_id) return [];
      const { data: coupleData } = await supabase
        .from("Couples_couples")
        .select("partner1_id, partner2_id")
        .eq("id", profile.couple_id)
        .single();
      if (!coupleData) return [];
      const { data } = await supabase
        .from("Couples_enneagram_assessments")
        .select("*")
        .in("user_id", [coupleData.partner1_id, coupleData.partner2_id])
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!profile?.couple_id,
    staleTime: 1000 * 60 * 30,
  });

  const sharedTodosQuery = useQuery<any[]>({
    queryKey: ["/api/shared-todos", profile?.couple_id],
    enabled: !!profile?.couple_id,
    staleTime: 1000 * 60 * 5,
  });

  const choresQuery = useQuery<any[]>({
    queryKey: ["/api/chores", profile?.couple_id],
    enabled: !!profile?.couple_id,
    staleTime: 1000 * 60 * 5,
  });

  const weeklyCheckinsQuery = useQuery<any[]>({
    queryKey: ["/api/weekly-checkin/history", profile?.couple_id],
    enabled: !!profile?.couple_id,
    staleTime: 1000 * 60 * 15,
  });

  const sessionNotesQuery = useQuery<any[]>({
    queryKey: ["/api/session-notes/couple", profile?.couple_id],
    enabled: !!profile?.couple_id,
    staleTime: 1000 * 60 * 10,
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

  type WidgetType = "standard" | "therapist" | "suggestion" | "ai" | "love-results" | "attachment" | "enneagram" | "todos" | "chores" | "checkin-history" | "session-notes";
  
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
    { widgetId: "checkin-history", title: "Check-In History", description: "Review your weekly progress", icon: TrendingUp, path: "/checkin-history", size: "lg", type: "checkin-history" },
    { widgetId: "love-results", title: "Your Love Languages", description: "How you give and receive love", icon: Heart, path: "/quiz", size: "lg", type: "love-results" },
    { widgetId: "weekly-checkin", title: "Weekly Check-In", description: "Reflect on your week together", icon: ClipboardList, path: "/weekly-checkin", size: "sm" },
    { widgetId: "love-languages", title: "Love Languages", description: "Discover how you give and receive love", icon: Heart, path: "/quiz", size: "sm" },
    { widgetId: "gratitude", title: "Gratitude Log", description: "Share appreciation for each other", icon: Coffee, path: "/gratitude", size: "sm" },
    { widgetId: "shared-goals", title: "Shared Goals", description: "Set and track goals together", icon: Target, path: "/goals", size: "sm" },
    { widgetId: "voice-memos", title: "Voice Memos", description: "Send loving voice messages", icon: Mic, path: "/voice-memos", size: "sm" },
    { widgetId: "calendar", title: "Shared Calendar", description: "Stay in sync", icon: Calendar, path: "/calendar", size: "sm" },
    { widgetId: "rituals", title: "Rituals", description: "Build meaningful traditions", icon: BookOpen, path: "/rituals", size: "sm" },
    { widgetId: "conversations", title: "Hold Me Tight", description: "Deepen emotional bonds", icon: Activity, path: "/conversation", size: "sm" },
    { widgetId: "love-map", title: "Love Map Quiz", description: "Know each other deeply", icon: Compass, path: "/love-map", size: "sm" },
    { widgetId: "therapist-thoughts", title: "Therapist Notes", description: "Messages from your therapist", icon: MessageSquare, path: "/therapist-thoughts", size: "sm" },
    { widgetId: "compatibility", title: "Compatibility", description: "View compatibility insights", icon: Heart, path: "/couple-compatibility", size: "sm" },
    { widgetId: "progress-timeline", title: "Progress", description: "Your relationship journey", icon: Clock, path: "/progress-timeline", size: "sm" },
    { widgetId: "growth-plan", title: "Growth Plan", description: "AI-powered exercises", icon: Zap, path: "/growth-plan", size: "sm" },
    { widgetId: "attachment", title: "Attachment Styles", description: "Your attachment patterns", icon: Link2, path: "/attachment-assessment", size: "md", type: "attachment" },
    { widgetId: "enneagram", title: "Enneagram Types", description: "Your personality insights", icon: Compass, path: "/enneagram-assessment", size: "md", type: "enneagram" },
    { widgetId: "session-notes", title: "Session Notes", description: "Summaries from your sessions", icon: FileText, path: "/session-notes", size: "md", type: "session-notes" },
    { widgetId: "messages", title: "Messages", description: "Secure messaging", icon: MessageCircle, path: "/messages", size: "sm" },
    { widgetId: "echo-empathy", title: "Echo & Empathy", description: "Practice listening", icon: Users, path: "/echo-empathy", size: "sm" },
    { widgetId: "conflict", title: "Conflict Tools", description: "Resolve with I-Statements", icon: Scale, path: "/conflict-resolution", size: "sm" },
    { widgetId: "pause", title: "Pause", description: "Take a mindful break", icon: Pause, path: "/pause", size: "sm" },
    { widgetId: "journal", title: "Journal", description: "Write together", icon: BookMarked, path: "/couple-journal", size: "sm" },
    { widgetId: "mood", title: "Mood", description: "Track wellbeing", icon: Smile, path: "/mood-tracker", size: "sm" },
    { widgetId: "ifs", title: "IFS", description: "Internal Family Systems", icon: Brain, path: "/ifs-intro", size: "sm" },
    { widgetId: "chores", title: "Chore Chart", description: "Track household tasks", icon: CheckSquare, path: "/chores", size: "md", type: "chores" },
    { widgetId: "todos", title: "To-Do List", description: "Shared tasks", icon: ListTodo, path: "/shared-todos", size: "md", type: "todos" },
    { widgetId: "financial", title: "Financial", description: "Money tools", icon: DollarSign, path: "/financial-toolkit", size: "sm" },
    { widgetId: "daily-tips", title: "Daily Tips", description: "Relationship tips", icon: Lightbulb, path: "/daily-tips", size: "sm" },
  ];

  const isWidgetEnabled = (widgetId: string): boolean => {
    const customization = customizationQuery.data;
    if (!customization?.enabled_widgets) return true;
    return customization.enabled_widgets[widgetId] !== false;
  };

  const toggleWidget = useCallback(async (widgetId: string) => {
    if (!profile?.couple_id) return;
    
    const currentEnabled = isWidgetEnabled(widgetId);
    const newEnabled = { ...customizationQuery.data?.enabled_widgets, [widgetId]: !currentEnabled };
    try {
      await invokeDashboardCustomization(profile.couple_id, "PATCH", {
        enabled_widgets: newEnabled,
      });
      queryClient.invalidateQueries({ queryKey: [`/api/dashboard-customization/couple/${profile.couple_id}`] });
    } catch (error: any) {
      console.error("[Client Dashboard] Failed to toggle widget:", error.message);
      toast({ title: "Error", description: error.message || "Failed to update widget visibility", variant: "destructive" });
    }
  }, [customizationQuery.data, profile?.couple_id, toast]);

  const handleDragEnd = useCallback(async (result: DropResult) => {
    if (!result.destination) return;
    const items = Array.from(localWidgetOrder.length > 0 ? localWidgetOrder : allWidgets.map(a => a.widgetId));
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    setLocalWidgetOrder(items);
    
    if (!profile?.couple_id) return;
    
    try {
      await invokeDashboardCustomization(profile.couple_id, "PATCH", {
        widget_order: items,
      });
      queryClient.invalidateQueries({ queryKey: [`/api/dashboard-customization/couple/${profile.couple_id}`] });
    } catch (error: any) {
      console.error("[Client Dashboard] Failed to save order:", error.message);
      toast({ title: "Error", description: error.message || "Failed to save order", variant: "destructive" });
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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  const getInitials = (name: string | undefined) => {
    if (!name) return "U";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            Welcome back, {profile?.full_name?.split(" ")[0] || "there"}
          </h1>
          <p className="text-sm text-muted-foreground">Your relationship dashboard</p>
        </div>

        {isEditMode && (
          <div className="flex items-center justify-between p-3 rounded-xl bg-primary/10 border border-primary/20 flex-wrap gap-2">
            <div className="flex items-center gap-2 text-primary">
              <Settings2 className="h-4 w-4" />
              <span className="text-sm font-medium">Edit Mode Active</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary" className="gap-1">
                <GripVertical className="h-3 w-3" />
                Drag to reorder
              </Badge>
              <Badge variant="secondary" className="gap-1">
                <Maximize2 className="h-3 w-3" />
                Resize
              </Badge>
              <Badge variant="secondary" className="gap-1">
                <EyeOff className="h-3 w-3" />
                Hide
              </Badge>
              <Button 
                size="sm" 
                variant="default" 
                onClick={exitEditMode}
                className="h-7"
                data-testid="button-exit-edit-mode"
              >
                Save & Exit
              </Button>
            </div>
          </div>
        )}

        <div 
          className="relative rounded-2xl overflow-hidden h-40 sm:h-48 mb-2"
          data-testid="hero-background"
        >
          <img 
            src={heroBackground} 
            alt="Relationship connection art" 
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/40 to-transparent" />
          <div className="absolute bottom-4 left-4 right-4 z-10">
            <p className="text-sm text-foreground/90 font-medium">Growing together, one connection at a time</p>
          </div>
        </div>

        <section>

          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="widgets" direction="vertical">
              {(provided) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className="grid grid-cols-3 gap-3"
                  style={{ gridAutoRows: "minmax(140px, auto)" }}
                >
                  {orderedWidgets.map((widget, index) => {
                    const Icon = widget.icon;
                    const variant = widgetVariants[widget.widgetId] || "default";
                    const widgetSizeClass = widget.size === "lg" ? "widget-lg" : widget.size === "md" ? "widget-md" : "widget-sm";
                    const widgetSize = getWidgetSize(widget.widgetId);
                    const isLargeHeight = widgetSize.rows === 2;

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
                                {isEditMode ? (
                                  <Button variant="ghost" size="sm" className="text-xs h-7" data-testid="button-view-all" disabled>
                                    View <ArrowRight className="ml-1 h-3 w-3" />
                                  </Button>
                                ) : (
                                  <Link href="/therapist-thoughts">
                                    <Button variant="ghost" size="sm" className="text-xs h-7" data-testid="button-view-all">
                                      View <ArrowRight className="ml-1 h-3 w-3" />
                                    </Button>
                                  </Link>
                                )}
                              </div>
                            </CardHeader>
                            <CardContent className="relative z-10 space-y-2">
                              {therapistThoughtsQuery.isLoading ? (
                                <div className="p-2 rounded-lg bg-background/60 backdrop-blur-sm border border-border/30 animate-pulse">
                                  <div className="h-4 bg-muted rounded w-3/4" />
                                </div>
                              ) : hasData ? (
                                therapistThoughtsQuery.data.slice(0, isLargeHeight ? 3 : 2).map((thought: any) => (
                                  <div key={thought.id} className="p-2 rounded-lg bg-background/60 backdrop-blur-sm border border-border/30">
                                    <div className="flex items-start gap-2">
                                      <div className="mt-0.5 flex-shrink-0">
                                        {thought.thought_type === "todo" ? (
                                          <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                                        ) : (
                                          <MessageCircle className="h-3 w-3 text-primary" />
                                        )}
                                      </div>
                                      <div className="min-w-0 flex-1">
                                        {thought.title && <p className="text-xs font-medium">{thought.title}</p>}
                                        <p className={cn("text-xs text-muted-foreground", isLargeHeight ? "line-clamp-3" : "line-clamp-1")}>{thought.content || thought.body || thought.message}</p>
                                      </div>
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
                        const hasData = dailySuggestionQuery.isSuccess && dailySuggestionQuery.data?.tip_text;
                        const suggestionCard = (
                          <Card className="glass-card border-none overflow-hidden cursor-pointer h-full luxury-widget" data-testid="card-suggestion">
                            <div className="gradient-animate bg-gradient-to-br from-emerald-500/10 to-teal-500/8" />
                            <CardHeader className="relative z-10 pb-2">
                              <div className="flex items-center justify-between flex-wrap gap-2">
                                <CardTitle className="text-sm flex items-center gap-2">
                                  <Sparkles className="h-4 w-4 text-emerald-500" />
                                  Today's Tip
                                </CardTitle>
                                {hasData && dailySuggestionQuery.data.category && (
                                  <Badge variant="secondary" className="text-xs capitalize">
                                    {dailySuggestionQuery.data.category}
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
                                <p className={cn("text-sm", isLargeHeight ? "line-clamp-none" : "line-clamp-3")}>{dailySuggestionQuery.data.tip_text}</p>
                              ) : (
                                <p className="text-xs text-muted-foreground text-center py-2">Check back tomorrow</p>
                              )}
                            </CardContent>
                          </Card>
                        );
                        if (isEditMode) {
                          return <div className="block h-full">{suggestionCard}</div>;
                        }
                        return <Link href="/daily-suggestion" className="block h-full">{suggestionCard}</Link>;
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
                                    <p className={cn("text-xs text-muted-foreground", isLargeHeight ? "line-clamp-none" : "line-clamp-1")}>{rec.rationale}</p>
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
                        const loveCard = (
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
                        );
                        if (isEditMode) {
                          return <div className="block h-full">{loveCard}</div>;
                        }
                        return <Link href="/love-languages" className="block h-full">{loveCard}</Link>;
                      }

                      if (widget.type === "attachment") {
                        const hasData = attachmentQuery.isSuccess && attachmentQuery.data && attachmentQuery.data.length > 0;
                        const attachmentCard = (
                          <Card className="glass-card border-none overflow-hidden h-full cursor-pointer luxury-widget">
                            <div className="gradient-animate bg-gradient-to-br from-blue-500/8 to-indigo-500/6" />
                            <CardHeader className="relative z-10 pb-2">
                              <CardTitle className="flex items-center gap-2 text-sm">
                                <Link2 className="h-4 w-4 text-blue-500" />
                                Attachment Styles
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="relative z-10">
                              {attachmentQuery.isLoading ? (
                                <div className="animate-pulse grid grid-cols-2 gap-2">
                                  <div className="h-12 bg-muted rounded" />
                                  <div className="h-12 bg-muted rounded" />
                                </div>
                              ) : hasData ? (
                                <div className="grid grid-cols-2 gap-2">
                                  {attachmentQuery.data.slice(0, 2).map((assessment: any) => (
                                    <div key={assessment.id} className="p-2 rounded-lg bg-background/60 backdrop-blur-sm border border-border/30">
                                      <p className="text-xs font-medium capitalize">{assessment.user_id === profile?.id ? "You" : "Partner"}</p>
                                      <p className="text-xs text-muted-foreground capitalize">{assessment.attachment_style}</p>
                                      {isLargeHeight && assessment.dynamics_with_partner && (
                                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{assessment.dynamics_with_partner}</p>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-xs text-muted-foreground text-center py-2">Take the assessment to discover your styles</p>
                              )}
                            </CardContent>
                          </Card>
                        );
                        if (isEditMode) return <div className="block h-full">{attachmentCard}</div>;
                        return <Link href="/attachment-assessment" className="block h-full">{attachmentCard}</Link>;
                      }

                      if (widget.type === "enneagram") {
                        const hasData = enneagramQuery.isSuccess && enneagramQuery.data && enneagramQuery.data.length > 0;
                        const enneagramCard = (
                          <Card className="glass-card border-none overflow-hidden h-full cursor-pointer luxury-widget">
                            <div className="gradient-animate bg-gradient-to-br from-purple-500/8 to-violet-500/6" />
                            <CardHeader className="relative z-10 pb-2">
                              <CardTitle className="flex items-center gap-2 text-sm">
                                <Compass className="h-4 w-4 text-purple-500" />
                                Enneagram Types
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="relative z-10">
                              {enneagramQuery.isLoading ? (
                                <div className="animate-pulse grid grid-cols-2 gap-2">
                                  <div className="h-12 bg-muted rounded" />
                                  <div className="h-12 bg-muted rounded" />
                                </div>
                              ) : hasData ? (
                                <div className="grid grid-cols-2 gap-2">
                                  {enneagramQuery.data.slice(0, 2).map((assessment: any) => (
                                    <div key={assessment.id} className="p-2 rounded-lg bg-background/60 backdrop-blur-sm border border-border/30">
                                      <p className="text-xs font-medium">{assessment.user_id === profile?.id ? "You" : "Partner"}</p>
                                      <p className="text-xs text-muted-foreground">Type {assessment.primary_type}{assessment.secondary_type ? ` w${assessment.secondary_type}` : ""}</p>
                                      {isLargeHeight && assessment.couple_dynamics && (
                                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{assessment.couple_dynamics}</p>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-xs text-muted-foreground text-center py-2">Take the assessment to discover your types</p>
                              )}
                            </CardContent>
                          </Card>
                        );
                        if (isEditMode) return <div className="block h-full">{enneagramCard}</div>;
                        return <Link href="/enneagram-assessment" className="block h-full">{enneagramCard}</Link>;
                      }

                      if (widget.type === "todos") {
                        const hasData = sharedTodosQuery.isSuccess && sharedTodosQuery.data && sharedTodosQuery.data.length > 0;
                        const incompleteTodos = sharedTodosQuery.data?.filter((t: any) => !t.is_completed) || [];
                        const todosCard = (
                          <Card className="glass-card border-none overflow-hidden h-full cursor-pointer luxury-widget">
                            <div className="gradient-animate bg-gradient-to-br from-slate-500/8 to-gray-500/6" />
                            <CardHeader className="relative z-10 pb-2">
                              <div className="flex items-center justify-between flex-wrap gap-2">
                                <CardTitle className="flex items-center gap-2 text-sm">
                                  <ListTodo className="h-4 w-4 text-slate-500" />
                                  To-Do List
                                </CardTitle>
                                {incompleteTodos.length > 0 && (
                                  <Badge variant="secondary" className="text-xs">{incompleteTodos.length} pending</Badge>
                                )}
                              </div>
                            </CardHeader>
                            <CardContent className="relative z-10 space-y-1">
                              {sharedTodosQuery.isLoading ? (
                                <div className="animate-pulse space-y-2">
                                  <div className="h-4 bg-muted rounded w-3/4" />
                                  <div className="h-4 bg-muted rounded w-1/2" />
                                </div>
                              ) : incompleteTodos.length > 0 ? (
                                incompleteTodos.slice(0, isLargeHeight ? 5 : 3).map((todo: any) => (
                                  <div key={todo.id} className="flex items-center gap-2 p-1.5 rounded bg-background/60">
                                    <CheckSquare className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                    <span className="text-xs truncate">{todo.title}</span>
                                  </div>
                                ))
                              ) : (
                                <p className="text-xs text-muted-foreground text-center py-2">No tasks pending</p>
                              )}
                            </CardContent>
                          </Card>
                        );
                        if (isEditMode) return <div className="block h-full">{todosCard}</div>;
                        return <Link href="/shared-todos" className="block h-full">{todosCard}</Link>;
                      }

                      if (widget.type === "chores") {
                        const hasData = choresQuery.isSuccess && choresQuery.data && choresQuery.data.length > 0;
                        const incompleteChores = choresQuery.data?.filter((c: any) => !c.is_completed) || [];
                        const choresCard = (
                          <Card className="glass-card border-none overflow-hidden h-full cursor-pointer luxury-widget">
                            <div className="gradient-animate bg-gradient-to-br from-green-500/8 to-emerald-500/6" />
                            <CardHeader className="relative z-10 pb-2">
                              <div className="flex items-center justify-between flex-wrap gap-2">
                                <CardTitle className="flex items-center gap-2 text-sm">
                                  <CheckSquare className="h-4 w-4 text-green-500" />
                                  Chore Chart
                                </CardTitle>
                                {incompleteChores.length > 0 && (
                                  <Badge variant="secondary" className="text-xs">{incompleteChores.length} due</Badge>
                                )}
                              </div>
                            </CardHeader>
                            <CardContent className="relative z-10 space-y-1">
                              {choresQuery.isLoading ? (
                                <div className="animate-pulse space-y-2">
                                  <div className="h-4 bg-muted rounded w-3/4" />
                                  <div className="h-4 bg-muted rounded w-1/2" />
                                </div>
                              ) : incompleteChores.length > 0 ? (
                                incompleteChores.slice(0, isLargeHeight ? 5 : 3).map((chore: any) => (
                                  <div key={chore.id} className="flex items-center justify-between gap-2 p-1.5 rounded bg-background/60">
                                    <span className="text-xs truncate">{chore.title}</span>
                                    <Badge variant="outline" className="text-xs capitalize">{chore.recurrence}</Badge>
                                  </div>
                                ))
                              ) : (
                                <p className="text-xs text-muted-foreground text-center py-2">All chores done</p>
                              )}
                            </CardContent>
                          </Card>
                        );
                        if (isEditMode) return <div className="block h-full">{choresCard}</div>;
                        return <Link href="/chores" className="block h-full">{choresCard}</Link>;
                      }

                      if (widget.type === "checkin-history") {
                        const hasData = weeklyCheckinsQuery.isSuccess && weeklyCheckinsQuery.data && weeklyCheckinsQuery.data.length > 0;
                        const checkinCard = (
                          <Card className="glass-card border-none overflow-hidden h-full cursor-pointer luxury-widget">
                            <div className="gradient-animate bg-gradient-to-br from-cyan-500/8 to-teal-500/6" />
                            <CardHeader className="relative z-10 pb-2">
                              <CardTitle className="flex items-center gap-2 text-sm">
                                <TrendingUp className="h-4 w-4 text-cyan-500" />
                                Check-In History
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="relative z-10 space-y-1">
                              {weeklyCheckinsQuery.isLoading ? (
                                <div className="animate-pulse space-y-2">
                                  <div className="h-4 bg-muted rounded w-3/4" />
                                  <div className="h-4 bg-muted rounded w-1/2" />
                                </div>
                              ) : hasData ? (
                                weeklyCheckinsQuery.data.slice(0, isLargeHeight ? 4 : 2).map((checkin: any, idx: number) => (
                                  <div key={checkin.id || idx} className="p-1.5 rounded bg-background/60">
                                    <div className="flex items-center justify-between">
                                      <span className="text-xs font-medium">Week {checkin.week_number}, {checkin.year}</span>
                                      <span className="text-xs text-muted-foreground">{checkin.q_connectedness}/10</span>
                                    </div>
                                    {isLargeHeight && checkin.q_appreciation && (
                                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{checkin.q_appreciation}</p>
                                    )}
                                  </div>
                                ))
                              ) : (
                                <p className="text-xs text-muted-foreground text-center py-2">Complete your first check-in</p>
                              )}
                            </CardContent>
                          </Card>
                        );
                        if (isEditMode) return <div className="block h-full">{checkinCard}</div>;
                        return <Link href="/checkin-history" className="block h-full">{checkinCard}</Link>;
                      }

                      if (widget.type === "session-notes") {
                        const hasData = sessionNotesQuery.isSuccess && sessionNotesQuery.data && sessionNotesQuery.data.length > 0;
                        const sessionCard = (
                          <Card className="glass-card border-none overflow-hidden h-full cursor-pointer luxury-widget">
                            <div className="gradient-animate bg-gradient-to-br from-orange-500/8 to-amber-500/6" />
                            <CardHeader className="relative z-10 pb-2">
                              <CardTitle className="flex items-center gap-2 text-sm">
                                <FileText className="h-4 w-4 text-orange-500" />
                                Session Notes
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="relative z-10 space-y-1">
                              {sessionNotesQuery.isLoading ? (
                                <div className="animate-pulse space-y-2">
                                  <div className="h-4 bg-muted rounded w-3/4" />
                                  <div className="h-4 bg-muted rounded w-1/2" />
                                </div>
                              ) : hasData ? (
                                sessionNotesQuery.data.slice(0, isLargeHeight ? 3 : 2).map((note: any, idx: number) => (
                                  <div key={note.id || idx} className="p-1.5 rounded bg-background/60">
                                    <p className="text-xs font-medium">{note.title || `Session ${idx + 1}`}</p>
                                    <p className="text-xs text-muted-foreground line-clamp-1">{note.summary || note.notes}</p>
                                  </div>
                                ))
                              ) : (
                                <p className="text-xs text-muted-foreground text-center py-2">No session notes yet</p>
                              )}
                            </CardContent>
                          </Card>
                        );
                        if (isEditMode) return <div className="block h-full">{sessionCard}</div>;
                        return <Link href="/session-notes" className="block h-full">{sessionCard}</Link>;
                      }

                      return null;
                    };

                    const specialContent = widget.type ? renderSpecialWidget() : null;
                    const colSpanClass = widgetSize.cols === 3 ? "col-span-3" : widgetSize.cols === 2 ? "col-span-2" : "";
                    const rowSpanClass = widgetSize.rows === 2 ? "row-span-2" : "";

                    if (isEditMode) {
                      return (
                        <Draggable key={widget.widgetId} draggableId={widget.widgetId} index={index} isDragDisabled={resizingWidget !== null}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className={cn(
                                colSpanClass,
                                rowSpanClass,
                                "relative group h-full",
                                snapshot.isDragging && "z-50"
                              )}
                            >
                              <div
                                {...provided.dragHandleProps}
                                className="absolute top-2 left-2 z-20 p-1.5 rounded-lg bg-background/80 backdrop-blur-sm border shadow-sm opacity-0 group-hover:opacity-100 transition-opacity cursor-grab"
                              >
                                <GripVertical className="h-4 w-4 text-muted-foreground" />
                              </div>
                              <div className="absolute top-2 right-2 z-20 flex gap-1">
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="secondary"
                                      className="h-7 px-2 rounded-lg shadow-sm text-xs"
                                      data-testid={`resize-${widget.widgetId}`}
                                    >
                                      {widgetSize.cols}×{widgetSize.rows}
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-2" align="end">
                                    <div className="grid grid-cols-3 gap-1">
                                      {SIZE_OPTIONS.map((opt) => (
                                        <Button
                                          key={opt.label}
                                          size="sm"
                                          variant={widgetSize.cols === opt.cols && widgetSize.rows === opt.rows ? "default" : "ghost"}
                                          className="h-8 text-xs"
                                          onClick={() => updateWidgetSize(widget.widgetId, opt.cols, opt.rows)}
                                          data-testid={`size-${widget.widgetId}-${opt.label}`}
                                        >
                                          {opt.label}
                                        </Button>
                                      ))}
                                    </div>
                                  </PopoverContent>
                                </Popover>
                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    toggleWidget(widget.widgetId);
                                  }}
                                  className="h-7 w-7 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center hover:bg-destructive/20 transition-colors"
                                  data-testid={`hide-${widget.widgetId}`}
                                >
                                  <EyeOff className="h-3 w-3" />
                                </button>
                              </div>
                              {widget.type ? specialContent : (
                                <LuxuryWidget
                                  title={widget.title}
                                  description={widget.description}
                                  icon={Icon}
                                  path={widget.path}
                                  variant={variant}
                                  size={widget.size}
                                  isDragging={snapshot.isDragging}
                                  disableNavigation={true}
                                  isLargeHeight={isLargeHeight}
                                  data-testid={`widget-${widget.widgetId}`}
                                />
                              )}
                            </div>
                          )}
                        </Draggable>
                      );
                    }

                    return (
                      <div key={widget.widgetId} className={cn(colSpanClass, rowSpanClass, "h-full")}>
                        {widget.type ? specialContent : (
                          <LuxuryWidget
                            title={widget.title}
                            description={widget.description}
                            icon={Icon}
                            path={widget.path}
                            variant={variant}
                            size={widget.size}
                            isLargeHeight={isLargeHeight}
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

          {isEditMode && (() => {
            const hiddenWidgets = allWidgets.filter((w) => !isWidgetEnabled(w.widgetId));
            if (hiddenWidgets.length === 0) return null;
            return (
              <div className="mt-6 p-4 rounded-xl bg-muted/50 border border-border/50">
                <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                  Hidden Widgets
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {hiddenWidgets.map((widget) => {
                    const Icon = widget.icon;
                    return (
                      <button
                        key={widget.widgetId}
                        onClick={() => toggleWidget(widget.widgetId)}
                        className="flex items-center gap-2 p-2 rounded-lg bg-background hover-elevate active-elevate-2 border border-border/50 text-left"
                        data-testid={`show-${widget.widgetId}`}
                      >
                        <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span className="text-xs truncate">{widget.title}</span>
                        <Eye className="h-3 w-3 text-primary ml-auto flex-shrink-0" />
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </section>
      </main>
    </div>
  );
}

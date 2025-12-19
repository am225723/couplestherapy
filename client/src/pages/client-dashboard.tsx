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
import { authenticatedFetchJson } from "@/lib/authenticated-fetch";
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
  TrendingDown,
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
  Plus,
  Send,
} from "lucide-react";
import { LoveLanguage } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { invokeDashboardCustomization, type DashboardCustomization } from "@/lib/dashboard-api";
import { aiFunctions, ExerciseRecommendationsResponse } from "@/lib/ai-functions";
import { LuxuryWidget, FeatureCard, StatWidget } from "@/components/luxury-widget";
import { cn, formatAIText } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
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

  const [newTodoTitle, setNewTodoTitle] = useState("");
  const [newChoreTitle, setNewChoreTitle] = useState("");
  const [quickMoodLevel, setQuickMoodLevel] = useState([5]);
  const [conflictText, setConflictText] = useState("");

  const addTodoMutation = useMutation({
    mutationFn: async (title: string) => {
      if (!profile?.couple_id) throw new Error("No couple ID");
      return apiRequest("POST", `/api/shared-todos`, { 
        couple_id: profile.couple_id,
        title, 
        priority: "medium" 
      });
    },
    onSuccess: () => {
      setNewTodoTitle("");
      queryClient.invalidateQueries({ queryKey: ["/api/shared-todos", profile?.couple_id] });
      toast({ title: "Added", description: "New task added to your list" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to add task", variant: "destructive" });
    },
  });

  const addChoreMutation = useMutation({
    mutationFn: async (title: string) => {
      if (!profile?.couple_id || !user?.id) throw new Error("No couple ID");
      return apiRequest("POST", `/api/chores/couple/${profile.couple_id}`, { 
        title, 
        recurrence: "weekly",
        assigned_to: user.id
      });
    },
    onSuccess: () => {
      setNewChoreTitle("");
      queryClient.invalidateQueries({ queryKey: ["/api/chores", profile?.couple_id] });
      toast({ title: "Added", description: "New chore added to your chart" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to add chore", variant: "destructive" });
    },
  });

  const getMoodEmotion = (level: number): string => {
    if (level >= 9) return "Ecstatic";
    if (level >= 8) return "Joyful";
    if (level >= 7) return "Happy";
    if (level >= 6) return "Content";
    if (level >= 5) return "Neutral";
    if (level >= 4) return "Uneasy";
    if (level >= 3) return "Stressed";
    if (level >= 2) return "Frustrated";
    return "Overwhelmed";
  };

  const saveMoodMutation = useMutation({
    mutationFn: async (level: number) => {
      if (!profile?.couple_id || !user?.id) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("Couples_mood_entries")
        .insert({
          couple_id: profile.couple_id,
          user_id: user.id,
          mood_level: level,
          emotion: getMoodEmotion(level),
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({ title: "Mood logged", description: "Your mood has been recorded" });
    },
    onError: (error: any) => {
      console.error("Mood save error:", error);
      toast({ title: "Error", description: "Failed to save mood", variant: "destructive" });
    },
  });

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
    queryFn: async () => {
      if (!profile?.couple_id) return [];
      return authenticatedFetchJson(`/api/shared-todos/couple/${profile.couple_id}`);
    },
    enabled: !!profile?.couple_id,
    staleTime: 1000 * 60 * 5,
  });

  const choresQuery = useQuery<any[]>({
    queryKey: ["/api/chores", profile?.couple_id],
    queryFn: async () => {
      if (!profile?.couple_id) return [];
      return authenticatedFetchJson(`/api/chores/couple/${profile.couple_id}`);
    },
    enabled: !!profile?.couple_id,
    staleTime: 1000 * 60 * 5,
  });

  const weeklyCheckinsQuery = useQuery<any[]>({
    queryKey: ["weekly-checkins", profile?.couple_id],
    queryFn: async () => {
      if (!profile?.couple_id) return [];
      const { data, error } = await supabase
        .from("Couples_weekly_checkins")
        .select("*")
        .eq("couple_id", profile.couple_id)
        .order("year", { ascending: false })
        .order("week_number", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!profile?.couple_id,
    staleTime: 1000 * 60 * 15,
  });

  const sessionNotesQuery = useQuery<any[]>({
    queryKey: ["/api/session-notes/couple", profile?.couple_id],
    enabled: !!profile?.couple_id,
    staleTime: 1000 * 60 * 10,
  });

  const calendarQuery = useQuery<any[]>({
    queryKey: ["/api/calendar", profile?.couple_id],
    queryFn: async () => {
      if (!profile?.couple_id) return [];
      return authenticatedFetchJson(`/api/calendar/${profile.couple_id}`);
    },
    enabled: !!profile?.couple_id,
    staleTime: 1000 * 60 * 5,
  });

  const voiceMemosQuery = useQuery<any[]>({
    queryKey: ["/api/voice-memos", profile?.couple_id],
    queryFn: async () => {
      if (!profile?.couple_id) return [];
      return authenticatedFetchJson(`/api/voice-memos?couple_id=${profile.couple_id}`);
    },
    enabled: !!profile?.couple_id,
    staleTime: 1000 * 60 * 5,
  });

  const gratitudeQuery = useQuery<any[]>({
    queryKey: ["/api/gratitude", profile?.couple_id],
    queryFn: async () => {
      if (!profile?.couple_id) return [];
      const { data } = await supabase
        .from("Couples_gratitude_logs")
        .select("*")
        .eq("couple_id", profile.couple_id)
        .order("created_at", { ascending: false })
        .limit(5);
      return data || [];
    },
    enabled: !!profile?.couple_id,
    staleTime: 1000 * 60 * 5,
  });

  const goalsQuery = useQuery<any[]>({
    queryKey: ["/api/goals", profile?.couple_id],
    queryFn: async () => {
      if (!profile?.couple_id) return [];
      const { data } = await supabase
        .from("Couples_shared_goals")
        .select("*")
        .eq("couple_id", profile.couple_id)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!profile?.couple_id,
    staleTime: 1000 * 60 * 5,
  });

  const ritualsQuery = useQuery<any[]>({
    queryKey: ["/api/rituals", profile?.couple_id],
    queryFn: async () => {
      if (!profile?.couple_id) return [];
      const { data } = await supabase
        .from("Couples_rituals_of_connection")
        .select("*")
        .eq("couple_id", profile.couple_id)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!profile?.couple_id,
    staleTime: 1000 * 60 * 5,
  });

  const conversationsQuery = useQuery<any[]>({
    queryKey: ["/api/conversations", profile?.couple_id],
    queryFn: async () => {
      if (!profile?.couple_id) return [];
      const { data } = await supabase
        .from("Couples_hold_me_tight_conversations")
        .select("*")
        .eq("couple_id", profile.couple_id)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!profile?.couple_id,
    staleTime: 1000 * 60 * 5,
  });

  const loveMapQuery = useQuery<any[]>({
    queryKey: ["/api/love-map", profile?.couple_id],
    queryFn: async () => {
      if (!profile?.couple_id) return [];
      const { data: coupleData } = await supabase
        .from("Couples_couples")
        .select("partner1_id, partner2_id")
        .eq("id", profile.couple_id)
        .single();
      if (!coupleData) return [];
      const { data } = await supabase
        .from("Couples_love_map_responses")
        .select("*")
        .in("user_id", [coupleData.partner1_id, coupleData.partner2_id]);
      return data || [];
    },
    enabled: !!profile?.couple_id,
    staleTime: 1000 * 60 * 15,
  });

  const dateNightQuery = useQuery<any[]>({
    queryKey: ["/api/date-night", profile?.couple_id],
    queryFn: async () => {
      if (!profile?.couple_id) return [];
      const { data } = await supabase
        .from("Couples_date_nights")
        .select("*")
        .eq("couple_id", profile.couple_id)
        .order("date", { ascending: true })
        .gte("date", new Date().toISOString().split("T")[0]);
      return data || [];
    },
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

  type WidgetType = "standard" | "therapist" | "suggestion" | "ai" | "love-results" | "attachment" | "enneagram" | "todos" | "chores" | "checkin-history" | "session-notes" | "mood" | "conflict" | "date-night" | "weekly-checkin" | "gratitude" | "goals" | "voice-memos" | "calendar" | "rituals" | "conversations" | "love-map" | "compatibility" | "progress" | "growth" | "messages" | "echo" | "pause" | "journal" | "ifs" | "financial" | "tips";
  
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
    { widgetId: "daily-suggestion", title: "Partner Tip", description: "Ways to connect with your partner", icon: Heart, path: "/daily-suggestion", size: "md", type: "suggestion" },
    { widgetId: "ai-suggestions", title: "Suggested For You", description: "AI-powered recommendations", icon: Sparkles, path: "#", size: "md", type: "ai" },
    { widgetId: "date-night", title: "Date Night", description: "Plan meaningful dates with AI", icon: Sparkles, path: "/date-night", size: "lg", type: "date-night" },
    { widgetId: "checkin-history", title: "Check-In History", description: "Review your weekly progress", icon: TrendingUp, path: "/checkin-history", size: "lg", type: "checkin-history" },
    { widgetId: "love-results", title: "Your Love Languages", description: "How you give and receive love", icon: Heart, path: "/quiz", size: "lg", type: "love-results" },
    { widgetId: "weekly-checkin", title: "Weekly Check-In", description: "Reflect on your week together", icon: ClipboardList, path: "/weekly-checkin", size: "sm", type: "weekly-checkin" },
    { widgetId: "love-languages", title: "Love Languages", description: "Discover how you give and receive love", icon: Heart, path: "/quiz", size: "sm", type: "love-results" },
    { widgetId: "gratitude", title: "Gratitude Log", description: "Share appreciation for each other", icon: Coffee, path: "/gratitude", size: "sm", type: "gratitude" },
    { widgetId: "shared-goals", title: "Shared Goals", description: "Set and track goals together", icon: Target, path: "/goals", size: "sm", type: "goals" },
    { widgetId: "voice-memos", title: "Voice Memos", description: "Send loving voice messages", icon: Mic, path: "/voice-memos", size: "sm", type: "voice-memos" },
    { widgetId: "calendar", title: "Shared Calendar", description: "Stay in sync", icon: Calendar, path: "/calendar", size: "sm", type: "calendar" },
    { widgetId: "rituals", title: "Rituals", description: "Build meaningful traditions", icon: BookOpen, path: "/rituals", size: "sm", type: "rituals" },
    { widgetId: "conversations", title: "Hold Me Tight", description: "Deepen emotional bonds", icon: Activity, path: "/conversation", size: "sm", type: "conversations" },
    { widgetId: "love-map", title: "Love Map Quiz", description: "Know each other deeply", icon: Compass, path: "/love-map", size: "sm", type: "love-map" },
    { widgetId: "therapist-thoughts", title: "Therapist Notes", description: "Messages from your therapist", icon: MessageSquare, path: "/therapist-thoughts", size: "sm", type: "therapist" },
    { widgetId: "compatibility", title: "Compatibility", description: "View compatibility insights", icon: Heart, path: "/couple-compatibility", size: "sm", type: "compatibility" },
    { widgetId: "progress-timeline", title: "Progress", description: "Your relationship journey", icon: Clock, path: "/progress-timeline", size: "sm", type: "progress" },
    { widgetId: "growth-plan", title: "Growth Plan", description: "AI-powered exercises", icon: Zap, path: "/growth-plan", size: "sm", type: "growth" },
    { widgetId: "attachment", title: "Attachment Styles", description: "Your attachment patterns", icon: Link2, path: "/attachment-assessment", size: "md", type: "attachment" },
    { widgetId: "enneagram", title: "Enneagram Types", description: "Your personality insights", icon: Compass, path: "/enneagram-assessment", size: "md", type: "enneagram" },
    { widgetId: "session-notes", title: "Session Notes", description: "Summaries from your sessions", icon: FileText, path: "/session-notes", size: "md", type: "session-notes" },
    { widgetId: "messages", title: "Messages", description: "Secure messaging", icon: MessageCircle, path: "/messages", size: "sm", type: "messages" },
    { widgetId: "echo-empathy", title: "Echo & Empathy", description: "Practice listening", icon: Users, path: "/echo-empathy", size: "sm", type: "echo" },
    { widgetId: "conflict", title: "Reword Feelings", description: "Express yourself kindly", icon: MessageCircle, path: "/conflict-resolution", size: "sm", type: "conflict" },
    { widgetId: "pause", title: "Pause", description: "Take a mindful break", icon: Pause, path: "/pause", size: "sm", type: "pause" },
    { widgetId: "journal", title: "Journal", description: "Write together", icon: BookMarked, path: "/couple-journal", size: "sm", type: "journal" },
    { widgetId: "mood", title: "Mood", description: "Track wellbeing", icon: Smile, path: "/mood-tracker", size: "sm", type: "mood" },
    { widgetId: "ifs", title: "IFS", description: "Internal Family Systems", icon: Brain, path: "/ifs-intro", size: "sm", type: "ifs" },
    { widgetId: "chores", title: "Chore Chart", description: "Track household tasks", icon: CheckSquare, path: "/chores", size: "md", type: "chores" },
    { widgetId: "todos", title: "To-Do List", description: "Shared tasks", icon: ListTodo, path: "/shared-todos", size: "md", type: "todos" },
    { widgetId: "financial", title: "Financial", description: "Money tools", icon: DollarSign, path: "/financial-toolkit", size: "sm", type: "financial" },
    { widgetId: "daily-tips", title: "Daily Tips", description: "Relationship tips", icon: Lightbulb, path: "/daily-tips", size: "sm", type: "tips" },
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
                  className="grid gap-3"
                  style={{ 
                    gridTemplateColumns: "repeat(3, 1fr)",
                    gridAutoRows: "200px",
                    gridAutoFlow: "dense"
                  }}
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
                          <div className="rounded-2xl p-4 relative cursor-pointer h-full flex flex-col border-l-4 border-l-primary shadow-lg glass-card overflow-hidden" data-testid="card-therapist">
                            <div className="gradient-animate rounded-2xl bg-gradient-to-br from-primary/10 to-blue-500/8" />
                            <div className="relative z-10 flex flex-col h-full">
                              <div className="flex-shrink-0 flex items-start justify-between mb-3">
                                <div className="p-2.5 rounded-xl bg-primary/15 flex-shrink-0">
                                  <MessageCircle className="h-6 w-6 text-primary" />
                                </div>
                              </div>
                              <h3 className="font-bold text-base text-foreground leading-tight mb-2">
                                {therapistCardTitle}
                              </h3>
                              <div className="flex-1 flex flex-col space-y-2 overflow-y-auto">
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
                                          {thought.title && <p className="text-sm font-medium">{thought.title}</p>}
                                          <p className={cn("text-sm text-muted-foreground", isLargeHeight ? "line-clamp-3" : "line-clamp-1")}>{thought.content || thought.body || thought.message}</p>
                                        </div>
                                      </div>
                                    </div>
                                  ))
                                ) : (
                                  <p className="text-sm text-muted-foreground text-center py-2">No messages yet</p>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      }

                      if (widget.type === "suggestion") {
                        const hasData = dailySuggestionQuery.isSuccess && dailySuggestionQuery.data?.tip_text;
                        const suggestionCard = (
                          <div className="rounded-2xl p-4 relative cursor-pointer h-full flex flex-col border-l-4 border-l-emerald-500 shadow-lg glass-card overflow-hidden">
                            <div className="gradient-animate rounded-2xl bg-gradient-to-br from-emerald-500/10 to-teal-500/8" />
                            <div className="relative z-10 flex flex-col h-full">
                              <div className="flex-shrink-0 flex items-start justify-between mb-3">
                                <div className="p-2.5 rounded-xl bg-emerald-500/15 flex-shrink-0">
                                  <Heart className="h-6 w-6 text-emerald-500" />
                                </div>
                                {hasData && dailySuggestionQuery.data.category && (
                                  <Badge variant="secondary" className="text-xs capitalize">
                                    {dailySuggestionQuery.data.category}
                                  </Badge>
                                )}
                              </div>
                              <h3 className="font-bold text-base text-foreground leading-tight mb-2">
                                Partner Tip
                              </h3>
                              <div className="flex-1 flex flex-col">
                                {dailySuggestionQuery.isLoading ? (
                                  <div className="animate-pulse space-y-2">
                                    <div className="h-4 bg-muted rounded w-3/4" />
                                    <div className="h-3 bg-muted rounded w-1/2" />
                                  </div>
                                ) : hasData ? (
                                  <p className={cn("text-sm text-muted-foreground leading-relaxed", isLargeHeight ? "" : "line-clamp-3")}>{formatAIText(dailySuggestionQuery.data.tip_text)}</p>
                                ) : (
                                  <p className="text-sm text-muted-foreground text-center py-2">Check back tomorrow</p>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                        if (isEditMode) {
                          return <div className="block h-full">{suggestionCard}</div>;
                        }
                        return <Link href="/daily-suggestion" className="block h-full">{suggestionCard}</Link>;
                      }

                      if (widget.type === "ai") {
                        const hasData = recommendationsQuery.isSuccess && recommendationsQuery.data?.recommendations?.length > 0;
                        return (
                          <div className="rounded-2xl p-4 relative cursor-pointer h-full flex flex-col border-l-4 border-l-amber-500 shadow-lg glass-card overflow-hidden" data-testid="card-ai">
                            <div className="gradient-animate rounded-2xl bg-gradient-to-br from-amber-500/10 to-orange-500/8" />
                            <div className="relative z-10 flex flex-col h-full">
                              <div className="flex-shrink-0 flex items-start justify-between mb-3">
                                <div className="p-2.5 rounded-xl bg-amber-500/15 flex-shrink-0">
                                  <Sparkles className="h-6 w-6 text-amber-500" />
                                </div>
                              </div>
                              <h3 className="font-bold text-base text-foreground leading-tight mb-2">
                                Suggested For You
                              </h3>
                              <div className="flex-1 flex flex-col space-y-2">
                                {recommendationsQuery.isLoading ? (
                                  <div className="animate-pulse space-y-2">
                                    <div className="h-4 bg-muted rounded w-full" />
                                    <div className="h-3 bg-muted rounded w-3/4" />
                                  </div>
                                ) : hasData ? (
                                  recommendationsQuery.data.recommendations.slice(0, 2).map((rec: any, idx: number) => (
                                    <div key={idx} className="p-2 rounded-lg bg-background/60 backdrop-blur-sm border border-border/30">
                                      <p className="font-medium text-sm">{rec.tool_name}</p>
                                      <p className={cn("text-sm text-muted-foreground", isLargeHeight ? "line-clamp-none" : "line-clamp-1")}>{rec.rationale}</p>
                                    </div>
                                  ))
                                ) : (
                                  <p className="text-sm text-muted-foreground text-center py-2">Complete assessments for suggestions</p>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      }

                      if (widget.type === "love-results") {
                        const hasData = !loading && loveLanguages.length > 0;
                        const partnerLang = loveLanguages.find((l) => l.user_id !== profile?.id);
                        const getLoveLanguageTip = (language: string) => {
                          const tips: Record<string, string> = {
                            "Words of Affirmation": "Express appreciation and encouragement",
                            "Acts of Service": "Help with tasks they find meaningful",
                            "Receiving Gifts": "Give thoughtful, personalized presents",
                            "Quality Time": "Give undivided attention and presence",
                            "Physical Touch": "Show affection through hugs and closeness",
                          };
                          return tips[language] || "Connect in meaningful ways";
                        };
                        const loveCard = (
                          <div className="rounded-2xl p-4 relative cursor-pointer h-full flex flex-col border-l-4 border-l-rose-500 shadow-lg glass-card overflow-hidden">
                            <div className="gradient-animate rounded-2xl bg-gradient-to-br from-rose-500/8 to-pink-500/6" />
                            <div className="relative z-10 flex flex-col h-full">
                              <div className="flex-shrink-0 flex items-start justify-between mb-3">
                                <div className="p-2.5 rounded-xl bg-rose-500/15 flex-shrink-0">
                                  <Heart className="h-6 w-6 text-rose-500" />
                                </div>
                              </div>
                              <h3 className="font-bold text-base text-foreground leading-tight mb-2">
                                Your Love Languages
                              </h3>
                              <div className="flex-1 flex flex-col overflow-hidden">
                                {loading ? (
                                  <div className="animate-pulse space-y-2">
                                    <div className="h-4 bg-muted rounded w-3/4" />
                                    <div className="h-4 bg-muted rounded w-1/2" />
                                  </div>
                                ) : hasData && partnerLang ? (
                                  <div className="space-y-2">
                                    <div className="p-2 rounded-lg bg-background/60 backdrop-blur-sm border border-border/30">
                                      <p className="text-xs font-medium text-muted-foreground">Partner needs:</p>
                                      <p className="text-sm font-medium text-foreground">{partnerLang.primary_language}</p>
                                    </div>
                                    <p className="text-xs text-primary">{getLoveLanguageTip(partnerLang.primary_language || '')}</p>
                                  </div>
                                ) : hasData ? (
                                  <div className="space-y-2">
                                    <p className="text-sm text-muted-foreground">Your results are in!</p>
                                    <p className="text-xs text-primary">Invite your partner to take the quiz</p>
                                  </div>
                                ) : (
                                  <div className="space-y-2">
                                    <p className="text-sm text-muted-foreground">Discover how you connect</p>
                                    <p className="text-xs text-primary font-medium">Take the quiz</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                        if (isEditMode) {
                          return <div className="block h-full">{loveCard}</div>;
                        }
                        return <Link href="/love-languages" className="block h-full">{loveCard}</Link>;
                      }

                      if (widget.type === "attachment") {
                        const hasData = attachmentQuery.isSuccess && attachmentQuery.data && attachmentQuery.data.length > 0;
                        const attachmentCard = (
                          <div className="rounded-2xl p-4 relative cursor-pointer h-full flex flex-col border-l-4 border-l-blue-500 shadow-lg glass-card overflow-hidden">
                            <div className="gradient-animate rounded-2xl bg-gradient-to-br from-blue-500/8 to-indigo-500/6" />
                            <div className="relative z-10 flex flex-col h-full">
                              <div className="flex-shrink-0 flex items-start justify-between mb-3">
                                <div className="p-2.5 rounded-xl bg-blue-500/15 flex-shrink-0">
                                  <Link2 className="h-6 w-6 text-blue-500" />
                                </div>
                              </div>
                              <h3 className="font-bold text-base text-foreground leading-tight mb-2">
                                Attachment Styles
                              </h3>
                              <div className="flex-1 flex flex-col">
                                {attachmentQuery.isLoading ? (
                                  <div className="animate-pulse grid grid-cols-2 gap-2">
                                    <div className="h-12 bg-muted rounded" />
                                    <div className="h-12 bg-muted rounded" />
                                  </div>
                                ) : hasData ? (
                                  <div className="grid grid-cols-2 gap-2">
                                    {attachmentQuery.data.slice(0, 2).map((assessment: any) => (
                                      <div key={assessment.id} className="p-2 rounded-lg bg-background/60 backdrop-blur-sm border border-border/30">
                                        <p className="text-sm font-medium capitalize">{assessment.user_id === profile?.id ? "You" : "Partner"}</p>
                                        <p className="text-sm text-muted-foreground capitalize">{assessment.attachment_style}</p>
                                        {isLargeHeight && assessment.dynamics_with_partner && (
                                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{assessment.dynamics_with_partner}</p>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-sm text-muted-foreground text-center py-2">Take the assessment to discover your styles</p>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                        if (isEditMode) return <div className="block h-full">{attachmentCard}</div>;
                        return <Link href="/attachment-assessment" className="block h-full">{attachmentCard}</Link>;
                      }

                      if (widget.type === "enneagram") {
                        const hasData = enneagramQuery.isSuccess && enneagramQuery.data && enneagramQuery.data.length > 0;
                        const enneagramCard = (
                          <div className="rounded-2xl p-4 relative cursor-pointer h-full flex flex-col border-l-4 border-l-purple-500 shadow-lg glass-card overflow-hidden">
                            <div className="gradient-animate rounded-2xl bg-gradient-to-br from-purple-500/8 to-violet-500/6" />
                            <div className="relative z-10 flex flex-col h-full">
                              <div className="flex-shrink-0 flex items-start justify-between mb-3">
                                <div className="p-2.5 rounded-xl bg-purple-500/15 flex-shrink-0">
                                  <Compass className="h-6 w-6 text-purple-500" />
                                </div>
                              </div>
                              <h3 className="font-bold text-base text-foreground leading-tight mb-2">
                                Enneagram Types
                              </h3>
                              <div className="flex-1 flex flex-col">
                                {enneagramQuery.isLoading ? (
                                  <div className="animate-pulse grid grid-cols-2 gap-2">
                                    <div className="h-12 bg-muted rounded" />
                                    <div className="h-12 bg-muted rounded" />
                                  </div>
                                ) : hasData ? (
                                  <div className="grid grid-cols-2 gap-2">
                                    {enneagramQuery.data.slice(0, 2).map((assessment: any) => (
                                      <div key={assessment.id} className="p-2 rounded-lg bg-background/60 backdrop-blur-sm border border-border/30">
                                        <p className="text-sm font-medium">{assessment.user_id === profile?.id ? "You" : "Partner"}</p>
                                        <p className="text-sm text-muted-foreground">Type {assessment.primary_type}{assessment.secondary_type ? ` w${assessment.secondary_type}` : ""}</p>
                                        {isLargeHeight && assessment.couple_dynamics && (
                                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{assessment.couple_dynamics}</p>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-sm text-muted-foreground text-center py-2">Take the assessment to discover your types</p>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                        if (isEditMode) return <div className="block h-full">{enneagramCard}</div>;
                        return <Link href="/enneagram-assessment" className="block h-full">{enneagramCard}</Link>;
                      }

                      if (widget.type === "todos") {
                        const hasData = sharedTodosQuery.isSuccess && sharedTodosQuery.data && sharedTodosQuery.data.length > 0;
                        const incompleteTodos = sharedTodosQuery.data?.filter((t: any) => !t.is_completed) || [];
                        return (
                          <div className="rounded-2xl p-4 relative cursor-pointer h-full flex flex-col border-l-4 border-l-slate-500 shadow-lg glass-card overflow-hidden">
                            <div className="gradient-animate rounded-2xl bg-gradient-to-br from-slate-500/8 to-gray-500/6" />
                            <div className="relative z-10 flex flex-col h-full">
                              <div className="flex-shrink-0 flex items-start justify-between mb-3">
                                <div className="p-2.5 rounded-xl bg-slate-500/15 flex-shrink-0">
                                  <ListTodo className="h-6 w-6 text-slate-500" />
                                </div>
                                {incompleteTodos.length > 0 && (
                                  <Badge variant="secondary" className="text-xs">{incompleteTodos.length} pending</Badge>
                                )}
                              </div>
                              <h3 className="font-bold text-base text-foreground leading-tight mb-2">
                                To-Do List
                              </h3>
                              <div className="flex-1 flex flex-col space-y-1 overflow-y-auto">
                              <form 
                                onSubmit={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  if (newTodoTitle.trim()) {
                                    addTodoMutation.mutate(newTodoTitle.trim());
                                  }
                                }}
                                className="flex gap-1 mb-2"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Input
                                  placeholder="Add task..."
                                  value={newTodoTitle}
                                  onChange={(e) => setNewTodoTitle(e.target.value)}
                                  className="h-7 text-xs"
                                  data-testid="input-add-todo"
                                  onClick={(e) => e.stopPropagation()}
                                />
                                <Button 
                                  type="submit" 
                                  size="icon" 
                                  variant="ghost" 
                                  className="h-7 w-7 flex-shrink-0"
                                  disabled={addTodoMutation.isPending || !newTodoTitle.trim()}
                                  data-testid="button-add-todo"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                              </form>
                              {sharedTodosQuery.isLoading ? (
                                <div className="animate-pulse space-y-2">
                                  <div className="h-4 bg-muted rounded w-3/4" />
                                  <div className="h-4 bg-muted rounded w-1/2" />
                                </div>
                              ) : incompleteTodos.length > 0 ? (
                                <>
                                  {incompleteTodos.slice(0, isLargeHeight ? 4 : 2).map((todo: any) => (
                                    <div key={todo.id} className="flex items-center gap-2 p-1.5 rounded bg-background/60">
                                      <CheckSquare className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                      <span className="text-sm truncate">{todo.title}</span>
                                    </div>
                                  ))}
                                  {!isEditMode && (
                                    <Link href="/shared-todos" className="block">
                                      <p className="text-sm text-primary text-center mt-1 hover:underline">View all tasks</p>
                                    </Link>
                                  )}
                                </>
                              ) : (
                                <p className="text-sm text-muted-foreground text-center py-2">No tasks pending</p>
                              )}
                              </div>
                            </div>
                          </div>
                        );
                      }

                      if (widget.type === "chores") {
                        const hasData = choresQuery.isSuccess && choresQuery.data && choresQuery.data.length > 0;
                        const incompleteChores = choresQuery.data?.filter((c: any) => !c.is_completed) || [];
                        return (
                          <div className="rounded-2xl p-4 relative cursor-pointer h-full flex flex-col border-l-4 border-l-green-500 shadow-lg glass-card overflow-hidden">
                            <div className="gradient-animate rounded-2xl bg-gradient-to-br from-green-500/8 to-emerald-500/6" />
                            <div className="relative z-10 flex flex-col h-full">
                              <div className="flex-shrink-0 flex items-start justify-between mb-3">
                                <div className="p-2.5 rounded-xl bg-green-500/15 flex-shrink-0">
                                  <CheckSquare className="h-6 w-6 text-green-500" />
                                </div>
                                {incompleteChores.length > 0 && (
                                  <Badge variant="secondary" className="text-xs">{incompleteChores.length} due</Badge>
                                )}
                              </div>
                              <h3 className="font-bold text-base text-foreground leading-tight mb-2">
                                Chore Chart
                              </h3>
                              <div className="flex-1 flex flex-col space-y-1 overflow-y-auto">
                              <form 
                                onSubmit={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  if (newChoreTitle.trim()) {
                                    addChoreMutation.mutate(newChoreTitle.trim());
                                  }
                                }}
                                className="flex gap-1 mb-2"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Input
                                  placeholder="Add chore..."
                                  value={newChoreTitle}
                                  onChange={(e) => setNewChoreTitle(e.target.value)}
                                  className="h-7 text-xs"
                                  data-testid="input-add-chore"
                                  onClick={(e) => e.stopPropagation()}
                                />
                                <Button 
                                  type="submit" 
                                  size="icon" 
                                  variant="ghost" 
                                  className="h-7 w-7 flex-shrink-0"
                                  disabled={addChoreMutation.isPending || !newChoreTitle.trim()}
                                  data-testid="button-add-chore"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                              </form>
                              {choresQuery.isLoading ? (
                                <div className="animate-pulse space-y-2">
                                  <div className="h-4 bg-muted rounded w-3/4" />
                                  <div className="h-4 bg-muted rounded w-1/2" />
                                </div>
                              ) : incompleteChores.length > 0 ? (
                                <>
                                  {incompleteChores.slice(0, isLargeHeight ? 4 : 2).map((chore: any) => (
                                    <div key={chore.id} className="flex items-center justify-between gap-2 p-1.5 rounded bg-background/60">
                                      <span className="text-sm truncate">{chore.title}</span>
                                      <Badge variant="outline" className="text-xs capitalize">{chore.recurrence}</Badge>
                                    </div>
                                  ))}
                                  {!isEditMode && (
                                    <Link href="/chores" className="block">
                                      <p className="text-sm text-primary text-center mt-1 hover:underline">View all chores</p>
                                    </Link>
                                  )}
                                </>
                              ) : (
                                <p className="text-sm text-muted-foreground text-center py-2">All chores done</p>
                              )}
                              </div>
                            </div>
                          </div>
                        );
                      }

                      if (widget.type === "checkin-history") {
                        const checkins = weeklyCheckinsQuery.data || [];
                        const hasData = checkins.length > 0;
                        const totalCount = checkins.length;
                        const latestScore = checkins[0]?.q_connectedness || checkins[0]?.connectedness;
                        const previousScore = checkins[1]?.q_connectedness || checkins[1]?.connectedness;
                        const trend = latestScore && previousScore ? (latestScore > previousScore ? "up" : latestScore < previousScore ? "down" : "same") : null;
                        const avgScore = hasData ? Math.round(checkins.reduce((sum: number, c: any) => sum + (c.q_connectedness || c.connectedness || 0), 0) / checkins.length * 10) / 10 : null;
                        const checkinCard = (
                          <div className="rounded-2xl p-4 relative cursor-pointer h-full flex flex-col border-l-4 border-l-cyan-500 shadow-lg glass-card overflow-hidden">
                            <div className="gradient-animate rounded-2xl bg-gradient-to-br from-cyan-500/8 to-teal-500/6" />
                            <div className="relative z-10 flex flex-col h-full">
                              <div className="flex-shrink-0 flex items-start justify-between mb-3">
                                <div className="p-2.5 rounded-xl bg-cyan-500/15 flex-shrink-0">
                                  <TrendingUp className="h-6 w-6 text-cyan-500" />
                                </div>
                                {totalCount > 0 && (
                                  <Badge variant="secondary" className="text-xs">{totalCount} check-ins</Badge>
                                )}
                              </div>
                              <h3 className="font-bold text-base text-foreground leading-tight mb-2">
                                Check-In History
                              </h3>
                              <div className="flex-1 flex flex-col space-y-1 overflow-y-auto">
                                {weeklyCheckinsQuery.isLoading ? (
                                  <div className="animate-pulse space-y-2">
                                    <div className="h-4 bg-muted rounded w-3/4" />
                                    <div className="h-4 bg-muted rounded w-1/2" />
                                  </div>
                                ) : hasData ? (
                                  <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm text-muted-foreground">Avg connection:</span>
                                      <span className="text-sm font-medium">{avgScore}/10</span>
                                      {trend === "up" && <TrendingUp className="h-3 w-3 text-emerald-500" />}
                                      {trend === "down" && <TrendingDown className="h-3 w-3 text-amber-500" />}
                                    </div>
                                    {isLargeHeight && checkins.slice(0, 3).map((checkin: any, idx: number) => (
                                      <div key={checkin.id || idx} className="flex items-center justify-between text-xs text-muted-foreground">
                                        <span>Week {checkin.week_number}</span>
                                        <span className="font-medium">{checkin.q_connectedness || checkin.connectedness}/10</span>
                                      </div>
                                    ))}
                                    <p className="text-xs text-primary">View full history</p>
                                  </div>
                                ) : (
                                  <p className="text-sm text-muted-foreground text-center py-2">No check-ins yet</p>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                        if (isEditMode) return <div className="block h-full">{checkinCard}</div>;
                        return <Link href="/checkin-history" className="block h-full">{checkinCard}</Link>;
                      }

                      if (widget.type === "session-notes") {
                        const hasData = sessionNotesQuery.isSuccess && sessionNotesQuery.data && sessionNotesQuery.data.length > 0;
                        const sessionCard = (
                          <div className="rounded-2xl p-4 relative cursor-pointer h-full flex flex-col border-l-4 border-l-orange-500 shadow-lg glass-card overflow-hidden">
                            <div className="gradient-animate rounded-2xl bg-gradient-to-br from-orange-500/8 to-amber-500/6" />
                            <div className="relative z-10 flex flex-col h-full">
                              <div className="flex-shrink-0 flex items-start justify-between mb-3">
                                <div className="p-2.5 rounded-xl bg-orange-500/15 flex-shrink-0">
                                  <FileText className="h-6 w-6 text-orange-500" />
                                </div>
                              </div>
                              <h3 className="font-bold text-base text-foreground leading-tight mb-2">
                                Session Notes
                              </h3>
                              <div className="flex-1 flex flex-col space-y-1 overflow-y-auto">
                                {sessionNotesQuery.isLoading ? (
                                  <div className="animate-pulse space-y-2">
                                    <div className="h-4 bg-muted rounded w-3/4" />
                                    <div className="h-4 bg-muted rounded w-1/2" />
                                  </div>
                                ) : hasData ? (
                                  sessionNotesQuery.data.slice(0, isLargeHeight ? 3 : 2).map((note: any, idx: number) => (
                                    <div key={note.id || idx} className="p-1.5 rounded bg-background/60">
                                      <p className="text-sm font-medium">{note.title || `Session ${idx + 1}`}</p>
                                      <p className="text-sm text-muted-foreground line-clamp-1">{note.summary || note.notes}</p>
                                    </div>
                                  ))
                                ) : (
                                  <p className="text-sm text-muted-foreground text-center py-2">No session notes yet</p>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                        if (isEditMode) return <div className="block h-full">{sessionCard}</div>;
                        return <Link href="/session-notes" className="block h-full">{sessionCard}</Link>;
                      }

                      if (widget.type === "mood") {
                        const getMoodLabel = (level: number) => {
                          if (level >= 9) return "Ecstatic";
                          if (level >= 8) return "Joyful";
                          if (level >= 7) return "Happy";
                          if (level >= 6) return "Content";
                          if (level >= 5) return "Neutral";
                          if (level >= 4) return "Uneasy";
                          if (level >= 3) return "Stressed";
                          if (level >= 2) return "Frustrated";
                          return "Overwhelmed";
                        };
                        const getMoodColor = (level: number) => {
                          if (level >= 9) return "text-emerald-400";
                          if (level >= 8) return "text-green-500";
                          if (level >= 7) return "text-green-400";
                          if (level >= 6) return "text-lime-500";
                          if (level >= 5) return "text-yellow-500";
                          if (level >= 4) return "text-amber-500";
                          if (level >= 3) return "text-orange-500";
                          if (level >= 2) return "text-red-400";
                          return "text-red-500";
                        };
                        return (
                          <div className="rounded-2xl p-4 relative cursor-pointer h-full flex flex-col border-l-4 border-l-amber-500 shadow-lg glass-card overflow-hidden">
                            <div className="gradient-animate rounded-2xl bg-gradient-to-br from-amber-500/8 to-yellow-500/6" />
                            <div className="relative z-10 flex flex-col h-full">
                              <div className="flex-shrink-0 flex items-start justify-between mb-3">
                                <div className="p-2.5 rounded-xl bg-amber-500/15 flex-shrink-0">
                                  <Smile className="h-6 w-6 text-amber-500" />
                                </div>
                                <span className={cn("text-xs font-medium", getMoodColor(quickMoodLevel[0]))}>
                                  {getMoodLabel(quickMoodLevel[0])}
                                </span>
                              </div>
                              <h3 className="font-bold text-base text-foreground leading-tight mb-2">
                                Mood Check
                              </h3>
                              <div className="flex-1 flex flex-col space-y-3 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                                <div className="space-y-2">
                                <Slider
                                  value={quickMoodLevel}
                                  onValueChange={setQuickMoodLevel}
                                  min={1}
                                  max={10}
                                  step={1}
                                  className="w-full"
                                  data-testid="slider-mood"
                                />
                                <div className="flex justify-between text-xs text-muted-foreground">
                                  <span>1</span>
                                  <span className="font-medium">{quickMoodLevel[0]}/10</span>
                                  <span>10</span>
                                </div>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                className="w-full h-6 text-xs py-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  saveMoodMutation.mutate(quickMoodLevel[0]);
                                }}
                                disabled={saveMoodMutation.isPending}
                                data-testid="button-save-mood"
                              >
                                {saveMoodMutation.isPending ? "..." : "Log"}
                              </Button>
                              {!isEditMode && (
                                <Link href="/mood-tracker" className="block">
                                  <p className="text-sm text-primary text-center hover:underline">View history</p>
                                </Link>
                              )}
                              </div>
                            </div>
                          </div>
                        );
                      }

                      if (widget.type === "conflict") {
                        return (
                          <div className="rounded-2xl p-4 relative cursor-pointer h-full flex flex-col border-l-4 border-l-rose-500 shadow-lg glass-card overflow-hidden">
                            <div className="gradient-animate rounded-2xl bg-gradient-to-br from-rose-500/8 to-pink-500/6" />
                            <div className="relative z-10 flex flex-col h-full">
                              <div className="flex-shrink-0 flex items-start justify-between mb-3">
                                <div className="p-2.5 rounded-xl bg-rose-500/15 flex-shrink-0">
                                  <MessageCircle className="h-6 w-6 text-rose-500" />
                                </div>
                              </div>
                              <h3 className="font-bold text-base text-foreground leading-tight mb-2">
                                Reword My Feelings
                              </h3>
                              <div className="flex-1 flex flex-col space-y-2 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                                <p className="text-sm text-muted-foreground">Type how you feel freely:</p>
                                <Textarea
                                  placeholder="I'm frustrated because..."
                                  value={conflictText}
                                  onChange={(e) => setConflictText(e.target.value)}
                                  className="flex-1 text-sm resize-none"
                                  onClick={(e) => e.stopPropagation()}
                                  data-testid="input-reword-feelings"
                                />
                                {!isEditMode && (
                                  <Link href="/conflict-resolution" className="block">
                                    <Button variant="outline" size="sm" className="w-full h-7 text-sm" data-testid="button-reword-feelings">
                                      Get kinder wording
                                    </Button>
                                  </Link>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      }

                      if (widget.type === "date-night") {
                        const upcomingDates = dateNightQuery.data?.filter((d: any) => new Date(d.date) >= new Date()) || [];
                        const nextDate = upcomingDates.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];
                        return (
                          <Link href="/date-night" className="block h-full">
                            <div className="rounded-2xl p-4 relative cursor-pointer h-full flex flex-col border-l-4 border-l-pink-500 shadow-lg glass-card overflow-hidden">
                              <div className="gradient-animate rounded-2xl bg-gradient-to-br from-pink-500/8 to-rose-500/6" />
                              <div className="relative z-10 flex flex-col h-full">
                                <div className="flex-shrink-0 flex items-start justify-between mb-3">
                                  <div className="p-2.5 rounded-xl bg-pink-500/15 flex-shrink-0">
                                    <Sparkles className="h-6 w-6 text-pink-500" />
                                  </div>
                                </div>
                                <h3 className="font-bold text-base text-foreground leading-tight mb-2">Date Night</h3>
                                <div className="flex-1 text-sm text-muted-foreground">
                                  {dateNightQuery.isLoading ? (
                                    <p>Loading...</p>
                                  ) : nextDate ? (
                                    <div className="space-y-1">
                                      <p className="font-medium text-foreground">{nextDate.title || "Your next date"}</p>
                                      <p className="text-xs">{new Date(nextDate.date).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</p>
                                    </div>
                                  ) : (
                                    <p className="text-primary font-medium">Plan your first date</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          </Link>
                        );
                      }

                      if (widget.type === "weekly-checkin") {
                        const checkins = weeklyCheckinsQuery.data || [];
                        const lastCheckin = checkins[0];
                        const totalCheckins = checkins.length;
                        const now = new Date();
                        const currentDay = now.getDay();
                        const daysUntilSunday = currentDay === 0 ? 0 : 7 - currentDay;
                        const lastCheckinDate = lastCheckin ? new Date(lastCheckin.created_at) : null;
                        const startOfWeek = new Date(now);
                        startOfWeek.setDate(now.getDate() - currentDay);
                        startOfWeek.setHours(0, 0, 0, 0);
                        const completedThisWeek = lastCheckinDate && lastCheckinDate >= startOfWeek;
                        return (
                          <Link href="/weekly-checkin" className="block h-full">
                            <div className="rounded-2xl p-4 relative cursor-pointer h-full flex flex-col border-l-4 border-l-blue-500 shadow-lg glass-card overflow-hidden">
                              <div className="gradient-animate rounded-2xl bg-gradient-to-br from-blue-500/8 to-indigo-500/6" />
                              <div className="relative z-10 flex flex-col h-full">
                                <div className="flex-shrink-0 flex items-start justify-between mb-3">
                                  <div className="p-2.5 rounded-xl bg-blue-500/15 flex-shrink-0">
                                    <ClipboardList className="h-6 w-6 text-blue-500" />
                                  </div>
                                  {totalCheckins > 0 && (
                                    <Badge variant="secondary" className="text-xs">{totalCheckins} total</Badge>
                                  )}
                                </div>
                                <h3 className="font-bold text-base text-foreground leading-tight mb-2">Weekly Check-In</h3>
                                <div className="flex-1 text-sm text-muted-foreground">
                                  {completedThisWeek ? (
                                    <div className="space-y-1">
                                      <p className="text-emerald-500 font-medium">Completed this week</p>
                                      <p className="text-xs">Great job staying connected!</p>
                                    </div>
                                  ) : totalCheckins > 0 ? (
                                    <div className="space-y-1">
                                      <p className="text-amber-500 font-medium">Due in {daysUntilSunday} day{daysUntilSunday !== 1 ? 's' : ''}</p>
                                      <p className="text-xs">{daysUntilSunday === 0 ? "Today is Sunday!" : "Complete before Sunday"}</p>
                                    </div>
                                  ) : (
                                    <div className="space-y-1">
                                      <p className="text-primary font-medium">Start your first check-in</p>
                                      <p className="text-xs">Due every Sunday</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </Link>
                        );
                      }

                      if (widget.type === "gratitude") {
                        const entries = gratitudeQuery.data || [];
                        const recentCount = entries.length;
                        const latestEntry = entries[0];
                        return (
                          <Link href="/gratitude" className="block h-full">
                            <div className="rounded-2xl p-4 relative cursor-pointer h-full flex flex-col border-l-4 border-l-emerald-500 shadow-lg glass-card overflow-hidden">
                              <div className="gradient-animate rounded-2xl bg-gradient-to-br from-emerald-500/8 to-teal-500/6" />
                              <div className="relative z-10 flex flex-col h-full">
                                <div className="flex-shrink-0 flex items-start justify-between mb-3">
                                  <div className="p-2.5 rounded-xl bg-emerald-500/15 flex-shrink-0">
                                    <Coffee className="h-6 w-6 text-emerald-500" />
                                  </div>
                                  {recentCount > 0 && (
                                    <Badge variant="secondary" className="text-xs">{recentCount} entries</Badge>
                                  )}
                                </div>
                                <h3 className="font-bold text-base text-foreground leading-tight mb-2">Gratitude Log</h3>
                                <div className="flex-1 text-sm text-muted-foreground overflow-hidden">
                                  {latestEntry ? (
                                    <p className="line-clamp-2">"{latestEntry.gratitude_text || latestEntry.content}"</p>
                                  ) : (
                                    <p className="text-primary font-medium">Share your first gratitude</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          </Link>
                        );
                      }

                      if (widget.type === "goals") {
                        const allGoals = goalsQuery.data || [];
                        const activeGoals = allGoals.filter((g: any) => g.status !== "completed");
                        const completedCount = allGoals.filter((g: any) => g.status === "completed")?.length || 0;
                        return (
                          <Link href="/goals" className="block h-full">
                            <div className="rounded-2xl p-4 relative cursor-pointer h-full flex flex-col border-l-4 border-l-blue-500 shadow-lg glass-card overflow-hidden">
                              <div className="gradient-animate rounded-2xl bg-gradient-to-br from-blue-500/8 to-indigo-500/6" />
                              <div className="relative z-10 flex flex-col h-full">
                                <div className="flex-shrink-0 flex items-start justify-between mb-3">
                                  <div className="p-2.5 rounded-xl bg-blue-500/15 flex-shrink-0">
                                    <Target className="h-6 w-6 text-blue-500" />
                                  </div>
                                  {activeGoals.length > 0 && (
                                    <Badge variant="secondary" className="text-xs">{activeGoals.length} active</Badge>
                                  )}
                                </div>
                                <h3 className="font-bold text-base text-foreground leading-tight mb-2">Shared Goals</h3>
                                <div className="flex-1 text-sm text-muted-foreground overflow-hidden">
                                  {activeGoals.length > 0 ? (
                                    <div className="space-y-1.5">
                                      {activeGoals.slice(0, 2).map((goal: any) => (
                                        <div key={goal.id} className="flex items-center gap-2">
                                          <div className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                                          <span className="truncate text-foreground/80">{goal.title || goal.goal_text}</span>
                                        </div>
                                      ))}
                                      {activeGoals.length > 2 && (
                                        <p className="text-xs text-muted-foreground">+{activeGoals.length - 2} more</p>
                                      )}
                                    </div>
                                  ) : completedCount > 0 ? (
                                    <p>{completedCount} goals completed</p>
                                  ) : (
                                    <p>Set your first goal together</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          </Link>
                        );
                      }

                      if (widget.type === "voice-memos") {
                        const unlistenedCount = voiceMemosQuery.data?.filter((m: any) => !m.listened_at && m.sender_id !== user?.id)?.length || 0;
                        return (
                          <div className="rounded-2xl p-4 relative cursor-pointer h-full flex flex-col border-l-4 border-l-slate-500 shadow-lg glass-card overflow-hidden">
                            <div className="gradient-animate rounded-2xl bg-gradient-to-br from-slate-500/8 to-gray-500/6" />
                            <div className="relative z-10 flex flex-col h-full">
                              <div className="flex-shrink-0 flex items-start justify-between mb-3">
                                <div className="p-2.5 rounded-xl bg-slate-500/15 flex-shrink-0">
                                  <Mic className="h-6 w-6 text-slate-500" />
                                </div>
                                {unlistenedCount > 0 && (
                                  <Badge variant="destructive" className="text-xs">{unlistenedCount} new</Badge>
                                )}
                              </div>
                              <h3 className="font-bold text-base text-foreground leading-tight mb-2">Voice Memos</h3>
                              <div className="flex-1 flex flex-col space-y-2">
                                <p className="text-sm text-muted-foreground">
                                  {unlistenedCount > 0 ? `${unlistenedCount} unplayed messages` : "Send a loving message"}
                                </p>
                                <Link href="/voice-memos" onClick={(e) => e.stopPropagation()}>
                                  <Button size="sm" className="w-full" data-testid="button-record-memo">
                                    <Mic className="h-3 w-3 mr-1" />
                                    Record
                                  </Button>
                                </Link>
                              </div>
                            </div>
                          </div>
                        );
                      }

                      if (widget.type === "calendar") {
                        const now = new Date();
                        const upcomingEvents = calendarQuery.data?.filter((e: any) => new Date(e.start_at) > now)?.sort((a: any, b: any) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime()) || [];
                        const nextEvent = upcomingEvents[0];
                        const formatEventDate = (dateStr: string) => {
                          const date = new Date(dateStr);
                          const today = new Date();
                          const tomorrow = new Date(today);
                          tomorrow.setDate(tomorrow.getDate() + 1);
                          if (date.toDateString() === today.toDateString()) return "Today";
                          if (date.toDateString() === tomorrow.toDateString()) return "Tomorrow";
                          return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
                        };
                        return (
                          <Link href="/calendar" className="block h-full">
                            <div className="rounded-2xl p-4 relative cursor-pointer h-full flex flex-col border-l-4 border-l-blue-500 shadow-lg glass-card overflow-hidden">
                              <div className="gradient-animate rounded-2xl bg-gradient-to-br from-blue-500/8 to-indigo-500/6" />
                              <div className="relative z-10 flex flex-col h-full">
                                <div className="flex-shrink-0 flex items-start justify-between mb-3">
                                  <div className="p-2.5 rounded-xl bg-blue-500/15 flex-shrink-0">
                                    <Calendar className="h-6 w-6 text-blue-500" />
                                  </div>
                                  {upcomingEvents.length > 0 && (
                                    <Badge variant="secondary" className="text-xs">{upcomingEvents.length} upcoming</Badge>
                                  )}
                                </div>
                                <h3 className="font-bold text-base text-foreground leading-tight mb-2">Shared Calendar</h3>
                                <div className="flex-1 text-sm text-muted-foreground overflow-hidden">
                                  {nextEvent ? (
                                    <div className="space-y-1">
                                      <p className="font-medium text-foreground">{nextEvent.title}</p>
                                      <p className="text-xs">{formatEventDate(nextEvent.start_at)} at {new Date(nextEvent.start_at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}</p>
                                      {upcomingEvents.length > 1 && (
                                        <p className="text-xs text-primary">+{upcomingEvents.length - 1} more event{upcomingEvents.length > 2 ? 's' : ''}</p>
                                      )}
                                    </div>
                                  ) : (
                                    <p className="text-primary font-medium">Add your first shared event</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          </Link>
                        );
                      }

                      if (widget.type === "rituals") {
                        const rituals = ritualsQuery.data || [];
                        const ritualCount = rituals.length;
                        const latestRitual = rituals[0];
                        return (
                          <Link href="/rituals" className="block h-full">
                            <div className="rounded-2xl p-4 relative cursor-pointer h-full flex flex-col border-l-4 border-l-purple-500 shadow-lg glass-card overflow-hidden">
                              <div className="gradient-animate rounded-2xl bg-gradient-to-br from-purple-500/8 to-pink-500/6" />
                              <div className="relative z-10 flex flex-col h-full">
                                <div className="flex-shrink-0 flex items-start justify-between mb-3">
                                  <div className="p-2.5 rounded-xl bg-purple-500/15 flex-shrink-0">
                                    <BookOpen className="h-6 w-6 text-purple-500" />
                                  </div>
                                  {ritualCount > 0 && (
                                    <Badge variant="secondary" className="text-xs">{ritualCount} active</Badge>
                                  )}
                                </div>
                                <h3 className="font-bold text-base text-foreground leading-tight mb-2">Rituals</h3>
                                <div className="flex-1 text-sm text-muted-foreground overflow-hidden">
                                  {latestRitual ? (
                                    <p className="line-clamp-2">{latestRitual.title || latestRitual.ritual_name}</p>
                                  ) : (
                                    <p className="text-primary font-medium">Create your first ritual</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          </Link>
                        );
                      }

                      if (widget.type === "conversations") {
                        const conversations = conversationsQuery.data || [];
                        const completedCount = conversations.filter((c: any) => c.status === "completed").length;
                        const inProgressCount = conversations.filter((c: any) => c.status === "in_progress").length;
                        return (
                          <Link href="/conversation" className="block h-full">
                            <div className="rounded-2xl p-4 relative cursor-pointer h-full flex flex-col border-l-4 border-l-emerald-500 shadow-lg glass-card overflow-hidden">
                              <div className="gradient-animate rounded-2xl bg-gradient-to-br from-emerald-500/8 to-teal-500/6" />
                              <div className="relative z-10 flex flex-col h-full">
                                <div className="flex-shrink-0 flex items-start justify-between mb-3">
                                  <div className="p-2.5 rounded-xl bg-emerald-500/15 flex-shrink-0">
                                    <Activity className="h-6 w-6 text-emerald-500" />
                                  </div>
                                  {completedCount > 0 && (
                                    <Badge variant="secondary" className="text-xs">{completedCount} done</Badge>
                                  )}
                                </div>
                                <h3 className="font-bold text-base text-foreground leading-tight mb-2">Hold Me Tight</h3>
                                <div className="flex-1 text-sm text-muted-foreground">
                                  {inProgressCount > 0 ? (
                                    <p className="text-amber-500">{inProgressCount} in progress</p>
                                  ) : completedCount > 0 ? (
                                    <p>{completedCount} conversations completed</p>
                                  ) : (
                                    <p className="text-primary font-medium">Start your first conversation</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          </Link>
                        );
                      }

                      if (widget.type === "love-map") {
                        const responses = loveMapQuery.data || [];
                        const responseCount = responses.length;
                        const totalQuestions = 20;
                        const completionPercent = Math.min(100, Math.round((responseCount / totalQuestions) * 100));
                        return (
                          <Link href="/love-map" className="block h-full">
                            <div className="rounded-2xl p-4 relative cursor-pointer h-full flex flex-col border-l-4 border-l-amber-500 shadow-lg glass-card overflow-hidden">
                              <div className="gradient-animate rounded-2xl bg-gradient-to-br from-amber-500/8 to-orange-500/6" />
                              <div className="relative z-10 flex flex-col h-full">
                                <div className="flex-shrink-0 flex items-start justify-between mb-3">
                                  <div className="p-2.5 rounded-xl bg-amber-500/15 flex-shrink-0">
                                    <Compass className="h-6 w-6 text-amber-500" />
                                  </div>
                                  {responseCount > 0 && (
                                    <Badge variant="secondary" className="text-xs">{completionPercent}%</Badge>
                                  )}
                                </div>
                                <h3 className="font-bold text-base text-foreground leading-tight mb-2">Love Map Quiz</h3>
                                <div className="flex-1 text-sm text-muted-foreground">
                                  {responseCount > 0 ? (
                                    <div className="space-y-1">
                                      <p>{responseCount} questions answered</p>
                                      {completionPercent < 100 && <p className="text-xs text-amber-500">Keep exploring</p>}
                                      {completionPercent >= 100 && <p className="text-xs text-emerald-500">Quiz complete</p>}
                                    </div>
                                  ) : (
                                    <p className="text-primary font-medium">Start the quiz</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          </Link>
                        );
                      }

                      if (widget.type === "compatibility") {
                        const hasAssessments = loveLanguages.length > 0 || (attachmentQuery.data && attachmentQuery.data.length > 0);
                        const insights = [
                          "Communication patterns",
                          "Emotional connection style",
                          "Conflict resolution approach",
                        ];
                        return (
                          <Link href="/couple-compatibility" className="block h-full">
                            <div className="rounded-2xl p-4 relative cursor-pointer h-full flex flex-col border-l-4 border-l-purple-500 shadow-lg glass-card overflow-hidden">
                              <div className="gradient-animate rounded-2xl bg-gradient-to-br from-purple-500/8 to-pink-500/6" />
                              <div className="relative z-10 flex flex-col h-full">
                                <div className="flex-shrink-0 flex items-start justify-between mb-3">
                                  <div className="p-2.5 rounded-xl bg-purple-500/15 flex-shrink-0">
                                    <Heart className="h-6 w-6 text-purple-500" />
                                  </div>
                                </div>
                                <h3 className="font-bold text-base text-foreground leading-tight mb-2">Compatibility</h3>
                                <div className="flex-1 text-sm text-muted-foreground overflow-hidden">
                                  {hasAssessments ? (
                                    <div className="space-y-1">
                                      {insights.slice(0, 2).map((insight, idx) => (
                                        <div key={idx} className="flex items-center gap-2">
                                          <div className="w-1.5 h-1.5 rounded-full bg-purple-500 flex-shrink-0" />
                                          <span className="truncate text-xs">{insight}</span>
                                        </div>
                                      ))}
                                      <p className="text-xs text-primary mt-1">View full insights</p>
                                    </div>
                                  ) : (
                                    <p className="text-primary font-medium">Complete assessments for insights</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          </Link>
                        );
                      }

                      if (widget.type === "progress") {
                        const totalCheckins = weeklyCheckinsQuery.data?.length || 0;
                        const hasGratitude = (gratitudeQuery.data?.length || 0) > 0;
                        const totalGoals = goalsQuery.data?.filter((g: any) => g.status === "completed")?.length || 0;
                        const hasAssessments = loveLanguages.length > 0 || (attachmentQuery.data && attachmentQuery.data.length > 0);
                        const milestones = [];
                        if (totalCheckins >= 1) milestones.push("First check-in done");
                        if (totalCheckins >= 4) milestones.push("4 weeks streak");
                        if (hasGratitude) milestones.push("Started gratitude practice");
                        if (totalGoals >= 1) milestones.push("Goal achieved");
                        if (hasAssessments) milestones.push("Assessments completed");
                        return (
                          <Link href="/progress-timeline" className="block h-full">
                            <div className="rounded-2xl p-4 relative cursor-pointer h-full flex flex-col border-l-4 border-l-blue-500 shadow-lg glass-card overflow-hidden">
                              <div className="gradient-animate rounded-2xl bg-gradient-to-br from-blue-500/8 to-indigo-500/6" />
                              <div className="relative z-10 flex flex-col h-full">
                                <div className="flex-shrink-0 flex items-start justify-between mb-3">
                                  <div className="p-2.5 rounded-xl bg-blue-500/15 flex-shrink-0">
                                    <Clock className="h-6 w-6 text-blue-500" />
                                  </div>
                                  {milestones.length > 0 && (
                                    <Badge variant="secondary" className="text-xs">{milestones.length} earned</Badge>
                                  )}
                                </div>
                                <h3 className="font-bold text-base text-foreground leading-tight mb-2">Progress</h3>
                                <div className="flex-1 text-sm text-muted-foreground overflow-hidden">
                                  {milestones.length > 0 ? (
                                    <div className="space-y-1">
                                      {milestones.slice(0, 2).map((milestone, idx) => (
                                        <div key={idx} className="flex items-center gap-2">
                                          <div className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                                          <span className="truncate text-xs">{milestone}</span>
                                        </div>
                                      ))}
                                      <p className="text-xs text-primary mt-1">View timeline</p>
                                    </div>
                                  ) : (
                                    <div className="space-y-1">
                                      <p>Keep going to earn milestones!</p>
                                      <p className="text-xs text-primary">View your journey</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </Link>
                        );
                      }

                      if (widget.type === "growth") {
                        const sampleExercises = [
                          "Practice active listening",
                          "Share daily appreciations",
                          "Plan quality time together",
                        ];
                        return (
                          <Link href="/growth-plan" className="block h-full">
                            <div className="rounded-2xl p-4 relative cursor-pointer h-full flex flex-col border-l-4 border-l-amber-500 shadow-lg glass-card overflow-hidden">
                              <div className="gradient-animate rounded-2xl bg-gradient-to-br from-amber-500/8 to-yellow-500/6" />
                              <div className="relative z-10 flex flex-col h-full">
                                <div className="flex-shrink-0 flex items-start justify-between mb-3">
                                  <div className="p-2.5 rounded-xl bg-amber-500/15 flex-shrink-0">
                                    <Zap className="h-6 w-6 text-amber-500" />
                                  </div>
                                </div>
                                <h3 className="font-bold text-base text-foreground leading-tight mb-2">Growth Plan</h3>
                                <div className="flex-1 text-sm text-muted-foreground overflow-hidden">
                                  <div className="space-y-1">
                                    {sampleExercises.slice(0, 2).map((exercise, idx) => (
                                      <div key={idx} className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />
                                        <span className="truncate text-xs">{exercise}</span>
                                      </div>
                                    ))}
                                    <p className="text-xs text-primary mt-1">View personalized plan</p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </Link>
                        );
                      }

                      if (widget.type === "messages") {
                        return (
                          <Link href="/messages" className="block h-full">
                            <div className="rounded-2xl p-4 relative cursor-pointer h-full flex flex-col border-l-4 border-l-blue-500 shadow-lg glass-card overflow-hidden">
                              <div className="gradient-animate rounded-2xl bg-gradient-to-br from-blue-500/8 to-indigo-500/6" />
                              <div className="relative z-10 flex flex-col h-full">
                                <div className="flex-shrink-0 flex items-start justify-between mb-3">
                                  <div className="p-2.5 rounded-xl bg-blue-500/15 flex-shrink-0">
                                    <MessageCircle className="h-6 w-6 text-blue-500" />
                                  </div>
                                </div>
                                <h3 className="font-bold text-base text-foreground leading-tight mb-2">Messages</h3>
                                <p className="flex-1 text-sm text-muted-foreground">Secure messaging with your partner</p>
                              </div>
                            </div>
                          </Link>
                        );
                      }

                      if (widget.type === "echo") {
                        return (
                          <Link href="/echo-empathy" className="block h-full">
                            <div className="rounded-2xl p-4 relative cursor-pointer h-full flex flex-col border-l-4 border-l-emerald-500 shadow-lg glass-card overflow-hidden">
                              <div className="gradient-animate rounded-2xl bg-gradient-to-br from-emerald-500/8 to-teal-500/6" />
                              <div className="relative z-10 flex flex-col h-full">
                                <div className="flex-shrink-0 flex items-start justify-between mb-3">
                                  <div className="p-2.5 rounded-xl bg-emerald-500/15 flex-shrink-0">
                                    <Users className="h-6 w-6 text-emerald-500" />
                                  </div>
                                </div>
                                <h3 className="font-bold text-base text-foreground leading-tight mb-2">Echo & Empathy</h3>
                                <p className="flex-1 text-sm text-muted-foreground">Practice active listening</p>
                              </div>
                            </div>
                          </Link>
                        );
                      }

                      if (widget.type === "pause") {
                        return (
                          <div className="rounded-2xl p-4 relative cursor-pointer h-full flex flex-col border-l-4 border-l-slate-500 shadow-lg glass-card overflow-hidden">
                            <div className="gradient-animate rounded-2xl bg-gradient-to-br from-slate-500/8 to-gray-500/6" />
                            <div className="relative z-10 flex flex-col h-full">
                              <div className="flex-shrink-0 flex items-start justify-between mb-3">
                                <div className="p-2.5 rounded-xl bg-slate-500/15 flex-shrink-0">
                                  <Pause className="h-6 w-6 text-slate-500" />
                                </div>
                              </div>
                              <h3 className="font-bold text-base text-foreground leading-tight mb-2">Pause</h3>
                              <div className="flex-1 flex flex-col space-y-2">
                                <p className="text-sm text-muted-foreground">Need a mindful break?</p>
                                <Link href="/pause" onClick={(e) => e.stopPropagation()}>
                                  <Button size="sm" variant="outline" className="w-full" data-testid="button-pause">
                                    <Pause className="h-3 w-3 mr-1" />
                                    Take a Pause
                                  </Button>
                                </Link>
                              </div>
                            </div>
                          </div>
                        );
                      }

                      if (widget.type === "journal") {
                        const journalPrompts = [
                          "What made you smile today?",
                          "What are you grateful for in your relationship?",
                          "Share a favorite memory together",
                          "What do you appreciate about your partner?",
                          "What dreams do you share?",
                        ];
                        const todayPrompt = journalPrompts[new Date().getDay() % journalPrompts.length];
                        return (
                          <div className="rounded-2xl p-4 relative cursor-pointer h-full flex flex-col border-l-4 border-l-emerald-500 shadow-lg glass-card overflow-hidden">
                            <div className="gradient-animate rounded-2xl bg-gradient-to-br from-emerald-500/8 to-teal-500/6" />
                            <div className="relative z-10 flex flex-col h-full">
                              <div className="flex-shrink-0 flex items-start justify-between mb-3">
                                <div className="p-2.5 rounded-xl bg-emerald-500/15 flex-shrink-0">
                                  <BookMarked className="h-6 w-6 text-emerald-500" />
                                </div>
                              </div>
                              <h3 className="font-bold text-base text-foreground leading-tight mb-2">Journal</h3>
                              <div className="flex-1 flex flex-col space-y-2">
                                <p className="text-sm text-muted-foreground italic">"{todayPrompt}"</p>
                                <Link href="/couple-journal" onClick={(e) => e.stopPropagation()}>
                                  <Button size="sm" variant="outline" className="w-full" data-testid="button-write-journal">
                                    <BookMarked className="h-3 w-3 mr-1" />
                                    Write Entry
                                  </Button>
                                </Link>
                              </div>
                            </div>
                          </div>
                        );
                      }

                      if (widget.type === "ifs") {
                        return (
                          <Link href="/ifs-intro" className="block h-full">
                            <div className="rounded-2xl p-4 relative cursor-pointer h-full flex flex-col border-l-4 border-l-purple-500 shadow-lg glass-card overflow-hidden">
                              <div className="gradient-animate rounded-2xl bg-gradient-to-br from-purple-500/8 to-pink-500/6" />
                              <div className="relative z-10 flex flex-col h-full">
                                <div className="flex-shrink-0 flex items-start justify-between mb-3">
                                  <div className="p-2.5 rounded-xl bg-purple-500/15 flex-shrink-0">
                                    <Brain className="h-6 w-6 text-purple-500" />
                                  </div>
                                </div>
                                <h3 className="font-bold text-base text-foreground leading-tight mb-2">IFS</h3>
                                <p className="flex-1 text-sm text-muted-foreground">Internal Family Systems work</p>
                              </div>
                            </div>
                          </Link>
                        );
                      }

                      if (widget.type === "financial") {
                        return (
                          <Link href="/financial-toolkit" className="block h-full">
                            <div className="rounded-2xl p-4 relative cursor-pointer h-full flex flex-col border-l-4 border-l-emerald-500 shadow-lg glass-card overflow-hidden">
                              <div className="gradient-animate rounded-2xl bg-gradient-to-br from-emerald-500/8 to-teal-500/6" />
                              <div className="relative z-10 flex flex-col h-full">
                                <div className="flex-shrink-0 flex items-start justify-between mb-3">
                                  <div className="p-2.5 rounded-xl bg-emerald-500/15 flex-shrink-0">
                                    <DollarSign className="h-6 w-6 text-emerald-500" />
                                  </div>
                                </div>
                                <h3 className="font-bold text-base text-foreground leading-tight mb-2">Financial</h3>
                                <p className="flex-1 text-sm text-muted-foreground">Money management tools</p>
                              </div>
                            </div>
                          </Link>
                        );
                      }

                      if (widget.type === "tips") {
                        const todayTip = dailySuggestionQuery.data;
                        const cleanTipText = todayTip?.tip_text?.replace(/\*\*/g, '') || '';
                        return (
                          <Link href="/daily-tips" className="block h-full">
                            <div className="rounded-2xl p-4 relative cursor-pointer h-full flex flex-col border-l-4 border-l-amber-500 shadow-lg glass-card overflow-hidden">
                              <div className="gradient-animate rounded-2xl bg-gradient-to-br from-amber-500/8 to-yellow-500/6" />
                              <div className="relative z-10 flex flex-col h-full">
                                <div className="flex-shrink-0 flex items-start justify-between mb-3">
                                  <div className="p-2.5 rounded-xl bg-amber-500/15 flex-shrink-0">
                                    <Lightbulb className="h-6 w-6 text-amber-500" />
                                  </div>
                                  <Badge variant="secondary" className="text-xs">Today</Badge>
                                </div>
                                <h3 className="font-bold text-base text-foreground leading-tight mb-2">Daily Tips</h3>
                                <div className="flex-1 text-sm text-muted-foreground overflow-hidden">
                                  {cleanTipText ? (
                                    <p className="line-clamp-4">{cleanTipText}</p>
                                  ) : (
                                    <p>Relationship tips for today</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          </Link>
                        );
                      }

                      return null;
                    };

                    const specialContent = widget.type ? renderSpecialWidget() : null;
                    // For CSS Grid: use grid column and row spans
                    // gridAutoFlow: dense allows smaller items to fill gaps
                    const gridStyle = {
                      gridColumn: `span ${widgetSize.cols}`,
                      gridRow: `span ${widgetSize.rows}`,
                    };

                    if (isEditMode) {
                      return (
                        <Draggable key={widget.widgetId} draggableId={widget.widgetId} index={index} isDragDisabled={resizingWidget !== null}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              style={{ ...gridStyle, ...provided.draggableProps.style }}
                              className={cn(
                                "relative group",
                                snapshot.isDragging && "z-50 opacity-90"
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
                      <div key={widget.widgetId} style={gridStyle} className="h-full">
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

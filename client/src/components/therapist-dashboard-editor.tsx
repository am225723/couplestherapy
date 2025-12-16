import { useState, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
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
  Calendar,
  TrendingUp,
  BookOpen,
  Activity,
  Compass,
  Lightbulb,
  Users,
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
  GripVertical,
  Maximize2,
  Minimize2,
  Eye,
  EyeOff,
  ArrowRight,
  Settings2,
  CheckCircle2,
} from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { LuxuryWidget } from "@/components/luxury-widget";
import { supabase } from "@/lib/supabase";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const invokeDashboardCustomization = async (coupleId: string, method: string, body?: any) => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const session = await supabase.auth.getSession();
  const token = session.data.session?.access_token;
  
  const url = `${supabaseUrl}/functions/v1/dashboard-customization?couple_id=${coupleId}`;
  
  const response = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to update dashboard");
  }
  
  return response.json();
};

interface TherapistDashboardEditorProps {
  coupleId: string;
  coupleName?: string;
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
  "therapist-card": "accent",
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
  "daily-suggestion": "success",
  "ai-suggestions": "warning",
  "date-night": "success",
  "checkin-history": "primary",
  "love-results": "accent",
};

type WidgetSize = { cols: 1 | 2 | 3; rows: 1 | 2 };
type WidgetType = "standard" | "therapist" | "suggestion" | "ai" | "love-results";

const SIZE_OPTIONS: Array<{ cols: 1 | 2 | 3; rows: 1 | 2; label: string }> = [
  { cols: 1, rows: 1, label: "1×1" },
  { cols: 1, rows: 2, label: "1×2" },
  { cols: 2, rows: 1, label: "2×1" },
  { cols: 2, rows: 2, label: "2×2" },
  { cols: 3, rows: 1, label: "3×1" },
  { cols: 3, rows: 2, label: "3×2" },
];

export function TherapistDashboardEditor({ coupleId, coupleName }: TherapistDashboardEditorProps) {
  const { toast } = useToast();
  const [localWidgetOrder, setLocalWidgetOrder] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const customizationQuery = useQuery<{
    widget_order: string[];
    enabled_widgets: Record<string, boolean>;
    widget_sizes?: Record<string, WidgetSize>;
  }>({
    queryKey: [`/api/dashboard-customization/couple/${coupleId}`],
    queryFn: async () => invokeDashboardCustomization(coupleId, "GET"),
    enabled: !!coupleId,
  });

  const therapistThoughtsQuery = useQuery<any[]>({
    queryKey: [`/api/therapist-thoughts/couple/${coupleId}`],
    enabled: !!coupleId,
    staleTime: 1000 * 60 * 5,
  });

  const dailyTipsQuery = useQuery<any>({
    queryKey: [`/api/daily-tips/couple/${coupleId}/today`],
    enabled: !!coupleId,
    staleTime: 1000 * 60 * 60,
  });

  const [loveLanguages, setLoveLanguages] = useState<any[]>([]);

  useEffect(() => {
    if (coupleId) {
      const fetchLoveLanguages = async () => {
        try {
          const { data: coupleData } = await supabase
            .from("Couples_couples")
            .select("partner1_id, partner2_id")
            .eq("id", coupleId)
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
        }
      };
      fetchLoveLanguages();
    }
  }, [coupleId]);

  useEffect(() => {
    if (customizationQuery.data?.widget_order) {
      setLocalWidgetOrder(customizationQuery.data.widget_order);
    }
  }, [customizationQuery.data?.widget_order]);

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
    return normalizeWidgetSize(raw);
  };

  const isWidgetEnabled = (widgetId: string): boolean => {
    const customization = customizationQuery.data;
    if (!customization?.enabled_widgets) return true;
    return customization.enabled_widgets[widgetId] !== false;
  };

  const toggleWidget = useCallback(async (widgetId: string) => {
    const currentEnabled = isWidgetEnabled(widgetId);
    const newEnabled = { ...customizationQuery.data?.enabled_widgets, [widgetId]: !currentEnabled };
    
    setIsSaving(true);
    try {
      await invokeDashboardCustomization(coupleId, "PATCH", {
        enabled_widgets: newEnabled,
      });
      queryClient.invalidateQueries({ queryKey: [`/api/dashboard-customization/couple/${coupleId}`] });
      toast({ 
        title: currentEnabled ? "Widget hidden" : "Widget shown", 
        description: `Widget visibility updated` 
      });
    } catch (error) {
      toast({ title: "Error", description: "Failed to update widget visibility", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  }, [customizationQuery.data, coupleId, toast]);

  const updateWidgetSize = async (widgetId: string, cols: 1 | 2 | 3, rows: 1 | 2) => {
    const currentSizes = customizationQuery.data?.widget_sizes || {};
    const newSizes = { ...currentSizes, [widgetId]: { cols, rows } };

    setIsSaving(true);
    try {
      await invokeDashboardCustomization(coupleId, "PATCH", {
        widget_sizes: newSizes,
      });
      queryClient.invalidateQueries({ queryKey: [`/api/dashboard-customization/couple/${coupleId}`] });
      toast({ title: "Widget resized", description: `Layout updated` });
    } catch (error) {
      toast({ title: "Error", description: "Failed to resize widget", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDragEnd = useCallback(async (result: DropResult) => {
    if (!result.destination) return;
    const items = Array.from(localWidgetOrder.length > 0 ? localWidgetOrder : allWidgets.map(a => a.widgetId));
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    setLocalWidgetOrder(items);

    setIsSaving(true);
    try {
      await invokeDashboardCustomization(coupleId, "PATCH", {
        widget_order: items,
      });
      queryClient.invalidateQueries({ queryKey: [`/api/dashboard-customization/couple/${coupleId}`] });
      toast({ title: "Order saved", description: `Widget order updated` });
    } catch (error) {
      toast({ title: "Error", description: "Failed to save order", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  }, [localWidgetOrder, allWidgets, coupleId, toast]);

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

  const hiddenWidgets = allWidgets.filter((w) => !isWidgetEnabled(w.widgetId));

  const renderSpecialWidget = (widget: typeof allWidgets[0]) => {
    if (widget.type === "therapist") {
      const hasData = therapistThoughtsQuery.isSuccess && therapistThoughtsQuery.data?.length > 0;
      return (
        <Card className="glass-card border-none overflow-hidden h-full" data-testid="card-therapist-preview">
          <div className="gradient-animate" />
          <CardHeader className="relative z-10 pb-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <MessageCircle className="h-4 w-4 text-primary" />
                From Your Therapist
              </CardTitle>
              <Button variant="ghost" size="sm" className="text-xs h-7" disabled>
                View <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
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
      const hasData = dailyTipsQuery.isSuccess && dailyTipsQuery.data?.tip_text;
      return (
        <Card className="glass-card border-none overflow-hidden h-full luxury-widget" data-testid="card-suggestion-preview">
          <div className="gradient-animate bg-gradient-to-br from-emerald-500/10 to-teal-500/8" />
          <CardHeader className="relative z-10 pb-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-emerald-500" />
                Today's Tip
              </CardTitle>
              {hasData && dailyTipsQuery.data.category && (
                <Badge variant="secondary" className="text-xs capitalize">
                  {dailyTipsQuery.data.category}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            {dailyTipsQuery.isLoading ? (
              <div className="animate-pulse space-y-2">
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </div>
            ) : hasData ? (
              <p className="text-sm line-clamp-3">{dailyTipsQuery.data.tip_text}</p>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-2">Check back tomorrow</p>
            )}
          </CardContent>
        </Card>
      );
    }

    if (widget.type === "ai") {
      return (
        <Card className="glass-card border-none overflow-hidden h-full" data-testid="card-ai-preview">
          <div className="gradient-animate bg-gradient-to-br from-amber-500/10 to-orange-500/8" />
          <CardHeader className="relative z-10 pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-500" />
              Suggested For You
            </CardTitle>
          </CardHeader>
          <CardContent className="relative z-10 space-y-2">
            <div className="p-2 rounded-lg bg-background/60 backdrop-blur-sm border border-border/30">
              <p className="font-medium text-xs">AI Recommendations</p>
              <p className="text-xs text-muted-foreground line-clamp-1">Based on couple's activity</p>
            </div>
          </CardContent>
        </Card>
      );
    }

    if (widget.type === "love-results") {
      const hasData = loveLanguages.length > 0;
      return (
        <Card className="glass-card border-none overflow-hidden h-full luxury-widget" data-testid="card-love-preview">
          <div className="gradient-animate bg-gradient-to-br from-rose-500/8 to-pink-500/6" />
          <CardHeader className="relative z-10 pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Heart className="h-4 w-4 text-rose-500" />
              Your Love Languages
            </CardTitle>
          </CardHeader>
          <CardContent className="relative z-10">
            {hasData ? (
              <div className="grid grid-cols-2 gap-2">
                {loveLanguages.slice(0, 2).map((lang, idx) => (
                  <div key={lang.id || idx} className="p-2 rounded-lg bg-background/60 backdrop-blur-sm border border-border/30">
                    <p className="text-xs font-medium">Partner {idx + 1}</p>
                    <p className="text-xs text-muted-foreground">{lang.primary_language}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-2">No love language data yet</p>
            )}
          </CardContent>
        </Card>
      );
    }

    return null;
  };

  if (customizationQuery.isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between p-3 rounded-xl bg-primary/10 border border-primary/20 flex-wrap gap-2">
        <div className="flex items-center gap-2 text-primary">
          <Settings2 className="h-4 w-4" />
          <span className="text-sm font-medium">
            Editing Dashboard for {coupleName || "Couple"}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="secondary" className="gap-1">
            <GripVertical className="h-3 w-3" />
            Drag to reorder
          </Badge>
          <Badge variant="secondary" className="gap-1">
            <Maximize2 className="h-3 w-3" />
            Click to resize
          </Badge>
          <Badge variant="secondary" className="gap-1">
            <EyeOff className="h-3 w-3" />
            Toggle visibility
          </Badge>
          {isSaving && (
            <Badge variant="outline" className="gap-1">
              Saving...
            </Badge>
          )}
        </div>
      </div>

      <div className="bg-gradient-to-br from-background via-background to-primary/5 p-4 rounded-xl border">
        <p className="text-xs text-muted-foreground mb-4">
          This is exactly how the client sees their dashboard. Drag widgets to reorder, use buttons to resize or hide.
        </p>

        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="therapist-widgets" direction="vertical">
            {(provided) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className="grid grid-cols-3 gap-3"
              >
                {orderedWidgets.map((widget, index) => {
                  const Icon = widget.icon;
                  const variant = widgetVariants[widget.widgetId] || "default";
                  const widgetSize = getWidgetSize(widget.widgetId);
                  const colSpanClass = widgetSize.cols === 3 ? "col-span-3" : widgetSize.cols === 2 ? "col-span-2" : "";
                  const rowSpanClass = widgetSize.rows === 2 ? "row-span-2" : "";

                  const specialContent = widget.type ? renderSpecialWidget(widget) : null;

                  return (
                    <Draggable
                      key={widget.widgetId}
                      draggableId={widget.widgetId}
                      index={index}
                    >
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={cn(
                            colSpanClass,
                            rowSpanClass,
                            "relative group transition-all duration-200",
                            snapshot.isDragging && "z-50 scale-[1.02] shadow-xl"
                          )}
                        >
                          <div
                            {...provided.dragHandleProps}
                            className="absolute top-2 left-2 z-20 p-1.5 rounded-lg bg-background/80 backdrop-blur-sm border shadow-sm opacity-0 group-hover:opacity-100 transition-opacity cursor-grab"
                          >
                            <GripVertical className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div className="absolute top-2 right-2 z-20 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
                              className="h-7 w-7 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center hover:bg-destructive/20 transition-colors shadow-sm"
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
                              data-testid={`widget-${widget.widgetId}`}
                            />
                          )}
                        </div>
                      )}
                    </Draggable>
                  );
                })}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>

        {hiddenWidgets.length > 0 && (
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
        )}
      </div>
    </div>
  );
}

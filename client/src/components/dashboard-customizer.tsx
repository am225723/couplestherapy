import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  GripVertical,
  Save,
  Heart,
  MessageSquare,
  Map,
  Mic,
  Coffee,
  AlertTriangle,
  MessageCircle,
  Lightbulb,
  BarChart3,
  Calendar,
  Compass,
  Baby,
  Target,
  Activity,
  BookOpen,
  TrendingUp,
  Eye,
  Settings2,
  Sparkles,
  History,
  Pencil,
  Link2,
  Users,
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
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import type { WidgetContentOverrides } from "@shared/schema";

interface DashboardCustomizerProps {
  coupleId: string;
  therapistId: string;
  initialOrder: string[];
  initialEnabled: Record<string, boolean>;
  initialSizes?: Record<string, "small" | "medium" | "large">;
  initialContentOverrides?: WidgetContentOverrides;
}

const ALL_WIDGETS = [
  "date-night",
  "checkin-history",
  "ai-suggestions",
  "weekly-checkin",
  "love-languages",
  "gratitude",
  "shared-goals",
  "conversations",
  "love-map",
  "voice-memos",
  "calendar",
  "rituals",
  "four-horsemen",
  "demon-dialogues",
  "meditation",
  "intimacy",
  "values",
  "parenting",
  "therapist-thoughts",
  "compatibility",
  "progress-timeline",
  "growth-plan",
  "attachment",
  "enneagram",
  "messages",
  "echo-empathy",
  "conflict",
  "pause",
  "journal",
  "mood",
  "ifs",
  "chores",
  "todos",
  "financial",
  "daily-tips",
];

const WIDGET_CONFIG: Record<
  string,
  {
    label: string;
    icon: any;
    color: string;
    bgColor: string;
    description: string;
  }
> = {
  "date-night": {
    label: "Date Night Generator",
    icon: Sparkles,
    color: "text-primary",
    bgColor: "bg-primary/10",
    description: "AI-powered date night planning",
  },
  "checkin-history": {
    label: "Check-In History",
    icon: History,
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-100 dark:bg-blue-900/30",
    description: "Review weekly check-in timeline",
  },
  "ai-suggestions": {
    label: "AI Suggestions",
    icon: Sparkles,
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-100 dark:bg-amber-900/30",
    description: "Personalized activity recommendations",
  },
  "weekly-checkin": {
    label: "Weekly Check-in",
    icon: TrendingUp,
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-100 dark:bg-blue-900/30",
    description: "Track emotional connection weekly",
  },
  "love-languages": {
    label: "Love Languages",
    icon: Heart,
    color: "text-red-600 dark:text-red-400",
    bgColor: "bg-red-100 dark:bg-red-900/30",
    description: "Show love language preferences",
  },
  gratitude: {
    label: "Gratitude Log",
    icon: Lightbulb,
    color: "text-yellow-600 dark:text-yellow-400",
    bgColor: "bg-yellow-100 dark:bg-yellow-900/30",
    description: "Daily gratitude exchanges",
  },
  "shared-goals": {
    label: "Shared Goals",
    icon: Target,
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-100 dark:bg-green-900/30",
    description: "Track couple goals progress",
  },
  conversations: {
    label: "Hold Me Tight",
    icon: MessageSquare,
    color: "text-purple-600 dark:text-purple-400",
    bgColor: "bg-purple-100 dark:bg-purple-900/30",
    description: "EFT conversation tracking",
  },
  "love-map": {
    label: "Love Map Quiz",
    icon: Map,
    color: "text-pink-600 dark:text-pink-400",
    bgColor: "bg-pink-100 dark:bg-pink-900/30",
    description: "Partner knowledge insights",
  },
  "voice-memos": {
    label: "Voice Memos",
    icon: Mic,
    color: "text-orange-600 dark:text-orange-400",
    bgColor: "bg-orange-100 dark:bg-orange-900/30",
    description: "Audio messages between partners",
  },
  calendar: {
    label: "Shared Calendar",
    icon: Calendar,
    color: "text-teal-600 dark:text-teal-400",
    bgColor: "bg-teal-100 dark:bg-teal-900/30",
    description: "Important dates together",
  },
  rituals: {
    label: "Rituals of Connection",
    icon: Coffee,
    color: "text-indigo-600 dark:text-indigo-400",
    bgColor: "bg-indigo-100 dark:bg-indigo-900/30",
    description: "Daily connection moments",
  },
  "four-horsemen": {
    label: "Four Horsemen",
    icon: AlertTriangle,
    color: "text-red-700 dark:text-red-300",
    bgColor: "bg-red-50 dark:bg-red-950/30",
    description: "Identify conflict patterns",
  },
  "demon-dialogues": {
    label: "Demon Dialogues",
    icon: MessageCircle,
    color: "text-rose-600 dark:text-rose-400",
    bgColor: "bg-rose-100 dark:bg-rose-900/30",
    description: "Break negative cycles",
  },
  meditation: {
    label: "Meditation Library",
    icon: BookOpen,
    color: "text-cyan-600 dark:text-cyan-400",
    bgColor: "bg-cyan-100 dark:bg-cyan-900/30",
    description: "Guided meditations",
  },
  intimacy: {
    label: "Intimacy Mapping",
    icon: Activity,
    color: "text-pink-600 dark:text-pink-400",
    bgColor: "bg-pink-100 dark:bg-pink-900/30",
    description: "Five dimensions of intimacy",
  },
  values: {
    label: "Values & Vision",
    icon: Compass,
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-100 dark:bg-amber-900/30",
    description: "Shared dreams and goals",
  },
  parenting: {
    label: "Parenting Partners",
    icon: Baby,
    color: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-100 dark:bg-emerald-900/30",
    description: "Co-parenting alignment",
  },
  "therapist-thoughts": {
    label: "Therapist Thoughts",
    icon: MessageSquare,
    color: "text-violet-600 dark:text-violet-400",
    bgColor: "bg-violet-100 dark:bg-violet-900/30",
    description: "Messages and to-dos from your therapist",
  },
  compatibility: {
    label: "Couples Compatibility",
    icon: Heart,
    color: "text-rose-600 dark:text-rose-400",
    bgColor: "bg-rose-100 dark:bg-rose-900/30",
    description: "View your compatibility insights",
  },
  "progress-timeline": {
    label: "Progress Timeline",
    icon: Clock,
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-100 dark:bg-blue-900/30",
    description: "Your relationship journey milestones",
  },
  "growth-plan": {
    label: "Growth Plan",
    icon: Zap,
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-100 dark:bg-amber-900/30",
    description: "AI-powered personalized growth exercises",
  },
  attachment: {
    label: "Attachment Style",
    icon: Link2,
    color: "text-indigo-600 dark:text-indigo-400",
    bgColor: "bg-indigo-100 dark:bg-indigo-900/30",
    description: "Understand your attachment patterns",
  },
  enneagram: {
    label: "Enneagram",
    icon: Compass,
    color: "text-purple-600 dark:text-purple-400",
    bgColor: "bg-purple-100 dark:bg-purple-900/30",
    description: "Personality type insights",
  },
  messages: {
    label: "Messages",
    icon: MessageCircle,
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-100 dark:bg-blue-900/30",
    description: "Secure couple messaging",
  },
  "echo-empathy": {
    label: "Echo & Empathy",
    icon: Users,
    color: "text-teal-600 dark:text-teal-400",
    bgColor: "bg-teal-100 dark:bg-teal-900/30",
    description: "Practice active listening",
  },
  conflict: {
    label: "Conflict Resolution",
    icon: Scale,
    color: "text-orange-600 dark:text-orange-400",
    bgColor: "bg-orange-100 dark:bg-orange-900/30",
    description: "I-Statement builder and resolution tools",
  },
  pause: {
    label: "Pause Button",
    icon: Pause,
    color: "text-red-600 dark:text-red-400",
    bgColor: "bg-red-100 dark:bg-red-900/30",
    description: "Take a break during conflicts",
  },
  journal: {
    label: "Couple Journal",
    icon: BookMarked,
    color: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-100 dark:bg-emerald-900/30",
    description: "Shared journaling space",
  },
  mood: {
    label: "Mood Tracker",
    icon: Smile,
    color: "text-yellow-600 dark:text-yellow-400",
    bgColor: "bg-yellow-100 dark:bg-yellow-900/30",
    description: "Track emotional wellbeing",
  },
  ifs: {
    label: "IFS Exercises",
    icon: Brain,
    color: "text-purple-600 dark:text-purple-400",
    bgColor: "bg-purple-100 dark:bg-purple-900/30",
    description: "Internal Family Systems practice",
  },
  chores: {
    label: "Chore Chart",
    icon: CheckSquare,
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-100 dark:bg-green-900/30",
    description: "Household task management",
  },
  todos: {
    label: "Shared To-Do List",
    icon: ListTodo,
    color: "text-slate-600 dark:text-slate-400",
    bgColor: "bg-slate-100 dark:bg-slate-900/30",
    description: "Collaborative task tracking",
  },
  financial: {
    label: "Financial Toolkit",
    icon: DollarSign,
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-100 dark:bg-green-900/30",
    description: "Money management tools",
  },
  "daily-tips": {
    label: "Daily Tips",
    icon: Lightbulb,
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-100 dark:bg-amber-900/30",
    description: "Personalized relationship tips",
  },
};

const SIZE_DIMENSIONS = {
  small: { cols: 1, label: "S", description: "1 column" },
  medium: { cols: 2, label: "M", description: "2 columns" },
  large: { cols: 3, label: "L", description: "3 columns" },
};

const WIDGET_GRADIENTS: Record<string, string> = {
  "date-night": "from-pink-500/15 to-rose-500/10 dark:from-pink-500/22 dark:to-rose-500/15",
  "checkin-history": "from-blue-500/15 to-indigo-500/10 dark:from-blue-500/22 dark:to-indigo-500/15",
  "ai-suggestions": "from-amber-500/15 to-orange-500/10 dark:from-amber-500/22 dark:to-orange-500/15",
  "weekly-checkin": "from-blue-500/15 to-sky-500/10 dark:from-blue-500/22 dark:to-sky-500/15",
  "love-languages": "from-red-500/15 to-rose-500/10 dark:from-red-500/22 dark:to-rose-500/15",
  gratitude: "from-yellow-500/15 to-amber-500/10 dark:from-yellow-500/22 dark:to-amber-500/15",
  "shared-goals": "from-green-500/15 to-emerald-500/10 dark:from-green-500/22 dark:to-emerald-500/15",
  conversations: "from-purple-500/15 to-violet-500/10 dark:from-purple-500/22 dark:to-violet-500/15",
  "love-map": "from-pink-500/15 to-fuchsia-500/10 dark:from-pink-500/22 dark:to-fuchsia-500/15",
  "voice-memos": "from-orange-500/15 to-red-500/10 dark:from-orange-500/22 dark:to-red-500/15",
  calendar: "from-teal-500/15 to-cyan-500/10 dark:from-teal-500/22 dark:to-cyan-500/15",
  rituals: "from-indigo-500/15 to-purple-500/10 dark:from-indigo-500/22 dark:to-purple-500/15",
  "four-horsemen": "from-red-600/15 to-rose-600/10 dark:from-red-600/22 dark:to-rose-600/15",
  "demon-dialogues": "from-rose-500/15 to-pink-500/10 dark:from-rose-500/22 dark:to-pink-500/15",
  meditation: "from-cyan-500/15 to-teal-500/10 dark:from-cyan-500/22 dark:to-teal-500/15",
  intimacy: "from-pink-500/15 to-rose-500/10 dark:from-pink-500/22 dark:to-rose-500/15",
  values: "from-amber-500/15 to-yellow-500/10 dark:from-amber-500/22 dark:to-yellow-500/15",
  parenting: "from-emerald-500/15 to-green-500/10 dark:from-emerald-500/22 dark:to-green-500/15",
  "therapist-thoughts": "from-violet-500/15 to-purple-500/10 dark:from-violet-500/22 dark:to-purple-500/15",
  compatibility: "from-rose-500/15 to-pink-500/10 dark:from-rose-500/22 dark:to-pink-500/15",
  "progress-timeline": "from-blue-500/15 to-indigo-500/10 dark:from-blue-500/22 dark:to-indigo-500/15",
  "growth-plan": "from-amber-500/15 to-orange-500/10 dark:from-amber-500/22 dark:to-orange-500/15",
  attachment: "from-indigo-500/15 to-blue-500/10 dark:from-indigo-500/22 dark:to-blue-500/15",
  enneagram: "from-purple-500/15 to-violet-500/10 dark:from-purple-500/22 dark:to-violet-500/15",
  messages: "from-blue-500/15 to-cyan-500/10 dark:from-blue-500/22 dark:to-cyan-500/15",
  "echo-empathy": "from-teal-500/15 to-emerald-500/10 dark:from-teal-500/22 dark:to-emerald-500/15",
  conflict: "from-orange-500/15 to-amber-500/10 dark:from-orange-500/22 dark:to-amber-500/15",
  pause: "from-red-500/15 to-rose-500/10 dark:from-red-500/22 dark:to-rose-500/15",
  journal: "from-emerald-500/15 to-teal-500/10 dark:from-emerald-500/22 dark:to-teal-500/15",
  mood: "from-yellow-500/15 to-orange-500/10 dark:from-yellow-500/22 dark:to-orange-500/15",
  ifs: "from-purple-500/15 to-indigo-500/10 dark:from-purple-500/22 dark:to-indigo-500/15",
  chores: "from-green-500/15 to-lime-500/10 dark:from-green-500/22 dark:to-lime-500/15",
  todos: "from-slate-500/15 to-gray-500/10 dark:from-slate-500/22 dark:to-gray-500/15",
  financial: "from-green-500/15 to-emerald-500/10 dark:from-green-500/22 dark:to-emerald-500/15",
  "daily-tips": "from-amber-500/15 to-yellow-500/10 dark:from-amber-500/22 dark:to-yellow-500/15",
};

const WIDGET_BORDER_COLORS: Record<string, string> = {
  "date-night": "border-l-pink-500",
  "checkin-history": "border-l-blue-500",
  "ai-suggestions": "border-l-amber-500",
  "weekly-checkin": "border-l-blue-500",
  "love-languages": "border-l-red-500",
  gratitude: "border-l-yellow-500",
  "shared-goals": "border-l-green-500",
  conversations: "border-l-purple-500",
  "love-map": "border-l-pink-500",
  "voice-memos": "border-l-orange-500",
  calendar: "border-l-teal-500",
  rituals: "border-l-indigo-500",
  "four-horsemen": "border-l-red-600",
  "demon-dialogues": "border-l-rose-500",
  meditation: "border-l-cyan-500",
  intimacy: "border-l-pink-500",
  values: "border-l-amber-500",
  parenting: "border-l-emerald-500",
  "therapist-thoughts": "border-l-violet-500",
  compatibility: "border-l-rose-500",
  "progress-timeline": "border-l-blue-500",
  "growth-plan": "border-l-amber-500",
  attachment: "border-l-indigo-500",
  enneagram: "border-l-purple-500",
  messages: "border-l-blue-500",
  "echo-empathy": "border-l-teal-500",
  conflict: "border-l-orange-500",
  pause: "border-l-red-500",
  journal: "border-l-emerald-500",
  mood: "border-l-yellow-500",
  ifs: "border-l-purple-500",
  chores: "border-l-green-500",
  todos: "border-l-slate-500",
  financial: "border-l-green-500",
  "daily-tips": "border-l-amber-500",
};

function WidgetPreviewCard({
  widgetId,
  size,
  enabled,
  onToggle,
  onSizeChange,
}: {
  widgetId: string;
  size: "small" | "medium" | "large";
  enabled: boolean;
  onToggle: () => void;
  onSizeChange: (size: "small" | "medium" | "large") => void;
}) {
  const config = WIDGET_CONFIG[widgetId];
  if (!config) return null;

  const Icon = config.icon;
  const sizeClass = {
    small: "col-span-1",
    medium: "col-span-2",
    large: "col-span-3",
  }[size];

  const heightClass = {
    small: "h-28",
    medium: "h-32",
    large: "h-36",
  }[size];

  const gradientClass = WIDGET_GRADIENTS[widgetId] || "from-primary/15 to-primary/10";
  const borderClass = WIDGET_BORDER_COLORS[widgetId] || "border-l-primary";

  return (
    <div
      className={cn(
        sizeClass,
        "transition-all duration-200",
        !enabled && "opacity-40",
      )}
    >
      <div
        className={cn(
          "glass-card h-full relative group overflow-hidden rounded-xl border-l-4",
          heightClass,
          borderClass,
          enabled ? "" : "border-dashed opacity-60",
        )}
      >
        <div className={cn("gradient-animate bg-gradient-to-br", gradientClass)} />
        
        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
          <Button
            size="icon"
            variant={size === "small" ? "default" : "outline"}
            className="h-6 w-6"
            onClick={() => onSizeChange("small")}
            data-testid={`button-size-small-${widgetId}`}
          >
            <span className="text-xs">S</span>
          </Button>
          <Button
            size="icon"
            variant={size === "medium" ? "default" : "outline"}
            className="h-6 w-6"
            onClick={() => onSizeChange("medium")}
            data-testid={`button-size-medium-${widgetId}`}
          >
            <span className="text-xs">M</span>
          </Button>
          <Button
            size="icon"
            variant={size === "large" ? "default" : "outline"}
            className="h-6 w-6"
            onClick={() => onSizeChange("large")}
            data-testid={`button-size-large-${widgetId}`}
          >
            <span className="text-xs">L</span>
          </Button>
        </div>

        <div className="relative z-10 p-3">
          <div className="flex items-start gap-3">
            <Checkbox
              checked={enabled}
              onCheckedChange={onToggle}
              className="h-4 w-4 mt-1"
              data-testid={`checkbox-enable-${widgetId}`}
            />
            <div className={cn("p-2.5 rounded-xl", config.bgColor)}>
              <Icon className={cn("w-5 h-5", config.color)} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-sm truncate">{config.label}</h3>
              <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                {config.description}
              </p>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 bg-background/60">
              {SIZE_DIMENSIONS[size].description}
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
}

function WidgetListItem({
  widgetId,
  size,
  enabled,
  onToggle,
  onSizeChange,
  onDragStart,
  onDragOver,
  onDrop,
}: {
  widgetId: string;
  size: "small" | "medium" | "large";
  enabled: boolean;
  onToggle: () => void;
  onSizeChange: (size: "small" | "medium" | "large") => void;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: () => void;
}) {
  const config = WIDGET_CONFIG[widgetId];
  if (!config) return null;

  const Icon = config.icon;

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg border cursor-move hover:border-primary/50 transition",
        !enabled && "opacity-50 bg-muted/50",
      )}
    >
      <GripVertical className="w-4 h-4 text-muted-foreground flex-shrink-0" />
      <Checkbox
        checked={enabled}
        onCheckedChange={onToggle}
        data-testid={`list-checkbox-${widgetId}`}
      />
      <div className={cn("p-2 rounded-md", config.bgColor)}>
        <Icon className={cn("w-4 h-4", config.color)} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{config.label}</p>
        <p className="text-xs text-muted-foreground truncate">
          {config.description}
        </p>
      </div>
      <div className="flex gap-1">
        {(["small", "medium", "large"] as const).map((s) => (
          <Button
            key={s}
            size="sm"
            variant={size === s ? "default" : "outline"}
            className="h-7 w-7 p-0"
            onClick={() => onSizeChange(s)}
            data-testid={`list-size-${s}-${widgetId}`}
          >
            {SIZE_DIMENSIONS[s].label}
          </Button>
        ))}
      </div>
    </div>
  );
}

export function DashboardCustomizer({
  coupleId,
  therapistId,
  initialOrder,
  initialEnabled,
  initialSizes = {},
  initialContentOverrides = {},
}: DashboardCustomizerProps) {
  const fullOrder = Array.from(new Set([...initialOrder, ...ALL_WIDGETS]));

  const [order, setOrder] = useState<string[]>(fullOrder);
  const [enabled, setEnabled] = useState<Record<string, boolean>>(() => {
    const defaults: Record<string, boolean> = {};
    ALL_WIDGETS.forEach((w) => {
      defaults[w] = initialEnabled[w] ?? true;
    });
    return defaults;
  });
  const [sizes, setSizes] = useState<
    Record<string, "small" | "medium" | "large">
  >(() => {
    const defaults: Record<string, "small" | "medium" | "large"> = {};
    ALL_WIDGETS.forEach((w) => {
      defaults[w] = initialSizes[w] || "medium";
    });
    return defaults;
  });
  const [contentOverrides, setContentOverrides] = useState<WidgetContentOverrides>(() => {
    return {
      "therapist-thoughts": {
        title: initialContentOverrides["therapist-thoughts"]?.title || "",
        description: initialContentOverrides["therapist-thoughts"]?.description || "",
        showMessages: initialContentOverrides["therapist-thoughts"]?.showMessages !== false,
        showTodos: initialContentOverrides["therapist-thoughts"]?.showTodos !== false,
        showResources: initialContentOverrides["therapist-thoughts"]?.showResources !== false,
      },
      ...initialContentOverrides,
    };
  });
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const { toast } = useToast();

  const updateContentOverride = (widgetId: string, field: string, value: any) => {
    setContentOverrides((prev) => ({
      ...prev,
      [widgetId]: {
        ...prev[widgetId],
        [field]: value,
      },
    }));
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(
        "POST",
        `/api/dashboard-customization/couple/${coupleId}`,
        {
          therapist_id: therapistId,
          widget_order: order,
          enabled_widgets: enabled,
          widget_sizes: sizes,
          widget_content_overrides: contentOverrides,
        },
      );
    },
    onSuccess: () => {
      toast({ title: "Saved", description: "Dashboard customization updated" });
      queryClient.invalidateQueries({
        queryKey: [`/api/dashboard-customization/couple/${coupleId}`],
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to save customization",
        variant: "destructive",
      });
    },
  });

  const handleDragStart = (widget: string) => {
    setDraggedItem(widget);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (targetWidget: string) => {
    if (!draggedItem || draggedItem === targetWidget) return;
    const newOrder = [...order];
    const draggedIndex = newOrder.indexOf(draggedItem);
    const targetIndex = newOrder.indexOf(targetWidget);
    newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetIndex, 0, draggedItem);
    setOrder(newOrder);
    setDraggedItem(null);
  };

  const toggleEnabled = (widget: string) => {
    setEnabled((prev) => ({ ...prev, [widget]: !prev[widget] }));
  };

  const setSize = (widget: string, size: "small" | "medium" | "large") => {
    setSizes((prev) => ({ ...prev, [widget]: size }));
  };

  const enabledWidgets = order.filter((w) => enabled[w]);
  const disabledWidgets = order.filter((w) => !enabled[w]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Dashboard Customizer</h2>
          <p className="text-muted-foreground">
            Configure which widgets appear on your client's dashboard and their
            sizes
          </p>
        </div>
        <Button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="gap-2"
          data-testid="button-save-customization"
        >
          <Save className="w-4 h-4" />
          {saveMutation.isPending ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      <Tabs defaultValue="preview" className="w-full">
        <TabsList className="mb-4 flex-wrap">
          <TabsTrigger value="preview" className="gap-2">
            <Eye className="h-4 w-4" />
            Visual Preview
          </TabsTrigger>
          <TabsTrigger value="list" className="gap-2">
            <Settings2 className="h-4 w-4" />
            List View
          </TabsTrigger>
          <TabsTrigger value="content" className="gap-2">
            <Pencil className="h-4 w-4" />
            Card Content
          </TabsTrigger>
        </TabsList>

        <TabsContent value="preview" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Client Dashboard Preview
              </CardTitle>
              <CardDescription>
                This shows how widgets will appear on the client's dashboard.
                Hover over widgets to adjust size.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg p-4 bg-muted/30">
                <div 
                  className="grid gap-3"
                  style={{ 
                    gridTemplateColumns: "repeat(auto-fit, minmax(min(160px, 100%), 1fr))",
                    gridAutoRows: "200px",
                    gridAutoFlow: "dense"
                  }}
                >
                  {enabledWidgets.map((widgetId) => (
                    <WidgetPreviewCard
                      key={widgetId}
                      widgetId={widgetId}
                      size={sizes[widgetId] || "medium"}
                      enabled={enabled[widgetId]}
                      onToggle={() => toggleEnabled(widgetId)}
                      onSizeChange={(s) => setSize(widgetId, s)}
                    />
                  ))}
                </div>
                {enabledWidgets.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No widgets enabled. Enable widgets from the list view.
                  </div>
                )}
              </div>

              {disabledWidgets.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-medium text-muted-foreground mb-2">
                    Hidden Widgets ({disabledWidgets.length})
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {disabledWidgets.map((widgetId) => {
                      const config = WIDGET_CONFIG[widgetId];
                      const Icon = config?.icon || Heart;
                      return (
                        <Button
                          key={widgetId}
                          variant="outline"
                          size="sm"
                          className="gap-1.5 opacity-60"
                          onClick={() => toggleEnabled(widgetId)}
                          data-testid={`button-enable-${widgetId}`}
                        >
                          <Icon className="h-3.5 w-3.5" />
                          {config?.label || widgetId}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="list" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Settings2 className="h-5 w-5" />
                Widget Configuration
              </CardTitle>
              <CardDescription className="break-words">
                Drag to reorder. All {ALL_WIDGETS.length} widgets are shown - enable or disable as needed.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px] pr-4">
                <div className="space-y-2">
                  {order.map((widgetId) => (
                    <WidgetListItem
                      key={widgetId}
                      widgetId={widgetId}
                      size={sizes[widgetId] || "medium"}
                      enabled={enabled[widgetId] ?? true}
                      onToggle={() => toggleEnabled(widgetId)}
                      onSizeChange={(s) => setSize(widgetId, s)}
                      onDragStart={() => handleDragStart(widgetId)}
                      onDragOver={handleDragOver}
                      onDrop={() => handleDrop(widgetId)}
                    />
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="content" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                "From Your Therapist" Card
              </CardTitle>
              <CardDescription className="break-words">
                Customize the title, description, and visible sections of the therapist messages card on your client's dashboard.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="therapist-card-title">Card Title</Label>
                  <Input
                    id="therapist-card-title"
                    placeholder="From Your Therapist"
                    value={contentOverrides["therapist-thoughts"]?.title || ""}
                    onChange={(e) => updateContentOverride("therapist-thoughts", "title", e.target.value)}
                    data-testid="input-therapist-card-title"
                  />
                  <p className="text-xs text-muted-foreground">
                    Leave empty to use default: "From Your Therapist"
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="therapist-card-description">Card Description</Label>
                  <Textarea
                    id="therapist-card-description"
                    placeholder="Messages, to-dos, and resources from your therapy sessions"
                    value={contentOverrides["therapist-thoughts"]?.description || ""}
                    onChange={(e) => updateContentOverride("therapist-thoughts", "description", e.target.value)}
                    className="resize-none"
                    rows={2}
                    data-testid="input-therapist-card-description"
                  />
                  <p className="text-xs text-muted-foreground">
                    Leave empty to use default description
                  </p>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-4">Visible Sections</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  Choose which types of content to show in this card
                </p>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="show-messages" className="font-medium">Messages</Label>
                      <p className="text-xs text-muted-foreground">
                        General messages and notes to the couple
                      </p>
                    </div>
                    <Switch
                      id="show-messages"
                      checked={contentOverrides["therapist-thoughts"]?.showMessages !== false}
                      onCheckedChange={(checked) => updateContentOverride("therapist-thoughts", "showMessages", checked)}
                      data-testid="switch-show-messages"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="show-todos" className="font-medium">To-Dos</Label>
                      <p className="text-xs text-muted-foreground">
                        Action items and homework assignments
                      </p>
                    </div>
                    <Switch
                      id="show-todos"
                      checked={contentOverrides["therapist-thoughts"]?.showTodos !== false}
                      onCheckedChange={(checked) => updateContentOverride("therapist-thoughts", "showTodos", checked)}
                      data-testid="switch-show-todos"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="show-resources" className="font-medium">Resources</Label>
                      <p className="text-xs text-muted-foreground">
                        Links to articles, videos, and other materials
                      </p>
                    </div>
                    <Switch
                      id="show-resources"
                      checked={contentOverrides["therapist-thoughts"]?.showResources !== false}
                      onCheckedChange={(checked) => updateContentOverride("therapist-thoughts", "showResources", checked)}
                      data-testid="switch-show-resources"
                    />
                  </div>
                </div>
              </div>

              <div className="border rounded-lg p-4 bg-muted/30">
                <h4 className="font-medium mb-2 text-sm">Preview</h4>
                <div className="bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-lg p-4 border">
                  <div className="flex items-center gap-2 mb-1">
                    <MessageCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    <span className="font-semibold">
                      {contentOverrides["therapist-thoughts"]?.title || "From Your Therapist"}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {contentOverrides["therapist-thoughts"]?.description || "Messages, to-dos, and resources from your therapy sessions"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {enabledWidgets.length} of {ALL_WIDGETS.length} widgets enabled
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="gap-2"
          data-testid="button-save-bottom"
        >
          <Save className="w-4 h-4" />
          Save Changes
        </Button>
      </div>
    </div>
  );
}

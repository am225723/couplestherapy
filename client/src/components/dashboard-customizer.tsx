import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
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
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
  HelpCircle,
  Layout,
  ChevronDown,
  Check,
  Trash2,
  Copy,
  Plus,
  Loader2,
  Smartphone,
  Monitor,
  Tablet,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMutation, useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import type { WidgetContentOverrides, LayoutTemplate } from "@shared/schema";

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
  "reflection-prompts",
];

const WIDGET_CATEGORIES: {
  id: string;
  label: string;
  description: string;
  widgets: string[];
}[] = [
  {
    id: "assessments",
    label: "Assessments & Insights",
    description: "Personality and compatibility assessments",
    widgets: ["love-languages", "attachment", "enneagram", "love-map", "compatibility"],
  },
  {
    id: "communication",
    label: "Communication Tools",
    description: "Connect and communicate with your partner",
    widgets: ["messages", "voice-memos", "echo-empathy", "conversations", "pause"],
  },
  {
    id: "activities",
    label: "Shared Activities",
    description: "Things you do together",
    widgets: ["gratitude", "shared-goals", "rituals", "calendar", "journal", "mood"],
  },
  {
    id: "therapy",
    label: "Therapy & Growth",
    description: "Therapeutic exercises and tools",
    widgets: ["therapist-thoughts", "reflection-prompts", "ifs", "conflict", "four-horsemen", "demon-dialogues"],
  },
  {
    id: "ai",
    label: "AI-Powered Features",
    description: "Smart recommendations and insights",
    widgets: ["date-night", "ai-suggestions", "growth-plan", "daily-tips"],
  },
  {
    id: "progress",
    label: "Progress Tracking",
    description: "Monitor your relationship journey",
    widgets: ["weekly-checkin", "checkin-history", "progress-timeline"],
  },
  {
    id: "practical",
    label: "Practical Tools",
    description: "Day-to-day household management",
    widgets: ["chores", "todos", "financial"],
  },
  {
    id: "other",
    label: "Other Features",
    description: "Additional helpful tools",
    widgets: ["meditation", "intimacy", "values", "parenting"],
  },
];

const PRESET_TEMPLATES = [
  {
    id: "essential",
    name: "Essential Starter",
    description: "Core features for new couples starting therapy",
    widgets: ["weekly-checkin", "love-languages", "gratitude", "shared-goals", "therapist-thoughts"],
  },
  {
    id: "communication",
    name: "Communication Focus",
    description: "Emphasis on improving partner communication",
    widgets: ["messages", "voice-memos", "echo-empathy", "conversations", "pause", "weekly-checkin"],
  },
  {
    id: "assessment",
    name: "Deep Assessment",
    description: "Comprehensive personality and compatibility analysis",
    widgets: ["love-languages", "attachment", "enneagram", "love-map", "compatibility", "weekly-checkin"],
  },
  {
    id: "ai-powered",
    name: "AI-Enhanced",
    description: "Leverage AI for personalized recommendations",
    widgets: ["date-night", "ai-suggestions", "growth-plan", "daily-tips", "weekly-checkin"],
  },
  {
    id: "full",
    name: "Full Experience",
    description: "All features enabled for comprehensive support",
    widgets: ALL_WIDGETS,
  },
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
  "reflection-prompts": {
    label: "Reflection Prompts",
    icon: HelpCircle,
    color: "text-violet-600 dark:text-violet-400",
    bgColor: "bg-violet-100 dark:bg-violet-900/30",
    description: "Guided questions from your therapist",
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
  "reflection-prompts": "from-violet-500/15 to-purple-500/10 dark:from-violet-500/22 dark:to-purple-500/15",
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
  "reflection-prompts": "border-l-violet-500",
};

function WidgetPreviewCard({
  widgetId,
  size,
  enabled,
  onToggle,
  onSizeChange,
  previewDevice = "desktop",
}: {
  widgetId: string;
  size: "small" | "medium" | "large";
  enabled: boolean;
  onToggle: () => void;
  onSizeChange: (size: "small" | "medium" | "large") => void;
  previewDevice?: "desktop" | "tablet" | "mobile";
}) {
  const config = WIDGET_CONFIG[widgetId];
  if (!config) return null;

  const Icon = config.icon;
  
  // Adjust column spans based on device mode
  let sizeClass = "col-span-1";
  if (previewDevice === "desktop") {
    sizeClass = { small: "col-span-1", medium: "col-span-2", large: "col-span-3" }[size];
  } else if (previewDevice === "tablet") {
    // Tablet: max 2 columns, so clamp span
    sizeClass = size === "small" ? "col-span-1" : "col-span-2";
  }
  // Mobile: always col-span-1 (already default)

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

  // Saved templates state and queries
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");

  // Device preview mode
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");

  const { data: savedTemplates = [], isLoading: templatesLoading } = useQuery<LayoutTemplate[]>({
    queryKey: ["/api/layout-templates/therapist", therapistId],
    queryFn: async () => {
      const response = await fetch(`/api/layout-templates/therapist/${therapistId}`);
      if (!response.ok) throw new Error("Failed to fetch templates");
      return response.json();
    },
  });

  const createTemplateMutation = useMutation({
    mutationFn: async (data: { name: string; description: string }) => {
      return apiRequest("POST", "/api/layout-templates", {
        therapist_id: therapistId,
        name: data.name,
        description: data.description,
        widget_order: order,
        enabled_widgets: enabled,
        widget_sizes: sizes,
        widget_content_overrides: contentOverrides,
      });
    },
    onSuccess: () => {
      toast({ title: "Template Saved", description: "Your layout has been saved as a template" });
      queryClient.invalidateQueries({ queryKey: ["/api/layout-templates/therapist", therapistId] });
      setSaveDialogOpen(false);
      setTemplateName("");
      setTemplateDescription("");
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save template", variant: "destructive" });
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (templateId: string) => {
      return apiRequest("DELETE", `/api/layout-templates/${templateId}`);
    },
    onSuccess: () => {
      toast({ title: "Template Deleted", description: "The template has been removed" });
      queryClient.invalidateQueries({ queryKey: ["/api/layout-templates/therapist", therapistId] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete template", variant: "destructive" });
    },
  });

  const applyTemplateMutation = useMutation({
    mutationFn: async (templateId: string) => {
      return apiRequest("POST", `/api/layout-templates/${templateId}/apply/${coupleId}`, {
        therapist_id: therapistId,
      });
    },
    onSuccess: () => {
      toast({ title: "Template Applied", description: "The template has been applied to this couple's dashboard" });
      queryClient.invalidateQueries({ queryKey: [`/api/dashboard-customization/couple/${coupleId}`] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to apply template", variant: "destructive" });
    },
  });

  const applySavedTemplate = (template: LayoutTemplate) => {
    setOrder(template.widget_order as string[]);
    setEnabled(template.enabled_widgets as Record<string, boolean>);
    setSizes(template.widget_sizes as Record<string, "small" | "medium" | "large">);
    if (template.widget_content_overrides) {
      setContentOverrides(template.widget_content_overrides as WidgetContentOverrides);
    }
    toast({
      title: "Template Applied",
      description: `"${template.name}" layout has been applied locally. Save to apply permanently.`,
    });
  };

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

      <Tabs defaultValue="templates" className="w-full">
        <TabsList className="mb-4 flex-wrap gap-1">
          <TabsTrigger value="templates" className="gap-2" data-testid="tab-templates">
            <Layout className="h-4 w-4" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="categories" className="gap-2" data-testid="tab-categories">
            <ChevronDown className="h-4 w-4" />
            By Category
          </TabsTrigger>
          <TabsTrigger value="preview" className="gap-2" data-testid="tab-preview">
            <Eye className="h-4 w-4" />
            Preview
          </TabsTrigger>
          <TabsTrigger value="list" className="gap-2" data-testid="tab-list">
            <Settings2 className="h-4 w-4" />
            All Widgets
          </TabsTrigger>
          <TabsTrigger value="content" className="gap-2" data-testid="tab-content">
            <Pencil className="h-4 w-4" />
            Card Content
          </TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Layout className="h-5 w-5" />
                Quick Start Templates
              </CardTitle>
              <CardDescription>
                Choose a pre-configured template to quickly set up the dashboard. 
                You can customize individual widgets after applying a template.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {PRESET_TEMPLATES.map((template) => {
                  const templateWidgetsEnabled = template.widgets.filter(w => enabled[w]).length;
                  const totalEnabled = Object.keys(enabled).filter(k => enabled[k]).length;
                  const isExactMatch = template.widgets.every(w => enabled[w]) && totalEnabled === template.widgets.length;
                  const isPartialMatch = templateWidgetsEnabled === template.widgets.length && totalEnabled > template.widgets.length;
                  return (
                    <Card 
                      key={template.id}
                      className={cn(
                        "cursor-pointer transition-all hover-elevate",
                        isExactMatch && "ring-2 ring-primary border-primary",
                        isPartialMatch && "ring-1 ring-primary/50 border-primary/50"
                      )}
                      onClick={() => {
                        const newEnabled: Record<string, boolean> = {};
                        ALL_WIDGETS.forEach(w => {
                          newEnabled[w] = template.widgets.includes(w);
                        });
                        setEnabled(newEnabled);
                        toast({
                          title: "Template Applied",
                          description: `"${template.name}" template has been applied with ${template.widgets.length} widgets enabled. Don't forget to save!`,
                        });
                      }}
                      data-testid={`template-${template.id}`}
                    >
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center justify-between">
                          {template.name}
                          {isExactMatch && <Check className="h-4 w-4 text-primary" />}
                          {isPartialMatch && <Badge variant="secondary" className="text-xs">+ extras</Badge>}
                        </CardTitle>
                        <CardDescription className="text-sm">
                          {template.description}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="flex flex-wrap gap-1">
                          {template.widgets.slice(0, 5).map(widgetId => {
                            const config = WIDGET_CONFIG[widgetId];
                            const Icon = config?.icon || Heart;
                            return (
                              <Badge key={widgetId} variant="secondary" className="text-xs gap-1">
                                <Icon className="h-3 w-3" />
                                {config?.label?.split(" ")[0] || widgetId}
                              </Badge>
                            );
                          })}
                          {template.widgets.length > 5 && (
                            <Badge variant="outline" className="text-xs">
                              +{template.widgets.length - 5} more
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Saved Templates */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Save className="h-5 w-5" />
                  Your Saved Templates
                </div>
                <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="gap-2" data-testid="button-save-as-template">
                      <Plus className="h-4 w-4" />
                      Save Current Layout
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Save Layout as Template</DialogTitle>
                      <DialogDescription>
                        Save your current widget configuration as a reusable template that you can apply to other couples.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="template-name">Template Name</Label>
                        <Input
                          id="template-name"
                          placeholder="e.g., New Couple Starter Pack"
                          value={templateName}
                          onChange={(e) => setTemplateName(e.target.value)}
                          data-testid="input-template-name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="template-description">Description (optional)</Label>
                        <Textarea
                          id="template-description"
                          placeholder="What's this template good for?"
                          value={templateDescription}
                          onChange={(e) => setTemplateDescription(e.target.value)}
                          data-testid="input-template-description"
                        />
                      </div>
                      <div className="text-sm text-muted-foreground">
                        This template will include {Object.values(enabled).filter(Boolean).length} enabled widgets.
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button 
                        onClick={() => createTemplateMutation.mutate({ name: templateName, description: templateDescription })}
                        disabled={!templateName.trim() || createTemplateMutation.isPending}
                        data-testid="button-confirm-save-template"
                      >
                        {createTemplateMutation.isPending ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            Saving...
                          </>
                        ) : (
                          "Save Template"
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardTitle>
              <CardDescription>
                Templates you've created from previous configurations. Click to apply to this couple.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {templatesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : savedTemplates.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Save className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No saved templates yet.</p>
                  <p className="text-sm">Create your first template using the button above.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {savedTemplates.map((template) => {
                    const enabledCount = Object.values(template.enabled_widgets as Record<string, boolean>).filter(Boolean).length;
                    return (
                      <Card 
                        key={template.id}
                        className="cursor-pointer transition-all hover-elevate"
                        onClick={() => applySavedTemplate(template)}
                        data-testid={`saved-template-${template.id}`}
                      >
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base flex items-center justify-between">
                            {template.name}
                            <Badge variant="outline" className="text-xs">
                              {enabledCount} widgets
                            </Badge>
                          </CardTitle>
                          {template.description && (
                            <CardDescription className="text-sm">
                              {template.description}
                            </CardDescription>
                          )}
                        </CardHeader>
                        <CardFooter className="pt-0 flex justify-between">
                          <span className="text-xs text-muted-foreground">
                            Used {template.usage_count || 0} times
                          </span>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteTemplateMutation.mutate(template.id);
                            }}
                            data-testid={`button-delete-template-${template.id}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </CardFooter>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <ChevronDown className="h-5 w-5" />
                Widgets by Category
              </CardTitle>
              <CardDescription>
                Browse and enable widgets organized by category. 
                Click the checkbox to toggle visibility on the client dashboard.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="multiple" defaultValue={["assessments", "therapy", "progress"]} className="w-full">
                {WIDGET_CATEGORIES.map((category) => {
                  const enabledCount = category.widgets.filter(w => enabled[w]).length;
                  const totalCount = category.widgets.length;
                  return (
                    <AccordionItem key={category.id} value={category.id}>
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-3 flex-1">
                          <span className="font-medium">{category.label}</span>
                          <Badge variant={enabledCount === totalCount ? "default" : enabledCount > 0 ? "secondary" : "outline"} className="text-xs">
                            {enabledCount}/{totalCount}
                          </Badge>
                          <span className="text-sm text-muted-foreground hidden sm:inline">
                            {category.description}
                          </span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-2">
                          {category.widgets.map(widgetId => {
                            const config = WIDGET_CONFIG[widgetId];
                            if (!config) return null;
                            const Icon = config.icon;
                            return (
                              <div 
                                key={widgetId}
                                className={cn(
                                  "flex items-center gap-3 p-3 rounded-lg border transition",
                                  enabled[widgetId] ? "bg-primary/5 border-primary/20" : "bg-muted/30 opacity-70"
                                )}
                              >
                                <Checkbox
                                  checked={enabled[widgetId]}
                                  onCheckedChange={() => toggleEnabled(widgetId)}
                                  data-testid={`category-checkbox-${widgetId}`}
                                />
                                <div className={cn("p-2 rounded-md", config.bgColor)}>
                                  <Icon className={cn("w-4 h-4", config.color)} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-sm truncate">{config.label}</p>
                                  <p className="text-xs text-muted-foreground truncate">{config.description}</p>
                                </div>
                                <div className="flex gap-1">
                                  {(["small", "medium", "large"] as const).map((s) => (
                                    <Button
                                      key={s}
                                      size="sm"
                                      variant={sizes[widgetId] === s ? "default" : "ghost"}
                                      className="h-6 w-6 p-0 text-xs"
                                      onClick={() => setSize(widgetId, s)}
                                      data-testid={`category-size-${s}-${widgetId}`}
                                    >
                                      {SIZE_DIMENSIONS[s].label}
                                    </Button>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <div className="flex gap-2 mt-3 pt-3 border-t">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEnabled(prev => {
                                const newEnabled = { ...prev };
                                category.widgets.forEach(w => newEnabled[w] = true);
                                return newEnabled;
                              });
                              toast({
                                title: "Widgets Enabled",
                                description: `All ${category.label} widgets have been enabled.`,
                              });
                            }}
                            data-testid={`button-enable-all-${category.id}`}
                          >
                            Enable All
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEnabled(prev => {
                                const newEnabled = { ...prev };
                                category.widgets.forEach(w => newEnabled[w] = false);
                                return newEnabled;
                              });
                              toast({
                                title: "Widgets Disabled",
                                description: `All ${category.label} widgets have been hidden.`,
                              });
                            }}
                            data-testid={`button-disable-all-${category.id}`}
                          >
                            Disable All
                          </Button>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preview" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Client Dashboard Preview
                </div>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant={previewDevice === "mobile" ? "default" : "ghost"}
                    className="gap-1.5"
                    onClick={() => setPreviewDevice("mobile")}
                    data-testid="button-preview-mobile"
                  >
                    <Smartphone className="h-4 w-4" />
                    Mobile
                  </Button>
                  <Button
                    size="sm"
                    variant={previewDevice === "tablet" ? "default" : "ghost"}
                    className="gap-1.5"
                    onClick={() => setPreviewDevice("tablet")}
                    data-testid="button-preview-tablet"
                  >
                    <Tablet className="h-4 w-4" />
                    Tablet
                  </Button>
                  <Button
                    size="sm"
                    variant={previewDevice === "desktop" ? "default" : "ghost"}
                    className="gap-1.5"
                    onClick={() => setPreviewDevice("desktop")}
                    data-testid="button-preview-desktop"
                  >
                    <Monitor className="h-4 w-4" />
                    Desktop
                  </Button>
                </div>
              </CardTitle>
              <CardDescription>
                Preview how the dashboard will appear on different devices.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className={cn(
                "mx-auto transition-all duration-300",
                previewDevice === "mobile" && "max-w-[375px]",
                previewDevice === "tablet" && "max-w-[768px]",
                previewDevice === "desktop" && "max-w-full"
              )}>
                {/* Device Frame */}
                <div className={cn(
                  "relative transition-all duration-300",
                  previewDevice === "mobile" && "rounded-[2.5rem] border-[10px] border-gray-800 dark:border-gray-600 bg-gray-800 dark:bg-gray-600 p-1",
                  previewDevice === "tablet" && "rounded-[1.5rem] border-[8px] border-gray-700 dark:border-gray-500 bg-gray-700 dark:bg-gray-500 p-1",
                  previewDevice === "desktop" && ""
                )}>
                  {/* Device notch for mobile */}
                  {previewDevice === "mobile" && (
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-6 bg-gray-800 dark:bg-gray-600 rounded-b-xl z-10" />
                  )}
                  {/* Device camera for tablet */}
                  {previewDevice === "tablet" && (
                    <div className="absolute top-2 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-500 dark:bg-gray-400 rounded-full z-10" />
                  )}
                  
                  {/* Screen content */}
                  <div className={cn(
                    "border rounded-lg p-4 bg-background overflow-hidden",
                    previewDevice === "mobile" && "rounded-[1.5rem] pt-8",
                    previewDevice === "tablet" && "rounded-[1rem] pt-6"
                  )}>
                    <div 
                      className={cn(
                        "grid gap-3",
                        previewDevice === "mobile" && "grid-cols-1",
                        previewDevice === "tablet" && "grid-cols-2"
                      )}
                      style={previewDevice === "desktop" ? { 
                        gridTemplateColumns: "repeat(auto-fit, minmax(min(160px, 100%), 1fr))",
                        gridAutoRows: "200px",
                        gridAutoFlow: "dense"
                      } : {
                        gridAutoRows: previewDevice === "mobile" ? "120px" : "160px",
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
                          previewDevice={previewDevice}
                        />
                      ))}
                    </div>
                    {enabledWidgets.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        No widgets enabled. Enable widgets from the list view.
                      </div>
                    )}
                  </div>
                </div>
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

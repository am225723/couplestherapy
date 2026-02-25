import type { LucideIcon } from "lucide-react";
import {
  Home,
  Wind,
  MessageCircle,
  Compass,
  CalendarDays,
  Wrench,
  LayoutDashboard,
  Lightbulb,
  TrendingUp,
  Zap,
  FileText,
  User,
  Settings,
  PauseCircle,
  BookOpen,
  HeartPulse,
  Brain,
  Mail,
  Mic,
  Shield,
  AlertTriangle,
  Repeat,
  Layers,
  Sparkles,
  Link2,
  Target,
  Map,
  Heart,
  Calendar,
  Coffee,
  CheckSquare,
  ListTodo,
  DollarSign,
  NotebookPen,
  Smile,
  Package,
  ClipboardList,
  History,
  Baby,
  MessageSquare,
} from "lucide-react";

export type ClientPrimaryTab =
  | "home"
  | "calm"
  | "connect"
  | "discover"
  | "plan"
  | "tools";

export interface ClientSecondaryRoute {
  title: string;
  url: string;
  icon: LucideIcon;
}

export interface ClientTabDefinition {
  id: ClientPrimaryTab;
  label: string;
  icon: LucideIcon;
  defaultUrl: string;
  routes: string[];
  secondaryRoutes: ClientSecondaryRoute[];
}

export const clientTabConfig: ClientTabDefinition[] = [
  {
    id: "home",
    label: "Home",
    icon: Home,
    defaultUrl: "/dashboard",
    routes: [
      "/dashboard",
      "/therapist-thoughts",
      "/progress-timeline",
      "/growth-plan",
      "/session-notes",
      "/profile",
      "/settings",
      "/couple-setup",
    ],
    secondaryRoutes: [
      { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
      {
        title: "Therapist Thoughts",
        url: "/therapist-thoughts",
        icon: Lightbulb,
      },
      {
        title: "Progress Timeline",
        url: "/progress-timeline",
        icon: TrendingUp,
      },
      { title: "Growth Plan", url: "/growth-plan", icon: Zap },
      { title: "Session Notes", url: "/session-notes", icon: FileText },
      { title: "Profile", url: "/profile", icon: User },
      { title: "Settings", url: "/settings", icon: Settings },
    ],
  },
  {
    id: "calm",
    label: "Calm",
    icon: Wind,
    defaultUrl: "/pause",
    routes: ["/pause", "/meditation-library", "/mood-tracker", "/ifs-intro"],
    secondaryRoutes: [
      { title: "Pause", url: "/pause", icon: PauseCircle },
      {
        title: "Meditation Library",
        url: "/meditation-library",
        icon: BookOpen,
      },
      { title: "Mood Tracker", url: "/mood-tracker", icon: HeartPulse },
      { title: "IFS Intro", url: "/ifs-intro", icon: Brain },
    ],
  },
  {
    id: "connect",
    label: "Connect",
    icon: MessageCircle,
    defaultUrl: "/messages",
    routes: [
      "/messages",
      "/voice-memos",
      "/echo-empathy",
      "/conversation",
      "/conflict-resolution",
      "/four-horsemen",
      "/demon-dialogues",
      "/intimacy-mapping",
    ],
    secondaryRoutes: [
      { title: "Messages", url: "/messages", icon: Mail },
      { title: "Voice Memos", url: "/voice-memos", icon: Mic },
      { title: "Echo & Empathy", url: "/echo-empathy", icon: MessageCircle },
      { title: "Hold Me Tight", url: "/conversation", icon: Heart },
      {
        title: "Conflict Resolution",
        url: "/conflict-resolution",
        icon: Shield,
      },
      {
        title: "Four Horsemen",
        url: "/four-horsemen",
        icon: AlertTriangle,
      },
      { title: "Demon Dialogues", url: "/demon-dialogues", icon: Repeat },
      { title: "Intimacy Mapping", url: "/intimacy-mapping", icon: Layers },
    ],
  },
  {
    id: "discover",
    label: "Discover",
    icon: Compass,
    defaultUrl: "/quiz",
    routes: [
      "/quiz",
      "/love-language-results",
      "/attachment-assessment",
      "/attachment-results",
      "/enneagram-assessment",
      "/enneagram-results",
      "/love-map",
      "/couple-compatibility",
      "/values-vision",
    ],
    secondaryRoutes: [
      { title: "Love Language Quiz", url: "/quiz", icon: Sparkles },
      {
        title: "Love Language Results",
        url: "/love-language-results",
        icon: Heart,
      },
      {
        title: "Attachment Assessment",
        url: "/attachment-assessment",
        icon: Link2,
      },
      {
        title: "Attachment Results",
        url: "/attachment-results",
        icon: Target,
      },
      {
        title: "Enneagram Assessment",
        url: "/enneagram-assessment",
        icon: Compass,
      },
      {
        title: "Enneagram Results",
        url: "/enneagram-results",
        icon: TrendingUp,
      },
      { title: "Love Map", url: "/love-map", icon: Map },
      {
        title: "Compatibility",
        url: "/couple-compatibility",
        icon: Heart,
      },
      { title: "Values & Vision", url: "/values-vision", icon: Sparkles },
    ],
  },
  {
    id: "plan",
    label: "Plan",
    icon: CalendarDays,
    defaultUrl: "/calendar",
    routes: [
      "/calendar",
      "/date-night",
      "/rituals",
      "/goals",
      "/shared-todos",
      "/chores",
      "/financial-toolkit",
      "/couple-journal",
      "/daily-suggestion",
      "/daily-tips",
    ],
    secondaryRoutes: [
      { title: "Calendar", url: "/calendar", icon: Calendar },
      { title: "Date Night", url: "/date-night", icon: Sparkles },
      { title: "Rituals", url: "/rituals", icon: Coffee },
      { title: "Goals", url: "/goals", icon: CheckSquare },
      { title: "Shared Todos", url: "/shared-todos", icon: ListTodo },
      { title: "Chores", url: "/chores", icon: CheckSquare },
      {
        title: "Financial Toolkit",
        url: "/financial-toolkit",
        icon: DollarSign,
      },
      {
        title: "Couple Journal",
        url: "/couple-journal",
        icon: NotebookPen,
      },
      {
        title: "Daily Suggestion",
        url: "/daily-suggestion",
        icon: Sparkles,
      },
      { title: "Daily Tips", url: "/daily-tips", icon: Smile },
    ],
  },
  {
    id: "tools",
    label: "Tools",
    icon: Wrench,
    defaultUrl: "/modules",
    routes: [
      "/modules",
      "/weekly-checkin",
      "/checkin-history",
      "/parenting-partners",
      "/reflection-prompts",
      "/gratitude",
    ],
    secondaryRoutes: [
      { title: "Modules", url: "/modules", icon: Package },
      {
        title: "Weekly Check-In",
        url: "/weekly-checkin",
        icon: ClipboardList,
      },
      { title: "Check-In History", url: "/checkin-history", icon: History },
      {
        title: "Parenting Partners",
        url: "/parenting-partners",
        icon: Baby,
      },
      {
        title: "Reflection Prompts",
        url: "/reflection-prompts",
        icon: MessageSquare,
      },
      { title: "Gratitude", url: "/gratitude", icon: Heart },
    ],
  },
];

const normalizedPath = (pathname: string): string => {
  const path = pathname.split("?")[0].split("#")[0] || "/";
  if (path.length > 1 && path.endsWith("/")) {
    return path.slice(0, -1);
  }
  return path;
};

const pathMatches = (pathname: string, candidate: string): boolean => {
  const normalized = normalizedPath(pathname);
  if (normalized === candidate) return true;
  return normalized.startsWith(`${candidate}/`);
};

export const routeToClientPrimaryTab = (pathname: string): ClientPrimaryTab => {
  for (const tab of clientTabConfig) {
    if (tab.routes.some((route) => pathMatches(pathname, route))) {
      return tab.id;
    }
  }
  return "tools";
};

export const getClientTab = (tabId: ClientPrimaryTab): ClientTabDefinition => {
  return (
    clientTabConfig.find((tab) => tab.id === tabId) ??
    clientTabConfig[clientTabConfig.length - 1]
  );
};

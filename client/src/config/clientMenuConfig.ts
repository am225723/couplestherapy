import { LucideIcon } from "lucide-react";
import {
  Home,
  ClipboardList,
  Heart,
  Map,
  AlertTriangle,
  MessageCircle,
  MessageSquare,
  Mic,
  Volume2,
  PauseCircle,
  User,
  BookOpen,
  Compass,
  Sparkles,
  Activity,
  Baby,
  Calendar,
  Target,
  Coffee,
  CheckSquare,
  Lightbulb,
  Smile,
  FolderKanban,
  DollarSign,
  Link2,
  ListTodo,
  Package,
  Shield,
  TrendingUp,
  Zap,
} from "lucide-react";

export interface MenuRoute {
  title: string;
  url: string;
  icon: LucideIcon;
  testId?: string;
}

export interface MenuCategory {
  id: string;
  label: string;
  icon?: LucideIcon;
  defaultOpen: boolean;
  routes: MenuRoute[];
}

export const clientMenuConfig: MenuCategory[] = [
  {
    id: "dashboard",
    label: "Home",
    icon: Home,
    defaultOpen: true,
    routes: [
      {
        title: "Dashboard",
        url: "/dashboard",
        icon: Home,
        testId: "nav-dashboard",
      },
      {
        title: "Therapist Thoughts",
        url: "/therapist-thoughts",
        icon: MessageSquare,
        testId: "nav-therapist-thoughts",
      },
      {
        title: "Couples Compatibility",
        url: "/couple-compatibility",
        icon: Heart,
        testId: "nav-compatibility",
      },
      {
        title: "Progress Timeline",
        url: "/progress-timeline",
        icon: TrendingUp,
        testId: "nav-progress-timeline",
      },
      {
        title: "Growth Plan",
        url: "/growth-plan",
        icon: Zap,
        testId: "nav-growth-plan",
      },
      {
        title: "Session Notes",
        url: "/session-notes",
        icon: BookOpen,
        testId: "nav-session-notes",
      },
      {
        title: "Reflection Prompts",
        url: "/reflection-prompts",
        icon: MessageCircle,
        testId: "nav-reflection-prompts",
      },
    ],
  },
  {
    id: "assessments",
    label: "Assessments & Check-ins",
    icon: CheckSquare,
    defaultOpen: true,
    routes: [
      {
        title: "Weekly Check-In",
        url: "/weekly-checkin",
        icon: ClipboardList,
        testId: "nav-checkin",
      },
      {
        title: "Check-In History",
        url: "/checkin-history",
        icon: Calendar,
        testId: "nav-checkin-history",
      },
      {
        title: "Love Language Quiz",
        url: "/quiz",
        icon: Heart,
        testId: "nav-love-language",
      },
      {
        title: "My Love Language Results",
        url: "/love-language-results",
        icon: Sparkles,
        testId: "nav-love-language-results",
      },
      {
        title: "Love Map Quiz",
        url: "/love-map",
        icon: Map,
        testId: "nav-love-map",
      },
      {
        title: "Attachment Assessment",
        url: "/attachment-assessment",
        icon: Link2,
        testId: "nav-attachment",
      },
      {
        title: "My Attachment Results",
        url: "/attachment-results",
        icon: Sparkles,
        testId: "nav-attachment-results",
      },
      {
        title: "Enneagram Assessment",
        url: "/enneagram-assessment",
        icon: Compass,
        testId: "nav-enneagram",
      },
      {
        title: "My Enneagram Results",
        url: "/enneagram-results",
        icon: Sparkles,
        testId: "nav-enneagram-results",
      },
      {
        title: "Four Horsemen",
        url: "/four-horsemen",
        icon: AlertTriangle,
        testId: "nav-four-horsemen",
      },
      {
        title: "Demon Dialogues",
        url: "/demon-dialogues",
        icon: MessageCircle,
        testId: "nav-demon-dialogues",
      },
    ],
  },
  {
    id: "communication",
    label: "Communication Tools",
    icon: MessageSquare,
    defaultOpen: false,
    routes: [
      {
        title: "Messages",
        url: "/messages",
        icon: MessageSquare,
        testId: "nav-messages",
      },
      {
        title: "Voice Memos",
        url: "/voice-memos",
        icon: Mic,
        testId: "nav-voice-memos",
      },
      {
        title: "Echo & Empathy",
        url: "/echo-empathy",
        icon: Volume2,
        testId: "nav-echo-empathy",
      },
      {
        title: "Hold Me Tight",
        url: "/conversation",
        icon: MessageCircle,
        testId: "nav-hold-me-tight",
      },
      {
        title: "Conflict Resolution",
        url: "/conflict-resolution",
        icon: Shield,
        testId: "nav-conflict-resolution",
      },
      {
        title: "Pause Button",
        url: "/pause",
        icon: PauseCircle,
        testId: "nav-pause",
      },
    ],
  },
  {
    id: "growth",
    label: "Personal Growth",
    icon: Lightbulb,
    defaultOpen: false,
    routes: [
      {
        title: "IFS Introduction",
        url: "/ifs-intro",
        icon: User,
        testId: "nav-ifs",
      },
      {
        title: "Meditation Library",
        url: "/meditation-library",
        icon: BookOpen,
        testId: "nav-meditation",
      },
      {
        title: "Values & Vision",
        url: "/values-vision",
        icon: Compass,
        testId: "nav-values",
      },
    ],
  },
  {
    id: "connection",
    label: "Connection & Fun",
    icon: Smile,
    defaultOpen: false,
    routes: [
      {
        title: "Daily Tips",
        url: "/daily-tips",
        icon: Lightbulb,
        testId: "nav-daily-tips",
      },
      {
        title: "Daily Suggestion",
        url: "/daily-suggestion",
        icon: Sparkles,
        testId: "nav-daily-suggestion",
      },
      {
        title: "Mood Tracker",
        url: "/mood-tracker",
        icon: Heart,
        testId: "nav-mood-tracker",
      },
      {
        title: "Date Night Generator",
        url: "/date-night",
        icon: Sparkles,
        testId: "nav-date-night",
      },
      {
        title: "Couple Journal",
        url: "/couple-journal",
        icon: BookOpen,
        testId: "nav-journal",
      },
      {
        title: "Gratitude Log",
        url: "/gratitude",
        icon: Heart,
        testId: "nav-gratitude",
      },
      {
        title: "Intimacy Mapping",
        url: "/intimacy-mapping",
        icon: Activity,
        testId: "nav-intimacy",
      },
      {
        title: "Parenting Partners",
        url: "/parenting-partners",
        icon: Baby,
        testId: "nav-parenting",
      },
    ],
  },
  {
    id: "planning",
    label: "Planning & Organization",
    icon: FolderKanban,
    defaultOpen: false,
    routes: [
      {
        title: "Calendar",
        url: "/calendar",
        icon: Calendar,
        testId: "nav-calendar",
      },
      {
        title: "Chore Chart",
        url: "/chores",
        icon: ListTodo,
        testId: "nav-chores",
      },
      {
        title: "Shared To-Do List",
        url: "/shared-todos",
        icon: ListTodo,
        testId: "nav-shared-todos",
      },
      {
        title: "Shared Goals",
        url: "/goals",
        icon: Target,
        testId: "nav-goals",
      },
      {
        title: "Financial Toolkit",
        url: "/financial-toolkit",
        icon: DollarSign,
        testId: "nav-financial",
      },
      {
        title: "Rituals",
        url: "/rituals",
        icon: Coffee,
        testId: "nav-rituals",
      },
    ],
  },
  {
    id: "subscriptions",
    label: "Add-on Modules",
    icon: Package,
    defaultOpen: false,
    routes: [
      {
        title: "Module Catalog",
        url: "/modules",
        icon: Package,
        testId: "nav-modules",
      },
    ],
  },
];

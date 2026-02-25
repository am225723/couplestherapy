import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Users,
  TrendingUp,
  Wrench,
  User,
  LayoutDashboard,
  Activity,
  ClipboardList,
  Heart,
  Link2,
  Compass,
  Map,
  Brain,
  FileText,
  PenLine,
  MessageSquare,
  MessageCircle,
  PauseCircle,
  Target,
  Calendar,
  Book,
  Shield,
  Mic,
  DollarSign,
  Lightbulb,
  Settings,
} from "lucide-react";

export type TherapistPrimaryTab =
  | "dashboard"
  | "couples"
  | "insights"
  | "tools"
  | "profile";

export interface TherapistSecondaryRoute {
  title: string;
  url: string;
  icon: LucideIcon;
}

export interface TherapistTabDefinition {
  id: TherapistPrimaryTab;
  label: string;
  icon: LucideIcon;
}

export const therapistTabConfig: TherapistTabDefinition[] = [
  { id: "dashboard", label: "Dashboard", icon: BarChart3 },
  { id: "couples", label: "Couples", icon: Users },
  { id: "insights", label: "Insights", icon: TrendingUp },
  { id: "tools", label: "Tools", icon: Wrench },
  { id: "profile", label: "Profile", icon: User },
];

const insightSections = new Set([
  "checkins",
  "languages",
  "attachment",
  "enneagram",
  "lovemap",
  "analytics",
  "progress-timeline",
  "mood",
]);

const toolSections = new Set([
  "notes",
  "prompts",
  "reflection-responses",
  "messages",
  "echo",
  "conversations",
  "pause",
  "goals",
  "calendar",
  "rituals",
  "ifs",
  "journal",
  "conflict",
  "voice-memos",
  "gratitude",
  "financial",
  "growth-plan",
  "therapy-tools",
  "dashboard-customization",
  "reminders",
  "therapist-thoughts",
]);

const normalizePath = (pathname: string): string => {
  const path = pathname.split("?")[0].split("#")[0] || "/";
  if (path.length > 1 && path.endsWith("/")) {
    return path.slice(0, -1);
  }
  return path;
};

export const getAdminCoupleIdFromPath = (pathname: string): string | null => {
  const normalized = normalizePath(pathname);
  const match = normalized.match(/^\/admin\/couple\/([^/]+)(?:\/.*)?$/);
  if (!match) return null;
  return match[1] ?? null;
};

export const getAdminSectionFromPath = (pathname: string): string | null => {
  const normalized = normalizePath(pathname);
  const match = normalized.match(/^\/admin\/couple\/[^/]+\/([^/]+)$/);
  if (!match) return "overview";
  return match[1] ?? "overview";
};

export const routeToTherapistPrimaryTab = (
  pathname: string,
): TherapistPrimaryTab => {
  const normalized = normalizePath(pathname);

  if (
    normalized.startsWith("/therapist/profile") ||
    normalized.startsWith("/therapist/settings")
  ) {
    return "profile";
  }

  if (normalized === "/therapist-thoughts") {
    return "tools";
  }

  if (normalized.startsWith("/admin/analytics")) {
    return "insights";
  }

  if (normalized.startsWith("/admin/couple")) {
    const section = getAdminSectionFromPath(normalized);

    if (section === "activity") return "couples";
    if (section && insightSections.has(section)) return "insights";
    if (section && toolSections.has(section)) return "tools";

    return "dashboard";
  }

  return "dashboard";
};

export const getTherapistTabHref = (
  tabId: TherapistPrimaryTab,
  pathname: string,
): string => {
  const coupleId = getAdminCoupleIdFromPath(pathname);

  switch (tabId) {
    case "dashboard":
      return coupleId ? `/admin/couple/${coupleId}/overview` : "/admin/couple";
    case "couples":
      return coupleId ? `/admin/couple/${coupleId}/activity` : "/admin/couple";
    case "insights":
      return coupleId ? `/admin/couple/${coupleId}/checkins` : "/admin/analytics";
    case "tools":
      return coupleId ? `/admin/couple/${coupleId}/notes` : "/admin/couple";
    case "profile":
      return "/therapist/profile";
    default:
      return "/admin/couple";
  }
};

export const getTherapistSecondaryLinks = (
  tabId: TherapistPrimaryTab,
  pathname: string,
): TherapistSecondaryRoute[] => {
  const coupleId = getAdminCoupleIdFromPath(pathname);
  const withSection = (section: string) =>
    coupleId ? `/admin/couple/${coupleId}/${section}` : "/admin/couple";
  const couplePrefix = coupleId ? `/admin/couple/${coupleId}` : "/admin/couple";

  switch (tabId) {
    case "dashboard":
      return [
        { title: "Overview", url: withSection("overview"), icon: LayoutDashboard },
        { title: "Activity", url: withSection("activity"), icon: Activity },
        { title: "Couple List", url: "/admin/couple", icon: Users },
      ];
    case "couples":
      return [
        { title: "Couple List", url: "/admin/couple", icon: Users },
        { title: "Activity Feed", url: withSection("activity"), icon: Activity },
      ];
    case "insights":
      return [
        { title: "Analytics", url: "/admin/analytics", icon: TrendingUp },
        { title: "Check-ins", url: withSection("checkins"), icon: ClipboardList },
        { title: "Languages", url: withSection("languages"), icon: Heart },
        { title: "Attachment", url: withSection("attachment"), icon: Link2 },
        { title: "Enneagram", url: withSection("enneagram"), icon: Compass },
        { title: "Love Map", url: withSection("lovemap"), icon: Map },
      ];
    case "tools":
      return [
        { title: "Notes", url: withSection("notes"), icon: FileText },
        { title: "Prompts", url: withSection("prompts"), icon: PenLine },
        { title: "Messages", url: withSection("messages"), icon: MessageSquare },
        { title: "Echo", url: withSection("echo"), icon: MessageCircle },
        { title: "Pause", url: withSection("pause"), icon: PauseCircle },
        { title: "Goals", url: withSection("goals"), icon: Target },
        { title: "Calendar", url: withSection("calendar"), icon: Calendar },
        { title: "Rituals", url: withSection("rituals"), icon: Book },
        { title: "Conflict", url: withSection("conflict"), icon: Shield },
        { title: "Voice", url: withSection("voice-memos"), icon: Mic },
        { title: "Financial", url: withSection("financial"), icon: DollarSign },
      ];
    case "profile":
      return [
        { title: "Profile", url: "/therapist/profile", icon: User },
        { title: "Settings", url: "/therapist/settings", icon: Settings },
        { title: "Thoughts", url: withSection("therapist-thoughts"), icon: Lightbulb },
      ];
    default:
      return [];
  }
};

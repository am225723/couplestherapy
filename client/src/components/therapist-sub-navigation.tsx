import { Button } from "@/components/ui/button";
import {
  FileText,
  Sparkles,
  CheckCircle,
  Sliders,
  PenLine,
  Heart,
  Brain,
  Users,
  Map,
  TrendingUp,
  MessageSquare,
  Calendar,
  Book,
  Target,
  Pause,
  Activity,
  LayoutDashboard,
  Bell,
  Lightbulb,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { TabCategory } from "./therapist-dashboard-tabs";

interface SubNavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
}

const SESSION_TOOLS: SubNavItem[] = [
  { id: "notes", label: "Session Notes", icon: FileText, description: "Document your sessions" },
  { id: "checkins", label: "Weekly Check-Ins", icon: CheckCircle, description: "View partner check-ins" },
  { id: "analytics", label: "AI Analytics", icon: Sparkles, description: "AI-powered insights" },
  { id: "echo", label: "Echo & Empathy", icon: Users, description: "Communication exercises" },
  { id: "pause", label: "Pause History", icon: Pause, description: "Conflict timeouts" },
  { id: "ifs", label: "IFS Exercises", icon: Brain, description: "Internal Family Systems" },
];

const CLIENT_MANAGEMENT: SubNavItem[] = [
  { id: "dashboard-customization", label: "Dashboard Customizer", icon: Sliders, description: "Customize client view" },
  { id: "prompts", label: "Client Prompts", icon: PenLine, description: "Send reflection prompts" },
  { id: "languages", label: "Love Languages", icon: Heart, description: "Assessment results" },
  { id: "attachment", label: "Attachment Styles", icon: Users, description: "Attachment patterns" },
  { id: "enneagram", label: "Enneagram", icon: Brain, description: "Personality types" },
  { id: "lovemap", label: "Love Map", icon: Map, description: "Relationship knowledge" },
];

const COMMUNICATION: SubNavItem[] = [
  { id: "messages", label: "Messages", icon: MessageSquare, description: "Direct messaging" },
  { id: "calendar", label: "Calendar", icon: Calendar, description: "Appointments & events" },
  { id: "reflection-responses", label: "Reflection Responses", icon: PenLine, description: "Client reflections" },
  { id: "conversations", label: "Hold Me Tight", icon: Heart, description: "Structured dialogues" },
  { id: "goals", label: "Shared Goals", icon: Target, description: "Couple goals" },
  { id: "rituals", label: "Rituals", icon: Book, description: "Connection rituals" },
  { id: "journal", label: "Journal Entries", icon: Book, description: "Shared journal" },
  { id: "activity", label: "Activity Feed", icon: Activity, description: "Recent activity" },
];

const OVERVIEW_ITEMS: SubNavItem[] = [
  { id: "overview", label: "Dashboard", icon: LayoutDashboard, description: "Quick overview" },
  { id: "reminders", label: "Reminders", icon: Bell, description: "Scheduled reminders" },
  { id: "therapist-thoughts", label: "Therapist Thoughts", icon: Lightbulb, description: "Notes & todos" },
];

const TAB_COLORS: Record<TabCategory, { active: string; hover: string; icon: string }> = {
  overview: {
    active: "bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 border-teal-300 dark:border-teal-700",
    hover: "hover:bg-teal-50 dark:hover:bg-teal-900/20",
    icon: "text-teal-600 dark:text-teal-400",
  },
  session: {
    active: "bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 border-violet-300 dark:border-violet-700",
    hover: "hover:bg-violet-50 dark:hover:bg-violet-900/20",
    icon: "text-violet-600 dark:text-violet-400",
  },
  client: {
    active: "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700",
    hover: "hover:bg-amber-50 dark:hover:bg-amber-900/20",
    icon: "text-amber-600 dark:text-amber-400",
  },
  communication: {
    active: "bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-700",
    hover: "hover:bg-rose-50 dark:hover:bg-rose-900/20",
    icon: "text-rose-600 dark:text-rose-400",
  },
};

interface TherapistSubNavigationProps {
  category: TabCategory;
  currentSection: string;
  onSelectSection: (section: string) => void;
}

export function TherapistSubNavigation({
  category,
  currentSection,
  onSelectSection,
}: TherapistSubNavigationProps) {
  const getItems = (): SubNavItem[] => {
    switch (category) {
      case "session":
        return SESSION_TOOLS;
      case "client":
        return CLIENT_MANAGEMENT;
      case "communication":
        return COMMUNICATION;
      case "overview":
      default:
        return OVERVIEW_ITEMS;
    }
  };

  const items = getItems();
  const colors = TAB_COLORS[category];

  return (
    <div className="bg-muted/30 border-b">
      <div className="px-4 py-2">
        <div className="flex flex-wrap gap-1.5">
          {items.map((item) => {
            const Icon = item.icon;
            const isActive = currentSection === item.id;
            return (
              <Button
                key={item.id}
                variant="ghost"
                size="sm"
                className={cn(
                  "gap-2 h-9 px-3 border transition-all duration-150",
                  isActive
                    ? colors.active
                    : `border-transparent ${colors.hover}`
                )}
                onClick={() => onSelectSection(item.id)}
                data-testid={`button-section-${item.id}`}
              >
                <Icon className={cn("h-4 w-4", isActive && colors.icon)} />
                <span className="hidden sm:inline">{item.label}</span>
              </Button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function getSectionCategory(section: string): TabCategory {
  if (SESSION_TOOLS.some((s) => s.id === section)) return "session";
  if (CLIENT_MANAGEMENT.some((s) => s.id === section)) return "client";
  if (COMMUNICATION.some((s) => s.id === section)) return "communication";
  return "overview";
}

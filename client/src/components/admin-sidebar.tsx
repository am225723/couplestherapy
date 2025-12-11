import { useState, useEffect } from "react";
import {
  Heart,
  Users,
  MessageSquare,
  Calendar,
  Target,
  Book,
  Brain,
  Pause,
  TrendingUp,
  Home,
  Map,
  ChevronDown,
  LayoutDashboard,
  Link2,
  Compass,
  Lightbulb,
  BookMarked,
  Mic,
  Scale,
  DollarSign,
  Zap,
  Clock,
  Smile,
  FileEdit,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface Couple {
  id: string;
  partner1?: {
    id: string;
    full_name: string | null;
    couple_id?: string | null;
    role?: string;
  };
  partner2?: {
    id: string;
    full_name: string | null;
    couple_id?: string | null;
    role?: string;
  };
}

interface AdminSidebarProps {
  couples: Couple[];
  selectedCoupleId: string | null;
  onSelectCouple: (coupleId: string) => void;
  currentSection?: string;
  onSelectSection?: (section: string) => void;
}

const sectionGroups = [
  {
    id: "core-insights",
    label: "Core Insights",
    defaultOpen: true,
    sections: [
      { id: "overview", label: "Overview", icon: Home },
      { id: "checkins", label: "Weekly Check-ins", icon: TrendingUp },
      { id: "analytics", label: "AI Analytics", icon: Brain },
    ],
  },
  {
    id: "assessments",
    label: "Assessments",
    defaultOpen: true,
    sections: [
      { id: "languages", label: "Love Languages", icon: Heart },
      { id: "lovemap", label: "Love Map Quiz", icon: Map },
      { id: "attachment", label: "Attachment Style", icon: Link2 },
      { id: "enneagram", label: "Enneagram", icon: Compass },
    ],
  },
  {
    id: "communication",
    label: "Communication Tools",
    defaultOpen: true,
    sections: [
      { id: "messages", label: "Messages", icon: MessageSquare },
      { id: "echo", label: "Echo & Empathy", icon: Users },
      { id: "pause", label: "Pause History", icon: Pause },
      { id: "conversations", label: "Hold Me Tight", icon: Heart },
      { id: "conflict", label: "Conflict Resolution", icon: Scale },
      { id: "voice-memos", label: "Voice Memos", icon: Mic },
    ],
  },
  {
    id: "activities",
    label: "Activities & Tracking",
    defaultOpen: false,
    sections: [
      { id: "activity", label: "Activity Feed", icon: TrendingUp },
      { id: "gratitude", label: "Gratitude Log", icon: Lightbulb },
      { id: "journal", label: "Couple Journal", icon: BookMarked },
      { id: "mood", label: "Mood Tracker", icon: Smile },
    ],
  },
  {
    id: "planning",
    label: "Planning & Goals",
    defaultOpen: false,
    sections: [
      { id: "goals", label: "Shared Goals", icon: Target },
      { id: "calendar", label: "Calendar", icon: Calendar },
      { id: "rituals", label: "Rituals", icon: Book },
      { id: "financial", label: "Financial Toolkit", icon: DollarSign },
    ],
  },
  {
    id: "growth",
    label: "Growth & Progress",
    defaultOpen: false,
    sections: [
      { id: "growth-plan", label: "Growth Plan", icon: Zap },
      { id: "progress-timeline", label: "Progress Timeline", icon: Clock },
    ],
  },
  {
    id: "support",
    label: "Support Resources",
    defaultOpen: false,
    sections: [
      { id: "ifs", label: "IFS Exercises", icon: Brain },
      { id: "therapy-tools", label: "Therapy Tools", icon: Book },
    ],
  },
  {
    id: "settings",
    label: "Settings",
    defaultOpen: false,
    sections: [
      {
        id: "dashboard-customization",
        label: "Customize Dashboard",
        icon: LayoutDashboard,
      },
      {
        id: "prompts",
        label: "Custom Prompts",
        icon: FileEdit,
      },
    ],
  },
];

export function AdminSidebar({
  couples,
  selectedCoupleId,
  onSelectCouple,
  currentSection,
  onSelectSection,
}: AdminSidebarProps) {
  const selectedCouple = couples.find((c) => c.id === selectedCoupleId);

  // Manage category open/close state with localStorage persistence
  const STORAGE_KEY = "aleic-admin-sidebar-sections";

  const [openSections, setOpenSections] = useState<Record<string, boolean>>(
    () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          return JSON.parse(stored);
        }
      } catch (e) {
        console.error("Failed to load admin sidebar state:", e);
      }
      // Initialize with default states from config
      return sectionGroups.reduce(
        (acc, group) => {
          acc[group.id] = group.defaultOpen;
          return acc;
        },
        {} as Record<string, boolean>,
      );
    },
  );

  // Persist section state to localStorage
  const toggleSection = (sectionId: string) => {
    setOpenSections((prev) => {
      const updated = { ...prev, [sectionId]: !prev[sectionId] };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.error("Failed to save admin sidebar state:", e);
      }
      return updated;
    });
  };

  // Auto-expand section if it contains the active route
  useEffect(() => {
    if (currentSection) {
      sectionGroups.forEach((group) => {
        const hasActiveSection = group.sections.some(
          (section) => section.id === currentSection,
        );
        if (hasActiveSection && !openSections[group.id]) {
          setOpenSections((prev) => {
            const updated = { ...prev, [group.id]: true };
            try {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
            } catch (e) {
              console.error("Failed to save admin sidebar state:", e);
            }
            return updated;
          });
        }
      });
    }
  }, [currentSection]);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Couple Roster</SidebarGroupLabel>
          <SidebarGroupContent>
            <ScrollArea className="h-[200px]">
              <SidebarMenu>
                {couples.map((couple) => {
                  const partner1Name =
                    couple.partner1?.full_name ?? "Partner 1";
                  const partner2Name =
                    couple.partner2?.full_name ?? "Partner 2";
                  const isSelected = couple.id === selectedCoupleId;

                  return (
                    <SidebarMenuItem key={couple.id}>
                      <SidebarMenuButton
                        onClick={() => onSelectCouple(couple.id)}
                        className={isSelected ? "bg-sidebar-accent" : ""}
                        data-testid={`sidebar-couple-${couple.id}`}
                      >
                        <div className="flex items-center gap-3 w-full">
                          <div className="flex -space-x-2">
                            <Avatar className="h-6 w-6 border-2 border-sidebar">
                              <AvatarFallback className="text-xs">
                                {getInitials(partner1Name)}
                              </AvatarFallback>
                            </Avatar>
                            <Avatar className="h-6 w-6 border-2 border-sidebar">
                              <AvatarFallback className="text-xs">
                                {getInitials(partner2Name)}
                              </AvatarFallback>
                            </Avatar>
                          </div>
                          <span className="text-sm truncate">
                            {partner1Name} & {partner2Name}
                          </span>
                        </div>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </ScrollArea>
          </SidebarGroupContent>
        </SidebarGroup>

        {selectedCouple && onSelectSection ? (
          <>
            {sectionGroups.map((group) => {
              const isOpen = openSections[group.id] ?? group.defaultOpen;
              const hasActiveSection = group.sections.some(
                (section) => section.id === currentSection,
              );

              return (
                <Collapsible
                  key={group.id}
                  open={isOpen}
                  onOpenChange={() => toggleSection(group.id)}
                  className="group/collapsible"
                >
                  <SidebarGroup>
                    <SidebarGroupLabel asChild>
                      <CollapsibleTrigger className="flex w-full items-center gap-2 hover-elevate active-elevate-2 p-2 rounded-md -m-2">
                        <span className="flex-1 text-left">{group.label}</span>
                        <ChevronDown
                          className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
                        />
                      </CollapsibleTrigger>
                    </SidebarGroupLabel>
                    <CollapsibleContent>
                      <SidebarGroupContent>
                        <SidebarMenu>
                          <SidebarMenuSub>
                            {group.sections.map((section) => {
                              const Icon = section.icon;
                              const isActive = currentSection === section.id;

                              return (
                                <SidebarMenuSubItem key={section.id}>
                                  <SidebarMenuSubButton
                                    onClick={() => onSelectSection(section.id)}
                                    isActive={isActive}
                                    data-testid={`sidebar-section-${section.id}`}
                                  >
                                    <Icon className="h-4 w-4" />
                                    <span>{section.label}</span>
                                  </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                              );
                            })}
                          </SidebarMenuSub>
                        </SidebarMenu>
                      </SidebarGroupContent>
                    </CollapsibleContent>
                  </SidebarGroup>
                </Collapsible>
              );
            })}
          </>
        ) : (
          !selectedCouple && (
            <SidebarGroup>
              <SidebarGroupContent>
                <div className="p-4 text-sm text-muted-foreground text-center">
                  Select a couple to view sections
                </div>
              </SidebarGroupContent>
            </SidebarGroup>
          )
        )}
      </SidebarContent>
    </Sidebar>
  );
}

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
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
  LayoutDashboard,
  Settings,
  Plus,
  Search,
  ChevronDown,
  Sparkles,
  Activity,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"; // Used for couple selector dropdown
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { LogOut } from "lucide-react";

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

interface AdminNavigationProps {
  couples: Couple[];
  selectedCoupleId: string | null;
  onSelectCouple: (coupleId: string) => void;
  currentSection?: string;
  onSelectSection?: (section: string) => void;
  onAddCouple?: () => void;
}

const MAIN_TABS = [
  { id: "overview", label: "Overview", icon: Home },
  { id: "insights", label: "Insights", icon: TrendingUp },
  { id: "tools", label: "Therapy Tools", icon: Wrench },
  { id: "customize", label: "Customize", icon: LayoutDashboard },
];

const INSIGHT_SECTIONS = [
  { id: "checkins", label: "Weekly Check-ins", icon: TrendingUp },
  { id: "languages", label: "Love Languages", icon: Heart },
  { id: "lovemap", label: "Love Map", icon: Map },
  { id: "analytics", label: "AI Analytics", icon: Brain },
];

const TOOL_SECTIONS = [
  { id: "messages", label: "Messages", icon: MessageSquare },
  { id: "echo", label: "Echo & Empathy", icon: Users },
  { id: "conversations", label: "Hold Me Tight", icon: Heart },
  { id: "pause", label: "Pause History", icon: Pause },
  { id: "goals", label: "Shared Goals", icon: Target },
  { id: "calendar", label: "Calendar", icon: Calendar },
  { id: "rituals", label: "Rituals", icon: Book },
  { id: "ifs", label: "IFS Exercises", icon: Brain },
  { id: "activity", label: "Activity Feed", icon: Activity },
];

export function AdminNavigation({
  couples,
  selectedCoupleId,
  onSelectCouple,
  currentSection = "overview",
  onSelectSection,
  onAddCouple,
}: AdminNavigationProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const { profile, signOut } = useAuth();
  const selectedCouple = couples.find((c) => c.id === selectedCoupleId);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getCoupleDisplayName = (couple: Couple) => {
    const p1 = couple.partner1?.full_name?.split(" ")[0] || "Partner 1";
    const p2 = couple.partner2?.full_name?.split(" ")[0] || "Partner 2";
    return `${p1} & ${p2}`;
  };

  const filteredCouples = couples.filter((couple) => {
    if (!searchQuery) return true;
    const name = getCoupleDisplayName(couple).toLowerCase();
    return name.includes(searchQuery.toLowerCase());
  });

  const getActiveTab = () => {
    if (currentSection === "overview") return "overview";
    if (currentSection === "dashboard-customization") return "customize";
    if (INSIGHT_SECTIONS.some((s) => s.id === currentSection))
      return "insights";
    if (TOOL_SECTIONS.some((s) => s.id === currentSection)) return "tools";
    return "overview";
  };

  const handleTabChange = (tab: string) => {
    if (!onSelectSection) return;
    if (tab === "overview") onSelectSection("overview");
    else if (tab === "customize") onSelectSection("dashboard-customization");
    else if (tab === "insights") onSelectSection("checkins");
    else if (tab === "tools") onSelectSection("messages");
  };

  return (
    <div className="border-b bg-card">
      <div className="flex items-center gap-4 px-4 py-3">
        <div className="flex items-center gap-2 shrink-0">
          <Heart className="h-6 w-6 text-primary" />
          <span className="font-semibold text-base sm:text-lg">ALEIC</span>
        </div>

        <div className="flex-1 flex items-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="gap-2 min-w-0 flex-1 justify-between text-xs sm:text-base"
                data-testid="dropdown-couple-selector"
              >
                {selectedCouple ? (
                  <div className="flex items-center gap-2">
                    <div className="flex -space-x-1">
                      <Avatar className="h-5 w-5 border border-background">
                        <AvatarFallback className="text-[10px]">
                          {getInitials(
                            selectedCouple.partner1?.full_name || "P1",
                          )}
                        </AvatarFallback>
                      </Avatar>
                      <Avatar className="h-5 w-5 border border-background">
                        <AvatarFallback className="text-[10px]">
                          {getInitials(
                            selectedCouple.partner2?.full_name || "P2",
                          )}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                    <span className="truncate">
                      {getCoupleDisplayName(selectedCouple)}
                    </span>
                  </div>
                ) : (
                  <span className="text-muted-foreground">Select a couple</span>
                )}
                <ChevronDown className="h-4 w-4 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[280px]">
              <div className="p-2">
                <Input
                  placeholder="Search couples..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-8"
                  data-testid="input-search-couples"
                />
              </div>
              <DropdownMenuSeparator />
              <div className="max-h-[300px] overflow-y-auto">
                {filteredCouples.map((couple) => (
                  <DropdownMenuItem
                    key={couple.id}
                    onClick={() => onSelectCouple(couple.id)}
                    className={cn(
                      "gap-2 cursor-pointer",
                      couple.id === selectedCoupleId && "bg-accent",
                    )}
                    data-testid={`menu-item-couple-${couple.id}`}
                  >
                    <div className="flex -space-x-1">
                      <Avatar className="h-6 w-6 border border-background">
                        <AvatarFallback className="text-xs">
                          {getInitials(couple.partner1?.full_name || "P1")}
                        </AvatarFallback>
                      </Avatar>
                      <Avatar className="h-6 w-6 border border-background">
                        <AvatarFallback className="text-xs">
                          {getInitials(couple.partner2?.full_name || "P2")}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                    <span>{getCoupleDisplayName(couple)}</span>
                  </DropdownMenuItem>
                ))}
                {filteredCouples.length === 0 && (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    No couples found
                  </div>
                )}
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={onAddCouple}
                className="gap-2 cursor-pointer text-primary"
                data-testid="menu-item-add-couple"
              >
                <Plus className="h-4 w-4" />
                Add New Couple
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

      </div>

      <div className="flex items-center gap-2 px-4 py-2 border-b">
        <Badge variant="secondary" className="gap-1 whitespace-nowrap text-xs sm:text-sm">
          <Users className="h-3 w-3" />
          {couples.length} couples
        </Badge>
      </div>

      {selectedCouple && onSelectSection && (
        <div className="px-4 pb-0 overflow-x-auto">
          <Tabs value={getActiveTab()} onValueChange={handleTabChange}>
            <TabsList className="h-auto w-full justify-start bg-transparent p-0 border-b-0 gap-1 min-w-max">
              {MAIN_TABS.map((tab) => {
                const Icon = tab.icon;
                return (
                  <TabsTrigger
                    key={tab.id}
                    value={tab.id}
                    className="gap-2 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-3 py-2 whitespace-nowrap"
                    data-testid={`tab-${tab.id}`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="whitespace-nowrap">{tab.label}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </Tabs>

          {getActiveTab() === "insights" && (
            <div className="flex gap-1 py-2 overflow-x-auto">
              {INSIGHT_SECTIONS.map((section) => {
                const Icon = section.icon;
                return (
                  <Button
                    key={section.id}
                    variant={
                      currentSection === section.id ? "secondary" : "ghost"
                    }
                    size="sm"
                    className="gap-1.5 flex-shrink-0"
                    onClick={() => onSelectSection(section.id)}
                    data-testid={`button-section-${section.id}`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {section.label}
                  </Button>
                );
              })}
            </div>
          )}

          {getActiveTab() === "tools" && (
            <div className="flex gap-1 py-2 overflow-x-auto">
              {TOOL_SECTIONS.map((section) => {
                const Icon = section.icon;
                return (
                  <Button
                    key={section.id}
                    variant={
                      currentSection === section.id ? "secondary" : "ghost"
                    }
                    size="sm"
                    className="gap-1.5 flex-shrink-0"
                    onClick={() => onSelectSection(section.id)}
                    data-testid={`button-section-${section.id}`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {section.label}
                  </Button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

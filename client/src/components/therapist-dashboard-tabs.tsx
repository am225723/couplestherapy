import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  LayoutDashboard,
  FileText,
  Settings2,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type TabCategory = "overview" | "session" | "client" | "communication";

interface TherapistDashboardTabsProps {
  activeTab: TabCategory;
  onTabChange: (tab: TabCategory) => void;
}

const TABS = [
  {
    id: "overview" as const,
    label: "Overview",
    icon: LayoutDashboard,
    color: "from-teal-500 to-emerald-500",
    bgColor: "bg-teal-500/10",
    textColor: "text-teal-600 dark:text-teal-400",
    borderColor: "border-teal-500",
  },
  {
    id: "session" as const,
    label: "Session Tools",
    icon: FileText,
    color: "from-violet-500 to-purple-500",
    bgColor: "bg-violet-500/10",
    textColor: "text-violet-600 dark:text-violet-400",
    borderColor: "border-violet-500",
  },
  {
    id: "client" as const,
    label: "Client Management",
    icon: Settings2,
    color: "from-amber-500 to-orange-500",
    bgColor: "bg-amber-500/10",
    textColor: "text-amber-600 dark:text-amber-400",
    borderColor: "border-amber-500",
  },
  {
    id: "communication" as const,
    label: "Communication",
    icon: MessageSquare,
    color: "from-rose-500 to-pink-500",
    bgColor: "bg-rose-500/10",
    textColor: "text-rose-600 dark:text-rose-400",
    borderColor: "border-rose-500",
  },
];

export function TherapistDashboardTabs({
  activeTab,
  onTabChange,
}: TherapistDashboardTabsProps) {
  return (
    <div className="sticky top-[120px] z-30 bg-background/95 backdrop-blur-sm border-b">
      <div className="px-4 py-2">
        <Tabs value={activeTab} onValueChange={(v) => onTabChange(v as TabCategory)}>
          <TabsList className="h-auto w-full justify-start bg-transparent p-0 gap-1 flex-wrap">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className={cn(
                    "gap-1.5 px-3 py-2 rounded-lg transition-all duration-200",
                    "data-[state=active]:shadow-none",
                    isActive
                      ? `${tab.bgColor} ${tab.textColor} border-2 ${tab.borderColor}`
                      : "border-2 border-transparent hover:bg-muted/50"
                  )}
                  data-testid={`tab-${tab.id}`}
                >
                  <Icon className={cn("h-4 w-4 flex-shrink-0", isActive && tab.textColor)} />
                  <span className="font-medium text-sm">{tab.label}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>
        </Tabs>
      </div>
    </div>
  );
}

export function getTabColor(tab: TabCategory) {
  const found = TABS.find((t) => t.id === tab);
  return found || TABS[0];
}

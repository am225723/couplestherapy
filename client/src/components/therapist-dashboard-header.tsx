import { useState } from "react";
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
} from "@/components/ui/dropdown-menu";
import {
  Heart,
  ChevronDown,
  Plus,
  Search,
  Sparkles,
  FileText,
  Users,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Couple {
  id: string;
  partner1?: {
    id: string;
    full_name: string | null;
  };
  partner2?: {
    id: string;
    full_name: string | null;
  };
}

interface TherapistDashboardHeaderProps {
  couples: Couple[];
  selectedCouple: Couple | null;
  onSelectCouple: (coupleId: string) => void;
  onAddCouple: () => void;
  onAISessionPrep?: () => void;
  isAILoading?: boolean;
}

export function TherapistDashboardHeader({
  couples,
  selectedCouple,
  onSelectCouple,
  onAddCouple,
  onAISessionPrep,
  isAILoading,
}: TherapistDashboardHeaderProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "?";
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

  return (
    <div className="sticky top-0 z-40 bg-gradient-to-r from-primary/5 via-background to-accent/5 border-b backdrop-blur-sm">
      <div className="flex items-center gap-4 px-4 py-3">
        <div className="flex items-center gap-2 shrink-0">
          <div className="p-2 rounded-xl bg-gradient-to-br from-primary to-accent">
            <Heart className="h-5 w-5 text-white" />
          </div>
          <span className="font-bold text-lg bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            ALEIC
          </span>
        </div>

        <div className="flex-1 flex items-center gap-3 max-w-md">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="gap-2 w-full justify-between bg-background/80 hover:bg-background"
                data-testid="dropdown-couple-selector"
              >
                {selectedCouple ? (
                  <div className="flex items-center gap-2">
                    <div className="flex -space-x-1">
                      <Avatar className="h-6 w-6 border-2 border-primary/20">
                        <AvatarFallback className="text-xs bg-gradient-to-br from-teal-400 to-teal-600 text-white">
                          {getInitials(selectedCouple.partner1?.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <Avatar className="h-6 w-6 border-2 border-secondary/20">
                        <AvatarFallback className="text-xs bg-gradient-to-br from-coral-400 to-coral-600 text-white">
                          {getInitials(selectedCouple.partner2?.full_name)}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                    <span className="font-medium truncate">
                      {getCoupleDisplayName(selectedCouple)}
                    </span>
                  </div>
                ) : (
                  <span className="text-muted-foreground">Select a couple</span>
                )}
                <ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[300px]">
              <div className="p-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search couples..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 h-9"
                    data-testid="input-search-couples"
                  />
                </div>
              </div>
              <DropdownMenuSeparator />
              <div className="max-h-[300px] overflow-y-auto">
                {filteredCouples.map((couple) => (
                  <DropdownMenuItem
                    key={couple.id}
                    onClick={() => onSelectCouple(couple.id)}
                    className={cn(
                      "gap-2 cursor-pointer py-2",
                      couple.id === selectedCouple?.id && "bg-primary/10"
                    )}
                    data-testid={`menu-item-couple-${couple.id}`}
                  >
                    <div className="flex -space-x-1">
                      <Avatar className="h-7 w-7 border-2 border-background">
                        <AvatarFallback className="text-xs bg-gradient-to-br from-teal-400 to-teal-600 text-white">
                          {getInitials(couple.partner1?.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <Avatar className="h-7 w-7 border-2 border-background">
                        <AvatarFallback className="text-xs bg-gradient-to-br from-coral-400 to-coral-600 text-white">
                          {getInitials(couple.partner2?.full_name)}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="font-medium">{getCoupleDisplayName(couple)}</span>
                    </div>
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
                className="gap-2 cursor-pointer text-primary font-medium"
                data-testid="menu-item-add-couple"
              >
                <Plus className="h-4 w-4" />
                Add New Couple
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {selectedCouple && (
          <div className="flex items-center gap-2 ml-auto shrink-0">
            <Badge 
              variant="secondary" 
              className="gap-1 bg-primary/10 text-primary border-primary/20 whitespace-nowrap hidden sm:flex"
            >
              <Users className="h-3 w-3" />
              {couples.length}
            </Badge>
            {onAISessionPrep && (
              <Button
                size="sm"
                onClick={onAISessionPrep}
                disabled={isAILoading}
                className="gap-1.5 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white shadow-md whitespace-nowrap"
                data-testid="button-ai-session-prep"
              >
                {isAILoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    <span className="hidden sm:inline">AI Prep</span>
                  </>
                )}
              </Button>
            )}
          </div>
        )}
      </div>

      {selectedCouple && (
        <div className="flex items-center gap-3 px-4 pb-3">
          <div className="flex items-center gap-3 p-2 rounded-lg bg-card/50 border">
            <div className="flex -space-x-2">
              <Avatar className="h-10 w-10 border-2 border-teal-200 dark:border-teal-800 ring-2 ring-teal-500/20">
                <AvatarFallback className="bg-gradient-to-br from-teal-400 to-teal-600 text-white font-semibold">
                  {getInitials(selectedCouple.partner1?.full_name)}
                </AvatarFallback>
              </Avatar>
              <Avatar className="h-10 w-10 border-2 border-coral-200 dark:border-coral-800 ring-2 ring-coral-500/20">
                <AvatarFallback className="bg-gradient-to-br from-coral-400 to-coral-600 text-white font-semibold">
                  {getInitials(selectedCouple.partner2?.full_name)}
                </AvatarFallback>
              </Avatar>
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-base">
                {selectedCouple.partner1?.full_name || "Partner 1"} & {selectedCouple.partner2?.full_name || "Partner 2"}
              </span>
              <span className="text-xs text-muted-foreground">Currently viewing</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

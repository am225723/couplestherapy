import { Heart, Users, MessageSquare, Calendar, Target, Book, Brain, Pause, TrendingUp, Home } from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Couple {
  id: string;
  partner1?: {
    id: string;
    full_name: string;
  };
  partner2?: {
    id: string;
    full_name: string;
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
    label: 'Core Insights',
    sections: [
      { id: 'overview', label: 'Overview', icon: Home },
      { id: 'checkins', label: 'Weekly Check-ins', icon: TrendingUp },
      { id: 'languages', label: 'Love Languages', icon: Heart },
      { id: 'analytics', label: 'AI Analytics', icon: Brain },
    ],
  },
  {
    label: 'Communication Tools',
    sections: [
      { id: 'messages', label: 'Messages', icon: MessageSquare },
      { id: 'echo', label: 'Echo & Empathy', icon: Users },
      { id: 'pause', label: 'Pause History', icon: Pause },
      { id: 'conversations', label: 'Hold Me Tight', icon: Heart },
    ],
  },
  {
    label: 'Planning & Goals',
    sections: [
      { id: 'goals', label: 'Shared Goals', icon: Target },
      { id: 'calendar', label: 'Calendar', icon: Calendar },
      { id: 'rituals', label: 'Rituals', icon: Book },
    ],
  },
  {
    label: 'Support Resources',
    sections: [
      { id: 'activity', label: 'Activity Feed', icon: TrendingUp },
      { id: 'ifs', label: 'IFS Exercises', icon: Brain },
      { id: 'therapy-tools', label: 'Therapy Tools', icon: Book },
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

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
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
                  const partner1Name = couple.partner1?.full_name || 'Partner 1';
                  const partner2Name = couple.partner2?.full_name || 'Partner 2';
                  const isSelected = couple.id === selectedCoupleId;

                  return (
                    <SidebarMenuItem key={couple.id}>
                      <SidebarMenuButton
                        onClick={() => onSelectCouple(couple.id)}
                        className={isSelected ? 'bg-sidebar-accent' : ''}
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

        {selectedCouple && onSelectSection && (
          <>
            {sectionGroups.map((group) => (
              <SidebarGroup key={group.label}>
                <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {group.sections.map((section) => {
                      const Icon = section.icon;
                      const isActive = currentSection === section.id;

                      return (
                        <SidebarMenuItem key={section.id}>
                          <SidebarMenuButton
                            onClick={() => onSelectSection(section.id)}
                            className={isActive ? 'bg-sidebar-accent' : ''}
                            data-testid={`sidebar-section-${section.id}`}
                          >
                            <Icon className="h-4 w-4" />
                            <span>{section.label}</span>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            ))}
          </>
        )}

        {!selectedCouple && (
          <SidebarGroup>
            <SidebarGroupContent>
              <div className="p-4 text-sm text-muted-foreground text-center">
                Select a couple to view sections
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
}

import { LucideIcon } from 'lucide-react';
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
  FolderKanban
} from 'lucide-react';

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
    id: 'dashboard',
    label: 'Home',
    icon: Home,
    defaultOpen: true,
    routes: [
      { title: 'Dashboard', url: '/dashboard', icon: Home, testId: 'nav-dashboard' },
    ],
  },
  {
    id: 'assessments',
    label: 'Assessments & Check-ins',
    icon: CheckSquare,
    defaultOpen: true,
    routes: [
      { title: 'Weekly Check-In', url: '/weekly-checkin', icon: ClipboardList, testId: 'nav-checkin' },
      { title: 'Love Language Quiz', url: '/quiz', icon: Heart, testId: 'nav-love-language' },
      { title: 'Love Map Quiz', url: '/love-map', icon: Map, testId: 'nav-love-map' },
      { title: 'Four Horsemen', url: '/four-horsemen', icon: AlertTriangle, testId: 'nav-four-horsemen' },
      { title: 'Demon Dialogues', url: '/demon-dialogues', icon: MessageCircle, testId: 'nav-demon-dialogues' },
    ],
  },
  {
    id: 'communication',
    label: 'Communication Tools',
    icon: MessageSquare,
    defaultOpen: false,
    routes: [
      { title: 'Messages', url: '/messages', icon: MessageSquare, testId: 'nav-messages' },
      { title: 'Voice Memos', url: '/voice-memos', icon: Mic, testId: 'nav-voice-memos' },
      { title: 'Echo & Empathy', url: '/echo-empathy', icon: Volume2, testId: 'nav-echo-empathy' },
      { title: 'Hold Me Tight', url: '/conversation', icon: MessageCircle, testId: 'nav-hold-me-tight' },
      { title: 'Pause Button', url: '/pause', icon: PauseCircle, testId: 'nav-pause' },
    ],
  },
  {
    id: 'growth',
    label: 'Personal Growth',
    icon: Lightbulb,
    defaultOpen: false,
    routes: [
      { title: 'IFS Introduction', url: '/ifs-intro', icon: User, testId: 'nav-ifs' },
      { title: 'Meditation Library', url: '/meditation-library', icon: BookOpen, testId: 'nav-meditation' },
      { title: 'Values & Vision', url: '/values-vision', icon: Compass, testId: 'nav-values' },
    ],
  },
  {
    id: 'connection',
    label: 'Connection & Fun',
    icon: Smile,
    defaultOpen: false,
    routes: [
      { title: 'Date Night Generator', url: '/date-night', icon: Sparkles, testId: 'nav-date-night' },
      { title: 'Gratitude Log', url: '/gratitude', icon: Heart, testId: 'nav-gratitude' },
      { title: 'Intimacy Mapping', url: '/intimacy-mapping', icon: Activity, testId: 'nav-intimacy' },
      { title: 'Parenting Partners', url: '/parenting-partners', icon: Baby, testId: 'nav-parenting' },
    ],
  },
  {
    id: 'planning',
    label: 'Planning & Organization',
    icon: FolderKanban,
    defaultOpen: false,
    routes: [
      { title: 'Calendar', url: '/calendar', icon: Calendar, testId: 'nav-calendar' },
      { title: 'Shared Goals', url: '/goals', icon: Target, testId: 'nav-goals' },
      { title: 'Rituals', url: '/rituals', icon: Coffee, testId: 'nav-rituals' },
    ],
  },
];

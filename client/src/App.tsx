import { useEffect } from 'react';
import { Switch, Route, Redirect } from 'wouter';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import { AuthProvider, useAuth } from './lib/auth-context';
import { ThemeProvider } from './components/theme-provider';
import { ThemeToggle } from './components/theme-toggle';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { SidebarProvider, Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarTrigger, SidebarHeader } from '@/components/ui/sidebar';
import { Button } from './components/ui/button';
import { Home, ClipboardList, Sparkles, Target, Coffee, MessageCircle, Mic, Users, LogOut, Loader2, BarChart3, UserPlus, Heart, MessageSquare, Calendar as CalendarIcon } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import tadiLogo from '@assets/logo_1762363277396.png';

import AuthPage from './pages/auth';
import CoupleSetup from './pages/couple-setup';
import LoveLanguageQuiz from './pages/love-language-quiz';
import WeeklyCheckin from './pages/weekly-checkin';
import CheckinHistory from './pages/checkin-history';
import GratitudeLogPage from './pages/gratitude-log';
import SharedGoalsPage from './pages/shared-goals';
import RitualsPage from './pages/rituals';
import HoldMeTightPage from './pages/hold-me-tight';
import VoiceMemosPage from './pages/voice-memos';
import DateNightPage from './pages/date-night';
import MessagesPage from './pages/messages';
import CalendarPage from './pages/calendar';
import ClientDashboard from './pages/client-dashboard';
import AdminDashboard from './pages/admin-dashboard';
import AnalyticsPage from './pages/analytics';
import UserManagementPage from './pages/user-management';
import NotFound from './pages/not-found';

function AppSidebar() {
  const { profile, signOut } = useAuth();
  const [location] = useLocation();

  const clientMenuItems = [
    { title: 'Dashboard', url: '/dashboard', icon: Home },
    { title: 'Weekly Check-In', url: '/weekly-checkin', icon: ClipboardList },
    { title: 'Messages', url: '/messages', icon: MessageSquare },
    { title: 'Calendar', url: '/calendar', icon: CalendarIcon },
    { title: 'Date Night Generator', url: '/date-night', icon: Sparkles },
    { title: 'Gratitude Log', url: '/gratitude', icon: Heart },
    { title: 'Shared Goals', url: '/goals', icon: Target },
    { title: 'Rituals', url: '/rituals', icon: Coffee },
    { title: 'Hold Me Tight', url: '/conversation', icon: MessageCircle },
    { title: 'Voice Memos', url: '/voice-memos', icon: Mic },
  ];

  const adminMenuItems = [
    { title: 'Couples', url: '/admin', icon: Users },
    { title: 'Analytics', url: '/admin/analytics', icon: BarChart3 },
    { title: 'User Management', url: '/admin/user-management', icon: UserPlus },
  ];

  const menuItems = profile?.role === 'therapist' ? adminMenuItems : clientMenuItems;

  const homeUrl = profile?.role === 'therapist' ? '/admin' : '/dashboard';

  return (
    <Sidebar>
      <SidebarHeader className="p-6 border-b">
        <Link href={homeUrl} className="flex items-center gap-3 hover-elevate active-elevate-2 p-2 rounded-md -m-2" data-testid="link-home">
          <img 
            src={tadiLogo} 
            alt="TADI Logo" 
            className="h-10 w-auto"
            data-testid="img-sidebar-logo"
          />
          <span className="text-xl font-bold">TADI</span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>
            {profile?.role === 'therapist' ? 'Therapist Portal' : 'Your Journey'}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={location === item.url}>
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={signOut}>
                  <LogOut className="h-4 w-4" />
                  <span>Sign Out</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

function AuthenticatedApp() {
  const { user, profile, loading } = useAuth();
  const [location, setLocation] = useLocation();

  // Redirect users to their appropriate home page on first authentication
  // This prevents 404 errors when therapists sign in while on client routes (or vice versa)
  useEffect(() => {
    if (!loading && user && profile) {
      const therapistRoutes = ['/admin', '/admin/analytics', '/admin/user-management'];
      const clientRoutes = ['/dashboard', '/couple-setup', '/quiz', '/weekly-checkin', '/checkin-history', '/gratitude', '/goals', '/rituals', '/conversation', '/voice-memos', '/date-night', '/messages', '/calendar'];
      
      const isTherapist = profile.role === 'therapist';
      const isOnTherapistRoute = location.startsWith('/admin');
      const isOnClientRoute = clientRoutes.some(route => location.startsWith(route));
      const isOnRootRoute = location === '/';
      
      // If therapist is on a client route, redirect to /admin
      if (isTherapist && isOnClientRoute) {
        setLocation('/admin');
      }
      // If client is on a therapist route, redirect based on couple setup status
      else if (!isTherapist && isOnTherapistRoute) {
        setLocation(profile.couple_id ? '/dashboard' : '/couple-setup');
      }
      // If on root route, redirect based on role
      else if (isOnRootRoute) {
        if (isTherapist) {
          setLocation('/admin');
        } else {
          setLocation(profile.couple_id ? '/dashboard' : '/couple-setup');
        }
      }
    }
  }, [user, profile, loading, location, setLocation]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p>Loading your profile...</p>
        </div>
      </div>
    );
  }

  const style = {
    '--sidebar-width': '16rem',
    '--sidebar-width-icon': '3rem',
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="flex items-center justify-between p-4 border-b bg-background">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">
                {profile.full_name} ({profile.role})
              </span>
              <ThemeToggle />
            </div>
          </header>
          <main className="flex-1 overflow-y-auto">
            <Switch>
              {profile.role === 'therapist' ? (
                <>
                  <Route path="/admin" component={AdminDashboard} />
                  <Route path="/admin/couple/:id" component={AdminDashboard} />
                  <Route path="/admin/analytics" component={AnalyticsPage} />
                  <Route path="/admin/user-management" component={UserManagementPage} />
                  <Route path="/">
                    <Redirect to="/admin" />
                  </Route>
                </>
              ) : (
                <>
                  <Route path="/couple-setup" component={CoupleSetup} />
                  <Route path="/dashboard" component={ClientDashboard} />
                  <Route path="/quiz" component={LoveLanguageQuiz} />
                  <Route path="/weekly-checkin" component={WeeklyCheckin} />
                  <Route path="/checkin-history" component={CheckinHistory} />
                  <Route path="/gratitude" component={GratitudeLogPage} />
                  <Route path="/goals" component={SharedGoalsPage} />
                  <Route path="/rituals" component={RitualsPage} />
                  <Route path="/conversation" component={HoldMeTightPage} />
                  <Route path="/voice-memos" component={VoiceMemosPage} />
                  <Route path="/date-night" component={DateNightPage} />
                  <Route path="/messages" component={MessagesPage} />
                  <Route path="/calendar" component={CalendarPage} />
                  <Route path="/">
                    {profile.couple_id ? <Redirect to="/dashboard" /> : <Redirect to="/couple-setup" />}
                  </Route>
                </>
              )}
              <Route component={NotFound} />
            </Switch>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <TooltipProvider>
            <AuthenticatedApp />
            <Toaster />
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

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
import { Heart, Home, ClipboardList, Sparkles, Target, Coffee, MessageCircle, Users, LogOut, Loader2 } from 'lucide-react';
import { Link, useLocation } from 'wouter';

import AuthPage from './pages/auth';
import CoupleSetup from './pages/couple-setup';
import LoveLanguageQuiz from './pages/love-language-quiz';
import WeeklyCheckin from './pages/weekly-checkin';
import GratitudeLogPage from './pages/gratitude-log';
import SharedGoalsPage from './pages/shared-goals';
import RitualsPage from './pages/rituals';
import HoldMeTightPage from './pages/hold-me-tight';
import ClientDashboard from './pages/client-dashboard';
import AdminDashboard from './pages/admin-dashboard';
import NotFound from './pages/not-found';

function AppSidebar() {
  const { profile, signOut } = useAuth();
  const [location] = useLocation();

  const clientMenuItems = [
    { title: 'Dashboard', url: '/dashboard', icon: Home },
    { title: 'Weekly Check-In', url: '/weekly-checkin', icon: ClipboardList },
    { title: 'Gratitude Log', url: '/gratitude', icon: Sparkles },
    { title: 'Shared Goals', url: '/goals', icon: Target },
    { title: 'Rituals', url: '/rituals', icon: Coffee },
    { title: 'Hold Me Tight', url: '/conversation', icon: MessageCircle },
  ];

  const adminMenuItems = [
    { title: 'Couples', url: '/admin', icon: Users },
  ];

  const menuItems = profile?.role === 'therapist' ? adminMenuItems : clientMenuItems;

  return (
    <Sidebar>
      <SidebarHeader className="p-6 border-b">
        <div className="flex items-center gap-2">
          <Heart className="h-6 w-6 text-primary" />
          <span className="text-xl font-bold">TADI</span>
        </div>
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
                  <Route path="/gratitude" component={GratitudeLogPage} />
                  <Route path="/goals" component={SharedGoalsPage} />
                  <Route path="/rituals" component={RitualsPage} />
                  <Route path="/conversation" component={HoldMeTightPage} />
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

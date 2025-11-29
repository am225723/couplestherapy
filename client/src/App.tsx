import { useEffect, useState, useMemo } from "react";
import { Switch, Route, Redirect } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { AuthProvider, useAuth } from "./lib/auth-context";
import { ThemeProvider } from "./components/theme-provider";
import { ThemeToggle } from "./components/theme-toggle";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { usePushNotifications } from "@/hooks/use-push-notifications";
import {
  SidebarProvider,
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
  SidebarTrigger,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { Button } from "./components/ui/button";
import { Avatar, AvatarFallback } from "./components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Users,
  LogOut,
  Loader2,
  BarChart3,
  UserPlus,
  ChevronDown,
  User,
  Settings,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { clientMenuConfig } from "./config/clientMenuConfig";
import coupleArt from "@assets/Screenshot_20251109_193551_Chrome Beta_1762734968356.jpg";

function getInitials(fullName: string): string {
  return fullName
    .split(" ")
    .map((name) => name.charAt(0).toUpperCase())
    .join("")
    .slice(0, 2);
}

import AuthPage from "./pages/auth";
import TherapistSignup from "./pages/therapist-signup";
import CoupleSignup from "./pages/couple-signup";
import CoupleSetup from "./pages/couple-setup";
import LoveLanguageQuiz from "./pages/love-language-quiz";
import LoveLanguageResults from "./pages/love-language-results";
import LoveMapQuiz from "./pages/love-map";
import WeeklyCheckin from "./pages/weekly-checkin";
import CheckinHistory from "./pages/checkin-history";
import GratitudeLogPage from "./pages/gratitude-log";
import SharedGoalsPage from "./pages/shared-goals";
import RitualsPage from "./pages/rituals";
import HoldMeTightPage from "./pages/hold-me-tight";
import VoiceMemosPage from "./pages/voice-memos";
import DateNightPage from "./pages/date-night";
import MessagesPage from "./pages/messages";
import CalendarPage from "./pages/calendar";
import EchoEmpathyPage from "./pages/echo-empathy";
import IfsIntroPage from "./pages/ifs-intro";
import PauseButtonPage from "./pages/pause-button";
import FourHorsemenPage from "./pages/four-horsemen";
import DemonDialoguesPage from "./pages/demon-dialogues";
import MeditationLibraryPage from "./pages/meditation-library";
import IntimacyMappingPage from "./pages/intimacy-mapping";
import ValuesVisionPage from "./pages/values-vision";
import ParentingPartnersPage from "./pages/parenting-partners";
import ClientDashboard from "./pages/client-dashboard";
import AdminDashboard from "./pages/admin-dashboard";
import TherapistDashboard from "./pages/therapist-dashboard";
import AnalyticsPage from "./pages/analytics";
import InvitationCodesPage from "./pages/invitation-codes";
import AttachmentAssessmentPage from "./pages/attachment-assessment";
import EnneagramAssessmentPage from "./pages/enneagram-assessment";
import CoupleJournalPage from "./pages/couple-journal";
import FinancialToolkitPage from "./pages/financial-toolkit";
import MoodTrackerPage from "./pages/mood-tracker";
import DailyTipsPage from "./pages/daily-tips";
import CoupleCompatibility from "./pages/couple-compatibility";
import ChoreChart from "./pages/chore-chart";
import TherapistThoughtsPage from "./pages/therapist-thoughts";
import TherapistProfile from "./pages/therapist-profile";
import TherapistSettings from "./pages/therapist-settings";
import NotFound from "./pages/not-found";

import _998 from "@assets/998.png";

function AppSidebar() {
  const { profile, signOut } = useAuth();
  const [location] = useLocation();

  // Manage category open/close state with localStorage persistence
  const STORAGE_KEY = "aleic-sidebar-categories";

  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>(
    () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          return JSON.parse(stored);
        }
      } catch (e) {
        console.error("Failed to load sidebar state:", e);
      }
      // Initialize with default states from config
      return clientMenuConfig.reduce(
        (acc, category) => {
          acc[category.id] = category.defaultOpen;
          return acc;
        },
        {} as Record<string, boolean>,
      );
    },
  );

  // Persist category state to localStorage
  const toggleCategory = (categoryId: string) => {
    setOpenCategories((prev) => {
      const updated = { ...prev, [categoryId]: !prev[categoryId] };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.error("Failed to save sidebar state:", e);
      }
      return updated;
    });
  };

  // Auto-expand category if it contains the active route
  useEffect(() => {
    clientMenuConfig.forEach((category) => {
      const hasActiveRoute = category.routes.some(
        (route) => route.url === location,
      );
      if (hasActiveRoute && !openCategories[category.id]) {
        setOpenCategories((prev) => {
          const updated = { ...prev, [category.id]: true };
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
          } catch (e) {
            console.error("Failed to save sidebar state:", e);
          }
          return updated;
        });
      }
    });
  }, [location]);

  const adminMenuItems = [
    { title: "Couples", url: "/admin/couple", icon: Users },
    { title: "Analytics", url: "/admin/analytics", icon: BarChart3 },
    {
      title: "Invitation Codes",
      url: "/admin/invitation-codes",
      icon: UserPlus,
    },
  ];

  const homeUrl =
    profile?.role === "therapist" ? "/admin/couple" : "/dashboard";
  const isTherapist = profile?.role === "therapist";

  return (
    <Sidebar>
      <SidebarHeader className="p-6 border-b">
        <Link
          href={homeUrl}
          className="flex items-center gap-3 hover-elevate active-elevate-2 p-2 rounded-md -m-2"
          data-testid="link-home"
        >
          <img
            src={coupleArt}
            alt="ALEIC - Couple Connection"
            className="h-10 w-auto"
            data-testid="img-sidebar-logo"
          />
          <span className="text-xl font-bold bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
            ALEIC
          </span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        {isTherapist ? (
          <SidebarGroup>
            <SidebarGroupLabel>Therapist Portal</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminMenuItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={location === item.url}>
                      <Link
                        href={item.url}
                        data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ) : (
          <>
            {clientMenuConfig.map((category) => {
              // Special handling for dashboard - render directly without collapsible
              if (category.id === "dashboard") {
                return (
                  <SidebarGroup key={category.id}>
                    <SidebarMenu>
                      {category.routes.map((route) => (
                        <SidebarMenuItem key={route.url}>
                          <SidebarMenuButton
                            asChild
                            isActive={location === route.url}
                          >
                            <Link href={route.url} data-testid={route.testId}>
                              <route.icon className="h-4 w-4" />
                              <span>{route.title}</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenu>
                  </SidebarGroup>
                );
              }

              // Render collapsible categories for all other groups
              const isOpen =
                openCategories[category.id] ?? category.defaultOpen;
              const hasActiveRoute = category.routes.some(
                (route) => route.url === location,
              );

              return (
                <Collapsible
                  key={category.id}
                  open={isOpen}
                  onOpenChange={() => toggleCategory(category.id)}
                  className="group/collapsible"
                >
                  <SidebarGroup>
                    <SidebarGroupLabel asChild>
                      <CollapsibleTrigger className="flex w-full items-center gap-2 hover-elevate active-elevate-2 p-2 rounded-md -m-2">
                        {category.icon && <category.icon className="h-4 w-4" />}
                        <span className="flex-1 text-left">
                          {category.label}
                        </span>
                        <ChevronDown
                          className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
                        />
                      </CollapsibleTrigger>
                    </SidebarGroupLabel>
                    <CollapsibleContent>
                      <SidebarGroupContent>
                        <SidebarMenu>
                          <SidebarMenuSub>
                            {category.routes.map((route) => (
                              <SidebarMenuSubItem key={route.url}>
                                <SidebarMenuSubButton
                                  asChild
                                  isActive={location === route.url}
                                >
                                  <Link
                                    href={route.url}
                                    data-testid={route.testId}
                                  >
                                    <route.icon className="h-4 w-4" />
                                    <span>{route.title}</span>
                                  </Link>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            ))}
                          </SidebarMenuSub>
                        </SidebarMenu>
                      </SidebarGroupContent>
                    </CollapsibleContent>
                  </SidebarGroup>
                </Collapsible>
              );
            })}
          </>
        )}

        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={signOut}
                  data-testid="button-signout"
                >
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
  const { user, profile, loading, signOut } = useAuth();
  const [location, setLocation] = useLocation();

  // Initialize push notifications for both web and mobile
  usePushNotifications();

  // Redirect users to their appropriate home page on first authentication
  // This prevents 404 errors when therapists sign in while on client routes (or vice versa)
  useEffect(() => {
    if (!loading && user && profile) {
      const therapistRoutes = [
        "/admin",
        "/admin/couple",
        "/admin/analytics",
        "/admin/invitation-codes",
        "/therapist-thoughts",
      ];
      const clientRoutes = [
        "/dashboard",
        "/couple-setup",
        "/quiz",
        "/love-language-results",
        "/love-map",
        "/weekly-checkin",
        "/checkin-history",
        "/gratitude",
        "/goals",
        "/rituals",
        "/conversation",
        "/voice-memos",
        "/date-night",
        "/messages",
        "/calendar",
        "/echo-empathy",
        "/ifs-intro",
        "/pause",
        "/four-horsemen",
        "/demon-dialogues",
        "/meditation-library",
        "/intimacy-mapping",
        "/values-vision",
        "/parenting-partners",
        "/couple-compatibility",
        "/attachment-assessment",
        "/enneagram-assessment",
        "/couple-journal",
        "/financial-toolkit",
      ];

      const isTherapist = profile.role === "therapist";
      const isOnTherapistRoute = location.startsWith("/admin");
      const isOnClientRoute = clientRoutes.some((route) =>
        location.startsWith(route),
      );
      const isOnRootRoute = location === "/";

      // If therapist is on /admin (without /couple), redirect to /admin/couple
      if (isTherapist && location === "/admin") {
        setLocation("/admin/couple");
      }
      // If therapist is on a client route, redirect to /admin/couple
      else if (isTherapist && isOnClientRoute) {
        setLocation("/admin/couple");
      }
      // If client is on a therapist route, redirect based on couple setup status
      else if (!isTherapist && isOnTherapistRoute) {
        setLocation(profile.couple_id ? "/dashboard" : "/couple-setup");
      }
      // If on root route, redirect based on role
      else if (isOnRootRoute) {
        if (isTherapist) {
          setLocation("/admin/couple");
        } else {
          setLocation(profile.couple_id ? "/dashboard" : "/couple-setup");
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

  // Allow public access to signup pages
  if (
    !user &&
    (location === "/auth/therapist-signup" ||
      location === "/auth/couple-signup")
  ) {
    return (
      <Switch>
        <Route path="/auth/therapist-signup" component={TherapistSignup} />
        <Route path="/auth/couple-signup" component={CoupleSignup} />
      </Switch>
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
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  // Therapist layout - no sidebar, signout in header
  if (profile.role === "therapist") {
    return (
      <div className="flex flex-col h-screen w-full">
        <header className="flex items-center justify-between p-4 border-b bg-background shrink-0">
          <Link
            href="/admin/couple"
            className="flex items-center gap-3"
            data-testid="link-therapist-home"
          >
            <img src={_998} alt="ALEIC" className="h-8 w-auto" />
            <span className="text-lg font-bold bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
              ALEIC
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Button
              variant="ghost"
              size="sm"
              onClick={signOut}
              className="gap-2"
              data-testid="button-therapist-signout"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="rounded-full hover-elevate active-elevate-2" data-testid="button-therapist-profile">
                  <Avatar className="h-10 w-10 border-2 border-primary/20">
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {profile.full_name ? getInitials(profile.full_name) : "T"}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <div className="px-3 py-2">
                  <p className="text-sm font-semibold">{profile.full_name || "Therapist"}</p>
                  <p className="text-xs text-muted-foreground">Licensed Therapist</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/therapist/profile" className="gap-2 cursor-pointer flex items-center" data-testid="menu-item-profile">
                    <User className="h-4 w-4" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/therapist/settings" className="gap-2 cursor-pointer flex items-center" data-testid="menu-item-settings">
                    <Settings className="h-4 w-4" />
                    Settings
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto">
          <Switch>
            <Route path="/admin" component={TherapistDashboard} />
            <Route path="/admin/couple" component={AdminDashboard} />
            <Route path="/admin/couple/:id" component={AdminDashboard} />
            <Route
              path="/admin/couple/:id/:section"
              component={AdminDashboard}
            />
            <Route path="/admin/analytics" component={AnalyticsPage} />
            <Route
              path="/admin/invitation-codes"
              component={InvitationCodesPage}
            />
            <Route path="/therapist-thoughts" component={AdminDashboard} />
            <Route path="/therapist/profile" component={TherapistProfile} />
            <Route path="/therapist/settings" component={TherapistSettings} />
            <Route path="/">
              <Redirect to="/admin/couple" />
            </Route>
            <Route component={NotFound} />
          </Switch>
        </main>
      </div>
    );
  }

  // Client layout - sidebar with Menu label
  return (
    <SidebarProvider style={style as React.CSSProperties} defaultOpen={false}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="flex items-center justify-between p-4 border-b bg-background">
            <div className="flex items-center gap-2">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
              <span className="text-sm font-medium text-muted-foreground">
                Menu
              </span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">
                {profile.full_name}
              </span>
              <ThemeToggle />
            </div>
          </header>
          <main className="flex-1 overflow-y-auto">
            <Switch>
              <Route path="/couple-setup" component={CoupleSetup} />
              <Route path="/dashboard" component={ClientDashboard} />
              <Route path="/quiz" component={LoveLanguageQuiz} />
              <Route
                path="/love-language-results"
                component={LoveLanguageResults}
              />
              <Route path="/love-map" component={LoveMapQuiz} />
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
              <Route path="/chores" component={ChoreChart} />
              <Route path="/echo-empathy" component={EchoEmpathyPage} />
              <Route path="/ifs-intro" component={IfsIntroPage} />
              <Route path="/pause" component={PauseButtonPage} />
              <Route path="/four-horsemen" component={FourHorsemenPage} />
              <Route path="/demon-dialogues" component={DemonDialoguesPage} />
              <Route
                path="/meditation-library"
                component={MeditationLibraryPage}
              />
              <Route path="/intimacy-mapping" component={IntimacyMappingPage} />
              <Route path="/values-vision" component={ValuesVisionPage} />
              <Route
                path="/parenting-partners"
                component={ParentingPartnersPage}
              />
              <Route
                path="/attachment-assessment"
                component={AttachmentAssessmentPage}
              />
              <Route
                path="/enneagram-assessment"
                component={EnneagramAssessmentPage}
              />
              <Route
                path="/couple-compatibility"
                component={CoupleCompatibility}
              />
              <Route path="/couple-journal" component={CoupleJournalPage} />
              <Route
                path="/financial-toolkit"
                component={FinancialToolkitPage}
              />
              <Route path="/mood-tracker" component={MoodTrackerPage} />
              <Route path="/daily-tips" component={DailyTipsPage} />
              <Route
                path="/therapist-thoughts"
                component={TherapistThoughtsPage}
              />
              <Route path="/">
                {profile.couple_id ? (
                  <Redirect to="/dashboard" />
                ) : (
                  <Redirect to="/couple-setup" />
                )}
              </Route>
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

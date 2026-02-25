import { useEffect } from "react";
import { Redirect, Route, Switch, useLocation } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { queryClient } from "./lib/queryClient";
import { AuthProvider, useAuth } from "./lib/auth-context";
import { ThemeProvider } from "./components/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { usePushNotifications } from "@/hooks/use-push-notifications";
import { ClientTabShell } from "@/components/navigation/client-tab-shell";
import { TherapistTabShell } from "@/components/navigation/therapist-tab-shell";

import AuthPage from "./pages/auth";
import TherapistSignup from "./pages/therapist-signup";
import CoupleSignup from "./pages/couple-signup";
import CoupleSetup from "./pages/couple-setup";
import LoveLanguageQuiz from "./pages/love-language-quiz";
import LoveLanguageResults from "./pages/love-language-results";
import AttachmentResults from "./pages/attachment-results";
import EnneagramResults from "./pages/enneagram-results";
import LoveMapQuiz from "./pages/love-map";
import WeeklyCheckin from "./pages/weekly-checkin";
import CheckinHistory from "./pages/checkin-history";
import SessionNotes from "./pages/session-notes";
import GratitudeLogPage from "./pages/gratitude-log";
import SharedGoalsPage from "./pages/shared-goals";
import RitualsPage from "./pages/rituals";
import HoldMeTightPage from "./pages/hold-me-tight";
import VoiceMemosPage from "./pages/voice-memos";
import DateNightPage from "./pages/date-night";
import SharedTodosPage from "./pages/shared-todos";
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
import AnalyticsPage from "./pages/analytics";
import InvitationCodesPage from "./pages/invitation-codes";
import AttachmentAssessmentPage from "./pages/attachment-assessment";
import EnneagramAssessmentPage from "./pages/enneagram-assessment";
import CoupleJournalPage from "./pages/couple-journal";
import FinancialToolkitPage from "./pages/financial-toolkit";
import MoodTrackerPage from "./pages/mood-tracker";
import DailyTipsPage from "./pages/daily-tips";
import DailySuggestionPage from "./pages/daily-suggestion";
import CoupleCompatibility from "./pages/couple-compatibility";
import ProgressTimelinePage from "./pages/progress-timeline";
import GrowthPlanPage from "./pages/growth-plan";
import ChoreChart from "./pages/chore-chart";
import TherapistThoughtsPage from "./pages/therapist-thoughts";
import TherapistProfile from "./pages/therapist-profile";
import TherapistSettings from "./pages/therapist-settings";
import ClientProfile from "./pages/client-profile";
import ClientSettings from "./pages/client-settings";
import ModulesPage from "./pages/modules";
import ConflictResolution from "./pages/conflict-resolution";
import ReflectionPromptsPage from "./pages/reflection-prompts";
import NotFound from "./pages/not-found";

const CLIENT_ROUTE_PREFIXES = [
  "/dashboard",
  "/couple-setup",
  "/quiz",
  "/love-language-results",
  "/attachment-results",
  "/enneagram-results",
  "/love-map",
  "/weekly-checkin",
  "/checkin-history",
  "/session-notes",
  "/gratitude",
  "/goals",
  "/rituals",
  "/conversation",
  "/voice-memos",
  "/date-night",
  "/messages",
  "/calendar",
  "/chores",
  "/echo-empathy",
  "/ifs-intro",
  "/pause",
  "/four-horsemen",
  "/demon-dialogues",
  "/meditation-library",
  "/intimacy-mapping",
  "/values-vision",
  "/parenting-partners",
  "/attachment-assessment",
  "/enneagram-assessment",
  "/couple-compatibility",
  "/couple-journal",
  "/financial-toolkit",
  "/mood-tracker",
  "/daily-tips",
  "/daily-suggestion",
  "/therapist-thoughts",
  "/profile",
  "/settings",
  "/modules",
  "/conflict-resolution",
  "/reflection-prompts",
  "/shared-todos",
  "/progress-timeline",
  "/growth-plan",
];

function pathMatches(pathname: string, candidate: string): boolean {
  return (
    pathname === candidate ||
    pathname.startsWith(`${candidate}/`) ||
    pathname.startsWith(`${candidate}?`)
  );
}

function AuthenticatedApp() {
  const { user, profile, loading, signOut } = useAuth();
  const [location, setLocation] = useLocation();

  usePushNotifications();

  useEffect(() => {
    if (!loading && user && profile) {
      const isTherapist = profile.role === "therapist";
      const isOnTherapistRoute = location.startsWith("/admin") ||
        location.startsWith("/therapist/");
      const isOnClientRoute = CLIENT_ROUTE_PREFIXES.some((route) =>
        pathMatches(location, route),
      );
      const isOnRootRoute = location === "/";

      if (isTherapist && isOnClientRoute && !location.startsWith("/therapist")) {
        setLocation("/admin/couple");
      } else if (!isTherapist && isOnTherapistRoute) {
        setLocation(profile.couple_id ? "/dashboard" : "/couple-setup");
      } else if (isOnRootRoute) {
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
      <div className="aleic-ambient flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

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
      <div className="aleic-ambient flex min-h-screen items-center justify-center">
        <div className="space-y-4 text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading your profile...</p>
        </div>
      </div>
    );
  }

  if (profile.role === "therapist") {
    return (
      <TherapistTabShell profile={profile} onSignOut={signOut}>
        <Switch>
          <Route path="/admin">
            <Redirect to="/admin/couple" />
          </Route>
          <Route path="/admin/couple" component={AdminDashboard} />
          <Route path="/admin/couple/:id" component={AdminDashboard} />
          <Route path="/admin/couple/:id/:section" component={AdminDashboard} />
          <Route path="/admin/analytics" component={AnalyticsPage} />
          <Route path="/admin/invitation-codes" component={InvitationCodesPage} />
          <Route path="/therapist-thoughts" component={AdminDashboard} />
          <Route path="/therapist/profile" component={TherapistProfile} />
          <Route path="/therapist/settings" component={TherapistSettings} />
          <Route path="/">
            <Redirect to="/admin/couple" />
          </Route>
          <Route component={NotFound} />
        </Switch>
      </TherapistTabShell>
    );
  }

  return (
    <ClientTabShell profile={profile} onSignOut={signOut}>
      <Switch>
        <Route path="/couple-setup" component={CoupleSetup} />
        <Route path="/dashboard" component={ClientDashboard} />
        <Route path="/quiz" component={LoveLanguageQuiz} />
        <Route
          path="/love-language-results"
          component={LoveLanguageResults}
        />
        <Route path="/attachment-results" component={AttachmentResults} />
        <Route path="/enneagram-results" component={EnneagramResults} />
        <Route path="/love-map" component={LoveMapQuiz} />
        <Route path="/weekly-checkin" component={WeeklyCheckin} />
        <Route path="/checkin-history" component={CheckinHistory} />
        <Route path="/session-notes" component={SessionNotes} />
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
        <Route path="/financial-toolkit" component={FinancialToolkitPage} />
        <Route path="/mood-tracker" component={MoodTrackerPage} />
        <Route path="/daily-tips" component={DailyTipsPage} />
        <Route path="/daily-suggestion" component={DailySuggestionPage} />
        <Route path="/therapist-thoughts" component={TherapistThoughtsPage} />
        <Route path="/profile" component={ClientProfile} />
        <Route path="/settings" component={ClientSettings} />
        <Route path="/modules" component={ModulesPage} />
        <Route path="/conflict-resolution" component={ConflictResolution} />
        <Route path="/reflection-prompts" component={ReflectionPromptsPage} />
        <Route path="/shared-todos" component={SharedTodosPage} />
        <Route path="/progress-timeline" component={ProgressTimelinePage} />
        <Route path="/growth-plan" component={GrowthPlanPage} />
        <Route path="/">
          {profile.couple_id ? (
            <Redirect to="/dashboard" />
          ) : (
            <Redirect to="/couple-setup" />
          )}
        </Route>
        <Route component={NotFound} />
      </Switch>
    </ClientTabShell>
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

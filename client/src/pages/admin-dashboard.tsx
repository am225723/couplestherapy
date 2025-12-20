import { useEffect, useState, useRef } from "react";
import { useRoute, Link, useLocation } from "wouter";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { AdminNavigation } from "@/components/admin-navigation";
import { AddCoupleModal } from "@/components/add-couple-modal";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import {
  Users,
  Loader2,
  Heart,
  Send,
  MessageSquare,
  CheckCircle2,
  CheckCircle,
  XCircle,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Target,
  Lightbulb,
  Trash2,
  Menu,
  Sliders,
  Plus,
  AlertCircle,
  FileText,
  Edit,
  Save,
  X,
  Activity,
  LayoutDashboard,
} from "lucide-react";
import {
  Couple,
  Profile,
  WeeklyCheckin,
  LoveLanguage,
  AttachmentAssessment,
  EnneagramAssessment,
  JournalEntry,
  GratitudeLog,
  SharedGoal,
  Ritual,
  Conversation,
  Message,
  CalendarEvent,
  EchoSession,
  EchoTurn,
  IfsExercise,
  IfsPart,
  PauseEvent,
  DashboardCustomization,
  TherapistPrompt,
} from "@shared/schema";
import { DashboardCustomizer } from "@/components/dashboard-customizer";
import { TherapistDashboardEditor } from "@/components/therapist-dashboard-editor";
import { ScheduleNotificationDialog } from "@/components/schedule-notification-dialog";
import { CheckinReminders } from "@/components/checkin-reminders";
import { SessionNotesPanel } from "@/components/session-notes-panel";
import {
  formatDistanceToNow,
  format,
  parse,
  startOfWeek,
  getDay,
} from "date-fns";
import { enUS } from "date-fns/locale/en-US";
import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { aiFunctions } from "@/lib/ai-functions";
import { invokeDashboardCustomization, type DashboardCustomization as DashboardCustomizationType } from "@/lib/dashboard-api";
import adminHeroImage from "@assets/generated_images/Admin_app_hero_image_7f3581f4.png";

const locales = {
  "en-US": enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

type MessageWithSender = Message & {
  sender: Pick<Profile, "id" | "full_name" | "role">;
};

type CoupleWithProfiles = Couple & {
  partner1?: Profile;
  partner2?: Profile;
};

export default function AdminDashboard() {
  const [match, params] = useRoute("/admin/couple/:id/:section?");
  const [, setLocation] = useLocation();

  // Valid sections - guard against malformed URLs (architect recommendation)
  const validSections = [
    "overview",
    "checkins",
    "languages",
    "attachment",
    "enneagram",
    "lovemap",
    "echo",
    "ifs",
    "pause",
    "activity",
    "messages",
    "calendar",
    "therapy-tools",
    "analytics",
    "conversations",
    "goals",
    "rituals",
    "journal",
    "dashboard-customization",
    "prompts",
    "gratitude",
    "conflict",
    "voice-memos",
    "financial",
    "growth-plan",
    "progress-timeline",
    "mood",
    "notes",
    "reminders",
  ];
  const currentSection = validSections.includes(params?.section || "")
    ? params?.section || "overview"
    : "overview";
  const [couples, setCouples] = useState<CoupleWithProfiles[]>([]);
  const [selectedCouple, setSelectedCouple] =
    useState<CoupleWithProfiles | null>(null);
  const [autoSelectedCoupleId, setAutoSelectedCoupleId] = useState<
    string | null
  >(null);
  const [checkins, setCheckins] = useState<
    (WeeklyCheckin & { author?: Profile })[]
  >([]);
  const [loveLanguages, setLoveLanguages] = useState<LoveLanguage[]>([]);
  const [attachmentStyles, setAttachmentStyles] = useState<AttachmentAssessment[]>([]);
  const [enneagramAssessments, setEnneagramAssessments] = useState<EnneagramAssessment[]>([]);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [commentText, setCommentText] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [commentingOn, setCommentingOn] = useState<{
    type: string;
    id: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [messageText, setMessageText] = useState("");
  const [dashboardCustomization, setDashboardCustomization] =
    useState<DashboardCustomization | null>(null);
  const [showAddCoupleModal, setShowAddCoupleModal] = useState(false);
  const [editingPromptId, setEditingPromptId] = useState<string | null>(null);
  const [newPrompt, setNewPrompt] = useState({
    tool_name: "",
    target_user_id: "" as string | null,
    title: "",
    description: "",
    suggested_action: "",
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastFetchedCoupleIdRef = useRef<string | null>(null);
  const { profile, user } = useAuth();
  const { toast } = useToast();

  // Fetch dashboard customization
  const dashboardCustomizationQuery = useQuery<DashboardCustomizationType>({
    queryKey: [`/api/dashboard-customization/couple/${selectedCouple?.id}`],
    queryFn: () => {
      if (!selectedCouple?.id) throw new Error("No couple ID");
      return invokeDashboardCustomization(selectedCouple.id, "GET");
    },
    enabled: !!selectedCouple?.id,
  });

  // Fetch therapist prompts for the couple
  const therapistPromptsQuery = useQuery<TherapistPrompt[]>({
    queryKey: ["/api/therapist-prompts/therapist", selectedCouple?.id],
    queryFn: async () => {
      const response = await fetch(
        `/api/therapist-prompts/therapist/${selectedCouple?.id}`,
      );
      if (!response.ok) throw new Error("Failed to fetch prompts");
      return response.json();
    },
    enabled: !!selectedCouple?.id,
  });

  // Create prompt mutation
  const createPromptMutation = useMutation({
    mutationFn: async (promptData: {
      couple_id: string;
      therapist_id: string;
      target_user_id?: string | null;
      tool_name: string;
      title: string;
      description: string;
      suggested_action: string;
    }) => {
      return apiRequest("POST", "/api/therapist-prompts", promptData);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Prompt created successfully",
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/therapist-prompts/therapist", selectedCouple?.id],
      });
      setNewPrompt({
        tool_name: "",
        target_user_id: null,
        title: "",
        description: "",
        suggested_action: "",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create prompt",
        variant: "destructive",
      });
    },
  });

  // Update prompt mutation
  const updatePromptMutation = useMutation({
    mutationFn: async ({
      id,
      ...data
    }: {
      id: string;
      target_user_id?: string | null;
      tool_name?: string;
      title?: string;
      description?: string;
      suggested_action?: string;
      is_enabled?: boolean;
    }) => {
      return apiRequest("PUT", `/api/therapist-prompts/${id}`, data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Prompt updated successfully",
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/therapist-prompts/therapist", selectedCouple?.id],
      });
      setEditingPromptId(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update prompt",
        variant: "destructive",
      });
    },
  });

  // Delete prompt mutation
  const deletePromptMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/therapist-prompts/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Prompt deleted successfully",
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/therapist-prompts/therapist", selectedCouple?.id],
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete prompt",
        variant: "destructive",
      });
    },
  });

  // AI Session Prep mutation - uses Supabase Edge Function
  const sessionPrepMutation = useMutation({
    mutationFn: async (couple_id: string) => {
      return aiFunctions.getSessionPrep(couple_id);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to generate session prep",
        variant: "destructive",
      });
    },
  });

  // Love Language deletion mutation
  const deleteLoveLanguageMutation = useMutation({
    mutationFn: async (loveLanguageId: string) => {
      return apiRequest("DELETE", `/api/love-languages/${loveLanguageId}`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Love language result deleted successfully",
      });
      // Refresh couple data
      if (selectedCouple) {
        fetchCoupleData(selectedCouple);
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete love language result",
        variant: "destructive",
      });
    },
  });

  // Helper function to navigate to section (architect-recommended)
  const navigateToSection = (coupleId: string, section: string) => {
    setLocation(`/admin/couple/${coupleId}/${section}`);
  };

  // Handle couple selection from sidebar
  const handleSelectCouple = (coupleId: string) => {
    const couple = couples.find((c) => c.id === coupleId);
    if (couple) {
      // Set ref and start fetch BEFORE navigation to prevent useEffect from double-fetching
      const shouldFetch = lastFetchedCoupleIdRef.current !== couple.id;
      if (shouldFetch) {
        fetchCoupleData(couple); // This sets the ref immediately at function start
      }
      setSelectedCouple(couple);
      navigateToSection(coupleId, "overview");
    }
  };

  // Handle section navigation from sidebar
  const handleSelectSection = (section: string) => {
    if (selectedCouple) {
      navigateToSection(selectedCouple.id, section);
    }
  };

  useEffect(() => {
    if (profile?.role === "therapist") {
      fetchCouples();
    }
  }, [profile]);

  useEffect(() => {
    if (couples.length > 0) {
      const targetCoupleId = params?.id || null;
      
      if (targetCoupleId) {
        // If ID is in URL, use it - but only fetch if it changed
        const couple = couples.find((c) => c.id === targetCoupleId);
        if (couple) {
          setSelectedCouple(couple);
          // Only fetch if couple changed - ref is updated inside fetchCoupleData
          if (lastFetchedCoupleIdRef.current !== couple.id) {
            fetchCoupleData(couple);
          }
          setAutoSelectedCoupleId(couple.id);
        }
      } else if (!autoSelectedCoupleId) {
        // If no ID and haven't auto-selected yet, use first couple and navigate
        const firstCouple = couples[0];
        if (firstCouple) {
          setSelectedCouple(firstCouple);
          // Only fetch if couple changed - ref is updated inside fetchCoupleData
          if (lastFetchedCoupleIdRef.current !== firstCouple.id) {
            fetchCoupleData(firstCouple);
          }
          setAutoSelectedCoupleId(firstCouple.id);
          setLocation(`/admin/couple/${firstCouple.id}/overview`);
        }
      }
    }
  }, [params?.id, couples.length, autoSelectedCoupleId]);

  const fetchCouples = async () => {
    if (!profile?.id) return;

    try {
      // Fetch ALL couples (cross-therapist access model)
      const { data: couplesData, error } = await supabase
        .from("Couples_couples")
        .select("*");

      if (error) throw error;

      const allProfiles: Profile[] = [];
      for (const couple of couplesData || []) {
        const { data: profiles } = await supabase
          .from("Couples_profiles")
          .select("*")
          .in("id", [couple.partner1_id, couple.partner2_id]);

        if (profiles) {
          allProfiles.push(...profiles);
        }
      }

      const couplesWithProfiles = (couplesData || []).map((couple) => ({
        ...couple,
        partner1: allProfiles.find((p) => p.id === couple.partner1_id),
        partner2: allProfiles.find((p) => p.id === couple.partner2_id),
      }));

      setCouples(couplesWithProfiles);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchCoupleData = async (couple: CoupleWithProfiles) => {
    // Set ref immediately to prevent duplicate fetches from concurrent code paths
    // This is reset in catch block if fetch fails, allowing retries
    lastFetchedCoupleIdRef.current = couple.id;
    const fetchingCoupleId = couple.id;
    
    try {
      const [
        checkinsRes,
        languagesRes,
        attachmentRes,
        enneagramRes,
        journalRes,
        gratitudeRes,
        goalsRes,
        ritualsRes,
        conversationsRes,
      ] = await Promise.all([
        supabase
          .from("Couples_weekly_checkins")
          .select("*")
          .eq("couple_id", couple.id)
          .order("created_at", { ascending: false })
          .limit(2),
        supabase
          .from("Couples_love_languages")
          .select("*")
          .in("user_id", [couple.partner1_id, couple.partner2_id]),
        supabase
          .from("Couples_attachment_assessments")
          .select("*")
          .in("user_id", [couple.partner1_id, couple.partner2_id]),
        supabase
          .from("Couples_enneagram_assessments")
          .select("*")
          .in("user_id", [couple.partner1_id, couple.partner2_id]),
        supabase
          .from("Couples_journal_entries")
          .select("*")
          .eq("couple_id", couple.id)
          .eq("privacy_level", "therapist")
          .order("created_at", { ascending: false }),
        supabase
          .from("Couples_gratitude_logs")
          .select("*")
          .eq("couple_id", couple.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("Couples_shared_goals")
          .select("*")
          .eq("couple_id", couple.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("Couples_rituals")
          .select("*")
          .eq("couple_id", couple.id)
          .order("category"),
        supabase
          .from("Couples_conversations")
          .select("*")
          .eq("couple_id", couple.id)
          .order("created_at", { ascending: false }),
      ]);

      // Fetch voice memos via Edge Function (metadata only - no storage paths or transcripts)
      let voiceMemosData: any[] = [];
      try {
        voiceMemosData = await aiFunctions.getTherapistVoiceMemos(couple.id);
      } catch (error) {
        console.error("Failed to fetch voice memos:", error);
        voiceMemosData = [];
      }

      const profiles = [couple.partner1, couple.partner2].filter(
        Boolean,
      ) as Profile[];

      const checkinsWithAuthors = (checkinsRes.data || []).map((checkin) => ({
        ...checkin,
        author: profiles.find((p) => p.id === checkin.user_id),
      }));

      setCheckins(checkinsWithAuthors);
      setLoveLanguages(languagesRes.data || []);
      setAttachmentStyles(attachmentRes.data || []);
      setEnneagramAssessments(enneagramRes.data || []);
      setJournalEntries(journalRes.data || []);

      const allActivities = [
        ...(gratitudeRes.data || []).map((item) => ({
          ...item,
          type: "gratitude_logs",
          timestamp: item.created_at,
        })),
        ...(goalsRes.data || []).map((item) => ({
          ...item,
          type: "shared_goals",
          timestamp: item.created_at,
        })),
        ...(ritualsRes.data || []).map((item) => ({
          ...item,
          type: "rituals",
          timestamp: item.created_at || new Date().toISOString(),
        })),
        ...(conversationsRes.data || []).map((item) => ({
          ...item,
          type: "conversations",
          timestamp: item.created_at,
        })),
        ...(voiceMemosData || []).map((item: any) => ({
          ...item,
          type: "voice_memos",
          timestamp: item.created_at,
          sender: { full_name: item.sender_name },
          recipient: { full_name: item.recipient_name },
        })),
      ].sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      );

      setActivities(allActivities);
    } catch (error: any) {
      // Reset ref on error so retries are allowed
      if (lastFetchedCoupleIdRef.current === fetchingCoupleId) {
        lastFetchedCoupleIdRef.current = null;
      }
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleAddComment = async (activityType: string, activityId: string) => {
    if (!selectedCouple || !profile?.id || !commentText.trim()) return;

    try {
      const { error } = await supabase
        .from("Couples_therapist_comments")
        .insert({
          couple_id: selectedCouple.id,
          therapist_id: profile.id,
          comment_text: commentText.trim(),
          is_private_note: isPrivate,
          related_activity_type: activityType,
          related_activity_id: activityId,
        });

      if (error) throw error;

      toast({
        title: "Comment added",
        description: isPrivate
          ? "Private note saved"
          : "Comment will appear in client app",
      });

      setCommentText("");
      setIsPrivate(false);
      setCommentingOn(null);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!selectedCouple) {
    return (
      <div className="min-h-screen bg-background">
        <div className="relative h-64 overflow-hidden">
          <img
            src={adminHeroImage}
            alt="Therapist dashboard"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-primary/40 to-accent/30"></div>
          <div className="relative h-full flex items-center justify-center">
            <div className="text-center space-y-2">
              <h1 className="text-5xl font-bold text-white">
                Therapist Dashboard
              </h1>
              <p className="text-xl text-white/90">
                Monitor and support your couples
              </p>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 py-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-3xl font-bold">Your Couples</h2>
            <Button
              onClick={() => setShowAddCoupleModal(true)}
              className="gap-2"
              data-testid="button-add-couple"
            >
              <Users className="h-4 w-4" />
              Add New Couple
            </Button>
          </div>
          {couples.length === 0 ? (
            <Card className="glass-card border-none text-center py-12">
              <CardContent>
                <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground mb-4">
                  No couples assigned yet
                </p>
                <Button
                  onClick={() => setShowAddCoupleModal(true)}
                  data-testid="button-add-first-couple"
                >
                  Add Your First Couple
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {couples.map((couple) => (
                <Card 
                  key={couple.id} 
                  className="glass-card border-none border-l-4 border-l-primary/50 hover-elevate cursor-pointer group"
                  data-testid={`card-couple-${couple.id}`}
                >
                  <CardHeader className="pb-3">
                    <Link href={`/admin/couple/${couple.id}`}>
                      <CardTitle className="flex items-center gap-3">
                        <div className="flex -space-x-2">
                          <Avatar className="border-2 border-background h-10 w-10">
                            <AvatarFallback className="bg-gradient-to-br from-primary/20 to-accent/20 text-primary font-semibold">
                              {couple.partner1?.full_name?.charAt(0) || "?"}
                            </AvatarFallback>
                          </Avatar>
                          <Avatar className="border-2 border-background h-10 w-10">
                            <AvatarFallback className="bg-gradient-to-br from-secondary/30 to-accent/20 text-secondary-foreground font-semibold">
                              {couple.partner2?.full_name?.charAt(0) || "?"}
                            </AvatarFallback>
                          </Avatar>
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="block truncate">
                            {couple.partner1?.full_name || "Partner 1"} &{" "}
                            {couple.partner2?.full_name || "Partner 2"}
                          </span>
                        </div>
                      </CardTitle>
                    </Link>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center gap-2">
                      <Button 
                        asChild
                        variant="ghost" 
                        size="sm" 
                        className="flex-1 gap-2 h-9"
                      >
                        <Link href={`/admin/couple/${couple.id}/notes`} data-testid={`button-notes-${couple.id}`}>
                          <FileText className="h-4 w-4" />
                          Notes
                        </Link>
                      </Button>
                      <Button 
                        asChild
                        variant="ghost" 
                        size="sm" 
                        className="flex-1 gap-2 h-9"
                      >
                        <Link href={`/admin/couple/${couple.id}/messages`} data-testid={`button-messages-${couple.id}`}>
                          <Send className="h-4 w-4" />
                          Message
                        </Link>
                      </Button>
                      <Button 
                        asChild
                        variant="ghost" 
                        size="sm" 
                        className="flex-1 gap-2 h-9"
                      >
                        <Link href={`/admin/couple/${couple.id}/dashboard-customization`} data-testid={`button-customize-${couple.id}`}>
                          <Sliders className="h-4 w-4" />
                          Customize
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        <AddCoupleModal
          open={showAddCoupleModal}
          onOpenChange={setShowAddCoupleModal}
          therapistId={profile?.id || ""}
          onSuccess={() => {
            fetchCouples();
          }}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-full">
      <AdminNavigation
        couples={couples}
        selectedCoupleId={selectedCouple?.id || null}
        onSelectCouple={handleSelectCouple}
        currentSection={currentSection}
        onSelectSection={handleSelectSection}
        onAddCouple={() => setShowAddCoupleModal(true)}
      />

      <div className="flex flex-col flex-1 overflow-y-auto min-h-0">
        <header className="border-b shrink-0 bg-gradient-to-r from-background to-muted/30">
          <div className="flex items-center justify-between p-4 gap-4">
            <div className="flex items-center gap-4">
              {selectedCouple && (
                <div className="flex items-center gap-3">
                  <div className="flex -space-x-2">
                    <Avatar className="border-2 border-background h-10 w-10">
                      <AvatarFallback className="bg-gradient-to-br from-primary/20 to-accent/20 text-primary font-semibold">
                        {selectedCouple.partner1?.full_name?.charAt(0) || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <Avatar className="border-2 border-background h-10 w-10">
                      <AvatarFallback className="bg-gradient-to-br from-secondary/30 to-accent/20 text-secondary-foreground font-semibold">
                        {selectedCouple.partner2?.full_name?.charAt(0) || "?"}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <h1 className="text-xl font-semibold">
                    {selectedCouple.partner1?.full_name} &{" "}
                    {selectedCouple.partner2?.full_name}
                  </h1>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button asChild variant="outline" size="sm" className="gap-2">
                <Link href={`/admin/couple/${selectedCouple?.id}/notes`} data-testid="header-button-notes">
                  <FileText className="h-4 w-4" />
                  Notes
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="gap-2">
                <Link href={`/admin/couple/${selectedCouple?.id}/messages`} data-testid="header-button-messages">
                  <MessageSquare className="h-4 w-4" />
                  Messages
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="gap-2">
                <Link href={`/admin/couple/${selectedCouple?.id}/dashboard-customization`} data-testid="header-button-customize">
                  <Sliders className="h-4 w-4" />
                  Customize
                </Link>
              </Button>
              <Dialog>
            <DialogTrigger asChild>
              <Button
                variant="default"
                className="gap-2"
                onClick={() => sessionPrepMutation.mutate(selectedCouple.id)}
                disabled={sessionPrepMutation.isPending}
                data-testid="button-ai-session-prep"
              >
                {sessionPrepMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    AI Session Prep
                  </>
                )}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  AI Session Preparation Summary
                </DialogTitle>
                <DialogDescription>
                  AI-powered analysis of the last 4 weeks of couple activity
                </DialogDescription>
              </DialogHeader>

              {sessionPrepMutation.isPending && (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              )}

              {sessionPrepMutation.isError && (
                <Alert
                  variant="destructive"
                  data-testid="alert-session-prep-error"
                >
                  <AlertDescription>
                    {sessionPrepMutation.error instanceof Error
                      ? sessionPrepMutation.error.message
                      : "Failed to generate session prep"}
                  </AlertDescription>
                </Alert>
              )}

              {sessionPrepMutation.isSuccess && sessionPrepMutation.data && (
                <div
                  className="space-y-6"
                  data-testid="container-session-prep-results"
                >
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Heart className="h-5 w-5 text-primary" />
                        Engagement Summary
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p
                        className="text-sm text-muted-foreground"
                        data-testid="text-engagement-summary"
                      >
                        {sessionPrepMutation.data.engagement_summary}
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <TrendingDown className="h-5 w-5 text-destructive" />
                        Concerning Patterns
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {sessionPrepMutation.data.concerning_patterns.map(
                          (pattern: string, idx: number) => (
                            <li
                              key={idx}
                              className="flex items-start gap-2"
                              data-testid={`text-concerning-pattern-${idx}`}
                            >
                              <span className="text-destructive mt-1">•</span>
                              <span className="text-sm">{pattern}</span>
                            </li>
                          ),
                        )}
                      </ul>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <TrendingUp className="h-5 w-5 text-green-600" />
                        Positive Patterns
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {sessionPrepMutation.data.positive_patterns.map(
                          (pattern: string, idx: number) => (
                            <li
                              key={idx}
                              className="flex items-start gap-2"
                              data-testid={`text-positive-pattern-${idx}`}
                            >
                              <span className="text-green-600 mt-1">•</span>
                              <span className="text-sm">{pattern}</span>
                            </li>
                          ),
                        )}
                      </ul>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Target className="h-5 w-5 text-primary" />
                        Session Focus Areas
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {sessionPrepMutation.data.session_focus_areas.map(
                          (area: string, idx: number) => (
                            <li
                              key={idx}
                              className="flex items-start gap-2"
                              data-testid={`text-focus-area-${idx}`}
                            >
                              <span className="text-primary mt-1">•</span>
                              <span className="text-sm font-medium">
                                {area}
                              </span>
                            </li>
                          ),
                        )}
                      </ul>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Lightbulb className="h-5 w-5 text-amber-500" />
                        Recommended Interventions
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {sessionPrepMutation.data.recommended_interventions.map(
                          (intervention: string, idx: number) => (
                            <li
                              key={idx}
                              className="flex items-start gap-2"
                              data-testid={`text-intervention-${idx}`}
                            >
                              <span className="text-amber-500 mt-1">•</span>
                              <span className="text-sm">{intervention}</span>
                            </li>
                          ),
                        )}
                      </ul>
                    </CardContent>
                  </Card>

                  <div className="text-xs text-muted-foreground text-center pt-4 border-t">
                    Generated{" "}
                    {sessionPrepMutation.data.generated_at
                      ? formatDistanceToNow(
                          new Date(sessionPrepMutation.data.generated_at),
                          { addSuffix: true },
                        )
                      : "just now"}
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
            </div>
          </div>
        </header>

        <main className="flex-1 min-h-0 overflow-y-auto">
          <ScrollArea className="h-full">
            <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
              {/* Controlled Tabs - synced with URL section */}
              <Tabs value={currentSection} onValueChange={handleSelectSection}>
                {/* TabsList hidden - navigation via sidebar only */}
                <div className="sr-only">
                  <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="checkins">Weekly Check-ins</TabsTrigger>
                    <TabsTrigger value="languages">Love Languages</TabsTrigger>
                    <TabsTrigger value="attachment">Attachment Styles</TabsTrigger>
                    <TabsTrigger value="enneagram">Enneagram</TabsTrigger>
                    <TabsTrigger value="lovemap">Love Map Quiz</TabsTrigger>
                    <TabsTrigger value="echo">Echo & Empathy</TabsTrigger>
                    <TabsTrigger value="ifs">IFS Exercises</TabsTrigger>
                    <TabsTrigger value="pause">Pause History</TabsTrigger>
                    <TabsTrigger value="activity">Activity Feed</TabsTrigger>
                    <TabsTrigger value="messages">Messages</TabsTrigger>
                    <TabsTrigger value="calendar">Calendar</TabsTrigger>
                    <TabsTrigger value="conversations">Hold Me Tight</TabsTrigger>
                    <TabsTrigger value="goals">Shared Goals</TabsTrigger>
                    <TabsTrigger value="rituals">Rituals</TabsTrigger>
                    <TabsTrigger value="journal">Journal Entries</TabsTrigger>
                    <TabsTrigger value="analytics">AI Analytics</TabsTrigger>
                    <TabsTrigger value="therapy-tools">
                      Therapy Tools
                    </TabsTrigger>
                    <TabsTrigger value="dashboard-customization">
                      Dashboard Customization
                    </TabsTrigger>
                    <TabsTrigger value="prompts">
                      Client Prompts
                    </TabsTrigger>
                    <TabsTrigger value="reminders">
                      Reminders
                    </TabsTrigger>
                    <TabsTrigger value="notes">
                      Session Notes
                    </TabsTrigger>
                  </TabsList>
                </div>

                {/* Overview tab - new default view */}
                <TabsContent value="overview" className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <LayoutDashboard className="h-5 w-5 text-primary" />
                      Overview
                    </h3>
                    {selectedCouple && (
                      <ScheduleNotificationDialog couple={selectedCouple} />
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="glass-card border-l-4 border-l-primary/60 hover-elevate">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-primary" />
                          Weekly Check-ins
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold text-primary">
                          {checkins.length}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Total completed
                        </p>
                      </CardContent>
                    </Card>
                    <Card className="glass-card border-l-4 border-l-accent/60 hover-elevate">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                          <Activity className="h-4 w-4 text-accent" />
                          Activities
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold text-accent">
                          {activities.length}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Recent activities
                        </p>
                      </CardContent>
                    </Card>
                    <Card className="glass-card border-l-4 border-l-rose-500/60 hover-elevate">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                          <Heart className="h-4 w-4 text-rose-500" />
                          Love Languages
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold text-rose-500">
                          {loveLanguages.length}/2
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Partners completed
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                  <Card className="glass-card border-l-4 border-l-primary/40">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Lightbulb className="h-5 w-5 text-primary" />
                        Therapist Thoughts
                      </CardTitle>
                      <CardDescription>
                        Manage your to-dos, messages, and notes for this couple
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {selectedCouple && (
                        <TherapistThoughtsPanel
                          coupleId={selectedCouple.id}
                          partner1={
                            selectedCouple.partner1 &&
                            selectedCouple.partner1_id
                              ? {
                                  id: selectedCouple.partner1_id,
                                  full_name: selectedCouple.partner1.full_name,
                                }
                              : null
                          }
                          partner2={
                            selectedCouple.partner2 &&
                            selectedCouple.partner2_id
                              ? {
                                  id: selectedCouple.partner2_id,
                                  full_name: selectedCouple.partner2.full_name,
                                }
                              : null
                          }
                        />
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="checkins" className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {checkins.slice(0, 2).map((checkin) => (
                      <Card key={checkin.id}>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="bg-primary/10 text-primary text-sm">
                                {checkin.author?.full_name?.charAt(0) || "?"}
                              </AvatarFallback>
                            </Avatar>
                            {checkin.author?.full_name}
                          </CardTitle>
                          <CardDescription>
                            {checkin.created_at
                              ? formatDistanceToNow(
                                  new Date(checkin.created_at),
                                  { addSuffix: true },
                                )
                              : "Recently"}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Label>Connectedness</Label>
                              <span className="text-2xl font-bold text-primary">
                                {checkin.q_connectedness}/10
                              </span>
                            </div>
                            <div className="h-2 bg-secondary rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary"
                                style={{
                                  width: `${(checkin.q_connectedness || 0) * 10}%`,
                                }}
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Label>Conflict Resolution</Label>
                              <span className="text-2xl font-bold text-secondary-foreground">
                                {checkin.q_conflict}/10
                              </span>
                            </div>
                            <div className="h-2 bg-secondary rounded-full overflow-hidden">
                              <div
                                className="h-full bg-accent"
                                style={{
                                  width: `${(checkin.q_conflict || 0) * 10}%`,
                                }}
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label>Appreciation</Label>
                            <p className="text-sm text-muted-foreground border-l-4 border-primary/30 pl-4 italic">
                              {checkin.q_appreciation}
                            </p>
                          </div>

                          <div className="space-y-2">
                            <Label>Regrettable Incident</Label>
                            <p className="text-sm text-muted-foreground border-l-4 border-destructive/30 pl-4 italic">
                              {checkin.q_regrettable_incident}
                            </p>
                          </div>

                          <div className="space-y-2">
                            <Label>Need</Label>
                            <p className="text-sm text-muted-foreground border-l-4 border-accent/30 pl-4 italic">
                              {checkin.q_my_need}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="languages" className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {loveLanguages.map((lang) => {
                      const partner = [
                        selectedCouple.partner1,
                        selectedCouple.partner2,
                      ].find((p) => p?.id === lang.user_id);
                      return (
                        <Card key={lang.id}>
                          <CardHeader>
                            <div className="flex items-center justify-between gap-4">
                              <CardTitle>
                                {partner?.full_name || "Unknown"}
                              </CardTitle>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    data-testid={`button-delete-love-language-${lang.id}`}
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>
                                      Delete Love Language Result?
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This will permanently delete{" "}
                                      {partner?.full_name || "this partner"}'s
                                      love language quiz result. They will need
                                      to retake the quiz.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel data-testid="button-cancel-delete-love-language">
                                      Cancel
                                    </AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() =>
                                        deleteLoveLanguageMutation.mutate(
                                          lang.id,
                                        )
                                      }
                                      disabled={
                                        deleteLoveLanguageMutation.isPending
                                      }
                                      data-testid="button-confirm-delete-love-language"
                                    >
                                      {deleteLoveLanguageMutation.isPending
                                        ? "Deleting..."
                                        : "Delete"}
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="space-y-2">
                              <Label className="text-sm text-muted-foreground">
                                Primary Language
                              </Label>
                              <p className="text-lg font-semibold text-primary">
                                {lang.primary_language}
                              </p>
                            </div>
                            <div className="space-y-2">
                              <Label className="text-sm text-muted-foreground">
                                Secondary Language
                              </Label>
                              <p className="text-lg font-semibold text-secondary-foreground">
                                {lang.secondary_language}
                              </p>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </TabsContent>

                <TabsContent value="attachment" className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {attachmentStyles.map((style) => {
                      const partner = [
                        selectedCouple.partner1,
                        selectedCouple.partner2,
                      ].find((p) => p?.id === style.user_id);
                      return (
                        <Card key={style.id}>
                          <CardHeader>
                            <CardTitle>
                              {partner?.full_name || "Unknown"}
                            </CardTitle>
                            <CardDescription>
                              Attachment Assessment
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="space-y-2">
                              <Label className="text-sm text-muted-foreground">
                                Attachment Style
                              </Label>
                              <p className="text-lg font-semibold text-primary capitalize">
                                {style.attachment_style?.replace(/-/g, " ") || "Not assessed"}
                              </p>
                            </div>
                            {style.score !== null && (
                              <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm text-muted-foreground">Assessment Score</span>
                                  <span className="text-sm font-medium">{style.score}%</span>
                                </div>
                                <Progress value={style.score} className="h-2" />
                              </div>
                            )}
                            {style.dynamics_with_partner && (
                              <div className="space-y-2">
                                <Label className="text-sm text-muted-foreground">
                                  Dynamics with Partner
                                </Label>
                                <p className="text-sm text-muted-foreground">
                                  {style.dynamics_with_partner}
                                </p>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                    {attachmentStyles.length === 0 && (
                      <Card className="col-span-full">
                        <CardContent className="pt-6 text-center text-muted-foreground">
                          No attachment style assessments completed yet.
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="enneagram" className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {enneagramAssessments.map((assessment) => {
                      const partner = [
                        selectedCouple.partner1,
                        selectedCouple.partner2,
                      ].find((p) => p?.id === assessment.user_id);
                      const enneagramTypeNames: Record<number, string> = {
                        1: "The Reformer",
                        2: "The Helper",
                        3: "The Achiever",
                        4: "The Individualist",
                        5: "The Investigator",
                        6: "The Loyalist",
                        7: "The Enthusiast",
                        8: "The Challenger",
                        9: "The Peacemaker",
                      };
                      return (
                        <Card key={assessment.id}>
                          <CardHeader>
                            <CardTitle>
                              {partner?.full_name || "Unknown"}
                            </CardTitle>
                            <CardDescription>
                              Enneagram Assessment
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="space-y-2">
                              <Label className="text-sm text-muted-foreground">
                                Primary Type
                              </Label>
                              <p className="text-lg font-semibold text-primary">
                                Type {assessment.primary_type}: {assessment.primary_type ? enneagramTypeNames[assessment.primary_type] : "Not assessed"}
                              </p>
                            </div>
                            {assessment.primary_score !== null && (
                              <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm text-muted-foreground">Primary Score</span>
                                  <span className="text-sm font-medium">{assessment.primary_score}%</span>
                                </div>
                                <Progress value={assessment.primary_score} className="h-2" />
                              </div>
                            )}
                            {assessment.secondary_type && (
                              <div className="space-y-2">
                                <Label className="text-sm text-muted-foreground">
                                  Secondary Type (Wing)
                                </Label>
                                <p className="text-sm">
                                  Type {assessment.secondary_type}: {enneagramTypeNames[assessment.secondary_type]}
                                </p>
                              </div>
                            )}
                            {assessment.couple_dynamics && (
                              <div className="space-y-2">
                                <Label className="text-sm text-muted-foreground">
                                  Couple Dynamics
                                </Label>
                                <p className="text-sm text-muted-foreground">
                                  {assessment.couple_dynamics}
                                </p>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                    {enneagramAssessments.length === 0 && (
                      <Card className="col-span-full">
                        <CardContent className="pt-6 text-center text-muted-foreground">
                          No Enneagram assessments completed yet.
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="journal" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Shared Journal Entries</CardTitle>
                      <CardDescription>
                        Journal entries shared with therapist by the couple
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {journalEntries.length > 0 ? (
                        <div className="space-y-4">
                          {journalEntries.map((entry) => {
                            const author = [
                              selectedCouple.partner1,
                              selectedCouple.partner2,
                            ].find((p) => p?.id === entry.created_by);
                            return (
                              <Card key={entry.id} className="border-l-4 border-l-primary">
                                <CardHeader className="pb-2">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <Avatar className="h-8 w-8">
                                        <AvatarFallback className="text-xs">
                                          {author?.full_name?.charAt(0) || "?"}
                                        </AvatarFallback>
                                      </Avatar>
                                      <div>
                                        <p className="text-sm font-medium">{author?.full_name || "Unknown"}</p>
                                        <p className="text-xs text-muted-foreground">
                                          {entry.created_at
                                            ? format(new Date(entry.created_at), "MMM d, yyyy 'at' h:mm a")
                                            : ""}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      {entry.entry_type && (
                                        <Badge variant="outline" className="capitalize">
                                          {entry.entry_type}
                                        </Badge>
                                      )}
                                      {entry.mood && (
                                        <Badge variant="secondary" className="capitalize">
                                          {entry.mood}
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                  {entry.title && (
                                    <CardTitle className="text-base mt-2">{entry.title}</CardTitle>
                                  )}
                                </CardHeader>
                                <CardContent>
                                  <p className="text-sm whitespace-pre-wrap">{entry.content}</p>
                                </CardContent>
                              </Card>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-center text-muted-foreground py-8">
                          No journal entries shared with therapist yet.
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="activity" className="space-y-4">
                  {activities.map((activity) => (
                    <Card key={`${activity.type}-${activity.id}`}>
                      <CardContent className="pt-6 space-y-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-muted-foreground uppercase">
                              {activity.type.replace(/_/g, " ")}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {activity.timestamp
                                ? formatDistanceToNow(
                                    new Date(activity.timestamp),
                                    { addSuffix: true },
                                  )
                                : ""}
                            </span>
                          </div>
                          {activity.type === "gratitude_logs" && (
                            <p>{activity.text_content}</p>
                          )}
                          {activity.type === "shared_goals" && (
                            <p>
                              <strong>Goal:</strong> {activity.title}
                            </p>
                          )}
                          {activity.type === "rituals" && (
                            <p>
                              <strong>{activity.category}:</strong>{" "}
                              {activity.description}
                            </p>
                          )}
                          {activity.type === "conversations" && (
                            <p className="text-sm italic">
                              Hold Me Tight conversation completed
                            </p>
                          )}
                          {activity.type === "voice_memos" && (
                            <div className="space-y-1">
                              <p className="text-sm">
                                <strong>
                                  {activity.sender?.full_name || "Unknown"}
                                </strong>{" "}
                                →{" "}
                                <strong>
                                  {activity.recipient?.full_name || "Unknown"}
                                </strong>
                              </p>
                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <span>
                                  Duration:{" "}
                                  {activity.duration_secs
                                    ? `${Math.floor(parseFloat(activity.duration_secs) / 60)}:${(Math.floor(parseFloat(activity.duration_secs)) % 60).toString().padStart(2, "0")}`
                                    : "Unknown"}
                                </span>
                                <span
                                  className={
                                    activity.is_listened
                                      ? "text-primary"
                                      : "text-destructive"
                                  }
                                >
                                  {activity.is_listened
                                    ? "✓ Listened"
                                    : "○ Not listened"}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>

                        {commentingOn?.id === activity.id ? (
                          <div className="space-y-4 border-t pt-4">
                            <Textarea
                              placeholder="Add your comment or note..."
                              value={commentText}
                              onChange={(e) => setCommentText(e.target.value)}
                              className="min-h-24"
                            />
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Checkbox
                                  id={`private-${activity.id}`}
                                  checked={isPrivate}
                                  onCheckedChange={(checked) =>
                                    setIsPrivate(checked as boolean)
                                  }
                                />
                                <Label
                                  htmlFor={`private-${activity.id}`}
                                  className="text-sm"
                                >
                                  Private note (only visible to you)
                                </Label>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  variant="ghost"
                                  onClick={() => setCommentingOn(null)}
                                >
                                  Cancel
                                </Button>
                                <Button
                                  onClick={() =>
                                    handleAddComment(activity.type, activity.id)
                                  }
                                >
                                  <Send className="h-4 w-4 mr-2" />
                                  Post
                                </Button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setCommentingOn({
                                type: activity.type,
                                id: activity.id,
                              })
                            }
                          >
                            Add Comment
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </TabsContent>

                <TabsContent value="notes" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Session Notes</CardTitle>
                      <CardDescription>
                        Document your therapy sessions with this couple
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <SessionNotesPanel
                        coupleId={selectedCouple.id}
                        therapistId={profile?.id || ""}
                      />
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="messages" className="space-y-4">
                  <MessagesTab
                    coupleId={selectedCouple.id}
                    therapistId={profile?.id || ""}
                    userId={user?.id || ""}
                    messageText={messageText}
                    setMessageText={setMessageText}
                    messagesEndRef={messagesEndRef}
                  />
                </TabsContent>

                <TabsContent value="calendar" className="space-y-4">
                  <CalendarTab coupleId={selectedCouple.id} />
                </TabsContent>

                <TabsContent value="lovemap" className="space-y-4">
                  <LoveMapTab coupleId={selectedCouple.id} />
                </TabsContent>

                <TabsContent value="echo" className="space-y-4">
                  <EchoEmpathyTab coupleId={selectedCouple.id} />
                </TabsContent>

                <TabsContent value="ifs" className="space-y-4">
                  <IfsTab
                    coupleId={selectedCouple.id}
                    partnerId1={selectedCouple.partner1_id}
                    partnerId2={selectedCouple.partner2_id}
                    partner1Name={
                      selectedCouple.partner1?.full_name || undefined
                    }
                    partner2Name={
                      selectedCouple.partner2?.full_name || undefined
                    }
                  />
                </TabsContent>

                <TabsContent value="pause" className="space-y-4">
                  <PauseHistoryTab
                    coupleId={selectedCouple.id}
                    partnerId1={selectedCouple.partner1_id}
                    partnerId2={selectedCouple.partner2_id}
                    partner1Name={
                      selectedCouple.partner1?.full_name || undefined
                    }
                    partner2Name={
                      selectedCouple.partner2?.full_name || undefined
                    }
                  />
                </TabsContent>

                <TabsContent value="therapy-tools" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Advanced Therapy Tools</CardTitle>
                      <CardDescription>
                        Track usage and progress across additional therapeutic
                        interventions
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Tabs defaultValue="four-horsemen">
                        <TabsList className="grid w-full grid-cols-6 gap-2">
                          <TabsTrigger
                            value="four-horsemen"
                            data-testid="tab-trigger-four-horsemen"
                          >
                            Four Horsemen
                          </TabsTrigger>
                          <TabsTrigger
                            value="demon-dialogues"
                            data-testid="tab-trigger-demon-dialogues"
                          >
                            Demon Dialogues
                          </TabsTrigger>
                          <TabsTrigger
                            value="meditation"
                            data-testid="tab-trigger-meditation"
                          >
                            Meditation
                          </TabsTrigger>
                          <TabsTrigger
                            value="intimacy"
                            data-testid="tab-trigger-intimacy"
                          >
                            Intimacy Mapping
                          </TabsTrigger>
                          <TabsTrigger
                            value="values"
                            data-testid="tab-trigger-values"
                          >
                            Values & Vision
                          </TabsTrigger>
                          <TabsTrigger
                            value="parenting"
                            data-testid="tab-trigger-parenting"
                          >
                            Parenting
                          </TabsTrigger>
                        </TabsList>

                        <TabsContent
                          value="four-horsemen"
                          className="space-y-4 mt-6"
                        >
                          <FourHorsemenTab coupleId={selectedCouple.id} />
                        </TabsContent>

                        <TabsContent
                          value="demon-dialogues"
                          className="space-y-4 mt-6"
                        >
                          <DemonDialoguesTab coupleId={selectedCouple.id} />
                        </TabsContent>

                        <TabsContent
                          value="meditation"
                          className="space-y-4 mt-6"
                        >
                          <MeditationLibraryTab coupleId={selectedCouple.id} />
                        </TabsContent>

                        <TabsContent
                          value="intimacy"
                          className="space-y-4 mt-6"
                        >
                          <IntimacyMappingTab coupleId={selectedCouple.id} />
                        </TabsContent>

                        <TabsContent value="values" className="space-y-4 mt-6">
                          <ValuesVisionTab coupleId={selectedCouple.id} />
                        </TabsContent>

                        <TabsContent
                          value="parenting"
                          className="space-y-4 mt-6"
                        >
                          <ParentingPartnersTab coupleId={selectedCouple.id} />
                        </TabsContent>
                      </Tabs>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent
                  value="dashboard-customization"
                  className="space-y-4"
                >
                  <TherapistDashboardEditor
                    coupleId={selectedCouple.id}
                    coupleName={`${selectedCouple.partner1?.full_name?.split(" ")[0] || "Partner 1"} & ${selectedCouple.partner2?.full_name?.split(" ")[0] || "Partner 2"}`}
                  />
                </TabsContent>

                {/* Client Prompts Tab - Therapist-customizable suggestions */}
                <TabsContent value="prompts" className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold">
                          Client Prompts
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Create custom suggestions and prompts that appear in
                          your client's "Suggested For You" section
                        </p>
                      </div>
                    </div>

                    {/* Add New Prompt Form */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                          <Plus className="h-4 w-4" />
                          Add New Prompt
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-sm font-medium">
                              Activity Type
                            </label>
                            <Select
                              value={newPrompt.tool_name}
                              onValueChange={(value) =>
                                setNewPrompt((p) => ({ ...p, tool_name: value }))
                              }
                            >
                              <SelectTrigger data-testid="select-tool-name">
                                <SelectValue placeholder="Select activity" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="reflection">
                                  Reflection Question
                                </SelectItem>
                                <SelectItem value="weekly-checkin">
                                  Weekly Check-In
                                </SelectItem>
                                <SelectItem value="gratitude">
                                  Gratitude Log
                                </SelectItem>
                                <SelectItem value="shared-goals">
                                  Shared Goals
                                </SelectItem>
                                <SelectItem value="rituals">
                                  Rituals of Connection
                                </SelectItem>
                                <SelectItem value="conversations">
                                  Hold Me Tight
                                </SelectItem>
                                <SelectItem value="voice-memos">
                                  Voice Memos
                                </SelectItem>
                                <SelectItem value="custom">
                                  Custom Activity
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium">
                              Target
                            </label>
                            <Select
                              value={newPrompt.target_user_id || "both"}
                              onValueChange={(value) =>
                                setNewPrompt((p) => ({ 
                                  ...p, 
                                  target_user_id: value === "both" ? null : value 
                                }))
                              }
                            >
                              <SelectTrigger data-testid="select-target-user">
                                <SelectValue placeholder="Select target" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="both">Both Partners</SelectItem>
                                {selectedCouple?.partner1 && (
                                  <SelectItem value={selectedCouple.partner1.id}>
                                    {selectedCouple.partner1.full_name || "Partner 1"}
                                  </SelectItem>
                                )}
                                {selectedCouple?.partner2 && (
                                  <SelectItem value={selectedCouple.partner2.id}>
                                    {selectedCouple.partner2.full_name || "Partner 2"}
                                  </SelectItem>
                                )}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Title</label>
                            <Input
                              placeholder="e.g., Gratitude Log"
                              value={newPrompt.title}
                              onChange={(e) =>
                                setNewPrompt((p) => ({
                                  ...p,
                                  title: e.target.value,
                                }))
                              }
                              data-testid="input-prompt-title"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">
                            Description (optional)
                          </label>
                          <Input
                            placeholder="Brief explanation of the activity"
                            value={newPrompt.description}
                            onChange={(e) =>
                              setNewPrompt((p) => ({
                                ...p,
                                description: e.target.value,
                              }))
                            }
                            data-testid="input-prompt-description"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">
                            Suggested Action
                          </label>
                          <Textarea
                            placeholder="e.g., Tonight, share one thing you're grateful for about each other before bed."
                            value={newPrompt.suggested_action}
                            onChange={(e) =>
                              setNewPrompt((p) => ({
                                ...p,
                                suggested_action: e.target.value,
                              }))
                            }
                            className="min-h-24"
                            data-testid="input-prompt-action"
                          />
                        </div>
                        <Button
                          onClick={() => {
                            if (
                              selectedCouple &&
                              profile?.id &&
                              newPrompt.tool_name &&
                              newPrompt.title &&
                              newPrompt.suggested_action
                            ) {
                              createPromptMutation.mutate({
                                couple_id: selectedCouple.id,
                                therapist_id: profile.id,
                                ...newPrompt,
                              });
                            }
                          }}
                          disabled={
                            createPromptMutation.isPending ||
                            !newPrompt.tool_name ||
                            !newPrompt.title ||
                            !newPrompt.suggested_action
                          }
                          data-testid="button-create-prompt"
                        >
                          {createPromptMutation.isPending ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              Creating...
                            </>
                          ) : (
                            <>
                              <Plus className="h-4 w-4 mr-2" />
                              Add Prompt
                            </>
                          )}
                        </Button>
                      </CardContent>
                    </Card>

                    {/* Existing Prompts List */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">
                          Active Prompts
                        </CardTitle>
                        <CardDescription>
                          These prompts will appear in your client's dashboard
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {therapistPromptsQuery.isLoading ? (
                          <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                          </div>
                        ) : therapistPromptsQuery.data &&
                          therapistPromptsQuery.data.length > 0 ? (
                          <div className="space-y-3">
                            {therapistPromptsQuery.data.map((prompt) => (
                              <div
                                key={prompt.id}
                                className={`p-4 rounded-lg border ${
                                  prompt.is_enabled
                                    ? "bg-background"
                                    : "bg-muted/50 opacity-60"
                                }`}
                                data-testid={`prompt-item-${prompt.id}`}
                              >
                                {editingPromptId === prompt.id ? (
                                  <EditPromptForm
                                    prompt={prompt}
                                    onSave={(data) => {
                                      updatePromptMutation.mutate({
                                        id: prompt.id,
                                        ...data,
                                      });
                                    }}
                                    onCancel={() => setEditingPromptId(null)}
                                    isSaving={updatePromptMutation.isPending}
                                  />
                                ) : (
                                  <div className="space-y-2">
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <span className="font-medium">
                                            {prompt.title}
                                          </span>
                                          <Badge variant="outline">
                                            {prompt.tool_name}
                                          </Badge>
                                          {!prompt.is_enabled && (
                                            <Badge variant="secondary">
                                              Disabled
                                            </Badge>
                                          )}
                                        </div>
                                        {prompt.description && (
                                          <p className="text-sm text-muted-foreground mt-1">
                                            {prompt.description}
                                          </p>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() =>
                                            setEditingPromptId(prompt.id)
                                          }
                                          data-testid={`button-edit-prompt-${prompt.id}`}
                                        >
                                          <Edit className="h-4 w-4" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() =>
                                            updatePromptMutation.mutate({
                                              id: prompt.id,
                                              is_enabled: !prompt.is_enabled,
                                            })
                                          }
                                          data-testid={`button-toggle-prompt-${prompt.id}`}
                                        >
                                          {prompt.is_enabled ? (
                                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                                          ) : (
                                            <XCircle className="h-4 w-4 text-muted-foreground" />
                                          )}
                                        </Button>
                                        <AlertDialog>
                                          <AlertDialogTrigger asChild>
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              data-testid={`button-delete-prompt-${prompt.id}`}
                                            >
                                              <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                          </AlertDialogTrigger>
                                          <AlertDialogContent>
                                            <AlertDialogHeader>
                                              <AlertDialogTitle>
                                                Delete Prompt?
                                              </AlertDialogTitle>
                                              <AlertDialogDescription>
                                                This will permanently delete
                                                this prompt. This action cannot
                                                be undone.
                                              </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                              <AlertDialogCancel>
                                                Cancel
                                              </AlertDialogCancel>
                                              <AlertDialogAction
                                                onClick={() =>
                                                  deletePromptMutation.mutate(
                                                    prompt.id,
                                                  )
                                                }
                                                className="bg-destructive hover:bg-destructive/90"
                                              >
                                                Delete
                                              </AlertDialogAction>
                                            </AlertDialogFooter>
                                          </AlertDialogContent>
                                        </AlertDialog>
                                      </div>
                                    </div>
                                    <div className="p-3 bg-amber-50 dark:bg-amber-950/20 rounded border border-amber-200/30 dark:border-amber-800/30">
                                      <p className="text-sm flex items-start gap-2">
                                        <Lightbulb className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                                        <span>{prompt.suggested_action}</span>
                                      </p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8 text-muted-foreground">
                            <p>No custom prompts yet.</p>
                            <p className="text-sm">
                              Create your first prompt above to give
                              personalized suggestions to this couple.
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="reminders" className="space-y-6">
                  {selectedCouple && (
                    <CheckinReminders couple={selectedCouple} />
                  )}
                </TabsContent>

                <TabsContent value="gratitude" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Gratitude Log</CardTitle>
                      <CardDescription>
                        Gratitude entries shared between partners
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <GratitudeTab coupleId={selectedCouple.id} />
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="conflict" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Conflict Resolution Sessions</CardTitle>
                      <CardDescription>
                        I-Statement sessions and resolution progress
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ConflictResolutionTab coupleId={selectedCouple.id} />
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="voice-memos" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Voice Memos</CardTitle>
                      <CardDescription>
                        Audio messages exchanged between partners
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <VoiceMemosTab coupleId={selectedCouple.id} />
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="financial" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Financial Toolkit</CardTitle>
                      <CardDescription>
                        Money management activities and budgeting
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <FinancialToolkitTab coupleId={selectedCouple.id} />
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="growth-plan" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Growth Plan</CardTitle>
                      <CardDescription>
                        AI-powered personalized exercises and goals
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <GrowthPlanTab coupleId={selectedCouple.id} />
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="progress-timeline" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Progress Timeline</CardTitle>
                      <CardDescription>
                        Relationship milestones and achievements
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ProgressTimelineTab coupleId={selectedCouple.id} />
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="mood" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Mood Tracker</CardTitle>
                      <CardDescription>
                        Emotional wellbeing tracking for both partners
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <MoodTrackerTab coupleId={selectedCouple.id} />
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="goals" className="space-y-4">
                  <GoalsTab coupleId={selectedCouple.id} />
                </TabsContent>

                <TabsContent value="rituals" className="space-y-4">
                  <RitualsTab coupleId={selectedCouple.id} />
                </TabsContent>

                <TabsContent value="conversations" className="space-y-4">
                  <ConversationsTab coupleId={selectedCouple.id} />
                </TabsContent>
              </Tabs>
            </div>
          </ScrollArea>
        </main>
      </div>

      <AddCoupleModal
        open={showAddCoupleModal}
        onOpenChange={setShowAddCoupleModal}
        therapistId={profile?.id || ""}
        onSuccess={() => {
          fetchCouples();
        }}
      />
    </div>
  );
}

function MessagesTab({
  coupleId,
  therapistId,
  userId,
  messageText,
  setMessageText,
  messagesEndRef,
}: {
  coupleId: string;
  therapistId: string;
  userId: string;
  messageText: string;
  setMessageText: (text: string) => void;
  messagesEndRef: React.RefObject<HTMLDivElement>;
}) {
  const { toast } = useToast();

  const { data: messages = [], isLoading } = useQuery<MessageWithSender[]>({
    queryKey: ["therapist-messages", coupleId],
    queryFn: async () => {
      const result = await aiFunctions.getMessages(coupleId);
      return result as unknown as MessageWithSender[];
    },
    enabled: !!coupleId,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (text: string) => {
      return aiFunctions.sendMessage(coupleId, text);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["therapist-messages", coupleId] });
      setMessageText("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send message",
        variant: "destructive",
      });
    },
  });

  const handleSend = () => {
    if (!messageText.trim()) return;
    sendMessageMutation.mutate(messageText.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  useEffect(() => {
    if (!coupleId) return;

    const channel = supabase
      .channel(`messages:${coupleId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "Couples_messages",
          filter: `couple_id=eq.${coupleId}`,
        },
        async (payload) => {
          const newMessage = payload.new as Message;

          const { data: sender } = await supabase
            .from("Couples_profiles")
            .select("id, full_name, role")
            .eq("id", newMessage.sender_id)
            .single();

          const messageWithSender: MessageWithSender = {
            ...newMessage,
            sender: sender || {
              id: newMessage.sender_id,
              full_name: "Unknown",
              role: "client",
            },
          };

          queryClient.setQueryData<MessageWithSender[]>(
            ["therapist-messages", coupleId],
            (old = []) => [...old, messageWithSender],
          );
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [coupleId]);

  return (
    <Card className="flex flex-col overflow-hidden h-[600px]">
      <CardHeader className="border-b">
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Conversation with Couple
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center space-y-4">
              <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground" />
              <div>
                <p className="font-medium">No messages yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Start a conversation with the couple
                </p>
              </div>
            </div>
          </div>
        ) : (
          <ScrollArea className="flex-1 p-6">
            <div className="space-y-4">
              {messages.map((message) => {
                const isCurrentUser = message.sender_id === userId;
                const isTherapist = message.sender.role === "therapist";

                return (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${isCurrentUser ? "flex-row-reverse" : "flex-row"}`}
                    data-testid={`message-${message.id}`}
                  >
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarFallback
                        className={
                          isTherapist
                            ? "bg-accent text-accent-foreground"
                            : "bg-primary text-primary-foreground"
                        }
                      >
                        {message.sender.full_name?.charAt(0) || "?"}
                      </AvatarFallback>
                    </Avatar>

                    <div
                      className={`flex flex-col gap-1 max-w-[70%] ${isCurrentUser ? "items-end" : "items-start"}`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium">
                          {isCurrentUser ? "You" : message.sender.full_name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {message.created_at
                            ? formatDistanceToNow(
                                new Date(message.created_at),
                                { addSuffix: true },
                              )
                            : "Just now"}
                        </span>
                      </div>

                      <div
                        className={`rounded-lg px-4 py-2 ${
                          isCurrentUser
                            ? "bg-primary text-primary-foreground"
                            : "bg-accent text-accent-foreground"
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap break-words">
                          {message.message_text}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>
        )}

        <div className="border-t p-4">
          <div className="flex gap-2">
            <Textarea
              placeholder="Type your message... (Press Enter to send, Shift+Enter for new line)"
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              onKeyDown={handleKeyDown}
              className="resize-none min-h-[60px] max-h-[200px]"
              disabled={sendMessageMutation.isPending}
              data-testid="input-message-therapist"
            />
            <Button
              onClick={handleSend}
              disabled={!messageText.trim() || sendMessageMutation.isPending}
              size="icon"
              className="flex-shrink-0"
              data-testid="button-send-message-therapist"
            >
              {sendMessageMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CalendarTab({ coupleId }: { coupleId: string }) {
  const [view, setView] = useState<"month" | "week" | "day" | "agenda">(
    "month",
  );
  const [date, setDate] = useState(new Date());

  const { data: events = [], isLoading } = useQuery<CalendarEvent[]>({
    queryKey: ["/api/calendar", coupleId],
    enabled: !!coupleId,
    queryFn: async () => {
      const response = await fetch(`/api/calendar/${coupleId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch calendar events");
      }
      return response.json();
    },
  });

  const calendarEvents = events.map((event) => ({
    ...event,
    start: new Date(event.start_at),
    end: new Date(event.end_at),
    title: event.title,
  }));

  const handleViewChange = (newView: any) => {
    if (
      newView === "month" ||
      newView === "week" ||
      newView === "day" ||
      newView === "agenda"
    ) {
      setView(newView);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-12">
          <Loader2
            className="h-8 w-8 animate-spin text-primary"
            data-testid="loader-calendar-therapist"
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Calendar</CardTitle>
        <CardDescription>
          View the couple's scheduled events and dates (read-only)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div
          style={{ height: "600px" }}
          data-testid="calendar-container-therapist"
        >
          <Calendar
            localizer={localizer}
            events={calendarEvents}
            startAccessor="start"
            endAccessor="end"
            view={view}
            onView={handleViewChange}
            date={date}
            onNavigate={setDate}
            selectable={false}
            popup
            style={{ height: "100%" }}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function LoveMapTab({ coupleId }: { coupleId: string }) {
  const { toast } = useToast();

  const { data: loveMapData, isLoading } = useQuery({
    queryKey: ["/api/love-map/therapist", coupleId],
    queryFn: async () => {
      const response = await fetch(`/api/love-map/therapist/${coupleId}`);
      if (!response.ok) throw new Error("Failed to fetch Love Map data");
      return response.json();
    },
    enabled: !!coupleId,
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-12">
          <Loader2
            className="h-8 w-8 animate-spin text-primary"
            data-testid="loader-lovemap-therapist"
          />
        </CardContent>
      </Card>
    );
  }

  if (!loveMapData || !loveMapData.session) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Love Map Quiz</CardTitle>
          <CardDescription>
            Based on Dr. Gottman's research - How well partners know each other
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center py-12">
          <Heart className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">
            This couple has not completed the Love Map Quiz yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  const {
    session,
    partner1_name,
    partner2_name,
    partner1_score,
    partner2_score,
    results,
  } = loveMapData;

  return (
    <div className="space-y-6">
      {/* Score Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{partner1_name}</CardTitle>
            <CardDescription>
              How well {partner1_name} knows {partner2_name}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              className="text-4xl font-bold text-primary"
              data-testid="text-partner1-score-therapist"
            >
              {partner1_score
                ? `${parseFloat(partner1_score).toFixed(0)}%`
                : "N/A"}
            </div>
            <Progress
              value={partner1_score ? parseFloat(partner1_score) : 0}
              className="mt-2"
              data-testid="progress-partner1-score-therapist"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{partner2_name}</CardTitle>
            <CardDescription>
              How well {partner2_name} knows {partner1_name}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              className="text-4xl font-bold text-primary"
              data-testid="text-partner2-score-therapist"
            >
              {partner2_score
                ? `${parseFloat(partner2_score).toFixed(0)}%`
                : "N/A"}
            </div>
            <Progress
              value={partner2_score ? parseFloat(partner2_score) : 0}
              className="mt-2"
              data-testid="progress-partner2-score-therapist"
            />
          </CardContent>
        </Card>
      </div>

      {/* Detailed Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Comparison</CardTitle>
          <CardDescription>
            Review both partners' answers and guesses
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {results && results.length > 0 ? (
            results.map((result: any, index: number) => (
              <div
                key={result.question_id}
                className="space-y-4 border-b pb-4 last:border-b-0"
                data-testid={`lovemap-result-${index}`}
              >
                <div className="font-semibold">
                  {index + 1}. {result.question_text}
                  {result.category && (
                    <Badge variant="secondary" className="ml-2">
                      {result.category}
                    </Badge>
                  )}
                </div>

                {/* Partner 1's Answer vs Partner 2's Guess */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-sm text-muted-foreground">
                      {partner1_name}'s Answer
                    </Label>
                    <p
                      className="text-sm p-3 bg-muted rounded-md"
                      data-testid={`text-p1-answer-${index}`}
                    >
                      {result.partner1_answer || "Not answered"}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm text-muted-foreground flex items-center gap-2">
                      {partner2_name}'s Guess
                      {result.partner2_guess_correct ? (
                        <CheckCircle2
                          className="h-4 w-4 text-green-600"
                          data-testid={`icon-p2-correct-${index}`}
                        />
                      ) : (
                        <XCircle
                          className="h-4 w-4 text-red-600"
                          data-testid={`icon-p2-incorrect-${index}`}
                        />
                      )}
                    </Label>
                    <p
                      className="text-sm p-3 bg-muted rounded-md"
                      data-testid={`text-p2-guess-${index}`}
                    >
                      {result.partner2_guess || "Not guessed"}
                    </p>
                  </div>
                </div>

                {/* Partner 2's Answer vs Partner 1's Guess */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-sm text-muted-foreground">
                      {partner2_name}'s Answer
                    </Label>
                    <p
                      className="text-sm p-3 bg-muted rounded-md"
                      data-testid={`text-p2-answer-${index}`}
                    >
                      {result.partner2_answer || "Not answered"}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm text-muted-foreground flex items-center gap-2">
                      {partner1_name}'s Guess
                      {result.partner1_guess_correct ? (
                        <CheckCircle2
                          className="h-4 w-4 text-green-600"
                          data-testid={`icon-p1-correct-${index}`}
                        />
                      ) : (
                        <XCircle
                          className="h-4 w-4 text-red-600"
                          data-testid={`icon-p1-incorrect-${index}`}
                        />
                      )}
                    </Label>
                    <p
                      className="text-sm p-3 bg-muted rounded-md"
                      data-testid={`text-p1-guess-${index}`}
                    >
                      {result.partner1_guess || "Not guessed"}
                    </p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="text-center text-muted-foreground py-8">
              No results available
            </p>
          )}
        </CardContent>
      </Card>

      {/* Clinical Insight */}
      <Alert className="border-primary/20 bg-primary/5">
        <Heart className="h-4 w-4 text-primary" />
        <AlertDescription>
          <p className="font-semibold mb-2">Clinical Insight: Love Maps</p>
          <p className="text-sm">
            Love Maps represent the cognitive space where partners store
            detailed knowledge about each other's inner world. Research by Dr.
            Gottman shows that couples with detailed Love Maps are better
            equipped to handle stress and conflict. Low scores may indicate
            areas where partners could benefit from more curiosity and active
            listening about each other's experiences, dreams, and preferences.
          </p>
        </AlertDescription>
      </Alert>
    </div>
  );
}

function EchoEmpathyTab({ coupleId }: { coupleId: string }) {
  const [echoSessions, setEchoSessions] = useState<
    (EchoSession & { turns: EchoTurn[] })[]
  >([]);

  useEffect(() => {
    fetchEchoSessions();
  }, [coupleId]);

  const fetchEchoSessions = async () => {
    try {
      const { data: sessions, error: sessionsError } = await supabase
        .from("Couples_echo_sessions")
        .select("*")
        .eq("couple_id", coupleId)
        .order("created_at", { ascending: false });

      if (sessionsError) throw sessionsError;

      const sessionIds = sessions?.map((s) => s.id) || [];
      const { data: turns, error: turnsError } = await supabase
        .from("Couples_echo_turns")
        .select("*")
        .in("session_id", sessionIds)
        .order("created_at", { ascending: true });

      if (turnsError) throw turnsError;

      const sessionsWithTurns =
        sessions?.map((session) => ({
          ...session,
          turns: turns?.filter((t) => t.session_id === session.id) || [],
        })) || [];

      setEchoSessions(sessionsWithTurns);
    } catch (error: any) {
      console.error("Error fetching echo sessions:", error);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Echo & Empathy Sessions</CardTitle>
          <CardDescription>
            Active listening exercises where partners practice reflecting back
            what they heard
          </CardDescription>
        </CardHeader>
        <CardContent>
          {echoSessions.length > 0 ? (
            <div className="space-y-4">
              {echoSessions.map((session) => {
                const step1Turn = session.turns.find((t) => t.step === 1);
                const step2Turn = session.turns.find((t) => t.step === 2);
                const step3Turn = session.turns.find((t) => t.step === 3);

                return (
                  <Card key={session.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">
                          Session{" "}
                          {session.created_at
                            ? formatDistanceToNow(
                                new Date(session.created_at),
                                { addSuffix: true },
                              )
                            : "Recently"}
                        </CardTitle>
                        <Badge
                          variant={
                            session.status === "completed"
                              ? "default"
                              : "secondary"
                          }
                        >
                          {session.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {step1Turn && (
                        <div>
                          <p className="text-sm font-semibold mb-1">
                            Step 1: Speaker's Concern
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {step1Turn.content}
                          </p>
                        </div>
                      )}
                      {step2Turn && (
                        <div>
                          <p className="text-sm font-semibold mb-1">
                            Step 2: Listener's Reflection
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {step2Turn.content}
                          </p>
                        </div>
                      )}
                      {step3Turn && (
                        <div>
                          <p className="text-sm font-semibold mb-1">
                            Step 3: Speaker's Confirmation
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {step3Turn.content}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              No Echo & Empathy sessions yet
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function IfsTab({
  coupleId,
  partnerId1,
  partnerId2,
  partner1Name,
  partner2Name,
}: {
  coupleId: string;
  partnerId1: string | null;
  partnerId2: string | null;
  partner1Name?: string;
  partner2Name?: string;
}) {
  const [partner1Parts, setPartner1Parts] = useState<IfsPart[]>([]);
  const [partner2Parts, setPartner2Parts] = useState<IfsPart[]>([]);

  useEffect(() => {
    fetchIfsParts();
  }, [coupleId]);

  const fetchIfsParts = async () => {
    try {
      const partnerIds = [partnerId1, partnerId2].filter(Boolean) as string[];
      if (partnerIds.length === 0) return;

      const { data: parts, error } = await supabase
        .from("Couples_ifs_parts")
        .select("*")
        .in("user_id", partnerIds)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setPartner1Parts(parts?.filter((p) => p.user_id === partnerId1) || []);
      setPartner2Parts(parts?.filter((p) => p.user_id === partnerId2) || []);
    } catch (error: any) {
      console.error("Error fetching IFS parts:", error);
    }
  };

  const renderParts = (parts: IfsPart[], partnerName?: string) => (
    <Card>
      <CardHeader>
        <CardTitle>{partnerName}'s Protective Parts</CardTitle>
        <CardDescription>
          Inner Family Systems protective parts identified
        </CardDescription>
      </CardHeader>
      <CardContent>
        {parts.length > 0 ? (
          <div className="space-y-4">
            {parts.map((part) => (
              <Card key={part.id}>
                <CardHeader>
                  <CardTitle className="text-base">{part.part_name}</CardTitle>
                  <CardDescription>
                    Identified{" "}
                    {part.created_at
                      ? formatDistanceToNow(new Date(part.created_at), {
                          addSuffix: true,
                        })
                      : "Recently"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm font-semibold mb-1">
                      When This Part Shows Up:
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {part.when_appears}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold mb-1">
                      Letter to This Part:
                    </p>
                    <div className="bg-muted p-4 rounded-md">
                      <p className="text-sm whitespace-pre-wrap">
                        {part.letter_content}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-8">
            No protective parts identified yet
          </p>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <Alert className="border-primary/20 bg-primary/5">
        <Heart className="h-4 w-4 text-primary" />
        <AlertDescription>
          <p className="font-semibold mb-2">Clinical Note: Privacy</p>
          <p className="text-sm">
            IFS letters are private. Partners cannot see each other's letters -
            only you (the therapist) can view them. This creates a safe space
            for self-reflection without fear of judgment.
          </p>
        </AlertDescription>
      </Alert>

      {renderParts(partner1Parts, partner1Name)}
      {renderParts(partner2Parts, partner2Name)}
    </div>
  );
}

function PauseHistoryTab({
  coupleId,
  partnerId1,
  partnerId2,
  partner1Name,
  partner2Name,
}: {
  coupleId: string;
  partnerId1: string | null;
  partnerId2: string | null;
  partner1Name?: string;
  partner2Name?: string;
}) {
  const [pauseEvents, setPauseEvents] = useState<PauseEvent[]>([]);

  useEffect(() => {
    fetchPauseHistory();
  }, [coupleId]);

  const fetchPauseHistory = async () => {
    try {
      const { data, error } = await supabase
        .from("Couples_pause_events")
        .select("*")
        .eq("couple_id", coupleId)
        .order("started_at", { ascending: false });

      if (error) throw error;
      setPauseEvents(data || []);
    } catch (error: any) {
      console.error("Error fetching pause history:", error);
    }
  };

  const getInitiatorName = (pause: PauseEvent) => {
    if (pause.initiated_by === partnerId1) return partner1Name || "Partner 1";
    if (pause.initiated_by === partnerId2) return partner2Name || "Partner 2";
    return "Unknown";
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Pause Button History</CardTitle>
          <CardDescription>
            20-minute de-escalation pauses activated during conflicts
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pauseEvents.length > 0 ? (
            <div className="space-y-4">
              {pauseEvents.map((pause) => {
                const duration =
                  pause.duration_minutes ||
                  (pause.ended_at && pause.started_at
                    ? Math.round(
                        (new Date(pause.ended_at).getTime() -
                          new Date(pause.started_at).getTime()) /
                          60000,
                      )
                    : null);

                return (
                  <Card key={pause.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-base">
                            Initiated by {getInitiatorName(pause)}
                          </CardTitle>
                          <CardDescription>
                            {pause.started_at
                              ? format(new Date(pause.started_at), "PPp")
                              : "Unknown time"}
                          </CardDescription>
                        </div>
                        <div className="text-right">
                          <Badge
                            variant={pause.ended_at ? "default" : "secondary"}
                          >
                            {pause.ended_at ? "Completed" : "Active"}
                          </Badge>
                          {duration !== null && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {duration} minutes
                            </p>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    {pause.reflection && (
                      <CardContent>
                        <p className="text-sm font-semibold mb-1">
                          Reflection:
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {pause.reflection}
                        </p>
                      </CardContent>
                    )}
                  </Card>
                );
              })}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              No pause events yet
            </p>
          )}
        </CardContent>
      </Card>

      <Alert className="border-primary/20 bg-primary/5">
        <Heart className="h-4 w-4 text-primary" />
        <AlertDescription>
          <p className="font-semibold mb-2">Clinical Insight: Pause Patterns</p>
          <p className="text-sm">
            Frequent use of the pause button may indicate the couple is actively
            working to manage conflict, which is positive. However, if pauses
            become too frequent or if one partner always initiates them, it
            could signal avoidance patterns worth exploring in therapy.
          </p>
        </AlertDescription>
      </Alert>
    </div>
  );
}

function FourHorsemenTab({ coupleId }: { coupleId: string }) {
  const { data: incidents = [], isLoading } = useQuery<any[]>({
    queryKey: [`/api/horsemen`, coupleId],
    enabled: !!coupleId,
  });

  const totalIncidents = incidents.length;
  const antidotePracticed = incidents.filter(
    (i: any) => i.antidote_practiced,
  ).length;
  const recentIncidents = incidents.slice(0, 10);

  const stats = incidents.reduce(
    (acc: any, incident: any) => {
      acc[incident.horseman_type] = (acc[incident.horseman_type] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card data-testid="card-total-incidents">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Total Incidents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className="text-2xl font-bold"
              data-testid="text-total-incidents"
            >
              {totalIncidents}
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-antidote-rate">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Antidote Success Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className="text-2xl font-bold text-green-600"
              data-testid="text-antidote-rate"
            >
              {totalIncidents > 0
                ? Math.round((antidotePracticed / totalIncidents) * 100)
                : 0}
              %
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-recent-activity">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-recent-count">
              {recentIncidents.length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card data-testid="card-horsemen-breakdown">
        <CardHeader>
          <CardTitle>Horsemen Breakdown</CardTitle>
          <CardDescription>Distribution of incident types</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {["criticism", "contempt", "defensiveness", "stonewalling"].map(
              (type) => (
                <div
                  key={type}
                  className="flex items-center justify-between"
                  data-testid={`stat-${type}`}
                >
                  <span className="capitalize text-sm">{type}</span>
                  <Badge variant="outline">{stats[type] || 0}</Badge>
                </div>
              ),
            )}
          </div>
        </CardContent>
      </Card>

      <Card data-testid="card-recent-incidents">
        <CardHeader>
          <CardTitle>Recent Incidents</CardTitle>
          <CardDescription>Last 10 logged incidents</CardDescription>
        </CardHeader>
        <CardContent>
          {recentIncidents.length > 0 ? (
            <div className="space-y-4">
              {recentIncidents.map((incident: any) => (
                <Card key={incident.id} data-testid={`incident-${incident.id}`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base capitalize">
                        {incident.horseman_type}
                      </CardTitle>
                      <div className="flex gap-2">
                        <Badge
                          variant={
                            incident.antidote_practiced
                              ? "default"
                              : "secondary"
                          }
                          data-testid={`badge-antidote-${incident.id}`}
                        >
                          {incident.antidote_practiced ? (
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                          ) : (
                            <XCircle className="w-3 h-3 mr-1" />
                          )}
                          {incident.antidote_practiced
                            ? "Antidote Practiced"
                            : "No Antidote"}
                        </Badge>
                      </div>
                    </div>
                    <CardDescription>
                      {incident.created_at
                        ? formatDistanceToNow(new Date(incident.created_at), {
                            addSuffix: true,
                          })
                        : "Recently"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      {incident.situation}
                    </p>
                    {incident.notes && (
                      <p className="text-sm text-muted-foreground mt-2 italic">
                        {incident.notes}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              No incidents logged yet
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function DemonDialoguesTab({ coupleId }: { coupleId: string }) {
  const { data: dialogues = [], isLoading } = useQuery<any[]>({
    queryKey: [`/api/demon-dialogues`, coupleId],
    enabled: !!coupleId,
  });

  const totalDialogues = dialogues.length;
  const interruptedCount = dialogues.filter((d: any) => d.interrupted).length;
  const recentDialogues = dialogues.slice(0, 10);

  const stats = dialogues.reduce(
    (acc: any, dialogue: any) => {
      acc[dialogue.dialogue_type] = (acc[dialogue.dialogue_type] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card data-testid="card-total-dialogues">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Total Cycles Recognized
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className="text-2xl font-bold"
              data-testid="text-total-dialogues"
            >
              {totalDialogues}
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-interruption-rate">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Interruption Success Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className="text-2xl font-bold text-green-600"
              data-testid="text-interruption-rate"
            >
              {totalDialogues > 0
                ? Math.round((interruptedCount / totalDialogues) * 100)
                : 0}
              %
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-recent-activity">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-recent-count">
              {recentDialogues.length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card data-testid="card-dialogue-breakdown">
        <CardHeader>
          <CardTitle>Dialogue Type Breakdown</CardTitle>
          <CardDescription>Distribution of negative cycles</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {["find_bad_guy", "protest_polka", "freeze_flee"].map((type) => (
              <div
                key={type}
                className="flex items-center justify-between"
                data-testid={`stat-${type}`}
              >
                <span className="text-sm">
                  {type
                    .split("_")
                    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                    .join(" ")}
                </span>
                <Badge variant="outline">{stats[type] || 0}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card data-testid="card-recent-dialogues">
        <CardHeader>
          <CardTitle>Recent Demon Dialogues</CardTitle>
          <CardDescription>Last 10 recognized cycles</CardDescription>
        </CardHeader>
        <CardContent>
          {recentDialogues.length > 0 ? (
            <div className="space-y-4">
              {recentDialogues.map((dialogue: any) => (
                <Card key={dialogue.id} data-testid={`dialogue-${dialogue.id}`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">
                        {dialogue.dialogue_type
                          .split("_")
                          .map(
                            (w: string) =>
                              w.charAt(0).toUpperCase() + w.slice(1),
                          )
                          .join(" ")}
                      </CardTitle>
                      <Badge
                        variant={dialogue.interrupted ? "default" : "secondary"}
                        data-testid={`badge-interrupted-${dialogue.id}`}
                      >
                        {dialogue.interrupted
                          ? "Interrupted"
                          : "Not Interrupted"}
                      </Badge>
                    </div>
                    <CardDescription>
                      {dialogue.created_at
                        ? formatDistanceToNow(new Date(dialogue.created_at), {
                            addSuffix: true,
                          })
                        : "Recently"}
                    </CardDescription>
                  </CardHeader>
                  {dialogue.notes && (
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        {dialogue.notes}
                      </p>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              No demon dialogues recognized yet
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function MeditationLibraryTab({ coupleId }: { coupleId: string }) {
  const { data: sessions = [], isLoading } = useQuery<any[]>({
    queryKey: [`/api/meditation/sessions`, coupleId],
    enabled: !!coupleId,
  });

  const completedSessions = sessions.filter((s: any) => s.completed).length;
  const totalMinutes = sessions
    .filter((s: any) => s.completed)
    .reduce(
      (sum: number, s: any) => sum + (s.meditation?.duration_mins || 0),
      0,
    );
  const recentSessions = sessions.slice(0, 10);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card data-testid="card-total-sessions">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Sessions Completed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className="text-2xl font-bold"
              data-testid="text-total-sessions"
            >
              {completedSessions}
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-total-minutes">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Minutes</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className="text-2xl font-bold text-primary"
              data-testid="text-total-minutes"
            >
              {totalMinutes}
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-recent-activity">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Recent Sessions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-recent-count">
              {recentSessions.length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card data-testid="card-recent-sessions">
        <CardHeader>
          <CardTitle>Recent Meditation Sessions</CardTitle>
          <CardDescription>Last 10 meditation practices</CardDescription>
        </CardHeader>
        <CardContent>
          {recentSessions.length > 0 ? (
            <div className="space-y-4">
              {recentSessions.map((session: any) => (
                <Card key={session.id} data-testid={`session-${session.id}`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">
                        {session.meditation?.title || "Meditation"}
                      </CardTitle>
                      <Badge
                        variant={session.completed ? "default" : "secondary"}
                        data-testid={`badge-status-${session.id}`}
                      >
                        {session.completed ? "Completed" : "In Progress"}
                      </Badge>
                    </div>
                    <CardDescription>
                      {session.created_at
                        ? formatDistanceToNow(new Date(session.created_at), {
                            addSuffix: true,
                          })
                        : "Recently"}
                      {session.meditation?.duration_mins &&
                        ` • ${session.meditation.duration_mins} mins`}
                    </CardDescription>
                  </CardHeader>
                  {session.feedback && (
                    <CardContent>
                      <p className="text-sm text-muted-foreground italic">
                        {session.feedback}
                      </p>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              No meditation sessions yet
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function IntimacyMappingTab({ coupleId }: { coupleId: string }) {
  const { data: ratings = [], isLoading: ratingsLoading } = useQuery<any[]>({
    queryKey: [`/api/intimacy/ratings`, coupleId],
    enabled: !!coupleId,
  });

  const { data: goals = [], isLoading: goalsLoading } = useQuery<any[]>({
    queryKey: [`/api/intimacy/goals`, coupleId],
    enabled: !!coupleId,
  });

  const totalRatings = ratings.length;
  const achievedGoals = goals.filter((g: any) => g.is_achieved).length;
  const recentRatings = ratings.slice(0, 5);

  const latestRating = ratings[0];
  const avgPhysical =
    ratings.length > 0
      ? Math.round(
          (ratings.reduce((sum: number, r: any) => sum + r.physical, 0) /
            ratings.length) *
            10,
        ) / 10
      : 0;
  const avgEmotional =
    ratings.length > 0
      ? Math.round(
          (ratings.reduce((sum: number, r: any) => sum + r.emotional, 0) /
            ratings.length) *
            10,
        ) / 10
      : 0;
  const avgIntellectual =
    ratings.length > 0
      ? Math.round(
          (ratings.reduce((sum: number, r: any) => sum + r.intellectual, 0) /
            ratings.length) *
            10,
        ) / 10
      : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card data-testid="card-total-ratings">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Ratings</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className="text-2xl font-bold"
              data-testid="text-total-ratings"
            >
              {totalRatings}
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-active-goals">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Goals Achieved
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className="text-2xl font-bold text-green-600"
              data-testid="text-goals-achieved"
            >
              {achievedGoals} / {goals.length}
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-avg-intimacy">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Avg Physical Intimacy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className="text-2xl font-bold text-primary"
              data-testid="text-avg-physical"
            >
              {avgPhysical}/10
            </div>
          </CardContent>
        </Card>
      </div>

      <Card data-testid="card-dimension-averages">
        <CardHeader>
          <CardTitle>Intimacy Dimension Averages</CardTitle>
          <CardDescription>
            Average ratings across all five dimensions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div data-testid="dimension-physical">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Physical</span>
                <span className="text-sm font-bold">{avgPhysical}/10</span>
              </div>
              <Progress
                value={avgPhysical * 10}
                className="h-2"
                data-testid="progress-physical"
              />
            </div>
            <div data-testid="dimension-emotional">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Emotional</span>
                <span className="text-sm font-bold">{avgEmotional}/10</span>
              </div>
              <Progress
                value={avgEmotional * 10}
                className="h-2"
                data-testid="progress-emotional"
              />
            </div>
            <div data-testid="dimension-intellectual">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Intellectual</span>
                <span className="text-sm font-bold">{avgIntellectual}/10</span>
              </div>
              <Progress
                value={avgIntellectual * 10}
                className="h-2"
                data-testid="progress-intellectual"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card data-testid="card-active-goals-list">
        <CardHeader>
          <CardTitle>Intimacy Goals</CardTitle>
          <CardDescription>Couple's intimacy improvement goals</CardDescription>
        </CardHeader>
        <CardContent>
          {goals.length > 0 ? (
            <div className="space-y-3">
              {goals.map((goal: any) => (
                <div
                  key={goal.id}
                  className="flex items-center justify-between p-3 border rounded-md"
                  data-testid={`goal-${goal.id}`}
                >
                  <div>
                    <p className="text-sm font-medium capitalize">
                      {goal.dimension}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {goal.goal_text}
                    </p>
                  </div>
                  <Badge
                    variant={goal.is_achieved ? "default" : "secondary"}
                    data-testid={`badge-goal-${goal.id}`}
                  >
                    {goal.is_achieved ? "Achieved" : "Active"}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              No intimacy goals set yet
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ValuesVisionTab({ coupleId }: { coupleId: string }) {
  const { data: dreams = [], isLoading: dreamsLoading } = useQuery<any[]>({
    queryKey: [`/api/dreams`, coupleId],
    enabled: !!coupleId,
  });

  const { data: values = [], isLoading: valuesLoading } = useQuery<any[]>({
    queryKey: [`/api/core-values`, coupleId],
    enabled: !!coupleId,
  });

  const { data: visionBoard = [], isLoading: visionLoading } = useQuery<any[]>({
    queryKey: [`/api/vision-board`, coupleId],
    enabled: !!coupleId,
  });

  const honoredDreams = dreams.filter((d: any) => d.partner_honored).length;
  const agreedValues = values.filter((v: any) => v.is_agreed).length;
  const achievedVisions = visionBoard.filter((v: any) => v.is_achieved).length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card data-testid="card-total-dreams">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Shared Dreams</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-dreams">
              {dreams.length}
            </div>
            <p className="text-xs text-muted-foreground">
              {honoredDreams} honored
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-core-values">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Core Values</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-core-values">
              {values.length}
            </div>
            <p className="text-xs text-muted-foreground">
              {agreedValues} agreed upon
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-vision-items">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Vision Board Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-vision-items">
              {visionBoard.length}
            </div>
            <p className="text-xs text-muted-foreground">
              {achievedVisions} achieved
            </p>
          </CardContent>
        </Card>
      </div>

      <Card data-testid="card-recent-dreams">
        <CardHeader>
          <CardTitle>Recent Dreams</CardTitle>
          <CardDescription>Last 5 shared dreams</CardDescription>
        </CardHeader>
        <CardContent>
          {dreams.length > 0 ? (
            <div className="space-y-3">
              {dreams.slice(0, 5).map((dream: any) => (
                <div
                  key={dream.id}
                  className="p-3 border rounded-md"
                  data-testid={`dream-${dream.id}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <Badge
                      variant="outline"
                      data-testid={`badge-category-${dream.id}`}
                    >
                      {dream.category}
                    </Badge>
                    <Badge
                      variant={dream.partner_honored ? "default" : "secondary"}
                      data-testid={`badge-honored-${dream.id}`}
                    >
                      {dream.partner_honored ? "Honored" : "Pending"}
                    </Badge>
                  </div>
                  <p className="text-sm">{dream.dream_text}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {dream.time_horizon} •{" "}
                    {dream.created_at
                      ? formatDistanceToNow(new Date(dream.created_at), {
                          addSuffix: true,
                        })
                      : "Recently"}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              No dreams shared yet
            </p>
          )}
        </CardContent>
      </Card>

      <Card data-testid="card-core-values-list">
        <CardHeader>
          <CardTitle>Core Values</CardTitle>
          <CardDescription>Couple's shared values</CardDescription>
        </CardHeader>
        <CardContent>
          {values.length > 0 ? (
            <div className="space-y-3">
              {values.map((value: any) => (
                <div
                  key={value.id}
                  className="flex items-center justify-between p-3 border rounded-md"
                  data-testid={`value-${value.id}`}
                >
                  <div>
                    <p className="text-sm font-medium">{value.value_name}</p>
                    {value.definition && (
                      <p className="text-sm text-muted-foreground">
                        {value.definition}
                      </p>
                    )}
                  </div>
                  <Badge
                    variant={value.is_agreed ? "default" : "secondary"}
                    data-testid={`badge-value-${value.id}`}
                  >
                    {value.is_agreed ? "Agreed" : "Proposed"}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              No core values defined yet
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ParentingPartnersTab({ coupleId }: { coupleId: string }) {
  const { data: agreements = [], isLoading: agreementsLoading } = useQuery<
    any[]
  >({
    queryKey: [`/api/parenting/agreements`, coupleId],
    enabled: !!coupleId,
  });

  const { data: stressCheckins = [], isLoading: stressLoading } = useQuery<
    any[]
  >({
    queryKey: [`/api/parenting/stress-checkins`, coupleId],
    enabled: !!coupleId,
  });

  const { data: styles = [], isLoading: stylesLoading } = useQuery<any[]>({
    queryKey: [`/api/parenting/styles`, coupleId],
    enabled: !!coupleId,
  });

  const activeAgreements = agreements.filter((a: any) => a.is_active).length;
  const avgStress =
    stressCheckins.length > 0
      ? Math.round(
          (stressCheckins.reduce(
            (sum: number, s: any) => sum + s.stress_level,
            0,
          ) /
            stressCheckins.length) *
            10,
        ) / 10
      : 0;
  const recentStressCheckins = stressCheckins.slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card data-testid="card-discipline-agreements">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Discipline Agreements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-agreements">
              {agreements.length}
            </div>
            <p className="text-xs text-muted-foreground">
              {activeAgreements} active
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-stress-checkins">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Stress Check-ins
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-checkins">
              {stressCheckins.length}
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-avg-stress">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Avg Stress Level
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className="text-2xl font-bold text-orange-600"
              data-testid="text-avg-stress"
            >
              {avgStress}/10
            </div>
          </CardContent>
        </Card>
      </div>

      <Card data-testid="card-parenting-styles">
        <CardHeader>
          <CardTitle>Parenting Styles</CardTitle>
          <CardDescription>
            Each partner's identified parenting approach
          </CardDescription>
        </CardHeader>
        <CardContent>
          {styles.length > 0 ? (
            <div className="space-y-4">
              {styles.map((style: any) => (
                <div
                  key={style.id}
                  className="p-4 border rounded-md"
                  data-testid={`style-${style.id}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <Badge
                      variant="outline"
                      data-testid={`badge-style-${style.id}`}
                    >
                      {style.style_type}
                    </Badge>
                  </div>
                  {style.discipline_approach && (
                    <p className="text-sm text-muted-foreground mt-2">
                      <strong>Discipline:</strong> {style.discipline_approach}
                    </p>
                  )}
                  {style.values_text && (
                    <p className="text-sm text-muted-foreground mt-1">
                      <strong>Values:</strong> {style.values_text}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              No parenting styles defined yet
            </p>
          )}
        </CardContent>
      </Card>

      <Card data-testid="card-recent-stress">
        <CardHeader>
          <CardTitle>Recent Stress Check-ins</CardTitle>
          <CardDescription>Last 5 parenting stress reports</CardDescription>
        </CardHeader>
        <CardContent>
          {recentStressCheckins.length > 0 ? (
            <div className="space-y-3">
              {recentStressCheckins.map((checkin: any) => (
                <Card key={checkin.id} data-testid={`checkin-${checkin.id}`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">
                        Stress Level: {checkin.stress_level}/10
                      </CardTitle>
                      <CardDescription>
                        {checkin.created_at
                          ? formatDistanceToNow(new Date(checkin.created_at), {
                              addSuffix: true,
                            })
                          : "Recently"}
                      </CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {checkin.stressor_text && (
                      <p className="text-sm text-muted-foreground">
                        <strong>Stressor:</strong> {checkin.stressor_text}
                      </p>
                    )}
                    {checkin.support_needed && (
                      <p className="text-sm text-muted-foreground">
                        <strong>Support Needed:</strong>{" "}
                        {checkin.support_needed}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              No stress check-ins yet
            </p>
          )}
        </CardContent>
      </Card>

      <Card data-testid="card-agreements-list">
        <CardHeader>
          <CardTitle>Discipline Agreements</CardTitle>
          <CardDescription>
            Agreed-upon approaches to common scenarios
          </CardDescription>
        </CardHeader>
        <CardContent>
          {agreements.length > 0 ? (
            <div className="space-y-3">
              {agreements.map((agreement: any) => (
                <div
                  key={agreement.id}
                  className="p-3 border rounded-md"
                  data-testid={`agreement-${agreement.id}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <p className="text-sm font-medium">{agreement.scenario}</p>
                    <Badge
                      variant={agreement.is_active ? "default" : "secondary"}
                      data-testid={`badge-agreement-${agreement.id}`}
                    >
                      {agreement.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {agreement.agreed_approach}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              No discipline agreements yet
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

interface TherapistThought {
  id: string;
  thought_type: "todo" | "message" | "file_reference";
  title: string;
  content?: string;
  file_reference?: string;
  priority?: "low" | "medium" | "high";
  is_completed?: boolean;
  individual_id?: string | null;
}

function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

interface TherapistThoughtsPanelProps {
  coupleId: string;
  partner1?: { id: string; full_name: string | null } | null;
  partner2?: { id: string; full_name: string | null } | null;
}

function TherapistThoughtsPanel({
  coupleId,
  partner1,
  partner2,
}: TherapistThoughtsPanelProps) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [newThought, setNewThought] = useState({
    thought_type: "todo" as "todo" | "message" | "file_reference",
    title: "",
    content: "",
    priority: "medium" as "low" | "medium" | "high",
    individual_id: null as string | null,
  });

  const getPartnerName = (id: string) => {
    if (partner1?.id === id) return partner1.full_name || "Partner 1";
    if (partner2?.id === id) return partner2.full_name || "Partner 2";
    return "Unknown";
  };

  const thoughtsQuery = useQuery({
    queryKey: ["therapist-thoughts", coupleId],
    queryFn: () => aiFunctions.getTherapistThoughts(coupleId),
    retry: 1,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      return aiFunctions.createTherapistThought({
        couple_id: coupleId,
        thought_type: newThought.thought_type,
        title: newThought.title,
        content: newThought.content,
        priority: newThought.priority,
        individual_id: newThought.individual_id,
      });
    },
    onSuccess: () => {
      setNewThought({
        thought_type: "todo",
        title: "",
        content: "",
        priority: "medium",
        individual_id: null,
      });
      setIsOpen(false);
      toast({ title: "Success", description: "Thought added" });
      queryClient.invalidateQueries({
        queryKey: ["therapist-thoughts", coupleId],
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to add thought",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return aiFunctions.deleteTherapistThought(id);
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Thought deleted" });
      queryClient.invalidateQueries({
        queryKey: ["therapist-thoughts", coupleId],
      });
    },
  });

  const allThoughts = (thoughtsQuery.data || []) as TherapistThought[];

  const thoughts = allThoughts;

  const todos = thoughts.filter((t) => t.thought_type === "todo");
  const messages = thoughts.filter((t) => t.thought_type === "message");
  const fileRefs = thoughts.filter((t) => t.thought_type === "file_reference");

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button
              size="sm"
              className="text-xs md:text-sm h-8 md:h-9"
              data-testid="button-add-thought"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline ml-1">Add Thought</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="w-full max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-base">
                Add Therapist Thought
              </DialogTitle>
              <DialogDescription className="text-xs">
                Create a to-do, message, or file reference for the couple
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium mb-1 block">Type</label>
                <Select
                  value={newThought.thought_type}
                  onValueChange={(value: any) =>
                    setNewThought({ ...newThought, thought_type: value })
                  }
                >
                  <SelectTrigger
                    className="h-8 text-xs"
                    data-testid="select-thought-type"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todo">To-Do</SelectItem>
                    <SelectItem value="message">Message to Client</SelectItem>
                    <SelectItem value="file_reference">
                      File Reference
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs font-medium mb-1 block">Title</label>
                <Input
                  placeholder="Title..."
                  value={newThought.title}
                  onChange={(e) =>
                    setNewThought({ ...newThought, title: e.target.value })
                  }
                  className="h-8 text-xs"
                  data-testid="input-thought-title"
                />
              </div>

              <div>
                <label className="text-xs font-medium mb-1 block">
                  Content (Optional)
                </label>
                <Textarea
                  placeholder="Add details..."
                  value={newThought.content}
                  onChange={(e) =>
                    setNewThought({ ...newThought, content: e.target.value })
                  }
                  className="resize-none text-xs min-h-16"
                  data-testid="textarea-thought-content"
                />
              </div>

              <div>
                <label className="text-xs font-medium mb-1 block">For</label>
                <Select
                  value={newThought.individual_id || "both"}
                  onValueChange={(value: string) =>
                    setNewThought({
                      ...newThought,
                      individual_id: value === "both" ? null : value,
                    })
                  }
                >
                  <SelectTrigger
                    className="h-8 text-xs"
                    data-testid="select-thought-target"
                  >
                    <SelectValue placeholder="Select recipient" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="both">Both Partners</SelectItem>
                    {partner1 && (
                      <SelectItem value={partner1.id}>
                        {partner1.full_name || "Partner 1"}
                      </SelectItem>
                    )}
                    {partner2 && (
                      <SelectItem value={partner2.id}>
                        {partner2.full_name || "Partner 2"}
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs font-medium mb-1 block">
                  Priority
                </label>
                <Select
                  value={newThought.priority}
                  onValueChange={(value: any) =>
                    setNewThought({ ...newThought, priority: value })
                  }
                >
                  <SelectTrigger
                    className="h-8 text-xs"
                    data-testid="select-thought-priority"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={() => createMutation.mutate()}
                disabled={!newThought.title || createMutation.isPending}
                className="w-full text-xs h-8"
                data-testid="button-submit-thought"
              >
                {createMutation.isPending ? "Adding..." : "Add Thought"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {thoughtsQuery.isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-4 h-4 animate-spin" />
        </div>
      ) : thoughts.length === 0 ? (
        <Alert className="text-xs">
          <AlertCircle className="h-3 w-3" />
          <AlertDescription className="text-xs">
            No therapist thoughts yet.
          </AlertDescription>
        </Alert>
      ) : (
        <>
          {todos.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">To-Do Items</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {todos.map((thought) => (
                  <div
                    key={thought.id}
                    className="flex items-start gap-2 p-2 bg-muted rounded text-xs group"
                  >
                    <CheckCircle2 className="w-3 h-3 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="font-semibold break-words">
                          {thought.title}
                        </p>
                        <Badge variant="outline" className="text-xs h-4 px-1">
                          {thought.individual_id
                            ? getPartnerName(thought.individual_id)
                            : "Both"}
                        </Badge>
                      </div>
                      {thought.content && (
                        <p className="text-muted-foreground break-words line-clamp-2">
                          {thought.content}
                        </p>
                      )}
                      {thought.priority && (
                        <Badge
                          className="mt-1 text-xs"
                          variant={
                            thought.priority === "high"
                              ? "destructive"
                              : thought.priority === "medium"
                                ? "secondary"
                                : "outline"
                          }
                        >
                          {thought.priority}
                        </Badge>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteMutation.mutate(thought.id)}
                      className="h-6 w-6 flex-shrink-0 opacity-0 group-hover:opacity-100"
                      data-testid={`button-delete-thought-${thought.id}`}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {messages.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Messages to Clients</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {messages.map((thought) => (
                  <div
                    key={thought.id}
                    className="flex items-start gap-2 p-2 bg-muted rounded text-xs group"
                  >
                    <MessageSquare className="w-3 h-3 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="font-semibold break-words">
                          {thought.title}
                        </p>
                        <Badge variant="outline" className="text-xs h-4 px-1">
                          {thought.individual_id
                            ? getPartnerName(thought.individual_id)
                            : "Both"}
                        </Badge>
                      </div>
                      {thought.content && (
                        <p className="text-muted-foreground break-words line-clamp-2">
                          {thought.content}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteMutation.mutate(thought.id)}
                      className="h-6 w-6 flex-shrink-0 opacity-0 group-hover:opacity-100"
                      data-testid={`button-delete-thought-${thought.id}`}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {fileRefs.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">File References</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {fileRefs.map((thought) => (
                  <div
                    key={thought.id}
                    className="flex items-start gap-2 p-2 bg-muted rounded text-xs group"
                  >
                    <FileText className="w-3 h-3 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="font-semibold break-words">
                          {thought.title}
                        </p>
                        <Badge variant="outline" className="text-xs h-4 px-1">
                          {thought.individual_id
                            ? getPartnerName(thought.individual_id)
                            : "Both"}
                        </Badge>
                      </div>
                      {thought.content && (
                        <p className="text-muted-foreground break-words line-clamp-2">
                          {thought.content}
                        </p>
                      )}
                      {thought.file_reference &&
                        isValidUrl(thought.file_reference) && (
                          <a
                            href={thought.file_reference}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline inline-flex items-center gap-1 mt-1"
                          >
                            <ExternalLink className="w-3 h-3" />
                            Open Link
                          </a>
                        )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteMutation.mutate(thought.id)}
                      className="h-6 w-6 flex-shrink-0 opacity-0 group-hover:opacity-100"
                      data-testid={`button-delete-thought-${thought.id}`}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

// EditPromptForm component for inline editing of prompts
function EditPromptForm({
  prompt,
  onSave,
  onCancel,
  isSaving,
}: {
  prompt: TherapistPrompt;
  onSave: (data: {
    tool_name: string;
    title: string;
    description: string;
    suggested_action: string;
  }) => void;
  onCancel: () => void;
  isSaving: boolean;
}) {
  const [editData, setEditData] = useState({
    tool_name: prompt.tool_name,
    title: prompt.title,
    description: prompt.description || "",
    suggested_action: prompt.suggested_action,
  });

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium">Activity Type</label>
          <Select
            value={editData.tool_name}
            onValueChange={(value) =>
              setEditData((d) => ({ ...d, tool_name: value }))
            }
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="weekly-checkin">Weekly Check-In</SelectItem>
              <SelectItem value="gratitude">Gratitude Log</SelectItem>
              <SelectItem value="shared-goals">Shared Goals</SelectItem>
              <SelectItem value="rituals">Rituals of Connection</SelectItem>
              <SelectItem value="conversations">Hold Me Tight</SelectItem>
              <SelectItem value="voice-memos">Voice Memos</SelectItem>
              <SelectItem value="custom">Custom Activity</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium">Title</label>
          <Input
            value={editData.title}
            onChange={(e) =>
              setEditData((d) => ({ ...d, title: e.target.value }))
            }
            className="h-8 text-sm"
            data-testid="input-edit-prompt-title"
          />
        </div>
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium">Description</label>
        <Input
          value={editData.description}
          onChange={(e) =>
            setEditData((d) => ({ ...d, description: e.target.value }))
          }
          className="h-8 text-sm"
          placeholder="Brief explanation"
          data-testid="input-edit-prompt-description"
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium">Suggested Action</label>
        <Textarea
          value={editData.suggested_action}
          onChange={(e) =>
            setEditData((d) => ({ ...d, suggested_action: e.target.value }))
          }
          className="min-h-20 text-sm"
          data-testid="input-edit-prompt-action"
        />
      </div>
      <div className="flex items-center gap-2 pt-2">
        <Button
          size="sm"
          onClick={() => onSave(editData)}
          disabled={isSaving || !editData.title || !editData.suggested_action}
          data-testid="button-save-prompt"
        >
          {isSaving ? (
            <Loader2 className="h-4 w-4 animate-spin mr-1" />
          ) : (
            <Save className="h-4 w-4 mr-1" />
          )}
          Save
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={onCancel}
          disabled={isSaving}
          data-testid="button-cancel-edit-prompt"
        >
          <X className="h-4 w-4 mr-1" />
          Cancel
        </Button>
      </div>
    </div>
  );
}

function GratitudeTab({ coupleId }: { coupleId: string }) {
  const { data: gratitudeEntries = [], isLoading } = useQuery({
    queryKey: ["gratitude-entries", coupleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("Couples_gratitude_log")
        .select("*, author:Couples_profiles!author_id(full_name)")
        .eq("couple_id", coupleId)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data || [];
    },
    enabled: !!coupleId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (gratitudeEntries.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No gratitude entries yet.</p>
        <p className="text-sm">The couple hasn't shared any gratitude moments.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {gratitudeEntries.map((entry: any) => (
        <div key={entry.id} className="p-3 border rounded-md">
          <p className="text-sm">{entry.content}</p>
          <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
            <span>{entry.author?.full_name || "Unknown"}</span>
            <span>{format(new Date(entry.created_at), "MMM d, yyyy")}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function ConflictResolutionTab({ coupleId }: { coupleId: string }) {
  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ["conflict-sessions", coupleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("Couples_conflict_sessions")
        .select("*")
        .eq("couple_id", coupleId)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data || [];
    },
    enabled: !!coupleId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No conflict resolution sessions yet.</p>
        <p className="text-sm">The couple hasn't used the I-Statement builder.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sessions.map((session: any) => (
        <div key={session.id} className="p-3 border rounded-md">
          <div className="flex items-center justify-between">
            <Badge variant={session.status === "resolved" ? "default" : "secondary"}>
              {session.status}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {format(new Date(session.created_at), "MMM d, yyyy")}
            </span>
          </div>
          {session.topic && <p className="text-sm mt-2">{session.topic}</p>}
        </div>
      ))}
    </div>
  );
}

function VoiceMemosTab({ coupleId }: { coupleId: string }) {
  const { data: memos = [], isLoading } = useQuery({
    queryKey: ["voice-memos", coupleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("Couples_voice_memos")
        .select("*, sender:Couples_profiles!sender_id(full_name)")
        .eq("couple_id", coupleId)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data || [];
    },
    enabled: !!coupleId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (memos.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No voice memos yet.</p>
        <p className="text-sm">The couple hasn't exchanged any audio messages.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {memos.map((memo: any) => (
        <div key={memo.id} className="p-3 border rounded-md">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{memo.sender?.full_name || "Unknown"}</span>
            <span className="text-xs text-muted-foreground">
              {format(new Date(memo.created_at), "MMM d, yyyy h:mm a")}
            </span>
          </div>
          {memo.transcript && (
            <p className="text-sm text-muted-foreground mt-2 italic">"{memo.transcript}"</p>
          )}
          <div className="text-xs text-muted-foreground mt-1">
            Duration: {memo.duration_seconds ? `${Math.floor(memo.duration_seconds / 60)}:${(memo.duration_seconds % 60).toString().padStart(2, '0')}` : "Unknown"}
          </div>
        </div>
      ))}
    </div>
  );
}

function FinancialToolkitTab({ coupleId }: { coupleId: string }) {
  const { data: budgets = [], isLoading } = useQuery({
    queryKey: ["financial-budgets", coupleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("Couples_financial_budgets")
        .select("*")
        .eq("couple_id", coupleId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!coupleId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (budgets.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No financial data yet.</p>
        <p className="text-sm">The couple hasn't set up any budgets.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {budgets.map((budget: any) => (
        <div key={budget.id} className="p-3 border rounded-md">
          <div className="flex items-center justify-between">
            <span className="font-medium">{budget.category}</span>
            <span className="text-sm">${budget.amount?.toLocaleString()}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function GrowthPlanTab({ coupleId }: { coupleId: string }) {
  const { data: plans = [], isLoading } = useQuery({
    queryKey: ["growth-plans", coupleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("Couples_growth_plans")
        .select("*")
        .eq("couple_id", coupleId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!coupleId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (plans.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No growth plans yet.</p>
        <p className="text-sm">The couple hasn't generated an AI-powered growth plan.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {plans.map((plan: any) => (
        <div key={plan.id} className="p-4 border rounded-md space-y-3">
          <div className="flex items-center justify-between">
            <Badge>{plan.status || "active"}</Badge>
            <span className="text-xs text-muted-foreground">
              {format(new Date(plan.created_at), "MMM d, yyyy")}
            </span>
          </div>
          {plan.exercises && (
            <div>
              <p className="text-sm font-medium mb-2">Exercises:</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                {(plan.exercises as any[]).slice(0, 3).map((ex: any, i: number) => (
                  <li key={i}>{ex.name || ex.title}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function ProgressTimelineTab({ coupleId }: { coupleId: string }) {
  const { data: events = [], isLoading } = useQuery({
    queryKey: ["progress-events", coupleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("Couples_progress_events")
        .select("*")
        .eq("couple_id", coupleId)
        .order("event_date", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data || [];
    },
    enabled: !!coupleId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No progress events yet.</p>
        <p className="text-sm">Milestones and achievements will appear here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {events.map((event: any) => (
        <div key={event.id} className="flex gap-3 p-3 border rounded-md">
          <div className="flex-shrink-0 w-2 h-2 mt-2 rounded-full bg-primary" />
          <div className="flex-1">
            <p className="text-sm font-medium">{event.title || event.event_type}</p>
            {event.description && (
              <p className="text-sm text-muted-foreground">{event.description}</p>
            )}
            <span className="text-xs text-muted-foreground">
              {format(new Date(event.event_date || event.created_at), "MMM d, yyyy")}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function MoodTrackerTab({ coupleId }: { coupleId: string }) {
  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["mood-entries", coupleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("Couples_mood_entries")
        .select("*, author:Couples_profiles!user_id(full_name)")
        .eq("couple_id", coupleId)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data || [];
    },
    enabled: !!coupleId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No mood entries yet.</p>
        <p className="text-sm">Partners haven't logged their emotional states.</p>
      </div>
    );
  }

  const getMoodColor = (mood: number) => {
    if (mood >= 4) return "bg-green-500";
    if (mood >= 3) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <div className="space-y-3">
      {entries.map((entry: any) => (
        <div key={entry.id} className="p-3 border rounded-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${getMoodColor(entry.mood_score)}`} />
              <span className="font-medium">{entry.author?.full_name || "Unknown"}</span>
            </div>
            <span className="text-xs text-muted-foreground">
              {format(new Date(entry.created_at), "MMM d, yyyy")}
            </span>
          </div>
          {entry.notes && <p className="text-sm text-muted-foreground mt-2">{entry.notes}</p>}
        </div>
      ))}
    </div>
  );
}

function GoalsTab({ coupleId }: { coupleId: string }) {
  const { data: goals = [], isLoading } = useQuery({
    queryKey: ["shared-goals", coupleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("Couples_shared_goals")
        .select("*")
        .eq("couple_id", coupleId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!coupleId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (goals.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">
            <p>No shared goals yet.</p>
            <p className="text-sm">The couple hasn't set any goals together.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Shared Goals</CardTitle>
        <CardDescription>Goals the couple is working toward together</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {goals.map((goal: any) => (
          <div key={goal.id} className="p-3 border rounded-md">
            <div className="flex items-center justify-between">
              <span className="font-medium">{goal.title}</span>
              <Badge variant={goal.completed ? "default" : "secondary"}>
                {goal.completed ? "Completed" : "In Progress"}
              </Badge>
            </div>
            {goal.description && (
              <p className="text-sm text-muted-foreground mt-1">{goal.description}</p>
            )}
            {goal.target_date && (
              <p className="text-xs text-muted-foreground mt-2">
                Target: {format(new Date(goal.target_date), "MMM d, yyyy")}
              </p>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function RitualsTab({ coupleId }: { coupleId: string }) {
  const { data: rituals = [], isLoading } = useQuery({
    queryKey: ["rituals", coupleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("Couples_rituals")
        .select("*")
        .eq("couple_id", coupleId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!coupleId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (rituals.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">
            <p>No rituals of connection yet.</p>
            <p className="text-sm">The couple hasn't established any rituals.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Rituals of Connection</CardTitle>
        <CardDescription>Special routines and traditions</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {rituals.map((ritual: any) => (
          <div key={ritual.id} className="p-3 border rounded-md">
            <div className="flex items-center justify-between">
              <span className="font-medium">{ritual.name || ritual.title}</span>
              {ritual.frequency && (
                <Badge variant="outline">{ritual.frequency}</Badge>
              )}
            </div>
            {ritual.description && (
              <p className="text-sm text-muted-foreground mt-1">{ritual.description}</p>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function ConversationsTab({ coupleId }: { coupleId: string }) {
  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ["hmt-conversations", coupleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("Couples_hold_me_tight")
        .select("*")
        .eq("couple_id", coupleId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!coupleId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">
            <p>No Hold Me Tight conversations yet.</p>
            <p className="text-sm">The couple hasn't completed any structured conversations.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Hold Me Tight Conversations</CardTitle>
        <CardDescription>Emotionally-focused conversation exercises</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {conversations.map((conv: any) => (
          <div key={conv.id} className="p-3 border rounded-md">
            <div className="flex items-center justify-between">
              <span className="font-medium">{conv.conversation_type || "Conversation"}</span>
              <span className="text-xs text-muted-foreground">
                {format(new Date(conv.created_at), "MMM d, yyyy")}
              </span>
            </div>
            {conv.status && (
              <Badge variant={conv.status === "completed" ? "default" : "secondary"} className="mt-2">
                {conv.status}
              </Badge>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

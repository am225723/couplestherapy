import { useEffect, useState } from "react";
import { useRoute, Link, useLocation } from "wouter";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { aiFunctions, TherapistThought as AITherapistThought } from "@/lib/ai-functions";
import {
  Loader2,
  Users,
  MessageSquare,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Menu,
  X,
  FileText,
  BarChart3,
  Calendar,
  Heart,
  Send,
  Sparkles,
  Settings,
  PenLine,
  Eye,
} from "lucide-react";
import { SessionNotesPanel } from "@/components/session-notes-panel";

interface CoupleData {
  id: string;
  partner1_id: string;
  partner2_id: string;
  partner1?: { full_name: string };
  partner2?: { full_name: string };
}

interface TherapistThought {
  id: string;
  thought_type: "todo" | "message" | "file_reference";
  title: string;
  content?: string;
  priority?: "low" | "medium" | "high";
  is_completed?: boolean;
}

export default function TherapistDashboard() {
  const [, params] = useRoute("/admin/couple/:id");
  const { profile } = useAuth();
  const coupleId = params?.id;

  const [couples, setCouples] = useState<CoupleData[]>([]);
  const [selectedCouple, setSelectedCouple] = useState<CoupleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [panelOpen, setPanelOpen] = useState(false);

  useEffect(() => {
    if (profile?.id) {
      fetchCouples();
    }
  }, [profile?.id]);

  useEffect(() => {
    if (coupleId && couples.length > 0) {
      const couple = couples.find((c) => c.id === coupleId);
      setSelectedCouple(couple || null);
    }
  }, [coupleId, couples]);

  const fetchCouples = async () => {
    if (!profile?.id) return;
    try {
      const { data: couplesData } = await supabase
        .from("Couples_couples")
        .select("*")
        .eq("therapist_id", profile.id);

      if (couplesData) {
        const { data: profiles } = await supabase
          .from("Couples_profiles")
          .select("id, full_name");

        const enriched = couplesData.map((couple) => ({
          ...couple,
          partner1: profiles?.find((p) => p.id === couple.partner1_id),
          partner2: profiles?.find((p) => p.id === couple.partner2_id),
        }));
        setCouples(enriched);
      }
    } catch (error) {
      console.error("Error fetching couples:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCouples = couples.filter(
    (couple) =>
      couple.partner1?.full_name
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      couple.partner2?.full_name
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="w-full h-full flex flex-col md:flex-row bg-gradient-to-br from-background via-background to-primary/5">
      {/* Mobile/Tablet: Drawer Panel */}
      {panelOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setPanelOpen(false)}
          />
          <div className="absolute left-0 top-0 bottom-0 w-80 bg-background/95 backdrop-blur-xl shadow-2xl flex flex-col border-r border-border/50">
            <div className="flex items-center justify-between p-4 border-b border-border/50">
              <h2 className="text-lg font-semibold tracking-tight">My Couples</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setPanelOpen(false)}
                className="rounded-xl"
                data-testid="button-close-panel"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <CouplesList
              loading={loading}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              filteredCouples={filteredCouples}
              selectedCouple={selectedCouple}
              onSelectCouple={() => setPanelOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Desktop: Sidebar Panel (always visible) */}
      <div className="hidden md:flex md:w-80 md:flex-col md:border-r md:border-border/50 md:bg-muted/20">
        <div className="flex items-center justify-between p-4 border-b border-border/50">
          <h2 className="text-lg font-semibold tracking-tight">My Couples</h2>
        </div>
        <CouplesList
          loading={loading}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          filteredCouples={filteredCouples}
          selectedCouple={selectedCouple}
        />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Toggle Button */}
        <div className="md:hidden flex items-center justify-between p-4 border-b border-border/50">
          <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setPanelOpen(true)}
            className="rounded-xl"
            data-testid="button-open-panel"
          >
            <Menu className="w-4 h-4" />
          </Button>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-6">
            {selectedCouple ? (
              <CoupleDetails couple={selectedCouple} therapistId={profile?.id || ""} />
            ) : (
              <div className="min-h-[300px] flex items-center justify-center">
                <div className="text-center space-y-3 p-8 rounded-2xl bg-muted/30 border border-border/50">
                  <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                    <Users className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-lg font-medium">Select a Couple</h3>
                  <p className="text-sm text-muted-foreground max-w-xs">
                    Choose a couple from the sidebar to view their details and manage their progress
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function CouplesList({
  loading,
  searchTerm,
  setSearchTerm,
  filteredCouples,
  selectedCouple,
  onSelectCouple,
}: {
  loading: boolean;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  filteredCouples: CoupleData[];
  selectedCouple: CoupleData | null;
  onSelectCouple?: () => void;
}) {
  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border/50 space-y-2">
        <Input
          placeholder="Search couples..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="text-sm rounded-xl bg-background/60"
          data-testid="input-search-couples"
        />
        <p className="text-xs text-muted-foreground">
          {filteredCouples.length} couple{filteredCouples.length !== 1 ? "s" : ""}
        </p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-2">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
            </div>
          ) : filteredCouples.length === 0 ? (
            <div className="p-4 text-center">
              <Users className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
              <p className="text-xs text-muted-foreground">
                {searchTerm ? "No matches found" : "No couples assigned"}
              </p>
            </div>
          ) : (
            filteredCouples.map((couple) => (
              <div
                key={couple.id}
                className={`p-3 rounded-xl transition-all ${
                  selectedCouple?.id === couple.id
                    ? "bg-primary/10 ring-1 ring-primary/50 shadow-sm"
                    : "hover:bg-muted/50"
                }`}
                data-testid={`card-couple-${couple.id}`}
              >
                <Link href={`/admin/couple/${couple.id}`}>
                  <div
                    className="flex items-center gap-3 cursor-pointer"
                    onClick={onSelectCouple}
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center flex-shrink-0">
                      <Users className="w-4 h-4 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">
                        {couple.partner1?.full_name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        & {couple.partner2?.full_name}
                      </p>
                    </div>
                  </div>
                </Link>
                <div className="flex items-center gap-1 mt-2 pl-13">
                  <Link href={`/admin/couple/${couple.id}?tab=notes`}>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 px-2 text-xs rounded-lg"
                      data-testid={`button-quick-notes-${couple.id}`}
                    >
                      <PenLine className="w-3.5 h-3.5 mr-1" />
                      Note
                    </Button>
                  </Link>
                  <Link href={`/admin/couple/${couple.id}?tab=thoughts`}>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 px-2 text-xs rounded-lg"
                      data-testid={`button-quick-message-${couple.id}`}
                    >
                      <Send className="w-3.5 h-3.5 mr-1" />
                      Message
                    </Button>
                  </Link>
                  <Link href={`/admin/couple/${couple.id}/calendar`}>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 px-2 text-xs rounded-lg"
                      data-testid={`button-quick-calendar-${couple.id}`}
                    >
                      <Calendar className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function CoupleDetails({ couple, therapistId }: { couple: CoupleData; therapistId: string }) {
  const { toast } = useToast();
  const [location] = useLocation();
  
  const urlParams = new URLSearchParams(window.location.search);
  const tabFromUrl = urlParams.get("tab") || "overview";
  const [activeTab, setActiveTab] = useState(tabFromUrl);
  
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get("tab") || "overview";
    setActiveTab(tab);
  }, [location]);

  // Fetch therapist thoughts
  const thoughtsQuery = useQuery({
    queryKey: ["therapist-thoughts", couple.id],
    queryFn: () => aiFunctions.getTherapistThoughts(couple.id),
    enabled: !!couple.id,
    retry: 1,
  });

  const thoughts = (thoughtsQuery.data || []) as TherapistThought[];
  const incompleteTodos = thoughts.filter(
    (t) => t.thought_type === "todo" && !t.is_completed,
  );

  return (
    <div className="space-y-6">
      {/* Couple Header with Quick Actions */}
      <div className="space-y-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            {couple.partner1?.full_name} & {couple.partner2?.full_name}
          </h1>
          <p className="text-sm text-muted-foreground">Manage their progress and activities</p>
        </div>

        {/* Quick Actions Row - Touch Friendly */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant="default"
            className="h-11 px-4 rounded-xl gap-2 text-sm bg-violet-600 hover:bg-violet-700"
            onClick={() => setActiveTab("prompts")}
            data-testid="button-send-prompt"
          >
            <PenLine className="w-4 h-4" />
            Send Prompt
          </Button>
          <Link href={`/admin/couple/${couple.id}/customization`}>
            <Button
              variant="outline"
              className="h-11 px-4 rounded-xl gap-2 text-sm"
              data-testid="button-customize-dashboard"
            >
              <Settings className="w-4 h-4" />
              Customize
            </Button>
          </Link>
          <Link href={`/admin/couple/${couple.id}/analytics`}>
            <Button
              variant="outline"
              className="h-11 px-4 rounded-xl gap-2 text-sm"
              data-testid="button-view-insights"
            >
              <Eye className="w-4 h-4" />
              Insights
            </Button>
          </Link>
          <Link href={`/admin/couple/${couple.id}/session-prep`}>
            <Button
              variant="outline"
              className="h-11 px-4 rounded-xl gap-2 text-sm"
              data-testid="button-session-prep"
            >
              <Sparkles className="w-4 h-4" />
              AI Prep
            </Button>
          </Link>
          <Button
            variant="outline"
            className="h-11 px-4 rounded-xl gap-2 text-sm"
            onClick={() => setActiveTab("notes")}
            data-testid="button-add-note-quick"
          >
            <Plus className="w-4 h-4" />
            Add Note
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 md:grid-cols-5 h-auto p-1 rounded-xl bg-muted/50 gap-1">
          <TabsTrigger value="overview" className="text-xs md:text-sm rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <BarChart3 className="h-3.5 w-3.5 mr-1.5 hidden sm:inline" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="prompts" className="text-xs md:text-sm rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm bg-violet-100 dark:bg-violet-900/30">
            <PenLine className="h-3.5 w-3.5 mr-1.5 hidden sm:inline" />
            Prompts
          </TabsTrigger>
          <TabsTrigger value="notes" className="text-xs md:text-sm rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <FileText className="h-3.5 w-3.5 mr-1.5 hidden sm:inline" />
            Notes
          </TabsTrigger>
          <TabsTrigger value="thoughts" className="text-xs md:text-sm relative rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <MessageSquare className="h-3.5 w-3.5 mr-1.5 hidden sm:inline" />
            Thoughts
            {incompleteTodos.length > 0 && (
              <Badge
                variant="destructive"
                className="ml-1 h-4 w-4 p-0 flex items-center justify-center text-[10px] flex-shrink-0"
              >
                {incompleteTodos.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="tools"
            className="text-xs md:text-sm rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            <Heart className="h-3.5 w-3.5 mr-1.5 hidden sm:inline" />
            Tools
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Session Info Card */}
            <Card className="glass-card border-none overflow-hidden">
              <div className="gradient-animate bg-gradient-to-br from-primary/10 to-primary/5" />
              <CardHeader className="relative z-10 pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  Session Info
                </CardTitle>
              </CardHeader>
              <CardContent className="relative z-10 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-background/60 backdrop-blur-sm border border-border/30">
                    <p className="text-xs text-muted-foreground mb-1">Partner 1</p>
                    <p className="font-semibold text-sm">{couple.partner1?.full_name}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-background/60 backdrop-blur-sm border border-border/30">
                    <p className="text-xs text-muted-foreground mb-1">Partner 2</p>
                    <p className="font-semibold text-sm">{couple.partner2?.full_name}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Links Card */}
            <Card className="glass-card border-none overflow-hidden">
              <div className="gradient-animate bg-gradient-to-br from-blue-500/10 to-indigo-500/5" />
              <CardHeader className="relative z-10 pb-2">
                <CardTitle className="text-sm">Quick Links</CardTitle>
              </CardHeader>
              <CardContent className="relative z-10 space-y-2">
                <Link href={`/admin/couple/${couple.id}/checkins`}>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-xs md:text-sm rounded-xl"
                    data-testid="button-view-checkins"
                  >
                    Weekly Check-ins
                  </Button>
                </Link>
                <Link href={`/admin/couple/${couple.id}/languages`}>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-xs md:text-sm rounded-xl"
                    data-testid="button-view-languages"
                  >
                    Love Languages
                  </Button>
                </Link>
                <Link href={`/admin/couple/${couple.id}/analytics`}>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-xs md:text-sm rounded-xl"
                    data-testid="button-view-analytics"
                  >
                    Analytics
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Prompts Tab */}
        <TabsContent value="prompts" className="mt-6">
          <ReflectionPromptsPanel 
            coupleId={couple.id} 
            partner1Id={couple.partner1_id}
            partner2Id={couple.partner2_id}
            partner1Name={couple.partner1?.full_name}
            partner2Name={couple.partner2?.full_name}
          />
        </TabsContent>

        {/* Notes Tab */}
        <TabsContent value="notes" className="mt-6">
          <Card className="glass-card border-none overflow-hidden">
            <div className="gradient-animate bg-gradient-to-br from-emerald-500/10 to-teal-500/5" />
            <CardContent className="relative z-10 p-6">
              <SessionNotesPanel coupleId={couple.id} therapistId={therapistId} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Thoughts Tab */}
        <TabsContent value="thoughts" className="mt-6">
          <Card className="glass-card border-none overflow-hidden">
            <div className="gradient-animate bg-gradient-to-br from-amber-500/10 to-orange-500/5" />
            <CardContent className="relative z-10 p-6">
              <TherapistThoughtsPanel coupleId={couple.id} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tools Tab */}
        <TabsContent value="tools" className="mt-6">
          <Card className="glass-card border-none overflow-hidden">
            <div className="gradient-animate bg-gradient-to-br from-purple-500/10 to-pink-500/5" />
            <CardHeader className="relative z-10 pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-purple-500" />
                Communication Tools
              </CardTitle>
            </CardHeader>
            <CardContent className="relative z-10 space-y-2">
              <Link href={`/admin/couple/${couple.id}/echo`}>
                <Button
                  variant="outline"
                  className="w-full justify-start text-xs md:text-sm rounded-xl"
                >
                  Echo & Empathy
                </Button>
              </Link>
              <Link href={`/admin/couple/${couple.id}/conversations`}>
                <Button
                  variant="outline"
                  className="w-full justify-start text-xs md:text-sm rounded-xl"
                >
                  Hold Me Tight
                </Button>
              </Link>
              <Link href={`/admin/couple/${couple.id}/calendar`}>
                <Button
                  variant="outline"
                  className="w-full justify-start text-xs md:text-sm rounded-xl"
                >
                  Calendar
                </Button>
              </Link>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function TherapistThoughtsPanel({ coupleId }: { coupleId: string }) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [newThought, setNewThought] = useState({
    thought_type: "todo" as "todo" | "message" | "file_reference",
    title: "",
    content: "",
    priority: "medium" as "low" | "medium" | "high",
  });

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
      });
    },
    onSuccess: () => {
      setNewThought({
        thought_type: "todo",
        title: "",
        content: "",
        priority: "medium",
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

  const updateMutation = useMutation({
    mutationFn: async (data: {
      id: string;
      updates: Partial<TherapistThought>;
    }) => {
      return aiFunctions.updateTherapistThought(data.id, data.updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["therapist-thoughts", coupleId],
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

  const thoughts = (thoughtsQuery.data || []) as TherapistThought[];
  const todos = thoughts.filter((t) => t.thought_type === "todo");
  const messages = thoughts.filter((t) => t.thought_type === "message");

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
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
                Create a to-do, message, or file reference
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
                      <p className="font-semibold break-words">
                        {thought.title}
                      </p>
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
                      <p className="font-semibold break-words">
                        {thought.title}
                      </p>
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
        </>
      )}
    </div>
  );
}

function ReflectionPromptsPanel({ 
  coupleId, 
  partner1Id,
  partner2Id,
  partner1Name,
  partner2Name 
}: { 
  coupleId: string;
  partner1Id?: string;
  partner2Id?: string;
  partner1Name?: string;
  partner2Name?: string;
}) {
  const { toast } = useToast();
  const [newPrompt, setNewPrompt] = useState({
    title: "",
    description: "",
    suggested_action: "",
    target_user_id: null as string | null,
  });

  // Fetch existing reflection prompts using default queryFn
  const promptsQuery = useQuery<any[]>({
    queryKey: ["/api/therapist-prompts/therapist", coupleId],
    select: (data) => data?.filter((p: any) => p.tool_name === "reflection") || [],
    enabled: !!coupleId,
  });

  // Fetch responses using default queryFn
  const responsesQuery = useQuery<any[]>({
    queryKey: ["/api/therapist-prompts/reflection-responses/couple", coupleId],
    enabled: !!coupleId,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/therapist-prompts", {
        couple_id: coupleId,
        tool_name: "reflection",
        title: newPrompt.title,
        description: newPrompt.description || null,
        suggested_action: newPrompt.suggested_action,
        target_user_id: newPrompt.target_user_id,
      });
      return res.json();
    },
    onSuccess: () => {
      setNewPrompt({ title: "", description: "", suggested_action: "", target_user_id: null });
      toast({ title: "Success", description: "Reflection prompt sent to client(s)" });
      queryClient.invalidateQueries({ queryKey: ["/api/therapist-prompts/therapist", coupleId] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error?.message || "Failed to create prompt", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/therapist-prompts/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Prompt deleted" });
      queryClient.invalidateQueries({ queryKey: ["/api/therapist-prompts/therapist", coupleId] });
    },
  });

  const prompts = promptsQuery.data || [];
  const responses = responsesQuery.data || [];

  // Helper to get partner name by ID
  const getPartnerName = (id: string | null | undefined) => {
    if (!id) return "Both Partners";
    if (partner1Id && id === partner1Id) return partner1Name || "Partner 1";
    if (partner2Id && id === partner2Id) return partner2Name || "Partner 2";
    return "Unknown";
  };

  // Check if individual targeting is available
  const canTargetIndividuals = !!partner1Id && !!partner2Id;

  return (
    <div className="space-y-4">
      {/* Create New Prompt */}
      <Card className="glass-card border-none overflow-hidden">
        <div className="gradient-animate bg-gradient-to-br from-violet-500/10 to-purple-500/5" />
        <CardHeader className="relative z-10 pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <PenLine className="h-4 w-4 text-violet-500" />
            Send Reflection Prompt
          </CardTitle>
          <CardDescription>
            Create a guided reflection question for your clients to answer
          </CardDescription>
        </CardHeader>
        <CardContent className="relative z-10 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Title</label>
              <Input
                placeholder="e.g., Weekly Reflection"
                value={newPrompt.title}
                onChange={(e) => setNewPrompt((p) => ({ ...p, title: e.target.value }))}
                data-testid="input-prompt-title"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Send To</label>
              <Select
                value={newPrompt.target_user_id || "both"}
                onValueChange={(value) => setNewPrompt((p) => ({ ...p, target_user_id: value === "both" ? null : value }))}
              >
                <SelectTrigger data-testid="select-target-user">
                  <SelectValue placeholder="Select recipient" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="both">Both Partners</SelectItem>
                  {canTargetIndividuals && (
                    <>
                      <SelectItem value={partner1Id!}>{partner1Name || "Partner 1"}</SelectItem>
                      <SelectItem value={partner2Id!}>{partner2Name || "Partner 2"}</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Reflection Question</label>
            <Textarea
              placeholder="e.g., What is one thing you appreciated about your partner this week that you haven't told them yet?"
              value={newPrompt.suggested_action}
              onChange={(e) => setNewPrompt((p) => ({ ...p, suggested_action: e.target.value }))}
              className="min-h-[100px]"
              data-testid="input-prompt-question"
            />
          </div>
          <Button
            onClick={() => createMutation.mutate()}
            disabled={!newPrompt.title || !newPrompt.suggested_action || createMutation.isPending}
            className="w-full gap-2 bg-violet-600 hover:bg-violet-700"
            data-testid="button-send-prompt"
          >
            {createMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Send Prompt
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Existing Prompts and Responses */}
      {promptsQuery.isLoading ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Loading prompts...</p>
          </CardContent>
        </Card>
      ) : prompts.length === 0 ? (
        <Card className="glass-card border-none overflow-hidden">
          <div className="gradient-animate bg-gradient-to-br from-muted/30 to-muted/10" />
          <CardContent className="relative z-10 py-8 text-center text-muted-foreground">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No reflection prompts sent yet.</p>
            <p className="text-sm mt-1">Create your first prompt above.</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="glass-card border-none overflow-hidden">
          <div className="gradient-animate bg-gradient-to-br from-blue-500/10 to-indigo-500/5" />
          <CardHeader className="relative z-10 pb-2">
            <CardTitle className="text-base">Sent Prompts & Responses</CardTitle>
            <CardDescription>
              View responses from your clients
            </CardDescription>
          </CardHeader>
          <CardContent className="relative z-10 space-y-4">
            {prompts.map((prompt) => {
              const promptResponses = responses.filter((r) => r.prompt_id === prompt.id);
              return (
                <Card key={prompt.id} className="border bg-background/50">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-sm">{prompt.title}</CardTitle>
                        <CardDescription className="text-xs mt-1 line-clamp-2">
                          {prompt.suggested_action}
                        </CardDescription>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteMutation.mutate(prompt.id)}
                        className="h-7 w-7 flex-shrink-0"
                        data-testid={`button-delete-prompt-${prompt.id}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline" className="text-xs">
                        {getPartnerName(prompt.target_user_id)}
                      </Badge>
                      <Badge variant={promptResponses.length > 0 ? "default" : "secondary"} className="text-xs">
                        {promptResponses.length} response{promptResponses.length !== 1 ? "s" : ""}
                      </Badge>
                    </div>
                  </CardHeader>
                  {promptResponses.length > 0 && (
                    <CardContent className="pt-0 space-y-2">
                      {promptResponses.map((response) => (
                        <div key={response.id} className="p-2 rounded bg-muted/50 text-sm">
                          <p className="font-medium text-xs text-muted-foreground mb-1">
                            {response.responder?.full_name || getPartnerName(response.responder_id)}:
                          </p>
                          <p className="text-sm">{response.response_text}</p>
                        </div>
                      ))}
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

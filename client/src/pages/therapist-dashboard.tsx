import { useEffect, useState } from "react";
import { useRoute, Link } from "wouter";
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
import { queryClient } from "@/lib/queryClient";
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
} from "lucide-react";

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
              <CoupleDetails couple={selectedCouple} />
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
              <Link key={couple.id} href={`/admin/couple/${couple.id}`}>
                <div
                  className={`p-3 rounded-xl cursor-pointer transition-all ${
                    selectedCouple?.id === couple.id
                      ? "bg-primary/10 ring-1 ring-primary/50 shadow-sm"
                      : "hover:bg-muted/50 hover-elevate"
                  }`}
                  onClick={onSelectCouple}
                  data-testid={`card-couple-${couple.id}`}
                >
                  <div className="flex items-center gap-3">
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
                </div>
              </Link>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function CoupleDetails({ couple }: { couple: CoupleData }) {
  const { toast } = useToast();

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
      {/* Couple Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          {couple.partner1?.full_name} & {couple.partner2?.full_name}
        </h1>
        <p className="text-sm text-muted-foreground">Manage their progress and activities</p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-3 h-9">
          <TabsTrigger value="overview" className="text-xs md:text-sm">
            Overview
          </TabsTrigger>
          <TabsTrigger value="thoughts" className="text-xs md:text-sm relative">
            Thoughts
            {incompleteTodos.length > 0 && (
              <Badge
                variant="destructive"
                className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs flex-shrink-0"
              >
                {incompleteTodos.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="tools"
            className="hidden md:inline-flex text-xs md:text-sm"
          >
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

        {/* Thoughts Tab */}
        <TabsContent value="thoughts" className="mt-4">
          <TherapistThoughtsPanel coupleId={couple.id} />
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

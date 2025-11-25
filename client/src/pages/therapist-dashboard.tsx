import { useEffect, useState } from 'react';
import { useRoute, Link } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Loader2, Users, MessageSquare, Plus, Trash2, CheckCircle2, AlertCircle, Menu, X } from 'lucide-react';

interface CoupleData {
  id: string;
  partner1_id: string;
  partner2_id: string;
  partner1?: { full_name: string };
  partner2?: { full_name: string };
}

interface TherapistThought {
  id: string;
  type: 'todo' | 'message' | 'file';
  title: string;
  content?: string;
  priority?: 'low' | 'medium' | 'high';
  is_complete?: boolean;
}

export default function TherapistDashboard() {
  const [, params] = useRoute('/admin/couple/:id');
  const { profile } = useAuth();
  const coupleId = params?.id;

  const [couples, setCouples] = useState<CoupleData[]>([]);
  const [selectedCouple, setSelectedCouple] = useState<CoupleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [panelOpen, setPanelOpen] = useState(false);

  useEffect(() => {
    if (profile?.id) {
      fetchCouples();
    }
  }, [profile?.id]);

  useEffect(() => {
    if (coupleId && couples.length > 0) {
      const couple = couples.find(c => c.id === coupleId);
      setSelectedCouple(couple || null);
    }
  }, [coupleId, couples]);

  const fetchCouples = async () => {
    if (!profile?.id) return;
    try {
      const { data: couplesData } = await supabase
        .from('Couples_couples')
        .select('*')
        .eq('therapist_id', profile.id);

      if (couplesData) {
        const { data: profiles } = await supabase
          .from('Couples_profiles')
          .select('id, full_name');

        const enriched = couplesData.map(couple => ({
          ...couple,
          partner1: profiles?.find(p => p.id === couple.partner1_id),
          partner2: profiles?.find(p => p.id === couple.partner2_id),
        }));
        setCouples(enriched);
      }
    } catch (error) {
      console.error('Error fetching couples:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCouples = couples.filter(couple =>
    couple.partner1?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    couple.partner2?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="w-full h-full flex flex-col md:flex-row">
      {/* Mobile/Tablet: Drawer Panel */}
      {panelOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setPanelOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-80 bg-background shadow-lg flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">My Couples</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setPanelOpen(false)}
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
      <div className="hidden md:flex md:w-80 md:flex-col md:border-r md:bg-muted/30">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">My Couples</h2>
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
        <div className="md:hidden flex items-center justify-between p-4 border-b">
          <h1 className="text-xl font-bold">Therapist Dashboard</h1>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setPanelOpen(true)}
            data-testid="button-open-panel"
          >
            <Menu className="w-4 h-4" />
          </Button>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 md:p-6 space-y-4">
            {selectedCouple ? (
              <CoupleDetails couple={selectedCouple} />
            ) : (
              <Card className="h-64 flex items-center justify-center">
                <CardContent className="text-center">
                  <Users className="w-8 h-8 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-muted-foreground">Select a couple to view details</p>
                </CardContent>
              </Card>
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
      <div className="p-4 border-b space-y-2">
        <Input
          placeholder="Search..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="text-sm"
          data-testid="input-search-couples"
        />
        <p className="text-xs text-muted-foreground">{filteredCouples.length} couples</p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
          ) : filteredCouples.length === 0 ? (
            <Alert className="m-2">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                {searchTerm ? 'No matches' : 'No couples'}
              </AlertDescription>
            </Alert>
          ) : (
            filteredCouples.map(couple => (
              <Link key={couple.id} href={`/admin/couple/${couple.id}`}>
                <div
                  className={`p-3 rounded-lg cursor-pointer transition-all hover-elevate ${
                    selectedCouple?.id === couple.id
                      ? 'bg-primary/10 ring-1 ring-primary'
                      : 'hover:bg-muted'
                  }`}
                  onClick={onSelectCouple}
                  data-testid={`card-couple-${couple.id}`}
                >
                  <p className="font-semibold text-sm truncate">{couple.partner1?.full_name}</p>
                  <p className="text-xs text-muted-foreground">&</p>
                  <p className="font-semibold text-sm truncate">{couple.partner2?.full_name}</p>
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
    queryKey: [`/api/therapist-thoughts/couple/${couple.id}`],
    enabled: !!couple.id,
    retry: 1,
  });

  const thoughts = (thoughtsQuery.data || []) as TherapistThought[];
  const incompleteTodos = thoughts.filter(t => t.type === 'todo' && !t.is_complete);

  return (
    <div className="space-y-4">
      {/* Couple Header */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg md:text-xl">{couple.partner1?.full_name} & {couple.partner2?.full_name}</CardTitle>
          <CardDescription className="text-xs">ID: {couple.id}</CardDescription>
        </CardHeader>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-3 h-9">
          <TabsTrigger value="overview" className="text-xs md:text-sm">Overview</TabsTrigger>
          <TabsTrigger value="thoughts" className="text-xs md:text-sm relative">
            Thoughts
            {incompleteTodos.length > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs flex-shrink-0">
                {incompleteTodos.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="tools" className="hidden md:inline-flex text-xs md:text-sm">Tools</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-3 mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Quick Links</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link href={`/admin/couple/${couple.id}/checkins`}>
                <Button variant="outline" className="w-full justify-start text-xs md:text-sm h-8 md:h-9" data-testid="button-view-checkins">
                  Weekly Check-ins
                </Button>
              </Link>
              <Link href={`/admin/couple/${couple.id}/languages`}>
                <Button variant="outline" className="w-full justify-start text-xs md:text-sm h-8 md:h-9" data-testid="button-view-languages">
                  Love Languages
                </Button>
              </Link>
              <Link href={`/admin/couple/${couple.id}/analytics`}>
                <Button variant="outline" className="w-full justify-start text-xs md:text-sm h-8 md:h-9" data-testid="button-view-analytics">
                  Analytics
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Session Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Partner 1</p>
                <p className="font-semibold text-sm">{couple.partner1?.full_name}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Partner 2</p>
                <p className="font-semibold text-sm">{couple.partner2?.full_name}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Thoughts Tab */}
        <TabsContent value="thoughts" className="mt-4">
          <TherapistThoughtsPanel coupleId={couple.id} />
        </TabsContent>

        {/* Tools Tab */}
        <TabsContent value="tools" className="space-y-3 mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Communication Tools</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link href={`/admin/couple/${couple.id}/echo`}>
                <Button variant="outline" className="w-full justify-start text-xs md:text-sm h-8 md:h-9">
                  Echo & Empathy
                </Button>
              </Link>
              <Link href={`/admin/couple/${couple.id}/conversations`}>
                <Button variant="outline" className="w-full justify-start text-xs md:text-sm h-8 md:h-9">
                  Hold Me Tight
                </Button>
              </Link>
              <Link href={`/admin/couple/${couple.id}/calendar`}>
                <Button variant="outline" className="w-full justify-start text-xs md:text-sm h-8 md:h-9">
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
    type: 'todo' as 'todo' | 'message' | 'file',
    title: '',
    content: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
  });

  const thoughtsQuery = useQuery({
    queryKey: [`/api/therapist-thoughts/couple/${coupleId}`],
    retry: 1,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', `/api/therapist-thoughts/couple/${coupleId}`, newThought);
    },
    onSuccess: () => {
      setNewThought({ type: 'todo', title: '', content: '', priority: 'medium' });
      setIsOpen(false);
      toast({ title: 'Success', description: 'Thought added' });
      queryClient.invalidateQueries({ queryKey: [`/api/therapist-thoughts/couple/${coupleId}`] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error?.message || 'Failed to add thought',
        variant: 'destructive',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: { id: string; updates: Partial<TherapistThought> }) => {
      return apiRequest('PATCH', `/api/therapist-thoughts/${data.id}`, data.updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/therapist-thoughts/couple/${coupleId}`] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest('DELETE', `/api/therapist-thoughts/${id}`);
    },
    onSuccess: () => {
      toast({ title: 'Success', description: 'Thought deleted' });
      queryClient.invalidateQueries({ queryKey: [`/api/therapist-thoughts/couple/${coupleId}`] });
    },
  });

  const thoughts = (thoughtsQuery.data || []) as TherapistThought[];
  const todos = thoughts.filter(t => t.type === 'todo');
  const messages = thoughts.filter(t => t.type === 'message');

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="text-xs md:text-sm h-8 md:h-9" data-testid="button-add-thought">
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline ml-1">Add Thought</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="w-full max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-base">Add Therapist Thought</DialogTitle>
              <DialogDescription className="text-xs">Create a to-do, message, or file reference</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium mb-1 block">Type</label>
                <Select value={newThought.type} onValueChange={(value: any) => setNewThought({ ...newThought, type: value })}>
                  <SelectTrigger className="h-8 text-xs" data-testid="select-thought-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todo">To-Do</SelectItem>
                    <SelectItem value="message">Message to Client</SelectItem>
                    <SelectItem value="file">File Reference</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs font-medium mb-1 block">Title</label>
                <Input
                  placeholder="Title..."
                  value={newThought.title}
                  onChange={(e) => setNewThought({ ...newThought, title: e.target.value })}
                  className="h-8 text-xs"
                  data-testid="input-thought-title"
                />
              </div>

              <div>
                <label className="text-xs font-medium mb-1 block">Content (Optional)</label>
                <Textarea
                  placeholder="Add details..."
                  value={newThought.content}
                  onChange={(e) => setNewThought({ ...newThought, content: e.target.value })}
                  className="resize-none text-xs min-h-16"
                  data-testid="textarea-thought-content"
                />
              </div>

              <div>
                <label className="text-xs font-medium mb-1 block">Priority</label>
                <Select value={newThought.priority} onValueChange={(value: any) => setNewThought({ ...newThought, priority: value })}>
                  <SelectTrigger className="h-8 text-xs" data-testid="select-thought-priority">
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
                {createMutation.isPending ? 'Adding...' : 'Add Thought'}
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
          <AlertDescription className="text-xs">No therapist thoughts yet.</AlertDescription>
        </Alert>
      ) : (
        <>
          {todos.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">To-Do Items</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {todos.map(thought => (
                  <div key={thought.id} className="flex items-start gap-2 p-2 bg-muted rounded text-xs group">
                    <CheckCircle2 className="w-3 h-3 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold break-words">{thought.title}</p>
                      {thought.content && (
                        <p className="text-muted-foreground break-words line-clamp-2">{thought.content}</p>
                      )}
                      {thought.priority && (
                        <Badge
                          className="mt-1 text-xs"
                          variant={thought.priority === 'high' ? 'destructive' : thought.priority === 'medium' ? 'secondary' : 'outline'}
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
                {messages.map(thought => (
                  <div key={thought.id} className="flex items-start gap-2 p-2 bg-muted rounded text-xs group">
                    <MessageSquare className="w-3 h-3 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold break-words">{thought.title}</p>
                      {thought.content && (
                        <p className="text-muted-foreground break-words line-clamp-2">{thought.content}</p>
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

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
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Loader2, Users, MessageSquare, Plus, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';

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
    <div className="w-full space-y-4 p-4 md:p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold">Therapist Dashboard</h1>
        <p className="text-sm md:text-base text-muted-foreground">Manage your couples and their therapy sessions</p>
      </div>

      {/* Main Content - Responsive Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Couples List - Left Column (or Full Width on Mobile) */}
        <div className="lg:col-span-1 space-y-4">
          <div>
            <h2 className="text-lg font-semibold mb-3">My Couples</h2>
            <Input
              placeholder="Search couples..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="mb-3"
              data-testid="input-search-couples"
            />
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
          ) : filteredCouples.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {searchTerm ? 'No couples found matching your search' : 'No couples assigned yet'}
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-2 max-h-96 lg:max-h-[600px] overflow-y-auto">
              {filteredCouples.map(couple => (
                <Link key={couple.id} href={`/admin/couple/${couple.id}`}>
                  <Card
                    className={`cursor-pointer transition-all hover-elevate ${
                      selectedCouple?.id === couple.id ? 'ring-2 ring-primary' : ''
                    }`}
                    data-testid={`card-couple-${couple.id}`}
                  >
                    <CardContent className="pt-4">
                      <p className="font-semibold text-sm">{couple.partner1?.full_name}</p>
                      <p className="text-xs text-muted-foreground">&</p>
                      <p className="font-semibold text-sm">{couple.partner2?.full_name}</p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Main Content - Right Column(s) (or Full Width on Mobile after list) */}
        <div className="lg:col-span-2">
          {selectedCouple ? (
            <CoupleDetails couple={selectedCouple} />
          ) : (
            <Card className="h-full">
              <CardContent className="py-12 text-center">
                <Users className="w-8 h-8 mx-auto mb-3 text-muted-foreground" />
                <p className="text-muted-foreground">Select a couple to view details</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
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
        <CardHeader>
          <CardTitle>{couple.partner1?.full_name} & {couple.partner2?.full_name}</CardTitle>
          <CardDescription>Couple ID: {couple.id}</CardDescription>
        </CardHeader>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="thoughts" className="relative">
            Thoughts
            {incompleteTodos.length > 0 && (
              <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                {incompleteTodos.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="tools" className="hidden md:inline-flex">Tools</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Quick Links</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link href={`/admin/couple/${couple.id}/checkins`}>
                <Button variant="outline" className="w-full justify-start" data-testid="button-view-checkins">
                  Weekly Check-ins
                </Button>
              </Link>
              <Link href={`/admin/couple/${couple.id}/languages`}>
                <Button variant="outline" className="w-full justify-start" data-testid="button-view-languages">
                  Love Languages
                </Button>
              </Link>
              <Link href={`/admin/couple/${couple.id}/analytics`}>
                <Button variant="outline" className="w-full justify-start" data-testid="button-view-analytics">
                  Analytics
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Session Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <p className="text-sm text-muted-foreground">Partner 1</p>
                <p className="font-semibold">{couple.partner1?.full_name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Partner 2</p>
                <p className="font-semibold">{couple.partner2?.full_name}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Thoughts Tab */}
        <TabsContent value="thoughts" className="space-y-4">
          <TherapistThoughtsPanel coupleId={couple.id} />
        </TabsContent>

        {/* Tools Tab */}
        <TabsContent value="tools" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Communication Tools</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link href={`/admin/couple/${couple.id}/echo`}>
                <Button variant="outline" className="w-full justify-start">
                  Echo & Empathy
                </Button>
              </Link>
              <Link href={`/admin/couple/${couple.id}/conversations`}>
                <Button variant="outline" className="w-full justify-start">
                  Hold Me Tight
                </Button>
              </Link>
              <Link href={`/admin/couple/${couple.id}/calendar`}>
                <Button variant="outline" className="w-full justify-start">
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
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button gap-2 data-testid="button-add-thought">
              <Plus className="w-4 h-4" />
              Add Thought
            </Button>
          </DialogTrigger>
          <DialogContent className="w-full max-w-md">
            <DialogHeader>
              <DialogTitle>Add Therapist Thought</DialogTitle>
              <DialogDescription>Create a to-do, message, or file reference</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Type</label>
                <Select value={newThought.type} onValueChange={(value: any) => setNewThought({ ...newThought, type: value })}>
                  <SelectTrigger data-testid="select-thought-type">
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
                <label className="text-sm font-medium mb-2 block">Title</label>
                <Input
                  placeholder="Title..."
                  value={newThought.title}
                  onChange={(e) => setNewThought({ ...newThought, title: e.target.value })}
                  data-testid="input-thought-title"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Content (Optional)</label>
                <Textarea
                  placeholder="Add any details..."
                  value={newThought.content}
                  onChange={(e) => setNewThought({ ...newThought, content: e.target.value })}
                  className="resize-none"
                  data-testid="textarea-thought-content"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Priority</label>
                <Select value={newThought.priority} onValueChange={(value: any) => setNewThought({ ...newThought, priority: value })}>
                  <SelectTrigger data-testid="select-thought-priority">
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
                className="w-full"
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
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>No therapist thoughts yet. Add one to get started.</AlertDescription>
        </Alert>
      ) : (
        <>
          {todos.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">To-Do Items</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {todos.map(thought => (
                  <div key={thought.id} className="flex items-start gap-3 p-3 bg-muted rounded-lg group">
                    <CheckCircle2 className="w-4 h-4 mt-1 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm break-words">{thought.title}</p>
                      {thought.content && (
                        <p className="text-xs text-muted-foreground mt-1 break-words">{thought.content}</p>
                      )}
                      {thought.priority && (
                        <Badge
                          className="mt-2"
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
                      className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      data-testid={`button-delete-thought-${thought.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {messages.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Messages to Clients</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {messages.map(thought => (
                  <div key={thought.id} className="flex items-start gap-3 p-3 bg-muted rounded-lg group">
                    <MessageSquare className="w-4 h-4 mt-1 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm break-words">{thought.title}</p>
                      {thought.content && (
                        <p className="text-xs text-muted-foreground mt-1 break-words">{thought.content}</p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteMutation.mutate(thought.id)}
                      className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      data-testid={`button-delete-thought-${thought.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
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

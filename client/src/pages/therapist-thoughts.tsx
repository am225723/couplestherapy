import { useState, useEffect } from 'react';
import { useRoute } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Plus, Trash2, CheckCircle2, Circle, FileText, MessageSquare, CheckSquare, Loader2 } from 'lucide-react';

interface TherapistThought {
  id: string;
  type: 'todo' | 'message' | 'file';
  title: string;
  content?: string;
  file_url?: string;
  priority?: 'low' | 'medium' | 'high';
  is_complete?: boolean;
  created_at: string;
}

export default function TherapistThoughts() {
  const [match, params] = useRoute('/admin/couple/:id');
  const coupleId = params?.id;
  const { profile } = useAuth();
  const { toast } = useToast();

  const [newThought, setNewThought] = useState({
    type: 'todo' as 'todo' | 'message' | 'file',
    title: '',
    content: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
  });
  const [isOpen, setIsOpen] = useState(false);

  const thoughtsQuery = useQuery({
    queryKey: [`/api/therapist-thoughts/couple/${coupleId}`],
    enabled: !!coupleId && profile?.role === 'therapist',
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!coupleId) throw new Error('No couple ID');
      return apiRequest('POST', `/api/therapist-thoughts/couple/${coupleId}`, newThought);
    },
    onSuccess: () => {
      setNewThought({ type: 'todo', title: '', content: '', priority: 'medium' });
      setIsOpen(false);
      toast({ title: 'Success', description: 'Thought added' });
      queryClient.invalidateQueries({ queryKey: [`/api/therapist-thoughts/couple/${coupleId}`] });
    },
    onError: () => toast({ title: 'Error', description: 'Failed to add thought', variant: 'destructive' }),
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
  const files = thoughts.filter(t => t.type === 'file');

  const getIcon = (type: string) => {
    switch (type) {
      case 'todo': return <CheckSquare className="w-4 h-4" />;
      case 'message': return <MessageSquare className="w-4 h-4" />;
      case 'file': return <FileText className="w-4 h-4" />;
      default: return null;
    }
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'secondary';
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold">Therapist Thoughts</h2>
          <p className="text-muted-foreground">Organize to-dos, messages, and files for this couple</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Add Thought
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Therapist Thought</DialogTitle>
              <DialogDescription>
                Create a to-do, message, or file reference
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="type">Type</Label>
                <Select value={newThought.type} onValueChange={(v: any) => setNewThought({ ...newThought, type: v })}>
                  <SelectTrigger>
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
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={newThought.title}
                  onChange={(e) => setNewThought({ ...newThought, title: e.target.value })}
                  placeholder="Enter title"
                />
              </div>
              <div>
                <Label htmlFor="content">Details</Label>
                <Textarea
                  id="content"
                  value={newThought.content}
                  onChange={(e) => setNewThought({ ...newThought, content: e.target.value })}
                  placeholder="Enter content"
                />
              </div>
              <div>
                <Label htmlFor="priority">Priority</Label>
                <Select value={newThought.priority} onValueChange={(v: any) => setNewThought({ ...newThought, priority: v })}>
                  <SelectTrigger>
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
              >
                {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Create
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {thoughtsQuery.isLoading ? (
        <div className="flex justify-center"><Loader2 className="w-8 h-8 animate-spin" /></div>
      ) : (
        <div className="grid gap-4">
          {todos.length > 0 && (
            <ThoughtSection title="To-Do Items" thoughts={todos} getIcon={getIcon} getPriorityColor={getPriorityColor} updateMutation={updateMutation} deleteMutation={deleteMutation} />
          )}
          {messages.length > 0 && (
            <ThoughtSection title="Client Messages" thoughts={messages} getIcon={getIcon} getPriorityColor={getPriorityColor} updateMutation={updateMutation} deleteMutation={deleteMutation} />
          )}
          {files.length > 0 && (
            <ThoughtSection title="File References" thoughts={files} getIcon={getIcon} getPriorityColor={getPriorityColor} updateMutation={updateMutation} deleteMutation={deleteMutation} />
          )}
          {thoughts.length === 0 && (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No thoughts added yet. Create one to get started.
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

function ThoughtSection({ title, thoughts, getIcon, getPriorityColor, updateMutation, deleteMutation }: any) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {thoughts.map((thought: TherapistThought) => (
          <div key={thought.id} className="flex items-start gap-3 p-3 bg-muted rounded-lg">
            <div className="mt-1">
              {thought.type === 'todo' ? (
                <Checkbox
                  checked={thought.is_complete}
                  onCheckedChange={(checked) =>
                    updateMutation.mutate({ id: thought.id, updates: { is_complete: checked } })
                  }
                  data-testid={`checkbox-complete-${thought.id}`}
                />
              ) : (
                getIcon(thought.type)
              )}
            </div>
            <div className="flex-1">
              <h4 className={`font-semibold ${thought.is_complete ? 'line-through' : ''}`}>
                {thought.title}
              </h4>
              {thought.content && <p className="text-sm text-muted-foreground">{thought.content}</p>}
              <div className="flex gap-2 mt-2">
                {thought.priority && (
                  <Badge variant={getPriorityColor(thought.priority)}>
                    {thought.priority}
                  </Badge>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => deleteMutation.mutate(thought.id)}
              data-testid={`button-delete-thought-${thought.id}`}
              className="flex-shrink-0"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

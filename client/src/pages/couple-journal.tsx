import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { BookOpen, Plus, Heart, Lock, Users, Eye, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface JournalEntry {
  id: string;
  mode: 'joint' | 'individual';
  visibility: 'private' | 'shared_with_partner' | 'shared_with_therapist';
  content: string;
  createdAt: Date;
  createdBy: string;
}

export default function CoupleJournalPage() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [newEntry, setNewEntry] = useState('');
  const [mode, setMode] = useState<'joint' | 'individual'>('individual');
  const [visibility, setVisibility] = useState<'private' | 'shared_with_partner' | 'shared_with_therapist'>('shared_with_partner');
  const [showNewEntry, setShowNewEntry] = useState(false);
  const { toast } = useToast();

  const handleCreateEntry = () => {
    if (!newEntry.trim()) {
      toast({
        title: 'Empty Entry',
        description: 'Please write something before saving',
        variant: 'destructive',
      });
      return;
    }

    const entry: JournalEntry = {
      id: Date.now().toString(),
      mode,
      visibility,
      content: newEntry,
      createdAt: new Date(),
      createdBy: 'You',
    };

    setEntries(prev => [entry, ...prev]);
    setNewEntry('');
    setShowNewEntry(false);

    toast({
      title: 'Entry Saved',
      description: 'Your journal entry has been saved successfully',
    });
  };

  const getVisibilityIcon = (vis: JournalEntry['visibility']) => {
    switch (vis) {
      case 'private':
        return <Lock className="h-4 w-4" />;
      case 'shared_with_partner':
        return <Users className="h-4 w-4" />;
      case 'shared_with_therapist':
        return <Eye className="h-4 w-4" />;
    }
  };

  const getVisibilityLabel = (vis: JournalEntry['visibility']) => {
    switch (vis) {
      case 'private':
        return 'Private';
      case 'shared_with_partner':
        return 'Shared with Partner';
      case 'shared_with_therapist':
        return 'Shared with Therapist';
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-5xl mx-auto py-12 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BookOpen className="h-10 w-10 text-primary" />
            <div>
              <h1 className="text-3xl font-bold" data-testid="title-journal">Shared Couple Journal</h1>
              <p className="text-muted-foreground">Document your relationship journey together</p>
            </div>
          </div>
          <Button
            onClick={() => setShowNewEntry(true)}
            size="lg"
            data-testid="button-new-entry"
          >
            <Plus className="h-5 w-5 mr-2" />
            New Entry
          </Button>
        </div>

        {showNewEntry && (
          <Card data-testid="card-new-entry">
            <CardHeader>
              <CardTitle className="text-xl">Create New Entry</CardTitle>
              <CardDescription>Write about your thoughts, feelings, and experiences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="mode">Entry Mode</Label>
                  <Select value={mode} onValueChange={(v) => setMode(v as 'joint' | 'individual')}>
                    <SelectTrigger id="mode" data-testid="select-mode">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="individual">Individual</SelectItem>
                      <SelectItem value="joint">Joint (collaborative)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="visibility">Visibility</Label>
                  <Select value={visibility} onValueChange={(v) => setVisibility(v as any)}>
                    <SelectTrigger id="visibility" data-testid="select-visibility">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="private">Private (only me)</SelectItem>
                      <SelectItem value="shared_with_partner">Shared with Partner</SelectItem>
                      <SelectItem value="shared_with_therapist">Shared with Therapist</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="content">Your Entry</Label>
                <Textarea
                  id="content"
                  value={newEntry}
                  onChange={(e) => setNewEntry(e.target.value)}
                  placeholder="What's on your mind? Write about your feelings, experiences, or anything you want to remember..."
                  className="min-h-[200px]"
                  data-testid="textarea-content"
                />
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowNewEntry(false);
                    setNewEntry('');
                  }}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
                <Button onClick={handleCreateEntry} data-testid="button-save">
                  <Heart className="h-4 w-4 mr-2" />
                  Save Entry
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {entries.length === 0 && !showNewEntry && (
          <Card data-testid="card-empty-state">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <BookOpen className="h-20 w-20 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Entries Yet</h3>
              <p className="text-muted-foreground text-center mb-6">
                Start documenting your relationship journey by creating your first journal entry
              </p>
              <Button onClick={() => setShowNewEntry(true)} data-testid="button-create-first">
                <Plus className="h-4 w-4 mr-2" />
                Create First Entry
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="space-y-4">
          {entries.map((entry) => (
            <Card key={entry.id} className="hover-elevate" data-testid={`card-entry-${entry.id}`}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={entry.mode === 'joint' ? 'default' : 'secondary'} data-testid={`badge-mode-${entry.id}`}>
                        {entry.mode === 'joint' ? <Users className="h-3 w-3 mr-1" /> : null}
                        {entry.mode === 'joint' ? 'Joint Entry' : 'Individual Entry'}
                      </Badge>
                      <Badge variant="outline" data-testid={`badge-visibility-${entry.id}`}>
                        {getVisibilityIcon(entry.visibility)}
                        <span className="ml-1">{getVisibilityLabel(entry.visibility)}</span>
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span data-testid={`text-date-${entry.id}`}>
                        {entry.createdAt.toLocaleDateString()} at {entry.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span>•</span>
                      <span data-testid={`text-author-${entry.id}`}>{entry.createdBy}</span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-base leading-relaxed" data-testid={`text-content-${entry.id}`}>
                  {entry.content}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

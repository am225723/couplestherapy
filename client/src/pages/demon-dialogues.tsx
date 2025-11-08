import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { format } from 'date-fns';
import { AlertTriangle, Pause, TrendingDown } from 'lucide-react';

const DEMON_DIALOGUES = {
  find_bad_guy: {
    name: 'Find the Bad Guy',
    color: 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200',
    description: 'Each partner blames the other: "It\'s your fault!" "No, it\'s yours!"',
    pattern: 'Mutual blame and defensiveness',
  },
  protest_polka: {
    name: 'Protest Polka',
    color: 'bg-purple-100 dark:bg-purple-900/20 text-purple-800 dark:text-purple-200',
    description: 'One partner pursues/criticizes, the other withdraws/defends',
    pattern: 'Pursue-withdraw cycle',
  },
  freeze_flee: {
    name: 'Freeze and Flee',
    color: 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200',
    description: 'Both partners shut down and emotionally withdraw',
    pattern: 'Mutual withdrawal',
  },
};

type DialogueType = keyof typeof DEMON_DIALOGUES;

interface DemonDialogue {
  id: string;
  couple_id: string;
  dialogue_type: DialogueType;
  recognized_by: string;
  interrupted: boolean;
  notes: string;
  pause_event_id: string | null;
  created_at: string;
}

export default function DemonDialoguesPage() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [selectedDialogue, setSelectedDialogue] = useState<DialogueType | null>(null);
  const [notes, setNotes] = useState('');
  const [interrupted, setInterrupted] = useState(false);

  // Fetch dialogues
  const { data: dialogues = [], isLoading } = useQuery<DemonDialogue[]>({
    queryKey: ['/api/demon-dialogues', profile?.couple_id],
    enabled: !!profile?.couple_id,
  });

  // Create dialogue mutation
  const createDialogueMutation = useMutation({
    mutationFn: async (data: { dialogue_type: DialogueType; interrupted: boolean; notes: string }) => {
      const response = await apiRequest('POST', '/api/demon-dialogues', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/demon-dialogues', profile?.couple_id] });
      toast({
        title: 'Cycle Recognized',
        description: 'Naming the pattern is the first step to breaking free.',
      });
      setSelectedDialogue(null);
      setNotes('');
      setInterrupted(false);
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to log dialogue',
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = () => {
    if (!selectedDialogue) return;
    
    createDialogueMutation.mutate({
      dialogue_type: selectedDialogue,
      interrupted,
      notes,
    });
  };

  // Calculate stats
  const stats = dialogues.reduce((acc, dialogue) => {
    acc[dialogue.dialogue_type] = (acc[dialogue.dialogue_type] || 0) + 1;
    return acc;
  }, {} as Record<DialogueType, number>);

  const interruptedCount = dialogues.filter(d => d.interrupted).length;
  const totalDialogues = dialogues.length;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Demon Dialogues</h1>
        <p className="text-muted-foreground mt-2">
          EFT identifies three negative interaction cycles that trap couples.
          Recognizing your pattern helps you break free.
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Object.entries(DEMON_DIALOGUES).map(([key, config]) => (
          <Card key={key} data-testid={`stat-card-${key}`}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                {config.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid={`text-stat-${key}`}>{stats[key as DialogueType] || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">times recognized</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Interruption Success */}
      {totalDialogues > 0 && (
        <Card data-testid="card-interruption-success">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Pause className="w-5 h-5 text-green-600" />
              Interruption Success
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600" data-testid="text-success-rate">
              {Math.round((interruptedCount / totalDialogues) * 100)}%
            </div>
            <p className="text-sm text-muted-foreground">
              {interruptedCount} of {totalDialogues} cycles successfully interrupted
            </p>
          </CardContent>
        </Card>
      )}

      {/* Log Demon Dialogue */}
      <Card>
        <CardHeader>
          <CardTitle>Recognize a Demon Dialogue</CardTitle>
          <CardDescription>
            Identify which negative cycle you're experiencing right now or recently experienced.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-3">
            {Object.entries(DEMON_DIALOGUES).map(([key, config]) => (
              <Button
                key={key}
                data-testid={`button-select-${key}`}
                variant={selectedDialogue === key ? "default" : "outline"}
                className="h-auto py-4 flex-col items-start"
                onClick={() => setSelectedDialogue(key as DialogueType)}
              >
                <div className="flex items-center gap-2 w-full">
                  <span className="font-semibold">{config.name}</span>
                </div>
                <p className="text-xs text-left mt-1">{config.description}</p>
                <p className="text-xs text-left text-muted-foreground">{config.pattern}</p>
              </Button>
            ))}
          </div>

          {selectedDialogue && (
            <>
              <div>
                <label className="text-sm font-medium">What happened?</label>
                <Textarea
                  data-testid="textarea-notes"
                  placeholder="Describe the interaction..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="interrupted"
                  data-testid="checkbox-interrupted"
                  checked={interrupted}
                  onChange={(e) => setInterrupted(e.target.checked)}
                  className="w-4 h-4"
                />
                <label htmlFor="interrupted" className="text-sm font-medium cursor-pointer">
                  We successfully interrupted this cycle (took a pause or reconnected)
                </label>
              </div>

              <Button
                data-testid="button-log-dialogue"
                onClick={handleSubmit}
                disabled={createDialogueMutation.isPending}
                className="w-full"
              >
                {createDialogueMutation.isPending ? 'Logging...' : 'Log This Cycle'}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Dialogue History */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Cycles</CardTitle>
          <CardDescription>Track your patterns over time</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : dialogues.length === 0 ? (
            <p className="text-muted-foreground">No demon dialogues logged yet.</p>
          ) : (
            dialogues.map((dialogue) => (
              <div
                key={dialogue.id}
                className="border rounded-md p-4 space-y-2"
                data-testid={`dialogue-${dialogue.id}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Badge className={DEMON_DIALOGUES[dialogue.dialogue_type].color} data-testid={`badge-dialogue-${dialogue.id}`}>
                      {DEMON_DIALOGUES[dialogue.dialogue_type].name}
                    </Badge>
                    <span className="text-sm text-muted-foreground" data-testid={`text-date-${dialogue.id}`}>
                      {format(new Date(dialogue.created_at), 'MMM d, h:mm a')}
                    </span>
                  </div>
                  {dialogue.interrupted && (
                    <Badge variant="default" className="bg-green-600" data-testid={`badge-interrupted-${dialogue.id}`}>
                      Interrupted
                    </Badge>
                  )}
                </div>

                {dialogue.notes && (
                  <p className="text-sm">{dialogue.notes}</p>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

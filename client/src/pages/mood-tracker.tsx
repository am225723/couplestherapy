import { useState, useMemo } from 'react';
import { useRoute } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Plus, Loader2, AlertCircle, TrendingUp, Heart } from 'lucide-react';

interface MoodEntry {
  id: string;
  couple_id: string;
  user_id: string;
  mood_level: number;
  emotion_primary: string;
  emotion_secondary?: string;
  notes?: string;
  created_at: string;
  user?: { full_name: string };
}

interface MoodStats {
  partner1: { name: string; avgMood: number; entries: number };
  partner2: { name: string; avgMood: number; entries: number };
  overallTrend: string;
}

const EMOTIONS = [
  'Happy', 'Sad', 'Anxious', 'Excited', 'Calm', 'Frustrated', 'Grateful', 'Overwhelmed',
  'Content', 'Nervous', 'Hopeful', 'Discouraged', 'Connected', 'Distant', 'Energetic', 'Tired'
];

const EMOTION_COLORS: Record<string, string> = {
  Happy: '#fbbf24',
  Sad: '#60a5fa',
  Anxious: '#f87171',
  Excited: '#f472b6',
  Calm: '#86efac',
  Frustrated: '#fb7185',
  Grateful: '#c084fc',
  Overwhelmed: '#f97316',
  Content: '#a78bfa',
  Nervous: '#f59e0b',
  Hopeful: '#34d399',
  Discouraged: '#6b7280',
  Connected: '#ec4899',
  Distant: '#9ca3af',
  Energetic: '#fbbf24',
  Tired: '#475569',
};

export default function MoodTracker() {
  const { profile } = useAuth();
  const { toast } = useToast();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newEntry, setNewEntry] = useState({
    mood_level: 5,
    emotion_primary: 'Calm',
    emotion_secondary: '',
    notes: '',
  });

  // Fetch mood entries
  const entriesQuery = useQuery({
    queryKey: [`/api/mood-tracker/couple/${profile?.couple_id}`],
    enabled: !!profile?.couple_id,
  });

  // Fetch mood stats
  const statsQuery = useQuery({
    queryKey: [`/api/mood-tracker/couple/${profile?.couple_id}/stats`],
    enabled: !!profile?.couple_id,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!profile?.couple_id) throw new Error('No couple ID');
      return apiRequest('POST', `/api/mood-tracker/couple/${profile.couple_id}`, newEntry);
    },
    onSuccess: () => {
      setNewEntry({ mood_level: 5, emotion_primary: 'Calm', emotion_secondary: '', notes: '' });
      setIsDialogOpen(false);
      toast({ title: 'Success', description: 'Mood entry recorded' });
      queryClient.invalidateQueries({ queryKey: [`/api/mood-tracker/couple/${profile?.couple_id}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/mood-tracker/couple/${profile?.couple_id}/stats`] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error?.message || 'Failed to save mood entry',
        variant: 'destructive',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest('DELETE', `/api/mood-tracker/${id}`);
    },
    onSuccess: () => {
      toast({ title: 'Success', description: 'Mood entry deleted' });
      queryClient.invalidateQueries({ queryKey: [`/api/mood-tracker/couple/${profile?.couple_id}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/mood-tracker/couple/${profile?.couple_id}/stats`] });
    },
  });

  const entries = (entriesQuery.data || []) as MoodEntry[];
  const stats = (statsQuery.data || {}) as MoodStats;

  // Prepare data for chart
  const chartData = useMemo(() => {
    const last30Days = entries
      .filter(e => new Date(e.created_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
      .reverse()
      .map(e => ({
        date: new Date(e.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        fullDate: e.created_at,
        [e.user?.full_name || 'Unknown']: e.mood_level,
      }));

    // Merge duplicate dates
    const merged: Record<string, any> = {};
    last30Days.forEach(item => {
      if (!merged[item.date]) {
        merged[item.date] = { date: item.date, fullDate: item.fullDate };
      }
      Object.assign(merged[item.date], Object.fromEntries(
        Object.entries(item).filter(([k]) => k !== 'date' && k !== 'fullDate')
      ));
    });

    return Object.values(merged);
  }, [entries]);

  // Emotion frequency
  const emotionFrequency = useMemo(() => {
    const freq: Record<string, number> = {};
    entries.forEach(e => {
      freq[e.emotion_primary] = (freq[e.emotion_primary] || 0) + 1;
    });
    return Object.entries(freq)
      .map(([emotion, count]) => ({ emotion, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [entries]);

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Heart className="w-8 h-8 text-primary" />
          Couples Mood Tracker
        </h1>
        <p className="text-muted-foreground">Track and visualize your emotional journey together</p>
      </div>

      {/* Stats Cards */}
      {stats?.partner1 && stats?.partner2 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">{stats.partner1.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-end gap-2">
                <span className="text-3xl font-bold">{stats.partner1.avgMood}</span>
                <span className="text-sm text-muted-foreground">/10</span>
              </div>
              <p className="text-xs text-muted-foreground">{stats.partner1.entries} entries (30 days)</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">{stats.partner2.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-end gap-2">
                <span className="text-3xl font-bold">{stats.partner2.avgMood}</span>
                <span className="text-sm text-muted-foreground">/10</span>
              </div>
              <p className="text-xs text-muted-foreground">{stats.partner2.entries} entries (30 days)</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant={stats.overallTrend === 'balanced' ? 'secondary' : 'default'}>
                {stats.overallTrend === 'partner1_higher' ? `${stats.partner1.name} higher`
                  : stats.overallTrend === 'partner2_higher' ? `${stats.partner2.name} higher`
                  : 'Balanced'}
              </Badge>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Add Mood Button */}
      <div className="flex justify-end">
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="lg" className="gap-2">
              <Plus className="w-4 h-4" />
              Log Your Mood
            </Button>
          </DialogTrigger>
          <DialogContent className="w-full max-w-sm">
            <DialogHeader>
              <DialogTitle>How are you feeling?</DialogTitle>
              <DialogDescription>Record your mood and emotions</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="text-sm mb-2 block">Mood Level: {newEntry.mood_level}/10</Label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={newEntry.mood_level}
                  onChange={(e) => setNewEntry({ ...newEntry, mood_level: parseInt(e.target.value) })}
                  className="w-full"
                  data-testid="slider-mood-level"
                />
              </div>

              <div>
                <Label className="text-sm mb-2 block">Primary Emotion</Label>
                <Select value={newEntry.emotion_primary} onValueChange={(value) => setNewEntry({ ...newEntry, emotion_primary: value })}>
                  <SelectTrigger data-testid="select-emotion-primary">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EMOTIONS.map(emotion => (
                      <SelectItem key={emotion} value={emotion}>{emotion}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm mb-2 block">Secondary Emotion (Optional)</Label>
                <Select value={newEntry.emotion_secondary || ''} onValueChange={(value) => setNewEntry({ ...newEntry, emotion_secondary: value || '' })}>
                  <SelectTrigger data-testid="select-emotion-secondary">
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    {EMOTIONS.map(emotion => (
                      <SelectItem key={emotion} value={emotion}>{emotion}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm mb-2 block">Notes (Optional)</Label>
                <Textarea
                  placeholder="What's on your mind?"
                  value={newEntry.notes}
                  onChange={(e) => setNewEntry({ ...newEntry, notes: e.target.value })}
                  className="resize-none text-sm min-h-20"
                  data-testid="textarea-mood-notes"
                />
              </div>

              <Button
                onClick={() => createMutation.mutate()}
                disabled={createMutation.isPending}
                className="w-full"
                data-testid="button-submit-mood"
              >
                {createMutation.isPending ? 'Saving...' : 'Save Mood Entry'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Charts */}
      {chartData.length > 0 ? (
        <div className="space-y-6">
          {/* Mood Trend Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Mood Trend (30 Days)</CardTitle>
              <CardDescription>Your emotional journey over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" fontSize={12} />
                  <YAxis domain={[1, 10]} />
                  <Tooltip />
                  <Legend />
                  {Object.keys(chartData[0] || {})
                    .filter(k => k !== 'date' && k !== 'fullDate')
                    .map((partner, idx) => (
                      <Line
                        key={partner}
                        type="monotone"
                        dataKey={partner}
                        stroke={idx === 0 ? '#ec4899' : '#06b6d4'}
                        connectNulls
                        dot={false}
                      />
                    ))}
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Emotion Frequency Chart */}
          {emotionFrequency.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Emotion Frequency</CardTitle>
                <CardDescription>Most common emotions logged</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={emotionFrequency}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="emotion" fontSize={12} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </div>
      ) : entriesQuery.isLoading ? (
        <Card>
          <CardContent className="py-12 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      ) : (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>No mood entries yet. Start tracking your emotions today!</AlertDescription>
        </Alert>
      )}

      {/* Recent Entries */}
      {entries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Entries</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 max-h-96 overflow-y-auto">
            {entries.slice(0, 10).map(entry => (
              <div key={entry.id} className="p-3 bg-muted rounded-lg flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-sm">{entry.user?.full_name || 'Unknown'}</span>
                    <Badge style={{ backgroundColor: EMOTION_COLORS[entry.emotion_primary] || '#6b7280' }}>
                      {entry.emotion_primary}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-lg font-bold">{entry.mood_level}/10</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(entry.created_at).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric', 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </span>
                  </div>
                  {entry.notes && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{entry.notes}</p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteMutation.mutate(entry.id)}
                  data-testid={`button-delete-mood-${entry.id}`}
                >
                  Delete
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

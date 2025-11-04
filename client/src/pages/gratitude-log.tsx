import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { Heart, Loader2, Sparkles, Upload } from 'lucide-react';
import { GratitudeLog, Profile, TherapistComment } from '@shared/schema';
import { formatDistanceToNow } from 'date-fns';

type GratitudeWithAuthor = GratitudeLog & {
  author?: Profile;
  comments?: TherapistComment[];
};

export default function GratitudeLogPage() {
  const [logs, setLogs] = useState<GratitudeWithAuthor[]>([]);
  const [newText, setNewText] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const { user, profile } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (profile?.couple_id) {
      fetchLogs();
      subscribeToComments();
    }
  }, [profile?.couple_id]);

  const fetchLogs = async () => {
    if (!profile?.couple_id) return;

    try {
      const { data: logsData, error: logsError } = await supabase
        .from('Couples_gratitude_logs')
        .select('*')
        .eq('couple_id', profile.couple_id)
        .order('created_at', { ascending: false });

      if (logsError) throw logsError;

      const userIds = [...new Set(logsData.map(log => log.user_id))];
      const { data: profiles, error: profilesError } = await supabase
        .from('Couples_profiles')
        .select('*')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      const { data: comments } = await supabase
        .from('Couples_therapist_comments')
        .select('*')
        .eq('couple_id', profile.couple_id)
        .eq('related_activity_type', 'gratitude_logs')
        .eq('is_private_note', false);

      const logsWithAuthors = logsData.map(log => ({
        ...log,
        author: profiles.find(p => p.id === log.user_id),
        comments: comments?.filter(c => c.related_activity_id === log.id) || [],
      }));

      setLogs(logsWithAuthors);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const subscribeToComments = () => {
    if (!profile?.couple_id) return;

    const channel = supabase
      .channel('gratitude_comments')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'Couples_therapist_comments',
          filter: `couple_id=eq.${profile.couple_id}`,
        },
        (payload) => {
          if (payload.new.related_activity_type === 'gratitude_logs' && !payload.new.is_private_note) {
            fetchLogs();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile?.couple_id || !newText.trim()) return;

    setSubmitting(true);

    try {
      const { error } = await supabase.from('Couples_gratitude_logs').insert({
        couple_id: profile.couple_id,
        user_id: user.id,
        text_content: newText.trim(),
      });

      if (error) throw error;

      setNewText('');
      toast({
        title: 'Gratitude shared!',
        description: 'Your moment of gratitude has been added.',
      });

      fetchLogs();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <Sparkles className="h-8 w-8 text-primary" />
            <h1 className="text-4xl font-bold">Gratitude Log</h1>
          </div>
          <p className="text-muted-foreground">
            Share moments of appreciation and connection
          </p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <Textarea
                placeholder="What are you grateful for today? Share a moment that made you smile..."
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
                className="min-h-32 resize-none"
                data-testid="textarea-new-gratitude"
              />
              <div className="flex gap-2">
                <Button
                  type="submit"
                  disabled={!newText.trim() || submitting}
                  data-testid="button-submit-gratitude"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Posting...
                    </>
                  ) : (
                    <>
                      <Heart className="mr-2 h-4 w-4" />
                      Share Gratitude
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {logs.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <Heart className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">
                  No gratitude entries yet. Be the first to share something beautiful!
                </p>
              </CardContent>
            </Card>
          ) : (
            logs.map((log) => (
              <Card key={log.id} data-testid={`card-gratitude-${log.id}`}>
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {log.author?.full_name?.charAt(0) || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-semibold">{log.author?.full_name || 'Unknown'}</p>
                      <p className="text-sm text-muted-foreground">
                        {log.created_at ? formatDistanceToNow(new Date(log.created_at), { addSuffix: true }) : 'Recently'}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-base leading-relaxed whitespace-pre-wrap">
                    {log.text_content}
                  </p>
                  
                  {log.comments && log.comments.length > 0 && (
                    <div className="border-l-4 border-primary/30 pl-4 mt-4 space-y-2">
                      <p className="text-sm font-medium text-primary">Therapist Comment</p>
                      {log.comments.map((comment) => (
                        <p key={comment.id} className="text-sm text-muted-foreground italic">
                          {comment.comment_text}
                        </p>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

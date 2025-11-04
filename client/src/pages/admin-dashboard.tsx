import { useEffect, useState } from 'react';
import { useRoute, Link } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { Users, Loader2, Heart, Send } from 'lucide-react';
import { Couple, Profile, WeeklyCheckin, LoveLanguage, GratitudeLog, SharedGoal, Ritual, Conversation } from '@shared/schema';
import { formatDistanceToNow } from 'date-fns';
import adminHeroImage from '@assets/generated_images/Admin_app_hero_image_7f3581f4.png';

type CoupleWithProfiles = Couple & {
  partner1?: Profile;
  partner2?: Profile;
};

export default function AdminDashboard() {
  const [match, params] = useRoute('/admin/couple/:id');
  const [couples, setCouples] = useState<CoupleWithProfiles[]>([]);
  const [selectedCouple, setSelectedCouple] = useState<CoupleWithProfiles | null>(null);
  const [checkins, setCheckins] = useState<(WeeklyCheckin & { author?: Profile })[]>([]);
  const [loveLanguages, setLoveLanguages] = useState<LoveLanguage[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [commentText, setCommentText] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [commentingOn, setCommentingOn] = useState<{ type: string; id: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const { profile } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (profile?.role === 'therapist') {
      fetchCouples();
    }
  }, [profile]);

  useEffect(() => {
    if (match && params?.id) {
      const couple = couples.find(c => c.id === params.id);
      if (couple) {
        setSelectedCouple(couple);
        fetchCoupleData(couple);
      }
    }
  }, [match, params, couples]);

  const fetchCouples = async () => {
    if (!profile?.id) return;

    try {
      const { data: couplesData, error } = await supabase
        .from('Couples_couples')
        .select('*')
        .eq('therapist_id', profile.id);

      if (error) throw error;

      const allProfiles: Profile[] = [];
      for (const couple of couplesData || []) {
        const { data: profiles } = await supabase
          .from('Couples_profiles')
          .select('*')
          .in('id', [couple.partner1_id, couple.partner2_id]);

        if (profiles) {
          allProfiles.push(...profiles);
        }
      }

      const couplesWithProfiles = (couplesData || []).map(couple => ({
        ...couple,
        partner1: allProfiles.find(p => p.id === couple.partner1_id),
        partner2: allProfiles.find(p => p.id === couple.partner2_id),
      }));

      setCouples(couplesWithProfiles);
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

  const fetchCoupleData = async (couple: CoupleWithProfiles) => {
    try {
      const [checkinsRes, languagesRes, gratitudeRes, goalsRes, ritualsRes, conversationsRes] = await Promise.all([
        supabase.from('Couples_weekly_checkins').select('*').eq('couple_id', couple.id).order('created_at', { ascending: false }).limit(2),
        supabase.from('Couples_love_languages').select('*').in('user_id', [couple.partner1_id, couple.partner2_id]),
        supabase.from('Couples_gratitude_logs').select('*').eq('couple_id', couple.id).order('created_at', { ascending: false }),
        supabase.from('Couples_shared_goals').select('*').eq('couple_id', couple.id).order('created_at', { ascending: false }),
        supabase.from('Couples_rituals').select('*').eq('couple_id', couple.id).order('category'),
        supabase.from('Couples_conversations').select('*').eq('couple_id', couple.id).order('created_at', { ascending: false }),
      ]);

      const profiles = [couple.partner1, couple.partner2].filter(Boolean) as Profile[];
      
      const checkinsWithAuthors = (checkinsRes.data || []).map(checkin => ({
        ...checkin,
        author: profiles.find(p => p.id === checkin.user_id),
      }));

      setCheckins(checkinsWithAuthors);
      setLoveLanguages(languagesRes.data || []);

      const allActivities = [
        ...(gratitudeRes.data || []).map(item => ({ ...item, type: 'gratitude_logs', timestamp: item.created_at })),
        ...(goalsRes.data || []).map(item => ({ ...item, type: 'shared_goals', timestamp: item.created_at })),
        ...(ritualsRes.data || []).map(item => ({ ...item, type: 'rituals', timestamp: item.created_at || new Date().toISOString() })),
        ...(conversationsRes.data || []).map(item => ({ ...item, type: 'conversations', timestamp: item.created_at })),
      ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      setActivities(allActivities);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleAddComment = async (activityType: string, activityId: string) => {
    if (!selectedCouple || !profile?.id || !commentText.trim()) return;

    try {
      const { error } = await supabase.from('Couples_therapist_comments').insert({
        couple_id: selectedCouple.id,
        therapist_id: profile.id,
        comment_text: commentText.trim(),
        is_private_note: isPrivate,
        related_activity_type: activityType,
        related_activity_id: activityId,
      });

      if (error) throw error;

      toast({
        title: 'Comment added',
        description: isPrivate ? 'Private note saved' : 'Comment will appear in client app',
      });

      setCommentText('');
      setIsPrivate(false);
      setCommentingOn(null);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
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
              <h1 className="text-5xl font-bold text-white">Therapist Dashboard</h1>
              <p className="text-xl text-white/90">Monitor and support your couples</p>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 py-12">
          <h2 className="text-3xl font-bold mb-6">Your Couples</h2>
          {couples.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No couples assigned yet</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {couples.map((couple) => (
                <Link key={couple.id} href={`/admin/couple/${couple.id}`}>
                  <Card className="hover-elevate cursor-pointer">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-3">
                        <div className="flex -space-x-2">
                          <Avatar className="border-2 border-background">
                            <AvatarFallback className="bg-primary/10 text-primary">
                              {couple.partner1?.full_name?.charAt(0) || '?'}
                            </AvatarFallback>
                          </Avatar>
                          <Avatar className="border-2 border-background">
                            <AvatarFallback className="bg-secondary/30 text-secondary-foreground">
                              {couple.partner2?.full_name?.charAt(0) || '?'}
                            </AvatarFallback>
                          </Avatar>
                        </div>
                        <span>
                          {couple.partner1?.full_name || 'Partner 1'} & {couple.partner2?.full_name || 'Partner 2'}
                        </span>
                      </CardTitle>
                    </CardHeader>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" asChild>
              <Link href="/admin">← Back to Couples</Link>
            </Button>
            <h1 className="text-3xl font-bold">
              {selectedCouple.partner1?.full_name} & {selectedCouple.partner2?.full_name}
            </h1>
          </div>
        </div>

        <Tabs defaultValue="checkins">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="checkins">Weekly Check-ins</TabsTrigger>
            <TabsTrigger value="languages">Love Languages</TabsTrigger>
            <TabsTrigger value="activity">Activity Feed</TabsTrigger>
          </TabsList>

          <TabsContent value="checkins" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {checkins.slice(0, 2).map((checkin) => (
                <Card key={checkin.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-primary/10 text-primary text-sm">
                          {checkin.author?.full_name?.charAt(0) || '?'}
                        </AvatarFallback>
                      </Avatar>
                      {checkin.author?.full_name}
                    </CardTitle>
                    <CardDescription>
                      {checkin.created_at ? formatDistanceToNow(new Date(checkin.created_at), { addSuffix: true }) : 'Recently'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Connectedness</Label>
                        <span className="text-2xl font-bold text-primary">{checkin.q_connectedness}/10</span>
                      </div>
                      <div className="h-2 bg-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary"
                          style={{ width: `${(checkin.q_connectedness || 0) * 10}%` }}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Conflict Resolution</Label>
                        <span className="text-2xl font-bold text-secondary-foreground">{checkin.q_conflict}/10</span>
                      </div>
                      <div className="h-2 bg-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full bg-accent"
                          style={{ width: `${(checkin.q_conflict || 0) * 10}%` }}
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
                const partner = [selectedCouple.partner1, selectedCouple.partner2].find(p => p?.id === lang.user_id);
                return (
                  <Card key={lang.id}>
                    <CardHeader>
                      <CardTitle>{partner?.full_name || 'Unknown'}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-sm text-muted-foreground">Primary Language</Label>
                        <p className="text-lg font-semibold text-primary">{lang.primary_language}</p>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm text-muted-foreground">Secondary Language</Label>
                        <p className="text-lg font-semibold text-secondary-foreground">{lang.secondary_language}</p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="activity" className="space-y-4">
            {activities.map((activity) => (
              <Card key={`${activity.type}-${activity.id}`}>
                <CardContent className="pt-6 space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-muted-foreground uppercase">{activity.type.replace(/_/g, ' ')}</span>
                      <span className="text-xs text-muted-foreground">
                        {activity.timestamp ? formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true }) : ''}
                      </span>
                    </div>
                    {activity.type === 'gratitude_logs' && <p>{activity.text_content}</p>}
                    {activity.type === 'shared_goals' && <p><strong>Goal:</strong> {activity.title}</p>}
                    {activity.type === 'rituals' && <p><strong>{activity.category}:</strong> {activity.description}</p>}
                    {activity.type === 'conversations' && <p className="text-sm italic">Hold Me Tight conversation completed</p>}
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
                            onCheckedChange={(checked) => setIsPrivate(checked as boolean)}
                          />
                          <Label htmlFor={`private-${activity.id}`} className="text-sm">
                            Private note (only visible to you)
                          </Label>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="ghost" onClick={() => setCommentingOn(null)}>Cancel</Button>
                          <Button onClick={() => handleAddComment(activity.type, activity.id)}>
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
                      onClick={() => setCommentingOn({ type: activity.type, id: activity.id })}
                    >
                      Add Comment
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

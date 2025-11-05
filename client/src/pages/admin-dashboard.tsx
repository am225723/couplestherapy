import { useEffect, useState, useRef } from 'react';
import { useRoute, Link } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { Users, Loader2, Heart, Send, MessageSquare } from 'lucide-react';
import { Couple, Profile, WeeklyCheckin, LoveLanguage, GratitudeLog, SharedGoal, Ritual, Conversation, Message, CalendarEvent } from '@shared/schema';
import { formatDistanceToNow, format, parse, startOfWeek, getDay } from 'date-fns';
import enUS from 'date-fns/locale/en-US';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import adminHeroImage from '@assets/generated_images/Admin_app_hero_image_7f3581f4.png';

const locales = {
  'en-US': enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

type MessageWithSender = Message & {
  sender: Pick<Profile, 'id' | 'full_name' | 'role'>;
};

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
  const [messageText, setMessageText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { profile, user } = useAuth();
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

      // Fetch voice memos via secure API endpoint (metadata only - no storage paths or transcripts)
      const voiceMemosResponse = await fetch(`/api/voice-memos/therapist/${couple.id}`);
      const voiceMemosData = voiceMemosResponse.ok ? await voiceMemosResponse.json() : [];

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
        ...(voiceMemosData || []).map((item: any) => ({ 
          ...item, 
          type: 'voice_memos', 
          timestamp: item.created_at,
          sender: { full_name: item.sender_name },
          recipient: { full_name: item.recipient_name }
        })),
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
          <TabsList className="grid w-full grid-cols-6 gap-2">
            <TabsTrigger value="checkins">Weekly Check-ins</TabsTrigger>
            <TabsTrigger value="languages">Love Languages</TabsTrigger>
            <TabsTrigger value="lovemap">Love Map Quiz</TabsTrigger>
            <TabsTrigger value="activity">Activity Feed</TabsTrigger>
            <TabsTrigger value="messages">Messages</TabsTrigger>
            <TabsTrigger value="calendar">Calendar</TabsTrigger>
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
                    {activity.type === 'voice_memos' && (
                      <div className="space-y-1">
                        <p className="text-sm">
                          <strong>{activity.sender?.full_name || 'Unknown'}</strong> → <strong>{activity.recipient?.full_name || 'Unknown'}</strong>
                        </p>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>Duration: {activity.duration_secs ? `${Math.floor(parseFloat(activity.duration_secs) / 60)}:${(Math.floor(parseFloat(activity.duration_secs)) % 60).toString().padStart(2, '0')}` : 'Unknown'}</span>
                          <span className={activity.is_listened ? 'text-primary' : 'text-destructive'}>
                            {activity.is_listened ? '✓ Listened' : '○ Not listened'}
                          </span>
                        </div>
                      </div>
                    )}
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

          <TabsContent value="messages" className="space-y-4">
            <MessagesTab 
              coupleId={selectedCouple.id}
              therapistId={profile?.id || ''}
              userId={user?.id || ''}
              messageText={messageText}
              setMessageText={setMessageText}
              messagesEndRef={messagesEndRef}
            />
          </TabsContent>

          <TabsContent value="calendar" className="space-y-4">
            <CalendarTab coupleId={selectedCouple.id} />
          </TabsContent>

          <TabsContent value="lovemap" className="space-y-4">
            <LoveMapTab coupleId={selectedCouple.id} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function MessagesTab({ 
  coupleId, 
  therapistId, 
  userId,
  messageText,
  setMessageText,
  messagesEndRef
}: {
  coupleId: string;
  therapistId: string;
  userId: string;
  messageText: string;
  setMessageText: (text: string) => void;
  messagesEndRef: React.RefObject<HTMLDivElement>;
}) {
  const { toast } = useToast();

  const { data: messages = [], isLoading } = useQuery<MessageWithSender[]>({
    queryKey: ['/api/messages', coupleId],
    queryFn: async () => {
      const response = await fetch(`/api/messages/${coupleId}`);
      if (!response.ok) throw new Error('Failed to fetch messages');
      return response.json();
    },
    enabled: !!coupleId,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (text: string) => {
      return apiRequest('POST', '/api/messages', {
        couple_id: coupleId,
        message_text: text,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/messages', coupleId] });
      setMessageText('');
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to send message',
        variant: 'destructive',
      });
    },
  });

  const handleSend = () => {
    if (!messageText.trim()) return;
    sendMessageMutation.mutate(messageText.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  useEffect(() => {
    if (!coupleId) return;

    const channel = supabase
      .channel(`messages:${coupleId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'Couples_messages',
          filter: `couple_id=eq.${coupleId}`,
        },
        async (payload) => {
          const newMessage = payload.new as Message;
          
          const { data: sender } = await supabase
            .from('Couples_profiles')
            .select('id, full_name, role')
            .eq('id', newMessage.sender_id)
            .single();

          const messageWithSender: MessageWithSender = {
            ...newMessage,
            sender: sender || { id: newMessage.sender_id, full_name: 'Unknown', role: 'client' },
          };

          queryClient.setQueryData<MessageWithSender[]>(
            ['/api/messages', coupleId],
            (old = []) => [...old, messageWithSender]
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [coupleId]);

  return (
    <Card className="flex flex-col overflow-hidden h-[600px]">
      <CardHeader className="border-b">
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Conversation with Couple
        </CardTitle>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center space-y-4">
              <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground" />
              <div>
                <p className="font-medium">No messages yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Start a conversation with the couple
                </p>
              </div>
            </div>
          </div>
        ) : (
          <ScrollArea className="flex-1 p-6">
            <div className="space-y-4">
              {messages.map((message) => {
                const isCurrentUser = message.sender_id === userId;
                const isTherapist = message.sender.role === 'therapist';

                return (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${isCurrentUser ? 'flex-row-reverse' : 'flex-row'}`}
                    data-testid={`message-${message.id}`}
                  >
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarFallback className={isTherapist ? 'bg-accent text-accent-foreground' : 'bg-primary text-primary-foreground'}>
                        {message.sender.full_name?.charAt(0) || '?'}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className={`flex flex-col gap-1 max-w-[70%] ${isCurrentUser ? 'items-end' : 'items-start'}`}>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium">
                          {isCurrentUser ? 'You' : message.sender.full_name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {message.created_at ? formatDistanceToNow(new Date(message.created_at), { addSuffix: true }) : 'Just now'}
                        </span>
                      </div>
                      
                      <div
                        className={`rounded-lg px-4 py-2 ${
                          isCurrentUser
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-accent text-accent-foreground'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap break-words">
                          {message.message_text}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>
        )}

        <div className="border-t p-4">
          <div className="flex gap-2">
            <Textarea
              placeholder="Type your message... (Press Enter to send, Shift+Enter for new line)"
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              onKeyDown={handleKeyDown}
              className="resize-none min-h-[60px] max-h-[200px]"
              disabled={sendMessageMutation.isPending}
              data-testid="input-message-therapist"
            />
            <Button
              onClick={handleSend}
              disabled={!messageText.trim() || sendMessageMutation.isPending}
              size="icon"
              className="flex-shrink-0"
              data-testid="button-send-message-therapist"
            >
              {sendMessageMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CalendarTab({ coupleId }: { coupleId: string }) {
  const [view, setView] = useState<'month' | 'week' | 'day' | 'agenda'>('month');
  const [date, setDate] = useState(new Date());

  const { data: events = [], isLoading } = useQuery<CalendarEvent[]>({
    queryKey: ['/api/calendar', coupleId],
    enabled: !!coupleId,
    queryFn: async () => {
      const response = await fetch(`/api/calendar/${coupleId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch calendar events');
      }
      return response.json();
    },
  });

  const calendarEvents = events.map((event) => ({
    ...event,
    start: new Date(event.start_at),
    end: new Date(event.end_at),
    title: event.title,
  }));

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" data-testid="loader-calendar-therapist" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Calendar</CardTitle>
        <CardDescription>
          View the couple's scheduled events and dates (read-only)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div style={{ height: '600px' }} data-testid="calendar-container-therapist">
          <Calendar
            localizer={localizer}
            events={calendarEvents}
            startAccessor="start"
            endAccessor="end"
            view={view}
            onView={setView}
            date={date}
            onNavigate={setDate}
            selectable={false}
            popup
            style={{ height: '100%' }}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function LoveMapTab({ coupleId }: { coupleId: string }) {
  const { toast } = useToast();

  const { data: loveMapData, isLoading } = useQuery({
    queryKey: ['/api/love-map/therapist', coupleId],
    queryFn: async () => {
      const response = await fetch(`/api/love-map/therapist/${coupleId}`);
      if (!response.ok) throw new Error('Failed to fetch Love Map data');
      return response.json();
    },
    enabled: !!coupleId,
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" data-testid="loader-lovemap-therapist" />
        </CardContent>
      </Card>
    );
  }

  if (!loveMapData || !loveMapData.session) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Love Map Quiz</CardTitle>
          <CardDescription>
            Based on Dr. Gottman's research - How well partners know each other
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center py-12">
          <Heart className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">
            This couple has not completed the Love Map Quiz yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  const { session, partner1_name, partner2_name, partner1_score, partner2_score, results } = loveMapData;

  return (
    <div className="space-y-6">
      {/* Score Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{partner1_name}</CardTitle>
            <CardDescription>How well {partner1_name} knows {partner2_name}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-primary" data-testid="text-partner1-score-therapist">
              {partner1_score ? `${parseFloat(partner1_score).toFixed(0)}%` : 'N/A'}
            </div>
            <Progress 
              value={partner1_score ? parseFloat(partner1_score) : 0} 
              className="mt-2"
              data-testid="progress-partner1-score-therapist"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{partner2_name}</CardTitle>
            <CardDescription>How well {partner2_name} knows {partner1_name}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-primary" data-testid="text-partner2-score-therapist">
              {partner2_score ? `${parseFloat(partner2_score).toFixed(0)}%` : 'N/A'}
            </div>
            <Progress 
              value={partner2_score ? parseFloat(partner2_score) : 0} 
              className="mt-2"
              data-testid="progress-partner2-score-therapist"
            />
          </CardContent>
        </Card>
      </div>

      {/* Detailed Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Comparison</CardTitle>
          <CardDescription>
            Review both partners' answers and guesses
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {results && results.length > 0 ? (
            results.map((result: any, index: number) => (
              <div 
                key={result.question_id} 
                className="space-y-4 border-b pb-4 last:border-b-0" 
                data-testid={`lovemap-result-${index}`}
              >
                <div className="font-semibold">
                  {index + 1}. {result.question_text}
                  {result.category && (
                    <Badge variant="secondary" className="ml-2">
                      {result.category}
                    </Badge>
                  )}
                </div>

                {/* Partner 1's Answer vs Partner 2's Guess */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-sm text-muted-foreground">
                      {partner1_name}'s Answer
                    </Label>
                    <p className="text-sm p-3 bg-muted rounded-md" data-testid={`text-p1-answer-${index}`}>
                      {result.partner1_answer || 'Not answered'}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm text-muted-foreground flex items-center gap-2">
                      {partner2_name}'s Guess
                      {result.partner2_guess_correct ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600" data-testid={`icon-p2-correct-${index}`} />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600" data-testid={`icon-p2-incorrect-${index}`} />
                      )}
                    </Label>
                    <p className="text-sm p-3 bg-muted rounded-md" data-testid={`text-p2-guess-${index}`}>
                      {result.partner2_guess || 'Not guessed'}
                    </p>
                  </div>
                </div>

                {/* Partner 2's Answer vs Partner 1's Guess */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-sm text-muted-foreground">
                      {partner2_name}'s Answer
                    </Label>
                    <p className="text-sm p-3 bg-muted rounded-md" data-testid={`text-p2-answer-${index}`}>
                      {result.partner2_answer || 'Not answered'}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm text-muted-foreground flex items-center gap-2">
                      {partner1_name}'s Guess
                      {result.partner1_guess_correct ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600" data-testid={`icon-p1-correct-${index}`} />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600" data-testid={`icon-p1-incorrect-${index}`} />
                      )}
                    </Label>
                    <p className="text-sm p-3 bg-muted rounded-md" data-testid={`text-p1-guess-${index}`}>
                      {result.partner1_guess || 'Not guessed'}
                    </p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="text-center text-muted-foreground py-8">No results available</p>
          )}
        </CardContent>
      </Card>

      {/* Clinical Insight */}
      <Alert className="border-primary/20 bg-primary/5">
        <Heart className="h-4 w-4 text-primary" />
        <AlertDescription>
          <p className="font-semibold mb-2">Clinical Insight: Love Maps</p>
          <p className="text-sm">
            Love Maps represent the cognitive space where partners store detailed knowledge about each other's inner world. 
            Research by Dr. Gottman shows that couples with detailed Love Maps are better equipped to handle stress and conflict. 
            Low scores may indicate areas where partners could benefit from more curiosity and active listening about each other's experiences, dreams, and preferences.
          </p>
        </AlertDescription>
      </Alert>
    </div>
  );
}

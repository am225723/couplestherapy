import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Loader2, MessageCircle, User, UserCheck, Check, X } from 'lucide-react';
import { EchoSession, EchoTurn, Profile } from '@shared/schema';
import { formatDistanceToNow } from 'date-fns';

type SessionWithTurns = EchoSession & {
  turns: EchoTurn[];
};

export default function EchoEmpathyPage() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [activeSession, setActiveSession] = useState<SessionWithTurns | null>(null);
  const [speakerContent, setSpeakerContent] = useState('');
  const [listenerContent, setListenerContent] = useState('');
  const [confirmationFeedback, setConfirmationFeedback] = useState('');
  const [understood, setUnderstood] = useState<boolean | null>(null);

  // Fetch partner profile
  const { data: partnerProfile } = useQuery<Profile>({
    queryKey: ['/api/profile/partner'],
    enabled: !!profile?.couple_id,
  });

  // Fetch session history
  const { data: sessions, isLoading } = useQuery<SessionWithTurns[]>({
    queryKey: ['/api/echo/sessions', profile?.couple_id],
    enabled: !!profile?.couple_id,
  });

  // Start new session mutation
  const startSessionMutation = useMutation({
    mutationFn: async ({ speaker_id, listener_id }: { speaker_id: string; listener_id: string }) => {
      return apiRequest(`/api/echo/session`, {
        method: 'POST',
        body: JSON.stringify({
          couple_id: profile!.couple_id,
          speaker_id,
          listener_id,
          current_step: 1,
          status: 'in_progress',
        }),
      });
    },
    onSuccess: (data) => {
      setActiveSession({ ...data, turns: [] });
      queryClient.invalidateQueries({ queryKey: ['/api/echo/sessions', profile?.couple_id] });
      toast({
        title: 'Session Started',
        description: 'Begin by sharing your concern or feeling.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to start session',
        variant: 'destructive',
      });
    },
  });

  // Submit turn mutation
  const submitTurnMutation = useMutation({
    mutationFn: async ({ session_id, step, author_id, content }: { session_id: string; step: number; author_id: string; content: string }) => {
      return apiRequest(`/api/echo/turn`, {
        method: 'POST',
        body: JSON.stringify({
          session_id,
          step,
          author_id,
          content,
        }),
      });
    },
    onSuccess: (data, variables) => {
      if (activeSession) {
        const updatedSession: SessionWithTurns = {
          ...activeSession,
          current_step: variables.step < 3 ? variables.step + 1 : activeSession.current_step,
          turns: [...activeSession.turns, data],
        };
        setActiveSession(updatedSession);
      }
      
      // Clear inputs
      setSpeakerContent('');
      setListenerContent('');
      setConfirmationFeedback('');
      
      queryClient.invalidateQueries({ queryKey: ['/api/echo/sessions', profile?.couple_id] });
      
      if (variables.step < 3) {
        toast({
          title: 'Turn Submitted',
          description: `Moving to step ${variables.step + 1}`,
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to submit turn',
        variant: 'destructive',
      });
    },
  });

  // Complete session mutation
  const completeSessionMutation = useMutation({
    mutationFn: async (session_id: string) => {
      return apiRequest(`/api/echo/session/${session_id}/complete`, {
        method: 'PATCH',
      });
    },
    onSuccess: () => {
      setActiveSession(null);
      setSpeakerContent('');
      setListenerContent('');
      setConfirmationFeedback('');
      setUnderstood(null);
      queryClient.invalidateQueries({ queryKey: ['/api/echo/sessions', profile?.couple_id] });
      toast({
        title: 'Session Complete',
        description: 'Great job practicing active listening!',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to complete session',
        variant: 'destructive',
      });
    },
  });

  const handleStartSession = (isSpeaker: boolean) => {
    if (!user?.id || !partnerProfile?.id) return;
    
    startSessionMutation.mutate({
      speaker_id: isSpeaker ? user.id : partnerProfile.id,
      listener_id: isSpeaker ? partnerProfile.id : user.id,
    });
  };

  const handleSubmitStep1 = () => {
    if (!activeSession || !user?.id || !speakerContent.trim()) return;
    submitTurnMutation.mutate({
      session_id: activeSession.id,
      step: 1,
      author_id: activeSession.speaker_id,
      content: speakerContent,
    });
  };

  const handleSubmitStep2 = () => {
    if (!activeSession || !user?.id || !listenerContent.trim()) return;
    submitTurnMutation.mutate({
      session_id: activeSession.id,
      step: 2,
      author_id: activeSession.listener_id,
      content: listenerContent,
    });
  };

  const handleSubmitStep3 = () => {
    if (!activeSession || !user?.id || understood === null) return;
    
    const content = understood 
      ? `Confirmed understanding. ${confirmationFeedback ? `Feedback: ${confirmationFeedback}` : ''}`
      : `Needs clarification. ${confirmationFeedback}`;
    
    submitTurnMutation.mutate({
      session_id: activeSession.id,
      step: 3,
      author_id: activeSession.speaker_id,
      content,
    });

    // After step 3, complete the session
    setTimeout(() => {
      completeSessionMutation.mutate(activeSession.id);
    }, 500);
  };

  const getRoleLabel = (userId: string) => {
    if (!activeSession) return '';
    return userId === activeSession.speaker_id ? 'Speaker' : 'Listener';
  };

  const isUserSpeaker = activeSession?.speaker_id === user?.id;
  const speakerTurn = activeSession?.turns.find(t => t.step === 1);
  const listenerTurn = activeSession?.turns.find(t => t.step === 2);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" data-testid="loader-echo" />
      </div>
    );
  }

  return (
    <div className="container max-w-5xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2" data-testid="text-page-title">Echo & Empathy</h1>
        <p className="text-muted-foreground" data-testid="text-page-description">
          Practice active listening through structured 3-step exercises. One partner shares a concern, the other reflects it back, and understanding is confirmed.
        </p>
      </div>

      {!activeSession ? (
        <Card data-testid="card-start-session">
          <CardHeader>
            <CardTitle data-testid="text-card-title">Start a New Session</CardTitle>
            <CardDescription data-testid="text-card-description">Choose your role to begin the exercise</CardDescription>
          </CardHeader>
          <CardContent className="flex gap-4">
            <Button
              onClick={() => handleStartSession(true)}
              disabled={startSessionMutation.isPending || !partnerProfile}
              className="flex-1"
              data-testid="button-start-as-speaker"
            >
              {startSessionMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <User className="h-4 w-4 mr-2" />
              )}
              I'll be the Speaker
            </Button>
            <Button
              onClick={() => handleStartSession(false)}
              disabled={startSessionMutation.isPending || !partnerProfile}
              variant="outline"
              className="flex-1"
              data-testid="button-start-as-listener"
            >
              {startSessionMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <UserCheck className="h-4 w-4 mr-2" />
              )}
              I'll be the Listener
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card data-testid="card-active-session">
          <CardHeader>
            <div className="flex items-center justify-between mb-4">
              <div>
                <CardTitle data-testid="text-session-title">Active Session</CardTitle>
                <CardDescription data-testid="text-session-role">
                  Your role: <Badge data-testid="badge-user-role">{getRoleLabel(user!.id)}</Badge>
                </CardDescription>
              </div>
              <Badge variant="outline" data-testid="badge-session-step">
                Step {activeSession.current_step} of 3
              </Badge>
            </div>
            <Progress value={(activeSession.current_step - 1) * 50} className="h-2" data-testid="progress-session" />
          </CardHeader>
          <CardContent className="space-y-6">
            {activeSession.current_step === 1 && isUserSpeaker && (
              <div data-testid="container-step-1">
                <h3 className="text-lg font-semibold mb-2" data-testid="text-step-title">Step 1: Share Your Concern</h3>
                <p className="text-sm text-muted-foreground mb-4" data-testid="text-step-description">
                  Share a specific concern, feeling, or situation you'd like your partner to understand.
                </p>
                <Textarea
                  value={speakerContent}
                  onChange={(e) => setSpeakerContent(e.target.value)}
                  placeholder="Example: When you're late without texting, I feel anxious and unimportant..."
                  className="min-h-32 mb-4"
                  data-testid="input-speaker-concern"
                />
                <Button
                  onClick={handleSubmitStep1}
                  disabled={!speakerContent.trim() || submitTurnMutation.isPending}
                  data-testid="button-submit-step-1"
                >
                  {submitTurnMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Submit Concern
                </Button>
              </div>
            )}

            {activeSession.current_step === 1 && !isUserSpeaker && (
              <div data-testid="container-waiting-step-1">
                <h3 className="text-lg font-semibold mb-2" data-testid="text-waiting-title">Waiting for Speaker...</h3>
                <p className="text-sm text-muted-foreground" data-testid="text-waiting-description">
                  The speaker is sharing their concern. You'll reflect it back in the next step.
                </p>
              </div>
            )}

            {activeSession.current_step === 2 && !isUserSpeaker && (
              <div data-testid="container-step-2">
                <h3 className="text-lg font-semibold mb-2" data-testid="text-step-2-title">Step 2: Reflect What You Heard</h3>
                <div className="bg-muted p-4 rounded-md mb-4">
                  <p className="text-sm font-medium mb-1" data-testid="text-speaker-concern-label">Speaker said:</p>
                  <p className="text-sm" data-testid="text-speaker-concern">{speakerTurn?.content}</p>
                </div>
                <p className="text-sm text-muted-foreground mb-4" data-testid="text-step-2-description">
                  Reflect back what you heard in your own words. Focus on understanding, not problem-solving.
                </p>
                <Textarea
                  value={listenerContent}
                  onChange={(e) => setListenerContent(e.target.value)}
                  placeholder="Example: I hear you saying that when I'm late without letting you know, you feel anxious and like you're not important to me..."
                  className="min-h-32 mb-4"
                  data-testid="input-listener-reflection"
                />
                <Button
                  onClick={handleSubmitStep2}
                  disabled={!listenerContent.trim() || submitTurnMutation.isPending}
                  data-testid="button-submit-step-2"
                >
                  {submitTurnMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Submit Reflection
                </Button>
              </div>
            )}

            {activeSession.current_step === 2 && isUserSpeaker && (
              <div data-testid="container-waiting-step-2">
                <h3 className="text-lg font-semibold mb-2" data-testid="text-waiting-step-2-title">Listener is Reflecting...</h3>
                <div className="bg-muted p-4 rounded-md mb-4">
                  <p className="text-sm font-medium mb-1" data-testid="text-your-concern-label">Your concern:</p>
                  <p className="text-sm" data-testid="text-your-concern">{speakerTurn?.content}</p>
                </div>
                <p className="text-sm text-muted-foreground" data-testid="text-waiting-step-2-description">
                  The listener is reflecting back what they heard. You'll confirm understanding in the next step.
                </p>
              </div>
            )}

            {activeSession.current_step === 3 && isUserSpeaker && (
              <div data-testid="container-step-3">
                <h3 className="text-lg font-semibold mb-2" data-testid="text-step-3-title">Step 3: Confirm Understanding</h3>
                <div className="bg-muted p-4 rounded-md mb-4">
                  <p className="text-sm font-medium mb-1" data-testid="text-listener-reflection-label">Listener reflected:</p>
                  <p className="text-sm" data-testid="text-listener-reflection">{listenerTurn?.content}</p>
                </div>
                <p className="text-sm text-muted-foreground mb-4" data-testid="text-step-3-description">
                  Did the listener accurately understand your concern?
                </p>
                <div className="flex gap-4 mb-4">
                  <Button
                    variant={understood === true ? 'default' : 'outline'}
                    onClick={() => setUnderstood(true)}
                    className="flex-1"
                    data-testid="button-understood-yes"
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Yes, I Feel Understood
                  </Button>
                  <Button
                    variant={understood === false ? 'default' : 'outline'}
                    onClick={() => setUnderstood(false)}
                    className="flex-1"
                    data-testid="button-understood-no"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Needs Clarification
                  </Button>
                </div>
                {understood !== null && (
                  <div className="space-y-4">
                    <Textarea
                      value={confirmationFeedback}
                      onChange={(e) => setConfirmationFeedback(e.target.value)}
                      placeholder={
                        understood
                          ? "Optional: Add any appreciation or additional thoughts..."
                          : "What needs clarification or correction?"
                      }
                      className="min-h-24"
                      data-testid="input-confirmation-feedback"
                    />
                    <Button
                      onClick={handleSubmitStep3}
                      disabled={submitTurnMutation.isPending || completeSessionMutation.isPending}
                      data-testid="button-submit-step-3"
                    >
                      {(submitTurnMutation.isPending || completeSessionMutation.isPending) && (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      )}
                      Complete Session
                    </Button>
                  </div>
                )}
              </div>
            )}

            {activeSession.current_step === 3 && !isUserSpeaker && (
              <div data-testid="container-waiting-step-3">
                <h3 className="text-lg font-semibold mb-2" data-testid="text-waiting-step-3-title">Speaker is Confirming...</h3>
                <div className="bg-muted p-4 rounded-md mb-4">
                  <p className="text-sm font-medium mb-1" data-testid="text-your-reflection-label">Your reflection:</p>
                  <p className="text-sm" data-testid="text-your-reflection">{listenerTurn?.content}</p>
                </div>
                <p className="text-sm text-muted-foreground" data-testid="text-waiting-step-3-description">
                  The speaker is confirming whether you accurately understood their concern.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Session History */}
      <div>
        <h2 className="text-2xl font-bold mb-4" data-testid="text-history-title">Session History</h2>
        {sessions && sessions.length > 0 ? (
          <div className="space-y-4">
            {sessions.map((session) => {
              const speakerIsUser = session.speaker_id === user?.id;
              const step1Turn = session.turns.find(t => t.step === 1);
              const step2Turn = session.turns.find(t => t.step === 2);
              const step3Turn = session.turns.find(t => t.step === 3);
              
              return (
                <Card key={session.id} data-testid={`card-session-${session.id}`}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg" data-testid={`text-session-title-${session.id}`}>
                          <MessageCircle className="h-4 w-4 inline mr-2" />
                          {speakerIsUser ? 'You' : partnerProfile?.full_name} as Speaker
                        </CardTitle>
                        <CardDescription data-testid={`text-session-date-${session.id}`}>
                          {formatDistanceToNow(new Date(session.created_at), { addSuffix: true })}
                        </CardDescription>
                      </div>
                      <Badge
                        variant={session.status === 'completed' ? 'default' : 'secondary'}
                        data-testid={`badge-session-status-${session.id}`}
                      >
                        {session.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {step1Turn && (
                      <div data-testid={`container-turn-1-${session.id}`}>
                        <p className="text-sm font-medium text-muted-foreground">Step 1: Speaker's Concern</p>
                        <p className="text-sm mt-1" data-testid={`text-turn-1-${session.id}`}>{step1Turn.content}</p>
                      </div>
                    )}
                    {step2Turn && (
                      <div data-testid={`container-turn-2-${session.id}`}>
                        <p className="text-sm font-medium text-muted-foreground">Step 2: Listener's Reflection</p>
                        <p className="text-sm mt-1" data-testid={`text-turn-2-${session.id}`}>{step2Turn.content}</p>
                      </div>
                    )}
                    {step3Turn && (
                      <div data-testid={`container-turn-3-${session.id}`}>
                        <p className="text-sm font-medium text-muted-foreground">Step 3: Speaker's Confirmation</p>
                        <p className="text-sm mt-1" data-testid={`text-turn-3-${session.id}`}>{step3Turn.content}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card data-testid="card-no-sessions">
            <CardContent className="p-12 text-center">
              <MessageCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground" data-testid="text-no-sessions">
                No sessions yet. Start your first Echo & Empathy exercise above!
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

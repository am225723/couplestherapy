import { useState, useEffect } from 'react';
import { useNavigate } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { Heart, Loader2, MessageCircle } from 'lucide-react';

type ConversationStep = 'initiate' | 'partner-reflect' | 'partner-respond' | 'complete';

export default function HoldMeTightPage() {
  const [step, setStep] = useState<ConversationStep>('initiate');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [initiatorFeel, setInitiatorFeel] = useState('');
  const [initiatorNeed, setInitiatorNeed] = useState('');
  const [partnerReflection, setPartnerReflection] = useState('');
  const [partnerResponse, setPartnerResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingExisting, setCheckingExisting] = useState(true);
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    checkForActiveConversation();
  }, [profile?.couple_id]);

  const checkForActiveConversation = async () => {
    if (!profile?.couple_id) return;

    try {
      const { data, error } = await supabase
        .from('Couples_conversations')
        .select('*')
        .eq('couple_id', profile.couple_id)
        .is('partner_response', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (data && !error) {
        setConversationId(data.id);
        if (data.initiator_id === user?.id) {
          if (!data.partner_reflection) {
            setStep('initiate');
            setInitiatorFeel(data.initiator_statement_feel || '');
            setInitiatorNeed(data.initiator_statement_need || '');
          } else {
            toast({
              title: 'Waiting for partner',
              description: 'Your partner is reflecting on what you shared.',
            });
            navigate('/dashboard');
          }
        } else {
          if (!data.partner_reflection) {
            setStep('partner-reflect');
            setInitiatorFeel(data.initiator_statement_feel || '');
            setInitiatorNeed(data.initiator_statement_need || '');
          } else {
            setStep('partner-respond');
            setPartnerReflection(data.partner_reflection || '');
          }
        }
      }
    } catch (error) {
      console.error('Error checking conversation:', error);
    } finally {
      setCheckingExisting(false);
    }
  };

  const handleInitiate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile?.couple_id) return;

    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('Couples_conversations')
        .insert({
          couple_id: profile.couple_id,
          initiator_id: user.id,
          initiator_statement_feel: initiatorFeel,
          initiator_statement_need: initiatorNeed,
        })
        .select()
        .single();

      if (error) throw error;

      setConversationId(data.id);
      toast({
        title: 'Conversation started',
        description: 'Your partner will be prompted to respond.',
      });

      navigate('/dashboard');
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

  const handlePartnerReflect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!conversationId) return;

    setLoading(true);

    try {
      const { error } = await supabase
        .from('Couples_conversations')
        .update({ partner_reflection: partnerReflection })
        .eq('id', conversationId);

      if (error) throw error;

      setStep('partner-respond');
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

  const handlePartnerRespond = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!conversationId) return;

    setLoading(true);

    try {
      const { error } = await supabase
        .from('Couples_conversations')
        .update({ partner_response: partnerResponse })
        .eq('id', conversationId);

      if (error) throw error;

      toast({
        title: 'Conversation complete',
        description: 'Thank you for sharing openly with each other.',
      });

      navigate('/dashboard');
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

  if (checkingExisting) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const progressValue = step === 'initiate' ? 33 : step === 'partner-reflect' ? 66 : 100;

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <MessageCircle className="h-8 w-8 text-primary" />
            <h1 className="text-4xl font-bold">Hold Me Tight Conversation</h1>
          </div>
          <p className="text-muted-foreground">
            A guided conversation to deepen emotional connection
          </p>
        </div>

        <Card>
          <CardHeader>
            <Progress value={progressValue} className="mb-4" />
            <CardTitle>
              {step === 'initiate' && 'Step 1: Share Your Raw Spot'}
              {step === 'partner-reflect' && 'Step 2: Reflect Back'}
              {step === 'partner-respond' && 'Step 3: Share Your Experience'}
            </CardTitle>
            <CardDescription>
              {step === 'initiate' && 'Share a vulnerable moment using "I feel" statements'}
              {step === 'partner-reflect' && 'Repeat back what you heard your partner say'}
              {step === 'partner-respond' && 'Share how you felt during that moment'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {step === 'initiate' && (
              <form onSubmit={handleInitiate} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    When this happens... I feel...
                  </label>
                  <Textarea
                    placeholder="Example: When you come home late without calling, I feel anxious and alone..."
                    value={initiatorFeel}
                    onChange={(e) => setInitiatorFeel(e.target.value)}
                    className="min-h-32 resize-none"
                    required
                    data-testid="textarea-initiator-feel"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    What I need from you is...
                  </label>
                  <Textarea
                    placeholder="Example: I need to know you're thinking of me, even when you're busy..."
                    value={initiatorNeed}
                    onChange={(e) => setInitiatorNeed(e.target.value)}
                    className="min-h-32 resize-none"
                    required
                    data-testid="textarea-initiator-need"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading} data-testid="button-initiate">
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Starting conversation...
                    </>
                  ) : (
                    <>
                      <Heart className="mr-2 h-4 w-4" />
                      Share with Partner
                    </>
                  )}
                </Button>
              </form>
            )}

            {step === 'partner-reflect' && (
              <form onSubmit={handlePartnerReflect} className="space-y-6">
                <div className="bg-accent/30 p-6 rounded-lg space-y-4">
                  <p className="text-sm font-medium text-muted-foreground">Your partner shared:</p>
                  <div className="space-y-2">
                    <p className="font-medium">They feel:</p>
                    <p className="italic">"{initiatorFeel}"</p>
                  </div>
                  <div className="space-y-2">
                    <p className="font-medium">They need:</p>
                    <p className="italic">"{initiatorNeed}"</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    What I'm hearing you say is...
                  </label>
                  <Textarea
                    placeholder="Reflect back what you heard without judgment..."
                    value={partnerReflection}
                    onChange={(e) => setPartnerReflection(e.target.value)}
                    className="min-h-32 resize-none"
                    required
                    data-testid="textarea-partner-reflection"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading} data-testid="button-reflect">
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Continuing...
                    </>
                  ) : (
                    'Continue to Step 3'
                  )}
                </Button>
              </form>
            )}

            {step === 'partner-respond' && (
              <form onSubmit={handlePartnerRespond} className="space-y-6">
                <div className="bg-secondary/30 p-6 rounded-lg">
                  <p className="text-sm font-medium text-muted-foreground mb-2">You reflected:</p>
                  <p className="italic">"{partnerReflection}"</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    When that happens, I'm feeling...
                  </label>
                  <Textarea
                    placeholder="Share your own vulnerable experience in that moment..."
                    value={partnerResponse}
                    onChange={(e) => setPartnerResponse(e.target.value)}
                    className="min-h-32 resize-none"
                    required
                    data-testid="textarea-partner-response"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading} data-testid="button-complete">
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Completing...
                    </>
                  ) : (
                    <>
                      <Heart className="mr-2 h-4 w-4" />
                      Complete Conversation
                    </>
                  )}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

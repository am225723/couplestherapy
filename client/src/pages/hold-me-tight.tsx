import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { authenticatedFetch } from '@/lib/authenticated-fetch';
import { useToast } from '@/hooks/use-toast';
import { useMutation } from '@tanstack/react-query';
import { Heart, Loader2, MessageCircle, ChevronLeft, ChevronRight, Sparkles, ChevronDown } from 'lucide-react';

type ConversationStep = 'initiate' | 'partner-reflect' | 'partner-respond' | 'complete';

export default function HoldMeTightPage() {
  const [step, setStep] = useState<ConversationStep>('initiate');
  const [initiatorStep, setInitiatorStep] = useState(1);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [initiatorSituation, setInitiatorSituation] = useState('');
  const [initiatorFeel, setInitiatorFeel] = useState('');
  const [initiatorScaredOf, setInitiatorScaredOf] = useState('');
  const [initiatorEmbarrassedAbout, setInitiatorEmbarrassedAbout] = useState('');
  const [initiatorExpectations, setInitiatorExpectations] = useState('');
  const [initiatorNeed, setInitiatorNeed] = useState('');
  const [partnerReflection, setPartnerReflection] = useState('');
  const [partnerResponse, setPartnerResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingExisting, setCheckingExisting] = useState(true);
  const [aiSuggestionsOpen, setAiSuggestionsOpen] = useState(false);
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  // AI Empathy Prompts mutation
  const empathyPromptMutation = useMutation({
    mutationFn: async () => {
      if (!conversationId) throw new Error('No conversation ID');
      
      // Combine all initiator responses for context
      const userResponse = `
        When this happens: ${initiatorSituation}
        I feel: ${initiatorFeel}
        I'm scared of: ${initiatorScaredOf}
        I'm embarrassed about: ${initiatorEmbarrassedAbout}
        My expectations: ${initiatorExpectations}
        I need: ${initiatorNeed}
      `.trim();

      const response = await authenticatedFetch('/api/ai/empathy-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_id: conversationId,
          step_number: 1,
          user_response: userResponse
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to get AI suggestions');
      }

      return response.json();
    }
  });

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
            setInitiatorSituation(data.initiator_situation || '');
            setInitiatorFeel(data.initiator_statement_feel || '');
            setInitiatorScaredOf(data.initiator_scared_of || '');
            setInitiatorEmbarrassedAbout(data.initiator_embarrassed_about || '');
            setInitiatorExpectations(data.initiator_expectations || '');
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
            setInitiatorSituation(data.initiator_situation || '');
            setInitiatorFeel(data.initiator_statement_feel || '');
            setInitiatorScaredOf(data.initiator_scared_of || '');
            setInitiatorEmbarrassedAbout(data.initiator_embarrassed_about || '');
            setInitiatorExpectations(data.initiator_expectations || '');
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

  const handleNext = () => {
    if (initiatorStep < 6) {
      setInitiatorStep(initiatorStep + 1);
    }
  };

  const handlePrevious = () => {
    if (initiatorStep > 1) {
      setInitiatorStep(initiatorStep - 1);
    }
  };

  const getCurrentStepValue = () => {
    switch (initiatorStep) {
      case 1: return initiatorSituation;
      case 2: return initiatorFeel;
      case 3: return initiatorScaredOf;
      case 4: return initiatorEmbarrassedAbout;
      case 5: return initiatorExpectations;
      case 6: return initiatorNeed;
      default: return '';
    }
  };

  const isCurrentStepValid = () => {
    return getCurrentStepValue().trim().length > 0;
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
          initiator_situation: initiatorSituation,
          initiator_statement_feel: initiatorFeel,
          initiator_scared_of: initiatorScaredOf,
          initiator_embarrassed_about: initiatorEmbarrassedAbout,
          initiator_expectations: initiatorExpectations,
          initiator_statement_need: initiatorNeed,
        })
        .select()
        .single();

      if (error) throw error;

      setConversationId(data.id);
      
      // Clear all initiator fields
      setInitiatorSituation('');
      setInitiatorFeel('');
      setInitiatorScaredOf('');
      setInitiatorEmbarrassedAbout('');
      setInitiatorExpectations('');
      setInitiatorNeed('');
      setInitiatorStep(1);
      
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

      // Clear reflection field and move to next step
      setPartnerReflection('');
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

      // Clear response field
      setPartnerResponse('');
      
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

  const getStepPrompt = () => {
    switch (initiatorStep) {
      case 1:
        return {
          title: 'When this happens...',
          description: 'Describe the specific situation or trigger that brings up difficult emotions.',
          placeholder: 'Example: When you come home late without calling me...',
          value: initiatorSituation,
          onChange: setInitiatorSituation,
          testId: 'textarea-situation',
        };
      case 2:
        return {
          title: 'I feel...',
          description: 'Name the emotions that arise in this situation. Be specific.',
          placeholder: 'Example: I feel anxious, alone, and scared that I\'m not important to you...',
          value: initiatorFeel,
          onChange: setInitiatorFeel,
          testId: 'textarea-feel',
        };
      case 3:
        return {
          title: 'What am I scared of?',
          description: 'Explore your deeper fears. What are you most afraid might happen?',
          placeholder: 'Example: I\'m scared that you don\'t need me, that I\'m not a priority in your life...',
          value: initiatorScaredOf,
          onChange: setInitiatorScaredOf,
          testId: 'textarea-scared-of',
        };
      case 4:
        return {
          title: 'What am I embarrassed about?',
          description: 'Acknowledge what feels vulnerable or shameful to admit.',
          placeholder: 'Example: I\'m embarrassed that I need so much reassurance, that I can\'t just be okay on my own...',
          value: initiatorEmbarrassedAbout,
          onChange: setInitiatorEmbarrassedAbout,
          testId: 'textarea-embarrassed-about',
        };
      case 5:
        return {
          title: 'What are my expectations?',
          description: 'Share your hopes and desires. What would feel good to you?',
          placeholder: 'Example: I hope that we can stay connected even when we\'re apart, that you\'ll think of me during the day...',
          value: initiatorExpectations,
          onChange: setInitiatorExpectations,
          testId: 'textarea-expectations',
        };
      case 6:
        return {
          title: 'What do I need?',
          description: 'Make a clear, specific request of your partner.',
          placeholder: 'Example: I need you to send me a quick text when you\'re running late, so I know you\'re thinking of me...',
          value: initiatorNeed,
          onChange: setInitiatorNeed,
          testId: 'textarea-need',
        };
      default:
        return {
          title: '',
          description: '',
          placeholder: '',
          value: '',
          onChange: () => {},
          testId: '',
        };
    }
  };

  if (checkingExisting) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const progressValue = 
    step === 'initiate' 
      ? (initiatorStep / 6) * 100 / 3
      : step === 'partner-reflect' 
        ? 33 + (100 / 3) 
        : 66 + (100 / 3);

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
            <Progress value={progressValue} className="mb-4" data-testid="progress-bar" />
            <CardTitle>
              {step === 'initiate' && `Step ${initiatorStep} of 6: ${getStepPrompt().title}`}
              {step === 'partner-reflect' && 'Partner Step 1: Reflect Back'}
              {step === 'partner-respond' && 'Partner Step 2: Share Your Experience'}
            </CardTitle>
            <CardDescription>
              {step === 'initiate' && getStepPrompt().description}
              {step === 'partner-reflect' && 'Reflect back what you heard your partner share'}
              {step === 'partner-respond' && 'Share how you felt during that moment'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {step === 'initiate' && (
              <form onSubmit={handleInitiate} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    {getStepPrompt().title}
                  </label>
                  <Textarea
                    placeholder={getStepPrompt().placeholder}
                    value={getStepPrompt().value}
                    onChange={(e) => getStepPrompt().onChange(e.target.value)}
                    className="min-h-32 resize-none"
                    required
                    data-testid={getStepPrompt().testId}
                  />
                </div>

                <div className="flex gap-4">
                  {initiatorStep > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handlePrevious}
                      className="flex-1"
                      data-testid="button-previous"
                    >
                      <ChevronLeft className="mr-2 h-4 w-4" />
                      Previous
                    </Button>
                  )}
                  {initiatorStep < 6 ? (
                    <Button
                      type="button"
                      onClick={handleNext}
                      disabled={!isCurrentStepValid()}
                      className="flex-1"
                      data-testid="button-next"
                    >
                      Next
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  ) : (
                    <Button 
                      type="submit" 
                      className="flex-1" 
                      disabled={loading || !isCurrentStepValid()} 
                      data-testid="button-submit"
                    >
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
                  )}
                </div>
              </form>
            )}

            {step === 'partner-reflect' && (
              <form onSubmit={handlePartnerReflect} className="space-y-6">
                <div className="bg-accent/30 p-6 rounded-lg space-y-6">
                  <p className="text-sm font-medium text-muted-foreground">Your partner shared:</p>
                  
                  <div className="space-y-2">
                    <p className="font-semibold text-foreground">When this happens:</p>
                    <p className="italic text-foreground/90">"{initiatorSituation}"</p>
                  </div>

                  <div className="space-y-2">
                    <p className="font-semibold text-foreground">They feel:</p>
                    <p className="italic text-foreground/90">"{initiatorFeel}"</p>
                  </div>

                  <div className="space-y-2">
                    <p className="font-semibold text-foreground">They're scared of:</p>
                    <p className="italic text-foreground/90">"{initiatorScaredOf}"</p>
                  </div>

                  <div className="space-y-2">
                    <p className="font-semibold text-foreground">They're embarrassed about:</p>
                    <p className="italic text-foreground/90">"{initiatorEmbarrassedAbout}"</p>
                  </div>

                  <div className="space-y-2">
                    <p className="font-semibold text-foreground">Their expectations:</p>
                    <p className="italic text-foreground/90">"{initiatorExpectations}"</p>
                  </div>

                  <div className="space-y-2">
                    <p className="font-semibold text-foreground">They need:</p>
                    <p className="italic text-foreground/90">"{initiatorNeed}"</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    What I'm hearing you say is...
                  </label>
                  <p className="text-sm text-muted-foreground mb-2">
                    Reflect back the essence of what you heard, showing you understand their vulnerable sharing.
                  </p>
                  <Textarea
                    placeholder="Example: I hear you saying that when I come home late without calling, you feel anxious and alone, and you're scared that you're not important to me..."
                    value={partnerReflection}
                    onChange={(e) => setPartnerReflection(e.target.value)}
                    className="min-h-32 resize-none"
                    required
                    data-testid="textarea-partner-reflection"
                  />
                </div>

                <div className="space-y-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full gap-2"
                    onClick={() => {
                      empathyPromptMutation.mutate();
                      setAiSuggestionsOpen(true);
                    }}
                    disabled={empathyPromptMutation.isPending}
                    data-testid="button-ai-empathy-suggestions"
                  >
                    {empathyPromptMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Getting AI Suggestions...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        Get AI Empathy Suggestions
                      </>
                    )}
                  </Button>

                  {empathyPromptMutation.isError && (
                    <Alert variant="destructive" data-testid="alert-empathy-error">
                      <AlertDescription>
                        {empathyPromptMutation.error instanceof Error ? empathyPromptMutation.error.message : 'Failed to get suggestions'}
                      </AlertDescription>
                    </Alert>
                  )}

                  {empathyPromptMutation.isSuccess && empathyPromptMutation.data && (
                    <Collapsible open={aiSuggestionsOpen} onOpenChange={setAiSuggestionsOpen}>
                      <CollapsibleTrigger asChild>
                        <Button
                          variant="ghost"
                          className="w-full justify-between"
                          data-testid="button-toggle-suggestions"
                        >
                          <span className="flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-primary" />
                            AI Empathy Suggestions
                          </span>
                          <ChevronDown className={`h-4 w-4 transition-transform ${aiSuggestionsOpen ? 'rotate-180' : ''}`} />
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="space-y-4 pt-4" data-testid="container-ai-suggestions">
                        <p className="text-sm text-muted-foreground">
                          Here are some empathetic ways to reflect what you heard. You can use these as inspiration or copy one to get started:
                        </p>
                        {empathyPromptMutation.data.suggested_responses.map((suggestion: string, idx: number) => (
                          <Card key={idx} className="hover-elevate cursor-pointer" onClick={() => setPartnerReflection(suggestion)}>
                            <CardContent className="p-4">
                              <p className="text-sm" data-testid={`text-suggestion-${idx}`}>{suggestion}</p>
                            </CardContent>
                          </Card>
                        ))}
                        <p className="text-xs text-muted-foreground italic text-center">
                          Click on any suggestion to use it, or write your own empathetic response
                        </p>
                      </CollapsibleContent>
                    </Collapsible>
                  )}
                </div>

                <Button type="submit" className="w-full" disabled={loading} data-testid="button-reflect">
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Continuing...
                    </>
                  ) : (
                    'Continue to Partner Step 2'
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

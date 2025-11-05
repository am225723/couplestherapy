import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2, ArrowLeft, ArrowRight, Heart } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface DateNightPreferences {
  time: string;
  location: string;
  price: string;
  participants: string;
  energy: string;
}

interface DateNightResponse {
  content: string;
  citations?: string[];
}

const STEPS = {
  GREETING: 0,
  TIME: 1,
  LOCATION: 2,
  PRICE: 3,
  PARTICIPANTS: 4,
  ENERGY: 5,
  RESULTS: 6,
};

export default function DateNightPage() {
  const [currentStep, setCurrentStep] = useState(STEPS.GREETING);
  const [preferences, setPreferences] = useState<DateNightPreferences>({
    time: '',
    location: '',
    price: '',
    participants: '',
    energy: '',
  });
  const [generatedIdeas, setGeneratedIdeas] = useState<string>('');
  const { toast } = useToast();

  const generateMutation = useMutation({
    mutationFn: async (prefs: DateNightPreferences) => {
      const response = await apiRequest('POST', '/api/date-night/generate', prefs);
      const data = await response.json();
      return data as DateNightResponse;
    },
    onSuccess: (data) => {
      setGeneratedIdeas(data.content);
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to generate date night ideas',
        variant: 'destructive',
      });
    },
  });

  const handleAnswer = (field: keyof DateNightPreferences, value: string) => {
    setPreferences((prev) => ({ ...prev, [field]: value }));
    
    if (currentStep === STEPS.ENERGY) {
      setCurrentStep(STEPS.RESULTS);
      generateMutation.mutate({ ...preferences, energy: value });
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > STEPS.GREETING) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleReset = () => {
    setCurrentStep(STEPS.GREETING);
    setPreferences({
      time: '',
      location: '',
      price: '',
      participants: '',
      energy: '',
    });
    setGeneratedIdeas('');
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case STEPS.GREETING:
        return 'Welcome to the Connection Concierge';
      case STEPS.TIME:
        return 'How much time can you set aside?';
      case STEPS.LOCATION:
        return 'At-home or out of the house?';
      case STEPS.PRICE:
        return "What's the ideal price point?";
      case STEPS.PARTICIPANTS:
        return 'Kid-friendly or adults only?';
      case STEPS.ENERGY:
        return 'Energy level?';
      default:
        return 'Your Date Night Ideas';
    }
  };

  const getProgress = () => {
    if (currentStep === STEPS.GREETING || currentStep === STEPS.RESULTS) {
      return null;
    }
    const step = currentStep;
    return `Step ${step} of 5`;
  };

  const renderGreeting = () => (
    <Card className="max-w-2xl mx-auto" data-testid="card-greeting">
      <CardHeader>
        <div className="flex items-center justify-center mb-4">
          <Sparkles className="h-12 w-12 text-primary" />
        </div>
        <CardTitle className="text-3xl text-center">Welcome to the Connection Concierge</CardTitle>
        <CardDescription className="text-center text-lg">
          Let's plan something special together! I'll ask you a few questions to create personalized date night ideas that strengthen your connection.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          onClick={() => setCurrentStep(STEPS.TIME)}
          className="w-full"
          size="lg"
          data-testid="button-start"
        >
          Let's Begin
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </CardContent>
    </Card>
  );

  const renderQuestion = (
    field: keyof DateNightPreferences,
    options: { label: string; value: string }[]
  ) => (
    <Card className="max-w-2xl mx-auto" data-testid={`card-question-${field}`}>
      <CardHeader>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-muted-foreground" data-testid="text-progress">
            {getProgress()}
          </span>
          <Heart className="h-5 w-5 text-primary" />
        </div>
        <CardTitle className="text-2xl">{getStepTitle()}</CardTitle>
        <CardDescription>Choose the option that feels right for you</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-4">
          {options.map((option) => (
            <Button
              key={option.value}
              onClick={() => handleAnswer(field, option.value)}
              variant="outline"
              className="h-auto py-6 text-lg justify-start hover-elevate active-elevate-2"
              data-testid={`button-option-${option.value.toLowerCase().replace(/\s+/g, '-')}`}
            >
              {option.label}
            </Button>
          ))}
        </div>
        
        {currentStep > STEPS.TIME && (
          <div className="flex justify-start mt-6">
            <Button
              onClick={handlePrevious}
              variant="ghost"
              disabled={generateMutation.isPending}
              data-testid="button-previous"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Previous
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const renderResults = () => {
    if (generateMutation.isPending) {
      return (
        <Card className="max-w-4xl mx-auto" data-testid="card-loading">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Loader2 className="h-16 w-16 animate-spin text-primary mb-4" />
            <p className="text-xl font-medium" data-testid="text-generating">
              Generating your personalized date night ideas...
            </p>
            <p className="text-muted-foreground mt-2">This may take a moment</p>
          </CardContent>
        </Card>
      );
    }

    const ideas = generatedIdeas.split('✨').filter(Boolean);

    return (
      <div className="max-w-4xl mx-auto space-y-8" data-testid="container-results">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Sparkles className="h-8 w-8 text-primary" />
              <div>
                <CardTitle className="text-3xl">Your Date Night Ideas</CardTitle>
                <CardDescription className="text-lg">
                  Three personalized suggestions to strengthen your connection
                </CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>

        {ideas.map((idea, index) => {
          const lines = idea.trim().split('\n').filter(Boolean);
          const title = lines[0]?.trim() || `Date Idea ${index + 1}`;
          const description = lines.find(l => l.startsWith('Description:'))?.replace('Description:', '').trim() || '';
          const connectionTip = lines.find(l => l.startsWith('Connection Tip:'))?.replace('Connection Tip:', '').trim() || '';

          return (
            <Card key={index} className="hover-elevate" data-testid={`card-idea-${index}`}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <Sparkles className="h-6 w-6 text-primary" />
                  {title}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {description && (
                  <div>
                    <p className="text-lg" data-testid={`text-description-${index}`}>{description}</p>
                  </div>
                )}
                {connectionTip && (
                  <div className="bg-primary/10 p-4 rounded-lg border-l-4 border-primary">
                    <p className="font-medium text-sm text-primary mb-1">Connection Tip</p>
                    <p className="text-sm" data-testid={`text-connection-tip-${index}`}>{connectionTip}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}

        <div className="flex justify-center gap-4">
          <Button
            onClick={handleReset}
            variant="outline"
            size="lg"
            data-testid="button-try-again"
          >
            Try Different Preferences
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="py-12">
        {currentStep === STEPS.GREETING && renderGreeting()}
        
        {currentStep === STEPS.TIME && renderQuestion('time', [
          { label: '1-2 hours', value: '1-2 hours' },
          { label: 'Full evening', value: 'Full evening' },
          { label: 'Whole afternoon', value: 'Whole afternoon' },
        ])}
        
        {currentStep === STEPS.LOCATION && renderQuestion('location', [
          { label: 'At home', value: 'At home' },
          { label: 'Out of the house', value: 'Out of the house' },
        ])}
        
        {currentStep === STEPS.PRICE && renderQuestion('price', [
          { label: 'Totally free', value: 'Totally free' },
          { label: 'Budget-friendly', value: 'Budget-friendly' },
          { label: "Let's splurge a little", value: "Let's splurge a little" },
        ])}
        
        {currentStep === STEPS.PARTICIPANTS && renderQuestion('participants', [
          { label: 'Kid-friendly', value: 'Kid-friendly' },
          { label: 'Adults only', value: 'Adults only' },
        ])}
        
        {currentStep === STEPS.ENERGY && renderQuestion('energy', [
          { label: 'Low-key and relaxing', value: 'Low-key and relaxing' },
          { label: 'Active and engaging', value: 'Active and engaging' },
        ])}
        
        {currentStep === STEPS.RESULTS && renderResults()}
      </div>
    </div>
  );
}

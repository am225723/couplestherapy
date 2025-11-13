import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2, ArrowLeft, ArrowRight, Heart, CalendarPlus } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';

interface DateNightPreferences {
  interests: string[];
  time: string;
  zipCode: string;
  travelDistance: string;
  activityLocation: string;
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
  INTERESTS: 1,
  TIME: 2,
  ZIP_CODE: 3,
  TRAVEL_DISTANCE: 4,
  ACTIVITY_LOCATION: 5,
  PRICE: 6,
  PARTICIPANTS: 7,
  ENERGY: 8,
  RESULTS: 9,
};

const INTEREST_OPTIONS = [
  { label: 'Cooking & Food', value: 'cooking-food' },
  { label: 'Movies & TV Shows', value: 'movies-tv' },
  { label: 'Outdoor Adventures', value: 'outdoor-adventures' },
  { label: 'Art & Creativity', value: 'art-creativity' },
  { label: 'Music & Concerts', value: 'music-concerts' },
  { label: 'Sports & Fitness', value: 'sports-fitness' },
  { label: 'Games & Puzzles', value: 'games-puzzles' },
  { label: 'Learning & Education', value: 'learning-education' },
  { label: 'Reading & Writing', value: 'reading-writing' },
  { label: 'Dancing', value: 'dancing' },
  { label: 'Travel & Exploration', value: 'travel-exploration' },
  { label: 'Wellness & Relaxation', value: 'wellness-relaxation' },
];

export default function DateNightPage() {
  const [currentStep, setCurrentStep] = useState(STEPS.GREETING);
  const [preferences, setPreferences] = useState<DateNightPreferences>({
    interests: [],
    time: '',
    zipCode: '',
    travelDistance: '',
    activityLocation: '',
    price: '',
    participants: '',
    energy: '',
  });
  const [generatedIdeas, setGeneratedIdeas] = useState<string>('');
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const generateMutation = useMutation({
    mutationFn: async (prefs: DateNightPreferences) => {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const response = await fetch(
        `${supabaseUrl}/functions/v1/ai-date-night`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseAnonKey}`,
          },
          body: JSON.stringify(prefs),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate date night ideas');
      }

      return await response.json() as DateNightResponse;
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
      interests: [],
      time: '',
      zipCode: '',
      travelDistance: '',
      activityLocation: '',
      price: '',
      participants: '',
      energy: '',
    });
    setGeneratedIdeas('');
  };

  const handleInterestToggle = (value: string) => {
    setPreferences((prev) => {
      const newInterests = prev.interests.includes(value)
        ? prev.interests.filter((i) => i !== value)
        : [...prev.interests, value];
      return { ...prev, interests: newInterests };
    });
  };

  const handleInterestsContinue = () => {
    if (preferences.interests.length === 0) {
      toast({
        title: 'Select at least one interest',
        description: 'Please choose what you both enjoy to get personalized ideas',
        variant: 'destructive',
      });
      return;
    }
    setCurrentStep(STEPS.TIME);
  };

  const handleAddToCalendar = (title: string, description: string) => {
    // Store the pre-filled event data in localStorage for the calendar page to pick up
    localStorage.setItem('prefilled_event', JSON.stringify({
      title,
      description,
    }));
    
    toast({
      title: 'Navigating to Calendar',
      description: 'Event details will be pre-filled for you',
    });

    // Navigate to calendar page
    setLocation('/calendar');
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case STEPS.GREETING:
        return 'Welcome to the Connection Concierge';
      case STEPS.INTERESTS:
        return 'What do you both enjoy?';
      case STEPS.TIME:
        return 'How much time can you set aside?';
      case STEPS.ZIP_CODE:
        return 'Where are you located?';
      case STEPS.TRAVEL_DISTANCE:
        return 'How far are you willing to travel?';
      case STEPS.ACTIVITY_LOCATION:
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
    const step = currentStep - 1;
    return `Step ${step} of 8`;
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
          onClick={() => setCurrentStep(STEPS.INTERESTS)}
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
        
        {currentStep > STEPS.INTERESTS && (
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
                <div className="pt-2">
                  <Button
                    onClick={() => handleAddToCalendar(title, description + (connectionTip ? `\n\nConnection Tip: ${connectionTip}` : ''))}
                    variant="outline"
                    className="w-full"
                    data-testid={`button-add-to-calendar-${index}`}
                  >
                    <CalendarPlus className="h-4 w-4 mr-2" />
                    Add to Calendar
                  </Button>
                </div>
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

  const [zipCodeInput, setZipCodeInput] = useState('');

  const handleZipCodeContinue = () => {
    if (!zipCodeInput.trim()) {
      toast({
        title: 'Location required',
        description: 'Please enter your ZIP code or city',
        variant: 'destructive',
      });
      return;
    }
    setPreferences((prev) => ({ ...prev, zipCode: zipCodeInput.trim() }));
    setCurrentStep(STEPS.TRAVEL_DISTANCE);
  };

  const renderZipCode = () => (
    <Card className="max-w-2xl mx-auto" data-testid="card-zipcode">
      <CardHeader>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-muted-foreground" data-testid="text-progress">
            Step 3 of 8
          </span>
          <Heart className="h-5 w-5 text-primary" />
        </div>
        <CardTitle className="text-2xl">{getStepTitle()}</CardTitle>
        <CardDescription>Enter your ZIP code or city to get local recommendations</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <Textarea
            placeholder="Enter ZIP code or city (e.g., 90210 or Los Angeles, CA)"
            value={zipCodeInput}
            onChange={(e) => setZipCodeInput(e.target.value)}
            className="min-h-[60px]"
            data-testid="input-zipcode"
          />
        </div>

        <div className="flex justify-between items-center pt-4">
          <Button
            onClick={handlePrevious}
            variant="ghost"
            data-testid="button-previous"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Previous
          </Button>
          <Button
            onClick={handleZipCodeContinue}
            disabled={!zipCodeInput.trim()}
            data-testid="button-continue"
          >
            Continue
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderInterests = () => (
    <Card className="max-w-2xl mx-auto" data-testid="card-interests">
      <CardHeader>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-muted-foreground" data-testid="text-progress">
            Step 1 of 8
          </span>
          <Heart className="h-5 w-5 text-primary" />
        </div>
        <CardTitle className="text-2xl">{getStepTitle()}</CardTitle>
        <CardDescription>Select all the activities and interests you share (or want to explore together)</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-3">
          {INTEREST_OPTIONS.map((option) => {
            const isSelected = preferences.interests.includes(option.value);
            return (
              <Button
                key={option.value}
                onClick={() => handleInterestToggle(option.value)}
                variant={isSelected ? 'default' : 'outline'}
                className="h-auto py-4 justify-start hover-elevate active-elevate-2"
                data-testid={`button-interest-${option.value}`}
              >
                {option.label}
              </Button>
            );
          })}
        </div>

        {preferences.interests.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Selected interests:</p>
            <div className="flex flex-wrap gap-2">
              {preferences.interests.map((interest) => {
                const option = INTEREST_OPTIONS.find(o => o.value === interest);
                return (
                  <Badge key={interest} variant="secondary" data-testid={`badge-${interest}`}>
                    {option?.label}
                  </Badge>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex justify-between items-center pt-4">
          <Button
            onClick={handlePrevious}
            variant="ghost"
            data-testid="button-previous"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Previous
          </Button>
          <Button
            onClick={handleInterestsContinue}
            disabled={preferences.interests.length === 0}
            data-testid="button-continue"
          >
            Continue
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="py-12">
        {currentStep === STEPS.GREETING && renderGreeting()}
        
        {currentStep === STEPS.INTERESTS && renderInterests()}
        
        {currentStep === STEPS.TIME && renderQuestion('time', [
          { label: '1-2 hours', value: '1-2 hours' },
          { label: 'Full evening', value: 'Full evening' },
          { label: 'Whole afternoon', value: 'Whole afternoon' },
        ])}

        {currentStep === STEPS.ZIP_CODE && renderZipCode()}

        {currentStep === STEPS.TRAVEL_DISTANCE && renderQuestion('travelDistance', [
          { label: 'Within 5 miles', value: 'Within 5 miles' },
          { label: 'Within 10 miles', value: 'Within 10 miles' },
          { label: 'Within 15 miles', value: 'Within 15 miles' },
          { label: 'Within 20 miles', value: 'Within 20 miles' },
          { label: '30+ miles / anywhere', value: '30+ miles' },
        ])}
        
        {currentStep === STEPS.ACTIVITY_LOCATION && renderQuestion('activityLocation', [
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

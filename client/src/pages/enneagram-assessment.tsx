import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Compass, ArrowLeft, ArrowRight, Check, Loader2, RotateCcw, Save } from "lucide-react";
import {
  enneagramQuestions,
  calculateEnneagramType,
  enneagramTypeInfo,
} from "@/data/enneagramQuestions";
import { useAuth } from "@/lib/auth-context";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useAutoSave } from "@/hooks/use-auto-save";

interface ProfileWithCouple {
  couple_id?: string;
  [key: string]: any;
}

const QUESTIONS_PER_PAGE = 6;

export default function EnneagramAssessmentPage() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const coupleId = (profile as ProfileWithCouple)?.couple_id;

  const [currentPage, setCurrentPage] = useState(0);
  const [responses, setResponses] = useState<{ [key: number]: number }>({});
  const [showResults, setShowResults] = useState(false);
  const [calculatedResults, setCalculatedResults] = useState<{
    dominantType: number;
    scores: Record<number, number>;
  } | null>(null);
  const [showDraftRecovery, setShowDraftRecovery] = useState(false);

  const { loadDraft, clearDraft, hasDraft } = useAutoSave(
    { responses, currentPage },
    { key: `enneagram_assessment_${user?.id || "anon"}`, debounceMs: 500 }
  );

  useEffect(() => {
    if (hasDraft() && Object.keys(responses).length === 0) {
      setShowDraftRecovery(true);
    }
  }, []);

  const handleRestoreDraft = () => {
    const draft = loadDraft();
    if (draft) {
      setResponses(draft.responses || {});
      setCurrentPage(draft.currentPage || 0);
      toast({
        title: "Progress Restored",
        description: "Your previous answers have been restored.",
      });
    }
    setShowDraftRecovery(false);
  };

  const handleDiscardDraft = () => {
    clearDraft();
    setShowDraftRecovery(false);
  };

  const totalPages = Math.ceil(enneagramQuestions.length / QUESTIONS_PER_PAGE);

  const saveResultsMutation = useMutation({
    mutationFn: async (results: { dominantType: number; scores: Record<number, number> }) => {
      if (!user || !coupleId) throw new Error("Not authenticated");
      
      const sortedScores = Object.entries(results.scores)
        .sort((a, b) => Number(b[1]) - Number(a[1]));
      const secondaryType = sortedScores.length > 1 ? parseInt(sortedScores[1][0]) : null;
      
      return apiRequest("POST", "/api/enneagram/assessments", {
        primary_type: results.dominantType,
        secondary_type: secondaryType,
        primary_score: results.scores[results.dominantType],
        secondary_score: secondaryType ? results.scores[secondaryType] : null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/enneagram/assessments/couple"] });
      toast({
        title: "Assessment Saved",
        description: "Your Enneagram results have been saved.",
      });
    },
    onError: (error) => {
      console.error("Failed to save enneagram results:", error);
      toast({
        title: "Error Saving Results",
        description: "Your results are shown but could not be saved. Please try again.",
        variant: "destructive",
      });
    },
  });
  const currentQuestions = enneagramQuestions.slice(
    currentPage * QUESTIONS_PER_PAGE,
    (currentPage + 1) * QUESTIONS_PER_PAGE,
  );

  const progress =
    (Object.keys(responses).length / enneagramQuestions.length) * 100;

  const handleResponse = (questionId: number, value: number) => {
    setResponses((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleNext = () => {
    if (currentPage < totalPages - 1) {
      setCurrentPage((prev) => prev + 1);
    } else if (Object.keys(responses).length === enneagramQuestions.length) {
      const results = calculateEnneagramType(responses);
      setCalculatedResults(results);
      setShowResults(true);
      clearDraft();
      if (user && coupleId) {
        saveResultsMutation.mutate(results);
      } else {
        toast({
          title: "Unable to Save",
          description: "Your results are displayed but couldn't be saved. Please ensure you're logged in and linked to a couple.",
          variant: "destructive",
        });
      }
    }
  };

  const handlePrevious = () => {
    if (currentPage > 0) {
      setCurrentPage((prev) => prev - 1);
    }
  };

  const canProceed = currentQuestions.every(
    (q) => responses[q.id] !== undefined,
  );

  if (showResults && calculatedResults) {
    const { dominantType, scores } = calculatedResults;
    const info =
      enneagramTypeInfo[dominantType as keyof typeof enneagramTypeInfo];

    const sortedScores = Object.entries(scores)
      .sort((a, b) => b[1] - a[1])
      .map(([type, score]) => ({
        type: parseInt(type),
        score,
        info: enneagramTypeInfo[
          parseInt(type) as keyof typeof enneagramTypeInfo
        ],
      }));

    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto py-12 space-y-6">
          <Card data-testid="card-results">
            <CardHeader>
              <div className="flex items-center gap-3 mb-4">
                <Compass className="h-10 w-10 text-primary" />
                <div>
                  <CardTitle className="text-3xl">
                    Your Enneagram Type
                  </CardTitle>
                  <CardDescription className="text-lg">
                    Personality insights for your relationship
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-primary/10 p-6 rounded-lg border-l-4 border-primary">
                <div className="flex items-baseline gap-3 mb-2">
                  <span className="text-4xl font-bold text-primary">
                    Type {dominantType}
                  </span>
                  <h3
                    className="text-2xl font-semibold"
                    data-testid="text-type-title"
                  >
                    {info.title}
                  </h3>
                </div>
                <p className="text-lg text-muted-foreground">
                  {info.description}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Check className="h-5 w-5 text-green-500" />
                      Your Strengths
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {info.strengths.map((strength, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-primary mt-1">•</span>
                          <span>{strength}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">
                      Growth Opportunities
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {info.challenges.map((challenge, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-primary mt-1">•</span>
                          <span>{challenge}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">All Type Scores</CardTitle>
                  <CardDescription>
                    See how you scored across all nine types
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {sortedScores.map(({ type, score, info }) => (
                    <div key={type} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">
                          Type {type}: {info.title}
                        </span>
                        <span data-testid={`score-type-${type}`}>{score}</span>
                      </div>
                      <Progress
                        value={
                          (score / Math.max(...Object.values(scores))) * 100
                        }
                        className="h-2"
                      />
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="bg-primary/5 border-primary/20">
                <CardHeader>
                  <CardTitle className="text-lg">
                    For Your Relationship
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">
                    Understanding your Enneagram type helps explain your
                    motivations, fears, and relationship patterns. Share your
                    results with your partner to discover how your types
                    interact. Each combination has unique strengths and
                    challenges that your therapist can help you navigate.
                  </p>
                </CardContent>
              </Card>

              <div className="flex justify-center gap-4 flex-wrap">
                {saveResultsMutation.isPending && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Saving your results...</span>
                  </div>
                )}
                <Button
                  onClick={() => navigate("/enneagram-results")}
                  size="lg"
                  data-testid="button-view-results"
                >
                  View My Results
                </Button>
                <Button
                  onClick={() => {
                    setShowResults(false);
                    setCurrentPage(0);
                    setResponses({});
                    setCalculatedResults(null);
                  }}
                  size="lg"
                  variant="outline"
                  data-testid="button-retake"
                >
                  Retake Assessment
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto py-12 space-y-4">
        {showDraftRecovery && (
          <Alert className="border-primary/50 bg-primary/5">
            <Save className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between flex-wrap gap-3">
              <span>You have unsaved progress from a previous session.</span>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleRestoreDraft} data-testid="button-restore-draft">
                  <RotateCcw className="h-4 w-4 mr-1" />
                  Restore
                </Button>
                <Button size="sm" variant="outline" onClick={handleDiscardDraft} data-testid="button-discard-draft">
                  Start Fresh
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}
        <Card data-testid="card-assessment">
          <CardHeader>
            <div className="flex items-center gap-3 mb-4">
              <Compass className="h-8 w-8 text-primary" />
              <div>
                <CardTitle className="text-2xl">Enneagram Assessment</CardTitle>
                <CardDescription className="text-base">
                  Discover your core personality type and relationship dynamics
                </CardDescription>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm font-medium">
                <span data-testid="text-page-progress">
                  Page {currentPage + 1} of {totalPages}
                </span>
                <span data-testid="text-completion-progress">
                  {Object.keys(responses).length} / {enneagramQuestions.length}{" "}
                  answered
                </span>
              </div>
              <Progress
                value={progress}
                className="h-2"
                data-testid="progress-bar"
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-8">
            {currentQuestions.map((question) => (
              <div
                key={question.id}
                className="space-y-4 pb-6 border-b last:border-b-0"
              >
                <Label
                  className="text-base font-medium"
                  data-testid={`question-${question.id}`}
                >
                  {question.id}. {question.question_text}
                </Label>
                <RadioGroup
                  value={responses[question.id]?.toString()}
                  onValueChange={(value) =>
                    handleResponse(question.id, parseInt(value))
                  }
                  data-testid={`radio-group-${question.id}`}
                >
                  <div className="grid grid-cols-5 gap-2">
                    {[1, 2, 3, 4, 5].map((value) => (
                      <div
                        key={value}
                        className="flex flex-col items-center space-y-2"
                      >
                        <RadioGroupItem
                          value={value.toString()}
                          id={`q${question.id}-${value}`}
                          data-testid={`radio-${question.id}-${value}`}
                        />
                        <Label
                          htmlFor={`q${question.id}-${value}`}
                          className="text-xs text-center cursor-pointer"
                        >
                          {value === 1 && "Rarely"}
                          {value === 2 && "Sometimes"}
                          {value === 3 && "Often"}
                          {value === 4 && "Very Often"}
                          {value === 5 && "Always"}
                        </Label>
                      </div>
                    ))}
                  </div>
                </RadioGroup>
              </div>
            ))}

            <div className="flex justify-between pt-4">
              <Button
                onClick={handlePrevious}
                variant="outline"
                disabled={currentPage === 0}
                data-testid="button-previous"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Previous
              </Button>
              <Button
                onClick={handleNext}
                disabled={!canProceed}
                data-testid="button-next"
              >
                {currentPage === totalPages - 1 ? "View Results" : "Next"}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

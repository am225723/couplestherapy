import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Loader2,
  Heart,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Users,
  Sparkles,
} from "lucide-react";
import type { LoveMapQuestion, LoveMapSession } from "@shared/schema";

type Phase = "truths" | "guesses" | "results";

interface TruthAnswers {
  [questionId: string]: string;
}

interface GuessAnswers {
  [questionId: string]: string;
}

interface ComparisonResult {
  question_id: string;
  question_text: string;
  category: string | null;
  my_answer: string | null;
  partner_answer: string | null;
  my_guess: string | null;
  partner_guess: string | null;
  my_guess_correct: boolean;
  partner_guess_correct: boolean;
}

interface ResultsData {
  session: LoveMapSession;
  results: ComparisonResult[];
  my_score: string | null;
  partner_score: string | null;
}

export default function LoveMapQuiz() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [currentPhase, setCurrentPhase] = useState<Phase>("truths");
  const [truthAnswers, setTruthAnswers] = useState<TruthAnswers>({});
  const [guessAnswers, setGuessAnswers] = useState<GuessAnswers>({});
  const [pageByPhase, setPageByPhase] = useState<Record<Phase, number>>({
    truths: 0,
    guesses: 0,
    results: 0,
  });
  const QUESTIONS_PER_PAGE = 10;

  // Get current page for active phase
  const currentPage = pageByPhase[currentPhase];

  // Fetch questions
  const { data: questions, isLoading: questionsLoading } = useQuery<
    LoveMapQuestion[]
  >({
    queryKey: ["/api/love-map/questions"],
    enabled: !!user,
  });

  // Fetch or create session
  const { data: session, isLoading: sessionLoading } = useQuery<LoveMapSession>(
    {
      queryKey: ["/api/love-map/session", profile?.couple_id],
      queryFn: async () => {
        const response = await fetch(
          `/api/love-map/session/${profile?.couple_id}`,
        );
        if (!response.ok) throw new Error("Failed to get session");
        return response.json();
      },
      enabled: !!profile?.couple_id,
    },
  );

  // Fetch results when both partners complete both phases
  const { data: resultsData, isLoading: resultsLoading } =
    useQuery<ResultsData>({
      queryKey: ["/api/love-map/results", session?.id],
      queryFn: async () => {
        const response = await fetch(`/api/love-map/results/${session?.id}`);
        if (!response.ok) throw new Error("Failed to get results");
        return response.json();
      },
      enabled: !!session?.id && currentPhase === "results",
    });

  // Determine which partner the current user is (need to fetch couple to determine partner1_id vs partner2_id)
  // For now, we'll use a heuristic based on completion status
  const [isPartner1, setIsPartner1] = useState<boolean | null>(null);

  // Determine which partner number based on who has completed what
  useEffect(() => {
    if (!session || !user) return;

    // Fetch the couple to determine which partner this user is
    const fetchCoupleInfo = async () => {
      const { data } = await supabase
        .from("Couples_couples")
        .select("partner1_id, partner2_id")
        .eq("id", session.couple_id)
        .single();

      if (data) {
        setIsPartner1(data.partner1_id === user.id);
      }
    };

    fetchCoupleInfo();
  }, [session, user]);

  // Calculate phase based on session status
  useEffect(() => {
    if (!session || !user) return;

    // Determine if current user completed truths and guesses
    const myTruthsCompleted = isPartner1
      ? session.partner1_truths_completed
      : session.partner2_truths_completed;
    const myGuessesCompleted = isPartner1
      ? session.partner1_guesses_completed
      : session.partner2_guesses_completed;

    const partnerTruthsCompleted = isPartner1
      ? session.partner2_truths_completed
      : session.partner1_truths_completed;
    const partnerGuessesCompleted = isPartner1
      ? session.partner2_guesses_completed
      : session.partner1_guesses_completed;

    // Determine current phase
    if (!myTruthsCompleted) {
      setCurrentPhase("truths");
    } else if (!partnerTruthsCompleted) {
      // Partner hasn't completed truths yet
      setCurrentPhase("truths"); // Show completion message
    } else if (!myGuessesCompleted) {
      setCurrentPhase("guesses");
    } else if (!partnerGuessesCompleted) {
      // Partner hasn't completed guesses yet
      setCurrentPhase("guesses"); // Show completion message
    } else {
      setCurrentPhase("results");
    }
  }, [session, user, isPartner1]);

  // Get questions for current phase with phase-specific filtering
  const phaseQuestions = useMemo(() => {
    if (currentPhase === "truths") {
      // Truths phase: All questions
      return questions || [];
    } else if (currentPhase === "guesses") {
      // Guesses phase: Only show questions if partner has completed truths
      const partnerTruthsCompleted = isPartner1
        ? session?.partner2_truths_completed
        : session?.partner1_truths_completed;

      if (!partnerTruthsCompleted || !questions) {
        return []; // Partner hasn't completed truths yet
      }
      return questions;
    } else if (currentPhase === "results") {
      // Results phase: Use comparison results array
      return resultsData?.results || [];
    }
    return [];
  }, [currentPhase, questions, session, isPartner1, resultsData]);

  // Clamp page number when dataset shrinks
  useEffect(() => {
    const maxPage =
      phaseQuestions.length > 0
        ? Math.ceil(phaseQuestions.length / QUESTIONS_PER_PAGE) - 1
        : 0;
    if (currentPage > maxPage) {
      setPageByPhase((prev) => ({ ...prev, [currentPhase]: maxPage }));
    }
  }, [phaseQuestions.length, currentPage, currentPhase, QUESTIONS_PER_PAGE]);

  // Calculate paginated questions for current phase
  const getCurrentPageQuestions = () => {
    const startIndex = currentPage * QUESTIONS_PER_PAGE;
    const endIndex = startIndex + QUESTIONS_PER_PAGE;
    return phaseQuestions.slice(startIndex, endIndex);
  };

  // Calculate pagination bounds per phase
  const totalPages =
    phaseQuestions.length > 0
      ? Math.ceil(phaseQuestions.length / QUESTIONS_PER_PAGE)
      : 0;
  const isLastPage = currentPage === totalPages - 1;
  const isFirstPage = currentPage === 0;

  // Submit truths mutation
  const submitTruthsMutation = useMutation({
    mutationFn: async (truths: TruthAnswers) => {
      const truthsArray = Object.entries(truths).map(
        ([question_id, answer_text]) => ({
          question_id,
          answer_text,
        }),
      );

      return apiRequest("POST", "/api/love-map/truths", {
        session_id: session?.id,
        truths: truthsArray,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/love-map/session"] });
      toast({
        title: "Answers Saved!",
        description:
          "Your self-reflections have been saved. Waiting for your partner to complete theirs.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save answers",
        variant: "destructive",
      });
    },
  });

  // Submit guesses mutation
  const submitGuessesMutation = useMutation({
    mutationFn: async (guesses: GuessAnswers) => {
      const guessesArray = Object.entries(guesses).map(
        ([question_id, guess_text]) => ({
          question_id,
          guess_text,
        }),
      );

      return apiRequest("POST", "/api/love-map/guesses", {
        session_id: session?.id,
        guesses: guessesArray,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/love-map/session"] });
      toast({
        title: "Guesses Submitted!",
        description:
          "Your guesses have been saved. Check back to see how well you know each other!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save guesses",
        variant: "destructive",
      });
    },
  });

  const handleTruthsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      phaseQuestions.length === 0 ||
      Object.keys(truthAnswers).length !== phaseQuestions.length
    ) {
      toast({
        title: "Incomplete",
        description: "Please answer all questions before submitting.",
        variant: "destructive",
      });
      return;
    }
    submitTruthsMutation.mutate(truthAnswers);
  };

  const handleGuessesSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      phaseQuestions.length === 0 ||
      Object.keys(guessAnswers).length !== phaseQuestions.length
    ) {
      toast({
        title: "Incomplete",
        description: "Please answer all questions before submitting.",
        variant: "destructive",
      });
      return;
    }
    submitGuessesMutation.mutate(guessAnswers);
  };

  if (questionsLoading || sessionLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2
          className="h-8 w-8 animate-spin text-primary"
          data-testid="loader-page"
        />
      </div>
    );
  }

  if (!questions || questions.length === 0) {
    return (
      <div className="min-h-screen bg-background py-12 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <AlertCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">No Questions Available</h2>
          <p className="text-muted-foreground">
            Please contact your therapist to set up the Love Map Quiz.
          </p>
        </div>
      </div>
    );
  }

  // Check completion status
  const myTruthsCompleted =
    session &&
    (isPartner1
      ? session.partner1_truths_completed
      : session.partner2_truths_completed);
  const partnerTruthsCompleted =
    session &&
    (isPartner1
      ? session.partner2_truths_completed
      : session.partner1_truths_completed);
  const myGuessesCompleted =
    session &&
    (isPartner1
      ? session.partner1_guesses_completed
      : session.partner2_guesses_completed);
  const partnerGuessesCompleted =
    session &&
    (isPartner1
      ? session.partner2_guesses_completed
      : session.partner1_guesses_completed);

  const progress = [
    { label: "Share About Yourself", completed: myTruthsCompleted },
    { label: "Guess About Partner", completed: myGuessesCompleted },
    {
      label: "View Results",
      completed: myGuessesCompleted && partnerGuessesCompleted,
    },
  ];

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Heart
              className="h-8 w-8 text-primary"
              data-testid="icon-love-map-header"
            />
            <h1 className="text-4xl font-bold">Love Map Quiz</h1>
          </div>
          <p className="text-muted-foreground">
            Based on Dr. Gottman's research - How well do you know your partner?
          </p>
        </div>

        {/* Progress Indicator */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              {progress.map((step, index) => (
                <div key={index} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center mb-2 ${
                        step.completed
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                      data-testid={`progress-step-${index}`}
                    >
                      {step.completed ? (
                        <CheckCircle2 className="h-5 w-5" />
                      ) : (
                        <span>{index + 1}</span>
                      )}
                    </div>
                    <span className="text-xs text-center text-muted-foreground">
                      {step.label}
                    </span>
                  </div>
                  {index < progress.length - 1 && (
                    <div className="h-0.5 flex-1 bg-muted" />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Phase 1: Share About Yourself (Truths) */}
        {currentPhase === "truths" && !myTruthsCompleted && (
          <form onSubmit={handleTruthsSubmit}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Phase 1: Share About Yourself
                </CardTitle>
                <CardDescription>
                  Answer these questions about yourself honestly. Your partner
                  will try to guess your answers!
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Page {currentPage + 1} of {totalPages} •{" "}
                    {Object.keys(truthAnswers).length} of{" "}
                    {phaseQuestions.length} answered
                  </p>
                  <Badge variant="outline" data-testid="badge-question-page">
                    Questions {currentPage * QUESTIONS_PER_PAGE + 1}-
                    {Math.min(
                      (currentPage + 1) * QUESTIONS_PER_PAGE,
                      phaseQuestions.length,
                    )}
                  </Badge>
                </div>

                {getCurrentPageQuestions().map((question, index) => {
                  const globalIndex = currentPage * QUESTIONS_PER_PAGE + index;
                  return (
                    <div key={question.id} className="space-y-2">
                      <Label
                        htmlFor={`truth-${question.id}`}
                        className="text-base"
                      >
                        {globalIndex + 1}. {question.question_text}
                        {question.category && (
                          <Badge
                            variant="secondary"
                            className="ml-2"
                            data-testid={`badge-category-${globalIndex}`}
                          >
                            {question.category}
                          </Badge>
                        )}
                      </Label>
                      <Textarea
                        id={`truth-${question.id}`}
                        data-testid={`textarea-truth-${globalIndex}`}
                        placeholder="Your answer..."
                        value={truthAnswers[question.id] || ""}
                        onChange={(e) =>
                          setTruthAnswers({
                            ...truthAnswers,
                            [question.id]: e.target.value,
                          })
                        }
                        className="min-h-20 resize-none"
                        required
                      />
                    </div>
                  );
                })}

                <div className="flex items-center justify-between gap-4 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      setPageByPhase((prev) => ({
                        ...prev,
                        [currentPhase]: prev[currentPhase] - 1,
                      }))
                    }
                    disabled={isFirstPage}
                    data-testid="button-prev-page"
                  >
                    Previous
                  </Button>

                  {!isLastPage ? (
                    <Button
                      type="button"
                      onClick={() =>
                        setPageByPhase((prev) => ({
                          ...prev,
                          [currentPhase]: prev[currentPhase] + 1,
                        }))
                      }
                      data-testid="button-next-page"
                    >
                      Next Page
                    </Button>
                  ) : (
                    <Button
                      type="submit"
                      disabled={submitTruthsMutation.isPending}
                      data-testid="button-submit-truths"
                    >
                      {submitTruthsMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        "Submit Your Answers"
                      )}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </form>
        )}

        {/* Waiting for Partner to Complete Truths */}
        {currentPhase === "truths" &&
          myTruthsCompleted &&
          !partnerTruthsCompleted && (
            <Alert className="border-primary/20 bg-primary/5">
              <Users className="h-4 w-4 text-primary" />
              <AlertDescription>
                <p className="font-semibold mb-1">
                  Great job completing Phase 1!
                </p>
                <p className="text-sm">
                  Waiting for your partner to share their answers. You'll be
                  notified when they're ready so you can move to Phase 2.
                </p>
              </AlertDescription>
            </Alert>
          )}

        {/* Phase 2: Guess About Your Partner */}
        {currentPhase === "guesses" &&
          partnerTruthsCompleted &&
          !myGuessesCompleted && (
            <form onSubmit={handleGuessesSubmit}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    Phase 2: Guess About Your Partner
                  </CardTitle>
                  <CardDescription>
                    Your partner has shared their answers. Now guess what they
                    said!
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="mb-4 flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      Page {currentPage + 1} of {totalPages} •{" "}
                      {Object.keys(guessAnswers).length} of{" "}
                      {phaseQuestions.length} answered
                    </p>
                    <Badge variant="outline" data-testid="badge-guess-page">
                      Questions {currentPage * QUESTIONS_PER_PAGE + 1}-
                      {Math.min(
                        (currentPage + 1) * QUESTIONS_PER_PAGE,
                        phaseQuestions.length,
                      )}
                    </Badge>
                  </div>

                  {getCurrentPageQuestions().map((question, index) => {
                    const globalIndex =
                      currentPage * QUESTIONS_PER_PAGE + index;
                    return (
                      <div key={question.id} className="space-y-2">
                        <Label
                          htmlFor={`guess-${question.id}`}
                          className="text-base"
                        >
                          {globalIndex + 1}. {question.question_text}
                          {question.category && (
                            <Badge
                              variant="secondary"
                              className="ml-2"
                              data-testid={`badge-guess-category-${globalIndex}`}
                            >
                              {question.category}
                            </Badge>
                          )}
                        </Label>
                        <Textarea
                          id={`guess-${question.id}`}
                          data-testid={`textarea-guess-${globalIndex}`}
                          placeholder="What did your partner say?"
                          value={guessAnswers[question.id] || ""}
                          onChange={(e) =>
                            setGuessAnswers({
                              ...guessAnswers,
                              [question.id]: e.target.value,
                            })
                          }
                          className="min-h-20 resize-none"
                          required
                        />
                      </div>
                    );
                  })}

                  <div className="flex items-center justify-between gap-4 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() =>
                        setPageByPhase((prev) => ({
                          ...prev,
                          [currentPhase]: prev[currentPhase] - 1,
                        }))
                      }
                      disabled={isFirstPage}
                      data-testid="button-guess-prev-page"
                    >
                      Previous
                    </Button>

                    {!isLastPage ? (
                      <Button
                        type="button"
                        onClick={() =>
                          setPageByPhase((prev) => ({
                            ...prev,
                            [currentPhase]: prev[currentPhase] + 1,
                          }))
                        }
                        data-testid="button-guess-next-page"
                      >
                        Next Page
                      </Button>
                    ) : (
                      <Button
                        type="submit"
                        disabled={submitGuessesMutation.isPending}
                        data-testid="button-submit-guesses"
                      >
                        {submitGuessesMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          "Submit Your Guesses"
                        )}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </form>
          )}

        {/* Waiting for Partner to Complete Guesses */}
        {currentPhase === "guesses" &&
          myGuessesCompleted &&
          !partnerGuessesCompleted && (
            <Alert className="border-primary/20 bg-primary/5">
              <Users className="h-4 w-4 text-primary" />
              <AlertDescription>
                <p className="font-semibold mb-1">Phase 2 complete!</p>
                <p className="text-sm">
                  Waiting for your partner to finish their guesses. Once they're
                  done, you'll both be able to see the results and compare your
                  answers!
                </p>
              </AlertDescription>
            </Alert>
          )}

        {/* Phase 3: Reveal & Compare Results */}
        {currentPhase === "results" && resultsData && (
          <div className="space-y-6">
            {/* Score Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Your Score</CardTitle>
                  <CardDescription>
                    How well you know your partner
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div
                    className="text-4xl font-bold text-primary"
                    data-testid="text-my-score"
                  >
                    {resultsData.my_score
                      ? `${parseFloat(resultsData.my_score).toFixed(0)}%`
                      : "N/A"}
                  </div>
                  <Progress
                    value={
                      resultsData.my_score
                        ? parseFloat(resultsData.my_score)
                        : 0
                    }
                    className="mt-2"
                    data-testid="progress-my-score"
                  />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Partner's Score</CardTitle>
                  <CardDescription>
                    How well your partner knows you
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div
                    className="text-4xl font-bold text-primary"
                    data-testid="text-partner-score"
                  >
                    {resultsData.partner_score
                      ? `${parseFloat(resultsData.partner_score).toFixed(0)}%`
                      : "N/A"}
                  </div>
                  <Progress
                    value={
                      resultsData.partner_score
                        ? parseFloat(resultsData.partner_score)
                        : 0
                    }
                    className="mt-2"
                    data-testid="progress-partner-score"
                  />
                </CardContent>
              </Card>
            </div>

            {/* Comparison Results */}
            <Card>
              <CardHeader>
                <CardTitle>Detailed Comparison</CardTitle>
                <CardDescription>
                  See how your answers and guesses matched up
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {resultsData.results.map((result, index) => (
                  <div
                    key={result.question_id}
                    className="space-y-4 border-b pb-4 last:border-b-0"
                    data-testid={`result-item-${index}`}
                  >
                    <div className="font-semibold">
                      {index + 1}. {result.question_text}
                    </div>

                    {/* My Answer vs Partner's Guess */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label className="text-sm text-muted-foreground">
                          Your Answer
                        </Label>
                        <p
                          className="text-sm p-3 bg-muted rounded-md"
                          data-testid={`text-my-answer-${index}`}
                        >
                          {result.my_answer || "Not answered"}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-sm text-muted-foreground flex items-center gap-2">
                          Partner's Guess
                          {result.partner_guess_correct ? (
                            <CheckCircle2
                              className="h-4 w-4 text-green-600"
                              data-testid={`icon-partner-correct-${index}`}
                            />
                          ) : (
                            <XCircle
                              className="h-4 w-4 text-red-600"
                              data-testid={`icon-partner-incorrect-${index}`}
                            />
                          )}
                        </Label>
                        <p
                          className="text-sm p-3 bg-muted rounded-md"
                          data-testid={`text-partner-guess-${index}`}
                        >
                          {result.partner_guess || "Not guessed"}
                        </p>
                      </div>
                    </div>

                    {/* Partner's Answer vs My Guess */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label className="text-sm text-muted-foreground">
                          Partner's Answer
                        </Label>
                        <p
                          className="text-sm p-3 bg-muted rounded-md"
                          data-testid={`text-partner-answer-${index}`}
                        >
                          {result.partner_answer || "Not answered"}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-sm text-muted-foreground flex items-center gap-2">
                          Your Guess
                          {result.my_guess_correct ? (
                            <CheckCircle2
                              className="h-4 w-4 text-green-600"
                              data-testid={`icon-my-correct-${index}`}
                            />
                          ) : (
                            <XCircle
                              className="h-4 w-4 text-red-600"
                              data-testid={`icon-my-incorrect-${index}`}
                            />
                          )}
                        </Label>
                        <p
                          className="text-sm p-3 bg-muted rounded-md"
                          data-testid={`text-my-guess-${index}`}
                        >
                          {result.my_guess || "Not guessed"}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Insight Card */}
            <Alert className="border-primary/20 bg-primary/5">
              <Heart className="h-4 w-4 text-primary" />
              <AlertDescription>
                <p className="font-semibold mb-2">
                  Understanding Your Love Map
                </p>
                <p className="text-sm">
                  The Love Map represents the space in your heart and mind where
                  you store all the relevant information about your partner's
                  life. Couples who have detailed Love Maps of each other's
                  worlds are better prepared to cope with stressful events and
                  conflict.
                </p>
                <p className="text-sm mt-2">
                  Continue updating your Love Map by staying curious about your
                  partner's inner world!
                </p>
              </AlertDescription>
            </Alert>
          </div>
        )}
      </div>
    </div>
  );
}

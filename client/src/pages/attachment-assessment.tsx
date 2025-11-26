import { useState } from "react";
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
import { Heart, ArrowLeft, ArrowRight, Check } from "lucide-react";
import {
  attachmentQuestions,
  calculateAttachmentStyle,
} from "@/data/attachmentQuestions";

const QUESTIONS_PER_PAGE = 5;

export default function AttachmentAssessmentPage() {
  const [currentPage, setCurrentPage] = useState(0);
  const [responses, setResponses] = useState<{ [key: number]: number }>({});
  const [showResults, setShowResults] = useState(false);

  const totalPages = Math.ceil(attachmentQuestions.length / QUESTIONS_PER_PAGE);
  const currentQuestions = attachmentQuestions.slice(
    currentPage * QUESTIONS_PER_PAGE,
    (currentPage + 1) * QUESTIONS_PER_PAGE,
  );

  const progress =
    (Object.keys(responses).length / attachmentQuestions.length) * 100;

  const handleResponse = (questionId: number, value: number) => {
    setResponses((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleNext = () => {
    if (currentPage < totalPages - 1) {
      setCurrentPage((prev) => prev + 1);
    } else if (Object.keys(responses).length === attachmentQuestions.length) {
      setShowResults(true);
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

  if (showResults) {
    const { primaryStyle, scores } = calculateAttachmentStyle(responses);

    const styleDescriptions = {
      secure: {
        title: "Secure Attachment",
        description:
          "You feel comfortable with emotional intimacy and can depend on others while maintaining your independence. You trust easily and don't worry excessively about relationships.",
        strengths: [
          "Comfortable with closeness",
          "Trusting and dependable",
          "Emotionally expressive",
          "Good at conflict resolution",
        ],
        growthAreas: [
          "Continue building healthy relationship skills",
          "Model secure attachment for your partner",
        ],
      },
      anxious: {
        title: "Anxious Attachment",
        description:
          "You desire close relationships but may worry about whether your partner truly cares about you. You might seek more intimacy than your partner is comfortable with.",
        strengths: [
          "Highly attuned to relationship dynamics",
          "Values emotional connection",
          "Expressive with feelings",
          "Committed to relationships",
        ],
        growthAreas: [
          "Practice self-soothing when anxious",
          "Build trust in your partner's commitment",
          "Develop independence within the relationship",
        ],
      },
      avoidant: {
        title: "Avoidant Attachment",
        description:
          "You value independence and may feel uncomfortable with too much emotional closeness. You might prefer keeping some emotional distance in relationships.",
        strengths: [
          "Self-reliant and independent",
          "Comfortable with alone time",
          "Maintains boundaries",
          "Problem-solver",
        ],
        growthAreas: [
          "Practice vulnerability with your partner",
          "Challenge beliefs about dependence",
          "Express emotions more openly",
        ],
      },
      disorganized: {
        title: "Disorganized Attachment",
        description:
          "You may experience conflicting desires for closeness and independence. Relationships can feel confusing, wanting intimacy while also feeling the need to pull away.",
        strengths: [
          "Aware of complexity in relationships",
          "Resilient despite challenges",
          "Capable of deep reflection",
        ],
        growthAreas: [
          "Develop consistent relationship patterns",
          "Work on emotional regulation",
          "Consider therapy for attachment healing",
        ],
      },
    };

    const info = styleDescriptions[primaryStyle];

    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto py-12 space-y-6">
          <Card data-testid="card-results">
            <CardHeader>
              <div className="flex items-center gap-3 mb-4">
                <Heart className="h-10 w-10 text-primary" />
                <div>
                  <CardTitle className="text-3xl">
                    Your Attachment Style
                  </CardTitle>
                  <CardDescription className="text-lg">
                    Understanding your relationship patterns
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3
                  className="text-2xl font-semibold mb-2"
                  data-testid="text-primary-style"
                >
                  {info.title}
                </h3>
                <p className="text-muted-foreground text-lg">
                  {info.description}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Your Scores</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {Object.entries(scores).map(([style, score]) => (
                      <div key={style} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="capitalize font-medium">
                            {style}
                          </span>
                          <span data-testid={`score-${style}`}>{score}%</span>
                        </div>
                        <Progress value={score} className="h-2" />
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <div className="space-y-4">
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
                        {info.growthAreas.map((area, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-primary mt-1">•</span>
                            <span>{area}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </div>
              </div>

              <Card className="bg-primary/5 border-primary/20">
                <CardHeader>
                  <CardTitle className="text-lg">
                    For Your Relationship
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">
                    Understanding your attachment style is the first step toward
                    healthier relationship patterns. Consider sharing these
                    results with your partner and discussing how your styles
                    interact. Your therapist can help you work together on
                    building secure attachment.
                  </p>
                </CardContent>
              </Card>

              <div className="flex justify-center">
                <Button
                  onClick={() => {
                    setShowResults(false);
                    setCurrentPage(0);
                    setResponses({});
                  }}
                  size="lg"
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
      <div className="max-w-4xl mx-auto py-12">
        <Card data-testid="card-assessment">
          <CardHeader>
            <div className="flex items-center gap-3 mb-4">
              <Heart className="h-8 w-8 text-primary" />
              <div>
                <CardTitle className="text-2xl">
                  Attachment Style Assessment
                </CardTitle>
                <CardDescription className="text-base">
                  Discover your attachment patterns and how they influence your
                  relationships
                </CardDescription>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm font-medium">
                <span data-testid="text-page-progress">
                  Page {currentPage + 1} of {totalPages}
                </span>
                <span data-testid="text-completion-progress">
                  {Object.keys(responses).length} / {attachmentQuestions.length}{" "}
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
                          {value === 1 && "Strongly Disagree"}
                          {value === 2 && "Disagree"}
                          {value === 3 && "Neutral"}
                          {value === 4 && "Agree"}
                          {value === 5 && "Strongly Agree"}
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

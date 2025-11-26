import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  quizQuestions,
  calculateLoveLanguageScores,
} from "@/lib/love-language-quiz";
import { LoveLanguageType } from "@shared/schema";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { Heart, Loader2 } from "lucide-react";

export default function LoveLanguageQuiz() {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<LoveLanguageType[]>([]);
  const [saving, setSaving] = useState(false);
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();

  const handleAnswer = (language: LoveLanguageType) => {
    const newAnswers = [...answers, language];
    setAnswers(newAnswers);

    if (currentQuestion < quizQuestions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      saveResults(newAnswers);
    }
  };

  const saveResults = async (finalAnswers: LoveLanguageType[]) => {
    if (!user) return;

    setSaving(true);
    const { scores, primary, secondary } =
      calculateLoveLanguageScores(finalAnswers);

    try {
      const { error } = await supabase.from("Couples_love_languages").insert({
        user_id: user.id,
        primary_language: primary,
        secondary_language: secondary,
        scores,
      });

      if (error) throw error;

      toast({
        title: "Quiz Complete!",
        description: `Your primary love language is ${primary}`,
      });

      navigate("/dashboard");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const question = quizQuestions[currentQuestion];
  const progress = ((currentQuestion + 1) / quizQuestions.length) * 100;

  if (saving) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="pt-12 pb-12 text-center">
            <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-lg font-medium">
              Calculating your love language...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background to-accent/10">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Heart className="h-6 w-6 text-primary" />
              <CardTitle>Discover Your Love Language</CardTitle>
            </div>
            <span className="text-sm text-muted-foreground">
              {currentQuestion + 1} / {quizQuestions.length}
            </span>
          </div>
          <Progress value={progress} className="h-2" />
          <CardDescription className="mt-4">
            Choose the statement that best describes how you prefer to give and
            receive love
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <Button
              variant="outline"
              className="w-full h-auto py-6 px-6 text-left justify-start hover-elevate active-elevate-2"
              onClick={() => handleAnswer(question.optionA.language)}
              data-testid={`button-option-a-${currentQuestion}`}
            >
              <span className="text-base">{question.optionA.text}</span>
            </Button>
            <Button
              variant="outline"
              className="w-full h-auto py-6 px-6 text-left justify-start hover-elevate active-elevate-2"
              onClick={() => handleAnswer(question.optionB.language)}
              data-testid={`button-option-b-${currentQuestion}`}
            >
              <span className="text-base">{question.optionB.text}</span>
            </Button>
          </div>
          {currentQuestion > 0 && (
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => {
                setCurrentQuestion(currentQuestion - 1);
                setAnswers(answers.slice(0, -1));
              }}
              data-testid="button-previous"
            >
              Previous Question
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

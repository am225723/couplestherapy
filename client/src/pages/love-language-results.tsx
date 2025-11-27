import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import { LoveLanguageType, LoveLanguage } from "@shared/schema";
import {
  Heart,
  MessageCircle,
  Clock,
  Gift,
  HandHeart,
  Sparkles,
  ArrowLeft,
  RefreshCw,
  Loader2,
  CheckCircle2,
  Lightbulb,
} from "lucide-react";

const loveLanguageDetails: Record<
  LoveLanguageType,
  {
    icon: typeof Heart;
    color: string;
    description: string;
    howToGive: string[];
    activities: string[];
  }
> = {
  "Words of Affirmation": {
    icon: MessageCircle,
    color: "text-blue-500",
    description:
      "You feel most loved when your partner expresses their feelings through verbal compliments, words of appreciation, and encouragement. Hearing 'I love you' and receiving genuine praise makes you feel valued and connected.",
    howToGive: [
      "Write love notes and leave them in unexpected places",
      "Send encouraging text messages throughout the day",
      "Verbally express appreciation for specific things they do",
      "Offer genuine compliments about their character and achievements",
      "Say 'I love you' regularly and meaningfully",
    ],
    activities: [
      "Write each other love letters to read aloud",
      "Create a jar of affirmations to read together weekly",
      "Record voice messages expressing what you love about each other",
      "Share three specific things you appreciate about your partner daily",
      "Write a heartfelt poem or song for each other",
    ],
  },
  "Quality Time": {
    icon: Clock,
    color: "text-green-500",
    description:
      "You feel most loved when your partner gives you undivided attention. Having meaningful conversations, sharing experiences together, and being fully present matters more to you than any gift or act of service.",
    howToGive: [
      "Put away phones and devices during time together",
      "Plan regular date nights with no distractions",
      "Engage in meaningful conversations about feelings and dreams",
      "Participate in activities you both enjoy together",
      "Make eye contact and actively listen when talking",
    ],
    activities: [
      "Take a weekly walk together without phones",
      "Cook a meal together from start to finish",
      "Start a hobby or class you can learn together",
      "Create a weekly 'us time' ritual (coffee dates, sunset watching)",
      "Plan a tech-free evening once a week",
    ],
  },
  "Receiving Gifts": {
    icon: Gift,
    color: "text-purple-500",
    description:
      "You feel most loved when your partner gives you thoughtful gifts that show they were thinking of you. The gift itself matters less than the thought and effort behind it - knowing someone thought of you makes you feel cherished.",
    howToGive: [
      "Pick up small gifts when you think of them",
      "Remember special occasions and celebrate meaningfully",
      "Pay attention to things they mention wanting",
      "Give 'just because' gifts to show you were thinking of them",
      "Put thought into gift wrapping and presentation",
    ],
    activities: [
      "Create a 'thinking of you' gift box for each other",
      "Make handmade gifts or crafts for one another",
      "Start a tradition of monthly 'just because' surprises",
      "Create a scrapbook of your relationship memories",
      "Plan a treasure hunt with meaningful small gifts",
    ],
  },
  "Acts of Service": {
    icon: HandHeart,
    color: "text-orange-500",
    description:
      "You feel most loved when your partner does helpful things for you. Actions speak louder than words - when they take care of tasks, ease your burden, or go out of their way to help, you feel truly loved and cared for.",
    howToGive: [
      "Take over a task they usually do without being asked",
      "Help with projects or responsibilities they're stressed about",
      "Make their morning routine easier (prepare coffee, pack lunch)",
      "Complete household chores before they need to ask",
      "Run errands or do tasks to ease their load",
    ],
    activities: [
      "Do a chore swap - each take over one of the other's tasks for a week",
      "Plan a 'pamper day' where you handle all responsibilities",
      "Create a 'honey-do' list and complete items together",
      "Meal prep together for the entire week",
      "Organize or clean a shared space as a team",
    ],
  },
  "Physical Touch": {
    icon: Heart,
    color: "text-red-500",
    description:
      "You feel most loved through physical affection. Hugs, kisses, holding hands, and intimate touch make you feel secure and connected. Physical presence and touch are your primary ways of feeling loved and giving love.",
    howToGive: [
      "Hold hands when walking or sitting together",
      "Give hugs and kisses regularly throughout the day",
      "Offer back rubs or massages",
      "Sit close together when relaxing",
      "Initiate physical affection without it leading to anything else",
    ],
    activities: [
      "Give each other massages once a week",
      "Dance together in the living room",
      "Practice couples yoga or stretching routines",
      "Create a cuddling routine (morning, evening, or both)",
      "Take baths together",
    ],
  },
};

export default function LoveLanguageResults() {
  const { user } = useAuth();
  const [, navigate] = useLocation();

  const { data: results, isLoading } = useQuery<LoveLanguage[]>({
    queryKey: ["/api/love-languages/user", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("Couples_love_languages")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1);

      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const latestResult = results?.[0];

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!latestResult) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <Heart className="h-12 w-12 mx-auto text-primary mb-4" />
            <CardTitle>No Results Yet</CardTitle>
            <CardDescription>
              Take the Love Language quiz to discover how you give and receive love.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full" data-testid="button-take-quiz">
              <Link href="/quiz">Take the Quiz</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const scores = latestResult.scores as Record<string, number>;
  const totalAnswers = Object.values(scores).reduce((a, b) => a + b, 0);
  const sortedLanguages = Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .map(([language, score]) => ({
      language: language as LoveLanguageType,
      score,
      percentage: Math.round((score / totalAnswers) * 100),
    }));

  const primaryLanguage = latestResult.primary_language as LoveLanguageType;
  const secondaryLanguage = latestResult.secondary_language as LoveLanguageType;
  const primaryDetails = loveLanguageDetails[primaryLanguage];
  const secondaryDetails = loveLanguageDetails[secondaryLanguage];

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gradient-to-br from-background to-accent/10">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            asChild
            className="gap-2"
            data-testid="button-back-dashboard"
          >
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Link>
          </Button>
          <Button
            variant="outline"
            asChild
            className="gap-2"
            data-testid="button-retake-quiz"
          >
            <Link href="/quiz">
              <RefreshCw className="h-4 w-4" />
              Retake Quiz
            </Link>
          </Button>
        </div>

        <Card className="overflow-hidden" data-testid="card-primary-result">
          <div className="bg-gradient-to-r from-primary/20 via-accent/20 to-secondary/20 p-6 md:p-8">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 rounded-full bg-background/80">
                <Heart className="h-8 w-8 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Your Primary Love Language</p>
                <h1 className="text-2xl md:text-3xl font-bold">{primaryLanguage}</h1>
              </div>
            </div>
            <p className="text-muted-foreground">{primaryDetails.description}</p>
          </div>
        </Card>

        <Card data-testid="card-score-breakdown">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Your Love Language Profile
            </CardTitle>
            <CardDescription>
              See how you scored across all five love languages
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {sortedLanguages.map(({ language, score, percentage }, index) => {
              const details = loveLanguageDetails[language];
              const Icon = details.icon;
              const isPrimary = index === 0;
              const isSecondary = index === 1;

              return (
                <div key={language} className="space-y-2" data-testid={`score-${language.toLowerCase().replace(/\s+/g, "-")}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className={`h-4 w-4 ${details.color}`} />
                      <span className="font-medium">{language}</span>
                      {isPrimary && (
                        <Badge variant="default" className="text-xs">Primary</Badge>
                      )}
                      {isSecondary && (
                        <Badge variant="secondary" className="text-xs">Secondary</Badge>
                      )}
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {score} ({percentage}%)
                    </span>
                  </div>
                  <Progress
                    value={percentage}
                    className={`h-3 ${isPrimary ? "bg-primary/20" : isSecondary ? "bg-secondary/20" : "bg-muted"}`}
                  />
                </div>
              );
            })}
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-6">
          <Card data-testid="card-primary-activities">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <primaryDetails.icon className={`h-5 w-5 ${primaryDetails.color}`} />
                {primaryLanguage} Activities
              </CardTitle>
              <CardDescription>
                Ways to practice your primary love language
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {primaryDetails.activities.map((activity, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                    <span className="text-sm">{activity}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card data-testid="card-secondary-activities">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <secondaryDetails.icon className={`h-5 w-5 ${secondaryDetails.color}`} />
                {secondaryLanguage} Activities
              </CardTitle>
              <CardDescription>
                Ways to practice your secondary love language
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {secondaryDetails.activities.map((activity, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                    <span className="text-sm">{activity}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        <Card data-testid="card-how-to-give">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-amber-500" />
              How to Love Your Partner
            </CardTitle>
            <CardDescription>
              Share this with your partner so they know how to best express love to you
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="font-semibold flex items-center gap-2 mb-3">
                <primaryDetails.icon className={`h-4 w-4 ${primaryDetails.color}`} />
                {primaryLanguage}
              </h3>
              <ul className="space-y-2">
                {primaryDetails.howToGive.map((tip, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="text-primary font-bold">-</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>

            <Separator />

            <div>
              <h3 className="font-semibold flex items-center gap-2 mb-3">
                <secondaryDetails.icon className={`h-4 w-4 ${secondaryDetails.color}`} />
                {secondaryLanguage}
              </h3>
              <ul className="space-y-2">
                {secondaryDetails.howToGive.map((tip, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="text-secondary font-bold">-</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-primary/5 border-primary/20" data-testid="card-couple-tip">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-full bg-primary/10">
                <Heart className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold mb-2">Strengthen Your Connection</h3>
                <p className="text-sm text-muted-foreground">
                  Understanding love languages is just the first step. Ask your partner to take
                  the quiz too, then compare your results on the{" "}
                  <Link href="/couple-compatibility" className="text-primary underline">
                    Couple Compatibility
                  </Link>{" "}
                  page to discover how to better love each other.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

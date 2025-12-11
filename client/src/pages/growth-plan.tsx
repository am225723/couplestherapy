import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth-context";
import { aiFunctions, GrowthPlanResponse, GrowthExercise, GrowthGoal } from "@/lib/ai-functions";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Loader2,
  AlertCircle,
  Sparkles,
  Target,
  Clock,
  Calendar,
  Heart,
  MessageCircle,
  Users,
  Flame,
  CheckCircle2,
  RefreshCw,
  ChevronRight,
  Zap,
} from "lucide-react";

const categoryIcons: Record<string, typeof Heart> = {
  communication: MessageCircle,
  intimacy: Heart,
  conflict: Flame,
  appreciation: Sparkles,
  goals: Target,
  trust: Users,
};

const categoryColors: Record<string, string> = {
  communication: "text-blue-500",
  intimacy: "text-pink-500",
  conflict: "text-orange-500",
  appreciation: "text-purple-500",
  goals: "text-green-500",
  trust: "text-teal-500",
};

const frequencyLabels: Record<string, string> = {
  daily: "Every day",
  weekly: "Once a week",
  "bi-weekly": "Every two weeks",
};

interface ProfileWithCouple {
  couple_id?: string;
  full_name?: string;
  [key: string]: any;
}

function ExerciseCard({ exercise }: { exercise: GrowthExercise }) {
  const Icon = categoryIcons[exercise.category] || Target;
  const colorClass = categoryColors[exercise.category] || "text-primary";

  return (
    <Card className="hover-elevate" data-testid={`card-exercise-${exercise.id}`}>
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <div className={`p-2 rounded-lg bg-muted ${colorClass}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <h3 className="font-semibold">{exercise.title}</h3>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  <Clock className="w-3 h-3 mr-1" />
                  {exercise.duration_minutes} min
                </Badge>
                <Badge variant="secondary" className="text-xs capitalize">
                  {frequencyLabels[exercise.frequency] || exercise.frequency}
                </Badge>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              {exercise.description}
            </p>
            {exercise.rationale && (
              <p className="text-xs text-muted-foreground mt-3 italic border-l-2 border-primary/30 pl-3">
                {exercise.rationale}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function GoalCard({ goal }: { goal: GrowthGoal }) {
  const Icon = categoryIcons[goal.category] || Target;
  const colorClass = categoryColors[goal.category] || "text-primary";
  const completedMilestones = 0;
  const progress = goal.milestones.length > 0 
    ? (completedMilestones / goal.milestones.length) * 100 
    : 0;

  return (
    <Card className="hover-elevate" data-testid={`card-goal-${goal.id}`}>
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <div className={`p-2 rounded-lg bg-muted ${colorClass}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <h3 className="font-semibold">{goal.title}</h3>
              <Badge variant="outline" className="text-xs">
                <Calendar className="w-3 h-3 mr-1" />
                {goal.target_date_weeks} weeks
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              {goal.description}
            </p>

            {goal.milestones.length > 0 && (
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-medium">
                    {completedMilestones}/{goal.milestones.length} milestones
                  </span>
                </div>
                <Progress value={progress} className="h-2" />
                <ul className="space-y-2 mt-3">
                  {goal.milestones.map((milestone, idx) => (
                    <li
                      key={idx}
                      className="flex items-center gap-2 text-sm"
                      data-testid={`milestone-${goal.id}-${idx}`}
                    >
                      <div className="w-5 h-5 rounded-full border-2 border-muted flex items-center justify-center">
                        <span className="text-xs text-muted-foreground">{idx + 1}</span>
                      </div>
                      <span className="text-muted-foreground">{milestone}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function GrowthPlanPage() {
  const { profile } = useAuth();
  const coupleId = (profile as ProfileWithCouple)?.couple_id;
  const [activeTab, setActiveTab] = useState("exercises");

  const growthPlanQuery = useQuery<GrowthPlanResponse>({
    queryKey: ["/api/growth-plan", coupleId],
    queryFn: () => aiFunctions.getGrowthPlan(),
    enabled: !!coupleId,
    staleTime: 1000 * 60 * 30,
    retry: 1,
  });

  const regenerateMutation = useMutation({
    mutationFn: () => aiFunctions.getGrowthPlan(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/growth-plan", coupleId] });
    },
  });

  if (!coupleId) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You need to be linked to a partner to access your growth plan.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (growthPlanQuery.isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Creating your personalized growth plan...</p>
          <p className="text-xs text-muted-foreground">This may take a moment</p>
        </div>
      </div>
    );
  }

  if (growthPlanQuery.isError) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to generate your growth plan. Please try again later.
          </AlertDescription>
        </Alert>
        <Button
          onClick={() => growthPlanQuery.refetch()}
          className="mt-4"
          data-testid="button-retry"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Try Again
        </Button>
      </div>
    );
  }

  const plan = growthPlanQuery.data;

  if (!plan) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No growth plan available. Click below to generate one.
          </AlertDescription>
        </Alert>
        <Button
          onClick={() => growthPlanQuery.refetch()}
          className="mt-4"
          data-testid="button-generate"
        >
          <Sparkles className="w-4 h-4 mr-2" />
          Generate Growth Plan
        </Button>
      </div>
    );
  }

  const context = plan.personalization_context;

  return (
    <div className="min-h-screen bg-background">
      <div className="relative h-56 overflow-hidden bg-gradient-to-br from-primary/20 via-accent/20 to-primary/10">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center space-y-3 px-4">
            <div className="flex items-center justify-center gap-3">
              <Zap className="h-10 w-10 text-primary" />
              <h1 className="text-4xl font-bold" data-testid="text-page-title">
                Relationship Growth Plan
              </h1>
            </div>
            <p className="text-lg text-muted-foreground max-w-2xl">
              Personalized exercises and goals to strengthen your connection
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6 -mt-8 space-y-6">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  Your Personalized Plan
                </CardTitle>
                <CardDescription className="mt-2">
                  {plan.plan_summary}
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => regenerateMutation.mutate()}
                disabled={regenerateMutation.isPending}
                data-testid="button-regenerate"
              >
                {regenerateMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                Regenerate
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <span className="text-sm text-muted-foreground mr-2">Focus areas:</span>
              {plan.focus_areas.map((area, idx) => (
                <Badge key={idx} variant="secondary">
                  {area}
                </Badge>
              ))}
            </div>

            {(context.love_languages || context.attachment_styles || context.enneagram_types) && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-xs text-muted-foreground mb-2">Based on your assessments:</p>
                <div className="flex flex-wrap gap-2">
                  {context.love_languages?.map((ll, idx) => (
                    <Badge key={`ll-${idx}`} variant="outline" className="text-xs">
                      <Heart className="w-3 h-3 mr-1 text-pink-500" />
                      {ll}
                    </Badge>
                  ))}
                  {context.attachment_styles?.map((as, idx) => (
                    <Badge key={`as-${idx}`} variant="outline" className="text-xs">
                      <Users className="w-3 h-3 mr-1 text-blue-500" />
                      {as}
                    </Badge>
                  ))}
                  {context.enneagram_types?.map((et, idx) => (
                    <Badge key={`et-${idx}`} variant="outline" className="text-xs">
                      <Target className="w-3 h-3 mr-1 text-purple-500" />
                      {et}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="exercises" data-testid="tab-exercises">
              <Clock className="w-4 h-4 mr-2" />
              Exercises ({plan.exercises.length})
            </TabsTrigger>
            <TabsTrigger value="goals" data-testid="tab-goals">
              <Target className="w-4 h-4 mr-2" />
              Goals ({plan.goals.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="exercises" className="mt-6">
            <div className="space-y-4">
              {plan.exercises.length === 0 ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    No exercises in your plan yet. Try regenerating.
                  </AlertDescription>
                </Alert>
              ) : (
                plan.exercises.map((exercise) => (
                  <ExerciseCard key={exercise.id} exercise={exercise} />
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="goals" className="mt-6">
            <div className="space-y-4">
              {plan.goals.length === 0 ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    No goals in your plan yet. Try regenerating.
                  </AlertDescription>
                </Alert>
              ) : (
                plan.goals.map((goal) => (
                  <GoalCard key={goal.id} goal={goal} />
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>

        <Card className="bg-muted/50">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground text-center">
              Generated on {new Date(plan.generated_at).toLocaleDateString()} at{" "}
              {new Date(plan.generated_at).toLocaleTimeString()}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  ArrowLeft,
  Calendar,
  TrendingUp,
  TrendingDown,
  Heart,
  AlertCircle,
} from "lucide-react";
import { Link } from "wouter";
import type { WeeklyCheckin } from "@shared/schema";
import { format } from "date-fns";

export default function CheckinHistory() {
  const { user, profile } = useAuth();

  const {
    data: checkins,
    isLoading,
    error,
  } = useQuery<WeeklyCheckin[]>({
    queryKey: ["weekly-checkins-history", profile?.couple_id],
    enabled: !!profile?.couple_id,
    queryFn: async () => {
      if (!profile?.couple_id) throw new Error("No couple ID");

      const { data, error } = await supabase
        .from("Couples_weekly_checkins")
        .select("*")
        .eq("couple_id", profile.couple_id)
        .order("year", { ascending: false })
        .order("week_number", { ascending: false });

      if (error) throw error;
      return data as WeeklyCheckin[];
    },
  });

  // Group check-ins by year and week
  const groupedCheckins = checkins?.reduce(
    (acc, checkin) => {
      const key = `${checkin.year}-W${checkin.week_number}`;
      if (!acc[key]) {
        acc[key] = {
          year: checkin.year,
          week: checkin.week_number,
          checkins: [],
        };
      }
      acc[key].checkins.push(checkin);
      return acc;
    },
    {} as Record<
      string,
      { year: number | null; week: number | null; checkins: WeeklyCheckin[] }
    >,
  );

  const weeks = groupedCheckins
    ? Object.values(groupedCheckins).sort((a, b) => {
        if (a.year !== b.year) return (b.year || 0) - (a.year || 0);
        return (b.week || 0) - (a.week || 0);
      })
    : [];

  const getConnectionTrend = (current: number, previous?: number) => {
    if (!previous) return null;
    if (current > previous) return "up";
    if (current < previous) return "down";
    return "same";
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background py-12 px-4">
        <div className="max-w-5xl mx-auto">
          <Skeleton className="h-12 w-64 mb-8" />
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-48 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <Link href="/dashboard">
            <Button
              variant="ghost"
              size="sm"
              className="mb-4"
              data-testid="button-back"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
          </Link>
          <div className="flex items-center gap-3 mb-2">
            <Calendar className="h-8 w-8 text-primary" />
            <h1 className="text-4xl font-bold">Check-In History</h1>
          </div>
          <p className="text-muted-foreground">
            Review your weekly reflections over time
          </p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Error loading check-in history. Please try again later.
            </AlertDescription>
          </Alert>
        )}

        {!error && (!checkins || checkins.length === 0) ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You haven't completed any weekly check-ins yet. Start your first
              check-in to track your progress over time.
            </AlertDescription>
          </Alert>
        ) : !error && checkins && checkins.length > 0 ? (
          <div className="space-y-6">
            {weeks.map((weekData, weekIndex) => {
              const myCheckin = weekData.checkins.find(
                (c) => c.user_id === user?.id,
              );
              const prevWeek = weeks[weekIndex + 1];
              const prevMyCheckin = prevWeek?.checkins.find(
                (c) => c.user_id === user?.id,
              );

              const connectionTrend =
                myCheckin && prevMyCheckin
                  ? getConnectionTrend(
                      myCheckin.q_connectedness || 0,
                      prevMyCheckin.q_connectedness,
                    )
                  : null;

              return (
                <Card
                  key={`${weekData.year}-${weekData.week}`}
                  data-testid={`card-week-${weekData.year}-${weekData.week}`}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          Week {weekData.week}, {weekData.year}
                          {connectionTrend === "up" && (
                            <Badge variant="default" className="gap-1">
                              <TrendingUp className="h-3 w-3" />
                              Improving
                            </Badge>
                          )}
                          {connectionTrend === "down" && (
                            <Badge variant="secondary" className="gap-1">
                              <TrendingDown className="h-3 w-3" />
                              Needs attention
                            </Badge>
                          )}
                        </CardTitle>
                        <CardDescription>
                          {myCheckin &&
                            format(
                              new Date(myCheckin.created_at!),
                              "MMMM d, yyyy",
                            )}
                        </CardDescription>
                      </div>
                      {myCheckin && (
                        <div className="flex gap-4 text-sm">
                          <div className="text-center">
                            <div className="text-muted-foreground mb-1">
                              Connection
                            </div>
                            <div className="text-2xl font-bold text-primary">
                              {myCheckin.q_connectedness}
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-muted-foreground mb-1">
                              Conflict
                            </div>
                            <div className="text-2xl font-bold text-secondary-foreground">
                              {myCheckin.q_conflict}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardHeader>

                  {myCheckin ? (
                    <CardContent className="space-y-6">
                      <div>
                        <h4 className="font-semibold mb-2 flex items-center gap-2">
                          <Heart className="h-4 w-4 text-primary" />
                          What I Appreciated
                        </h4>
                        <p
                          className="text-muted-foreground"
                          data-testid={`text-appreciation-${weekData.year}-${weekData.week}`}
                        >
                          {myCheckin.q_appreciation}
                        </p>
                      </div>

                      <div>
                        <h4 className="font-semibold mb-2">
                          Regrettable Incident
                        </h4>
                        <p
                          className="text-muted-foreground"
                          data-testid={`text-incident-${weekData.year}-${weekData.week}`}
                        >
                          {myCheckin.q_regrettable_incident}
                        </p>
                      </div>

                      <div>
                        <h4 className="font-semibold mb-2">What I Needed</h4>
                        <p
                          className="text-muted-foreground"
                          data-testid={`text-need-${weekData.year}-${weekData.week}`}
                        >
                          {myCheckin.q_my_need}
                        </p>
                      </div>
                    </CardContent>
                  ) : (
                    <CardContent>
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          You didn't complete a check-in this week.
                        </AlertDescription>
                      </Alert>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}

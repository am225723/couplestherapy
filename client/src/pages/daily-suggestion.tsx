import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { aiFunctions, PersonalizedTipResponse } from "@/lib/ai-functions";
import { format, subDays } from "date-fns";
import {
  Heart,
  MessageCircle,
  Sparkles,
  Gift,
  Smile,
  Loader2,
  CheckCircle2,
  RefreshCw,
  Calendar,
  Eye,
  Clock,
  Hand,
  Camera,
  PenTool,
  ThumbsUp,
  Compass,
  Trophy,
  Wind,
  Focus,
  HelpingHand,
  Wrench,
  HeartHandshake,
} from "lucide-react";

interface DailySuggestion {
  id: string;
  category: string;
  title: string;
  description: string;
  action_prompt: string | null;
  icon: string | null;
  is_active: boolean;
}

interface SuggestionHistory {
  id: string;
  couple_id: string;
  suggestion_id: string;
  shown_date: string;
  completed: boolean;
  suggestion?: DailySuggestion;
}


const iconMap: Record<string, typeof Heart> = {
  Heart,
  Clock,
  Hand,
  Ear: MessageCircle,
  MessageCircle,
  HeartHandshake,
  Eye,
  Gift,
  Sparkles,
  PenTool,
  Camera,
  ThumbsUp,
  Smile,
  Calendar,
  Compass,
  HelpingHand,
  Wrench,
  Trophy,
  Wind,
  Focus,
};

const categoryColors: Record<string, string> = {
  connection: "bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300",
  communication: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  intimacy: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
  gratitude: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  fun: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  support: "bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300",
  mindfulness: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300",
};

export default function DailySuggestion() {
  const { user, profile, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const coupleId = profile?.couple_id;

  const today = format(new Date(), "yyyy-MM-dd");

  const { data: todaySuggestion, isLoading: suggestionLoading, refetch } = useQuery<SuggestionHistory | null>({
    queryKey: ["/api/suggestion/today", coupleId],
    queryFn: async () => {
      if (!coupleId) return null;

      const { data: existing, error: existingError } = await supabase
        .from("Couples_suggestion_history")
        .select("*, suggestion:Couples_daily_suggestions(*)")
        .eq("couple_id", coupleId)
        .eq("shown_date", today)
        .single();

      if (existing && !existingError) {
        return {
          ...existing,
          suggestion: existing.suggestion as DailySuggestion,
        };
      }

      const sevenDaysAgo = format(subDays(new Date(), 7), "yyyy-MM-dd");
      const { data: recentShown } = await supabase
        .from("Couples_suggestion_history")
        .select("suggestion_id")
        .eq("couple_id", coupleId)
        .gte("shown_date", sevenDaysAgo);

      const recentIds = new Set(recentShown?.map((r) => r.suggestion_id) || []);

      const { data: allSuggestions, error: suggestionsError } = await supabase
        .from("Couples_daily_suggestions")
        .select("*")
        .eq("is_active", true);

      if (suggestionsError) throw suggestionsError;

      const suggestions = (allSuggestions || []).filter(
        (s) => !recentIds.has(s.id)
      );

      if (!suggestions || suggestions.length === 0) {
        const { data: anySuggestion } = await supabase
          .from("Couples_daily_suggestions")
          .select("*")
          .eq("is_active", true)
          .limit(1)
          .single();

        if (!anySuggestion) return null;

        const { data: newHistory, error: insertError } = await supabase
          .from("Couples_suggestion_history")
          .insert({
            id: crypto.randomUUID(),
            couple_id: coupleId,
            suggestion_id: anySuggestion.id,
            shown_date: today,
            completed: false,
          })
          .select("*, suggestion:Couples_daily_suggestions(*)")
          .single();

        if (insertError) throw insertError;
        return {
          ...newHistory,
          suggestion: newHistory.suggestion as DailySuggestion,
        };
      }

      const randomIndex = Math.floor(Math.random() * suggestions.length);
      const selectedSuggestion = suggestions[randomIndex];

      const { data: newHistory, error: insertError } = await supabase
        .from("Couples_suggestion_history")
        .insert({
          id: crypto.randomUUID(),
          couple_id: coupleId,
          suggestion_id: selectedSuggestion.id,
          shown_date: today,
          completed: false,
        })
        .select("*, suggestion:Couples_daily_suggestions(*)")
        .single();

      if (insertError) throw insertError;
      return {
        ...newHistory,
        suggestion: newHistory.suggestion as DailySuggestion,
      };
    },
    enabled: !!coupleId,
  });

  const { data: history, isLoading: historyLoading } = useQuery<SuggestionHistory[]>({
    queryKey: ["/api/suggestion/history", coupleId],
    queryFn: async () => {
      if (!coupleId) return [];
      const { data, error } = await supabase
        .from("Couples_suggestion_history")
        .select("*, suggestion:Couples_daily_suggestions(*)")
        .eq("couple_id", coupleId)
        .order("shown_date", { ascending: false })
        .limit(14);
      if (error) throw error;
      return (data || []).map((h) => ({
        ...h,
        suggestion: h.suggestion as DailySuggestion,
      }));
    },
    enabled: !!coupleId,
  });

  const { data: personalizedTip, isLoading: personalizedLoading, error: personalizedError } = useQuery<PersonalizedTipResponse>({
    queryKey: ["ai-personalized-daily-tip", coupleId],
    queryFn: () => aiFunctions.getPersonalizedDailyTip(),
    enabled: !!coupleId && !!user,
    retry: 1,
    staleTime: 1000 * 60 * 60, // 1 hour
  });

  const completeMutation = useMutation({
    mutationFn: async () => {
      if (!todaySuggestion) throw new Error("No suggestion to complete");
      const { error } = await supabase
        .from("Couples_suggestion_history")
        .update({ completed: true })
        .eq("id", todaySuggestion.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/suggestion/today"] });
      queryClient.invalidateQueries({ queryKey: ["/api/suggestion/history"] });
      queryClient.invalidateQueries({ queryKey: ["/api/daily-suggestion"] });
      toast({
        title: "Great job!",
        description: "You completed today's relationship suggestion.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to mark as complete. Please try again.",
        variant: "destructive",
      });
    },
  });

  if (authLoading || suggestionLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const suggestion = todaySuggestion?.suggestion;
  const IconComponent = suggestion?.icon ? iconMap[suggestion.icon] || Heart : Heart;

  return (
    <div className="container mx-auto py-8 px-4 max-w-2xl">
      <div className="space-y-6">
        {personalizedTip && personalizedTip.is_personalized && (
          <Card className="overflow-hidden border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-accent/10">
            <div className="h-2 bg-gradient-to-r from-primary to-accent" />
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <CardTitle>Your Personalized Daily Tip</CardTitle>
                </div>
                <Badge className={categoryColors[personalizedTip.category] || "bg-primary/10 text-primary"}>
                  {personalizedTip.category}
                </Badge>
              </div>
              <CardDescription className="flex items-center gap-2">
                <span>Based on your assessment results</span>
                {personalizedTip.assessment_summary && (
                  <span className="text-xs">
                    ({[
                      personalizedTip.assessment_summary.has_attachment && "Attachment",
                      personalizedTip.assessment_summary.has_enneagram && "Enneagram", 
                      personalizedTip.assessment_summary.has_love_language && "Love Language",
                    ].filter(Boolean).join(", ")})
                  </span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-full bg-primary/10">
                  <Heart className="h-8 w-8 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold mb-2" data-testid="text-personalized-title">
                    {personalizedTip.title}
                  </h3>
                  <p className="text-muted-foreground" data-testid="text-personalized-description">
                    {personalizedTip.description}
                  </p>
                </div>
              </div>

              {personalizedTip.action_prompt && (
                <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                  <p className="text-sm font-medium text-center">
                    {personalizedTip.action_prompt}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {personalizedLoading && (
          <Card className="overflow-hidden">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <CardTitle>Loading Your Personalized Tip...</CardTitle>
              </div>
            </CardHeader>
          </Card>
        )}

        <Card className="overflow-hidden">
          <div className={`h-2 ${categoryColors[suggestion?.category || "connection"]?.split(" ")[0] || "bg-primary"}`} />
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <CardTitle>Today's Relationship Suggestion</CardTitle>
              </div>
              {suggestion?.category && (
                <Badge className={categoryColors[suggestion.category]}>
                  {suggestion.category}
                </Badge>
              )}
            </div>
            <CardDescription>
              {format(new Date(), "EEEE, MMMM d, yyyy")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {suggestion ? (
              <>
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-full bg-primary/10">
                    <IconComponent className="h-8 w-8 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold mb-2" data-testid="text-suggestion-title">
                      {suggestion.title}
                    </h3>
                    <p className="text-muted-foreground" data-testid="text-suggestion-description">
                      {suggestion.description}
                    </p>
                  </div>
                </div>

                {suggestion.action_prompt && (
                  <div className="p-4 rounded-lg bg-muted/50 border">
                    <p className="text-sm font-medium text-center">
                      {suggestion.action_prompt}
                    </p>
                  </div>
                )}

                <div className="flex gap-3 justify-center pt-4">
                  {todaySuggestion?.completed ? (
                    <Button disabled className="gap-2" data-testid="button-completed">
                      <CheckCircle2 className="h-4 w-4" />
                      Completed
                    </Button>
                  ) : (
                    <Button
                      onClick={() => completeMutation.mutate()}
                      disabled={completeMutation.isPending}
                      className="gap-2"
                      data-testid="button-mark-complete"
                    >
                      {completeMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4" />
                      )}
                      Mark as Complete
                    </Button>
                  )}
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No suggestion available for today.</p>
                <Button onClick={() => refetch()} className="mt-4 gap-2" data-testid="button-refresh">
                  <RefreshCw className="h-4 w-4" />
                  Try Again
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Calendar className="h-5 w-5" />
              Recent Suggestions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {historyLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : history && history.length > 0 ? (
              <ScrollArea className="h-64">
                <div className="space-y-3">
                  {history.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                      data-testid={`history-item-${item.id}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${item.completed ? "bg-green-100 dark:bg-green-900" : "bg-muted"}`}>
                          {item.completed ? (
                            <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                          ) : (
                            <Clock className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-sm">
                            {item.suggestion?.title || "Unknown"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(item.shown_date), "MMM d, yyyy")}
                          </p>
                        </div>
                      </div>
                      {item.suggestion?.category && (
                        <Badge variant="outline" className="text-xs">
                          {item.suggestion.category}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <p className="text-center text-muted-foreground py-4">
                No suggestion history yet.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

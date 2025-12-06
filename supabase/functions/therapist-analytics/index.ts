import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { corsHeaders } from "../_shared/cors.ts";
import { verifyTherapistAuth, verifyCoupleExists } from "../_shared/auth.ts";

interface CoupleAnalytics {
  couple_id: string;
  partner1_name: string;
  partner2_name: string;
  last_activity_date: string | null;
  engagement_score: number;
  checkin_completion_rate: number;
  gratitude_count: number;
  goals_completed: number;
  goals_total: number;
  conversations_count: number;
  rituals_count: number;
  total_checkins: number;
  checkins_this_month: number;
  avg_connectedness: number;
  avg_conflict: number;
}

interface TherapistAnalytics {
  therapist_id: string;
  total_couples: number;
  active_couples: number;
  overall_checkin_rate: number;
  total_gratitude_logs: number;
  total_comments_given: number;
  couples: CoupleAnalytics[];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authResult = await verifyTherapistAuth(req);
    if (!authResult.success) {
      return new Response(JSON.stringify({ error: authResult.error }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: authResult.status,
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

    const { data: couples, error: couplesError } = await supabaseAdmin
      .from("Couples_couples")
      .select("*");

    if (couplesError) throw couplesError;

    if (!couples || couples.length === 0) {
      return new Response(
        JSON.stringify({
          therapist_id: authResult.therapistId,
          total_couples: 0,
          active_couples: 0,
          overall_checkin_rate: 0,
          total_gratitude_logs: 0,
          total_comments_given: 0,
          couples: [],
        } as TherapistAnalytics),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const coupleIds = couples.map((c: any) => c.id);
    const thirtyDaysAgo = new Date(
      Date.now() - 30 * 24 * 60 * 60 * 1000
    ).toISOString();

    const { data: profiles } = await supabaseAdmin
      .from("Couples_profiles")
      .select("*")
      .in("couple_id", coupleIds);

    const [
      { data: allCheckins },
      { data: allGratitude },
      { data: allGoals },
      { data: allConversations },
      { data: allRituals },
      { data: therapistComments },
    ] = await Promise.all([
      supabaseAdmin
        .from("Couples_weekly_checkins")
        .select("*")
        .in("couple_id", coupleIds),
      supabaseAdmin
        .from("Couples_gratitude_logs")
        .select("*")
        .in("couple_id", coupleIds),
      supabaseAdmin
        .from("Couples_shared_goals")
        .select("*")
        .in("couple_id", coupleIds),
      supabaseAdmin
        .from("Couples_conversations")
        .select("*")
        .in("couple_id", coupleIds),
      supabaseAdmin
        .from("Couples_rituals")
        .select("*")
        .in("couple_id", coupleIds),
      supabaseAdmin
        .from("Couples_therapist_comments")
        .select("*")
        .eq("therapist_id", authResult.therapistId),
    ]);

    const coupleAnalytics: CoupleAnalytics[] = couples.map((couple: any) => {
      const partner1 = profiles?.find((p: any) => p.id === couple.partner1_id);
      const partner2 = profiles?.find((p: any) => p.id === couple.partner2_id);

      const checkins =
        allCheckins?.filter((c: any) => c.couple_id === couple.id) || [];
      const gratitude =
        allGratitude?.filter((g: any) => g.couple_id === couple.id) || [];
      const goals =
        allGoals?.filter((g: any) => g.couple_id === couple.id) || [];
      const conversations =
        allConversations?.filter((c: any) => c.couple_id === couple.id) || [];
      const rituals =
        allRituals?.filter((r: any) => r.couple_id === couple.id) || [];

      const currentDate = new Date();
      const fourWeeksAgo = new Date(
        currentDate.getTime() - 28 * 24 * 60 * 60 * 1000
      );
      const recentCheckins = checkins.filter(
        (c: any) => new Date(c.created_at) >= fourWeeksAgo
      );

      const weekGroups = recentCheckins.reduce(
        (acc: Record<string, Set<string>>, c: any) => {
          const key = `${c.year}-${c.week_number}`;
          if (!acc[key]) acc[key] = new Set();
          acc[key].add(c.user_id);
          return acc;
        },
        {} as Record<string, Set<string>>
      );

      const distinctWeeks = Object.keys(weekGroups).length;
      const weeksWithBothPartners = (
        Object.values(weekGroups) as Set<string>[]
      ).filter((s) => s.size === 2).length;
      const denominator = Math.max(distinctWeeks, 1);
      const checkinCompletionRate = Math.min(
        Math.round((weeksWithBothPartners / denominator) * 100),
        100
      );

      const connectednessScores = checkins
        .map((c: any) => c.q_connectedness)
        .filter(Boolean);
      const conflictScores = checkins
        .map((c: any) => c.q_conflict)
        .filter(Boolean);
      const avgConnectedness =
        connectednessScores.length > 0
          ? Math.round(
              (connectednessScores.reduce((a: number, b: number) => a + b, 0) /
                connectednessScores.length) *
                10
            ) / 10
          : 0;
      const avgConflict =
        conflictScores.length > 0
          ? Math.round(
              (conflictScores.reduce((a: number, b: number) => a + b, 0) /
                conflictScores.length) *
                10
            ) / 10
          : 0;

      const allDates = [
        ...checkins.map((c: any) => c.created_at),
        ...gratitude.map((g: any) => g.created_at),
        ...conversations.map((c: any) => c.created_at),
      ].filter(Boolean);
      const lastActivityDate =
        allDates.length > 0
          ? allDates.sort(
              (a, b) => new Date(b).getTime() - new Date(a).getTime()
            )[0]
          : null;

      const recentActivityCount = [
        ...checkins.filter(
          (c: any) => new Date(c.created_at) >= new Date(thirtyDaysAgo)
        ),
        ...gratitude.filter(
          (g: any) => new Date(g.created_at) >= new Date(thirtyDaysAgo)
        ),
        ...conversations.filter(
          (c: any) => new Date(c.created_at) >= new Date(thirtyDaysAgo)
        ),
      ].length;
      const engagementScore = Math.min(Math.round(recentActivityCount * 10), 100);

      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const checkinsThisMonth = checkins.filter((c: any) => {
        const date = new Date(c.created_at);
        return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
      }).length;

      return {
        couple_id: couple.id,
        partner1_name: partner1?.full_name || "Partner 1",
        partner2_name: partner2?.full_name || "Partner 2",
        last_activity_date: lastActivityDate,
        engagement_score: engagementScore,
        checkin_completion_rate: checkinCompletionRate,
        gratitude_count: gratitude.length,
        goals_completed: goals.filter((g: any) => g.is_completed).length,
        goals_total: goals.length,
        conversations_count: conversations.length,
        rituals_count: rituals.length,
        total_checkins: checkins.length,
        checkins_this_month: checkinsThisMonth,
        avg_connectedness: avgConnectedness,
        avg_conflict: avgConflict,
      };
    });

    const activeThreshold = new Date(thirtyDaysAgo);
    const activeCouples = coupleAnalytics.filter(
      (c) =>
        c.last_activity_date && new Date(c.last_activity_date) >= activeThreshold
    ).length;

    const totalCheckinRate =
      coupleAnalytics.length > 0
        ? Math.round(
            coupleAnalytics.reduce((sum, c) => sum + c.checkin_completion_rate, 0) /
              coupleAnalytics.length
          )
        : 0;

    const response: TherapistAnalytics = {
      therapist_id: authResult.therapistId,
      total_couples: couples.length,
      active_couples: activeCouples,
      overall_checkin_rate: totalCheckinRate,
      total_gratitude_logs: allGratitude?.length || 0,
      total_comments_given: therapistComments?.length || 0,
      couples: coupleAnalytics,
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Therapist analytics error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to fetch analytics" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});

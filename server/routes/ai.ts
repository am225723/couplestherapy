import { Router } from "express";
import { supabaseAdmin } from "../supabase.js";
import { analyzeCheckInsWithPerplexity } from "../perplexity.js";
import { safeJsonParse } from "../_shared/safe-json-parse.js";
import { verifyTherapistSession, verifyUserSession } from "../helpers.js";
import { z } from "zod";

// API response types (not from database schema)
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

interface AIInsight {
  couple_id: string;
  generated_at: string;
  summary: string;
  discrepancies: string[];
  patterns: string[];
  recommendations: string[];
  raw_analysis: string;
  citations?: string[];
}

interface SessionPrepResult {
  couple_id: string;
  generated_at: string;
  engagement_summary: string;
  concerning_patterns: string[];
  positive_patterns: string[];
  session_focus_areas: string[];
  recommended_interventions: string[];
  ai_analysis: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

const aiRouter = Router();

// Simple in-memory cache for AI insights (5-minute TTL)
// This prevents expensive repeated API calls and provides basic rate limiting
const aiInsightsCache = new Map<
  string,
  { data: AIInsight; timestamp: number }
>();
const sessionPrepCache = new Map<
  string,
  { data: SessionPrepResult; timestamp: number }
>();
const empathyPromptCache = new Map<string, { data: any; timestamp: number }>();
const recommendationsCache = new Map<
  string,
  { data: any; timestamp: number }
>();
const echoCoachingCache = new Map<string, { data: any; timestamp: number }>();
const voiceSentimentCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const EMPATHY_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes for empathy prompts
const RECOMMENDATIONS_CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes for exercise recommendations
const ECHO_COACHING_CACHE_TTL_MS = 60 * 60 * 1000; // 60 minutes for echo coaching feedback
const VOICE_SENTIMENT_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours for voice sentiment (transcript doesn't change)

// THERAPIST ANALYTICS (AI-Powered)
aiRouter.get("/analytics", async (req, res) => {
  try {
    // Verify therapist session and get therapist ID from authenticated session
    const authResult = await verifyTherapistSession(req);
    if (!authResult.success) {
      return res.status(authResult.status).json({ error: authResult.error });
    }

    const therapistId = authResult.therapistId;

    // Cross-therapist access: Get ALL couples in the system (any therapist can view all couples)
    const { data: couples, error: couplesError } = await supabaseAdmin
      .from("Couples_couples")
      .select("*");

    if (couplesError) throw couplesError;
    if (!couples || couples.length === 0) {
      return res.json({
        therapist_id: therapistId,
        total_couples: 0,
        active_couples: 0,
        overall_checkin_rate: 0,
        total_gratitude_logs: 0,
        total_comments_given: 0,
        couples: [],
      } as TherapistAnalytics);
    }

    const coupleIds = couples.map((c) => c.id);
    const thirtyDaysAgo = new Date(
      Date.now() - 30 * 24 * 60 * 60 * 1000,
    ).toISOString();

    // Fetch all profiles for partner names
    const { data: profiles } = await supabaseAdmin
      .from("Couples_profiles")
      .select("*")
      .in("couple_id", coupleIds);

    // Fetch all activity data in parallel
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
        .eq("therapist_id", therapistId),
    ]);

    // Calculate per-couple analytics
    const coupleAnalytics: CoupleAnalytics[] = couples.map((couple) => {
      const partner1 = profiles?.find((p) => p.id === couple.partner1_id);
      const partner2 = profiles?.find((p) => p.id === couple.partner2_id);

      const checkins =
        allCheckins?.filter((c) => c.couple_id === couple.id) || [];
      const gratitude =
        allGratitude?.filter((g) => g.couple_id === couple.id) || [];
      const goals = allGoals?.filter((g) => g.couple_id === couple.id) || [];
      const conversations =
        allConversations?.filter((c) => c.couple_id === couple.id) || [];
      const rituals =
        allRituals?.filter((r) => r.couple_id === couple.id) || [];

      // Calculate check-in completion rate (past 4 weeks)
      const currentDate = new Date();
      const fourWeeksAgo = new Date(
        currentDate.getTime() - 28 * 24 * 60 * 60 * 1000,
      );
      const recentCheckins = checkins.filter(
        (c) => new Date(c.created_at) >= fourWeeksAgo,
      );

      // Group by week and count unique users
      const weekGroups = recentCheckins.reduce(
        (acc, c) => {
          const key = `${c.year}-${c.week_number}`;
          if (!acc[key]) acc[key] = new Set();
          acc[key].add(c.user_id);
          return acc;
        },
        {} as Record<string, Set<string>>,
      );

      const distinctWeeks = Object.keys(weekGroups).length;
      const weeksWithBothPartners = (
        Object.values(weekGroups) as Set<string>[]
      ).filter((s) => s.size === 2).length;
      // Use actual distinct weeks as denominator, minimum 1 to avoid division by zero
      const denominator = Math.max(distinctWeeks, 1);
      const checkinCompletionRate = Math.min(
        Math.round((weeksWithBothPartners / denominator) * 100),
        100,
      );

      // Calculate average scores
      const connectednessScores = checkins
        .map((c) => c.q_connectedness)
        .filter(Boolean);
      const conflictScores = checkins.map((c) => c.q_conflict).filter(Boolean);
      const avgConnectedness =
        connectednessScores.length > 0
          ? Math.round(
              (connectednessScores.reduce((a, b) => a + b, 0) /
                connectednessScores.length) *
                10,
            ) / 10
          : 0;
      const avgConflict =
        conflictScores.length > 0
          ? Math.round(
              (conflictScores.reduce((a, b) => a + b, 0) /
                conflictScores.length) *
                10,
            ) / 10
          : 0;

      // Find last activity date
      const allDates = [
        ...checkins.map((c) => c.created_at),
        ...gratitude.map((g) => g.created_at),
        ...goals.map((g) => g.created_at),
        ...conversations.map((c) => c.created_at),
      ]
        .filter(Boolean)
        .map((d) => new Date(d).getTime());

      const lastActivityDate =
        allDates.length > 0
          ? new Date(Math.max(...allDates)).toISOString()
          : null;

      // Calculate engagement score (0-100) - all metrics use last 30 days for consistency
      // Weighted: checkins (40%), gratitude (20%), goals (20%), conversations (10%), rituals (10%)
      const thirtyDaysAgoTime =
        currentDate.getTime() - 30 * 24 * 60 * 60 * 1000;
      const checkinsThisMonth = checkins.filter(
        (c) => new Date(c.created_at).getTime() >= thirtyDaysAgoTime,
      ).length;
      const gratitudeThisMonth = gratitude.filter(
        (g) => new Date(g.created_at).getTime() >= thirtyDaysAgoTime,
      ).length;
      const goalsCompletedThisMonth = goals.filter(
        (g) =>
          g.status === "done" &&
          new Date(g.created_at).getTime() >= thirtyDaysAgoTime,
      ).length;
      const conversationsThisMonth = conversations.filter(
        (c) => new Date(c.created_at).getTime() >= thirtyDaysAgoTime,
      ).length;
      const ritualsThisMonth = rituals.filter(
        (r) => new Date(r.created_at || 0).getTime() >= thirtyDaysAgoTime,
      ).length;

      const checkinScore = Math.min((checkinsThisMonth / 8) * 40, 40); // 8 checkins/month = full score
      const gratitudeScore = Math.min((gratitudeThisMonth / 20) * 20, 20); // 20/month = full score
      const goalScore = Math.min((goalsCompletedThisMonth / 5) * 20, 20); // 5/month = full score
      const conversationScore = Math.min((conversationsThisMonth / 3) * 10, 10); // 3/month = full score
      const ritualScore = Math.min((ritualsThisMonth / 4) * 10, 10); // 4/month = full score

      const engagementScore = Math.round(
        checkinScore +
          gratitudeScore +
          goalScore +
          conversationScore +
          ritualScore,
      );

      return {
        couple_id: couple.id,
        partner1_name: partner1?.full_name || "Partner 1",
        partner2_name: partner2?.full_name || "Partner 2",
        total_checkins: checkins.length,
        checkins_this_month: checkinsThisMonth,
        checkin_completion_rate: checkinCompletionRate,
        gratitude_count: gratitude.length,
        goals_total: goals.length,
        goals_completed: goals.filter((g) => g.status === "done").length,
        conversations_count: conversations.length,
        rituals_count: rituals.length,
        avg_connectedness: avgConnectedness,
        avg_conflict: avgConflict,
        last_activity_date: lastActivityDate,
        engagement_score: engagementScore,
      };
    });

    // Calculate therapist-wide stats
    const activeCouples = coupleAnalytics.filter((c) => {
      return (
        c.last_activity_date &&
        new Date(c.last_activity_date) >= new Date(thirtyDaysAgo)
      );
    }).length;

    const overallCheckinRate =
      coupleAnalytics.length > 0
        ? Math.round(
            coupleAnalytics.reduce(
              (sum, c) => sum + c.checkin_completion_rate,
              0,
            ) / coupleAnalytics.length,
          )
        : 0;

    const analytics: TherapistAnalytics = {
      therapist_id: therapistId,
      total_couples: couples.length,
      active_couples: activeCouples,
      overall_checkin_rate: overallCheckinRate,
      total_gratitude_logs: allGratitude?.length || 0,
      total_comments_given: therapistComments?.length || 0,
      couples: coupleAnalytics,
    };

    res.json(analytics);
  } catch (error: any) {
    console.error("Analytics error:", error);
    res.status(500).json({ error: error.message });
  }
});

// AI INSIGHTS (Clinical Insights from Check-ins)
aiRouter.get("/insights", async (req, res) => {
  try {
    // Verify therapist session and get therapist ID from authenticated session
    const authResult = await verifyTherapistSession(req);
    if (!authResult.success) {
      return res.status(authResult.status).json({ error: authResult.error });
    }

    const therapistId = authResult.therapistId;
    const coupleId = req.query.couple_id as string;

    if (!coupleId) {
      return res.status(400).json({
        error: "couple_id is required",
      });
    }

    // Check cache first to prevent expensive duplicate API calls
    const cacheKey = `${therapistId}:${coupleId}`;
    const cached = aiInsightsCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return res.json(cached.data);
    }

    // 1. Validate couple exists (therapists can access all couples)
    const { data: couple, error: coupleError } = await supabaseAdmin
      .from("Couples_couples")
      .select("*")
      .eq("id", coupleId)
      .single();

    if (coupleError || !couple) {
      return res.status(404).json({ error: "Couple not found" });
    }

    // 2. Fetch last 8-12 weeks of check-ins for BOTH partners
    const twelveWeeksAgo = new Date();
    twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - 84); // 12 weeks

    const { data: checkins, error: checkinsError } = await supabaseAdmin
      .from("Couples_weekly_checkins")
      .select("*")
      .eq("couple_id", coupleId)
      .gte("created_at", twelveWeeksAgo.toISOString())
      .order("year", { ascending: true })
      .order("week_number", { ascending: true });

    if (checkinsError) {
      throw checkinsError;
    }

    if (!checkins || checkins.length === 0) {
      return res.status(400).json({
        error:
          "No check-in data available for this couple in the last 12 weeks",
      });
    }

    // 3. Format data for Perplexity AI analysis
    // PRIVACY: Use anonymized labels instead of actual names when sending to external AI service
    const weeklyData: Record<string, any[]> = {};

    checkins.forEach((checkin) => {
      const weekKey = `${checkin.year}-W${checkin.week_number}`;
      if (!weeklyData[weekKey]) {
        weeklyData[weekKey] = [];
      }
      const partnerId = checkin.user_id === couple.partner1_id ? 1 : 2;
      weeklyData[weekKey].push({
        userId: checkin.user_id,
        partnerId,
        partnerLabel: `Partner ${partnerId}`, // Anonymized - no real names sent to AI
        connectedness: checkin.q_connectedness,
        conflict: checkin.q_conflict,
        appreciation: checkin.q_appreciation,
        regrettableIncident: checkin.q_regrettable_incident,
        need: checkin.q_my_need,
        createdAt: checkin.created_at,
      });
    });

    // Build user prompt
    let userPrompt = `Analyze the following weekly check-in data for a couple in therapy:\n\n`;

    const sortedWeeks = Object.keys(weeklyData).sort();
    sortedWeeks.forEach((weekKey) => {
      const weekCheckins = weeklyData[weekKey];
      const [year, weekNum] = weekKey.split("-W");
      const sampleDate = weekCheckins[0]?.createdAt
        ? new Date(weekCheckins[0].createdAt).toLocaleDateString()
        : "";

      userPrompt += `Week ${weekNum}, ${year} (${sampleDate}):\n`;

      weekCheckins.forEach((checkin) => {
        userPrompt += `- ${checkin.partnerLabel}: Connectedness: ${checkin.connectedness}/10, Conflict: ${checkin.conflict}/10\n`;
        userPrompt += `  Appreciation: "${checkin.appreciation}"\n`;
        userPrompt += `  Regrettable Incident: "${checkin.regrettableIncident}"\n`;
        userPrompt += `  Need: "${checkin.need}"\n`;
      });

      userPrompt += "\n";
    });

    userPrompt += `\nBased on this data, provide:\n`;
    userPrompt += `1. A brief summary of the couple's relationship dynamics\n`;
    userPrompt += `2. Key discrepancies between partners' perceptions (list 3-5 specific points)\n`;
    userPrompt += `3. Important patterns and trends over time (list 3-5 specific observations)\n`;
    userPrompt += `4. Therapeutic recommendations for the therapist (list 3-5 actionable items)\n`;

    const systemPrompt = `You are an expert couples therapist analyzing weekly check-in data from a therapeutic intervention. Analyze the provided data to identify:
1. Significant discrepancies between partners' perceptions (connectedness and conflict scores)
2. Temporal patterns and trends
3. Areas of concern requiring therapeutic attention
4. Potential relationship strengths to build upon
5. Specific recommendations for the therapist

Be precise, evidence-based, and therapeutically sensitive. Format your response as structured insights.`;

    // 4. Call Perplexity API
    const analysisResult = await analyzeCheckInsWithPerplexity({
      systemPrompt,
      userPrompt,
    });

    // 5. Parse and structure the response
    const rawAnalysis = analysisResult.content;
    const parsed = safeJsonParse(rawAnalysis);

    if (!parsed) {
      return res.status(500).json({ error: "Failed to parse AI response" });
    }

    const insights: AIInsight = {
      couple_id: coupleId,
      generated_at: new Date().toISOString(),
      summary: parsed.summary || rawAnalysis.substring(0, 300) + "...",
      discrepancies: parsed.discrepancies || [
        "Analysis completed - see raw analysis for details",
      ],
      patterns: parsed.patterns || [
        "Analysis completed - see raw analysis for details",
      ],
      recommendations: parsed.recommendations || [
        "Analysis completed - see raw analysis for details",
      ],
      raw_analysis: rawAnalysis,
      citations: analysisResult.citations,
    };

    // Cache the result to prevent repeated expensive API calls
    aiInsightsCache.set(cacheKey, {
      data: insights,
      timestamp: Date.now(),
    });

    res.json(insights);
  } catch (error: any) {
    console.error("AI Insights error:", error);
    res.status(500).json({
      error: error.message || "Failed to generate AI insights",
    });
  }
});

// AI SESSION PREP (Comprehensive Weekly Summary for Therapists)
aiRouter.post("/session-prep/:couple_id", async (req, res) => {
  try {
    // Verify therapist session and get therapist ID from authenticated session
    const authResult = await verifyTherapistSession(req);
    if (!authResult.success) {
      return res.status(authResult.status).json({ error: authResult.error });
    }

    const therapistId = authResult.therapistId;
    const coupleId = req.params.couple_id;

    if (!coupleId) {
      return res.status(400).json({
        error: "couple_id is required",
      });
    }

    // Check cache first to prevent expensive duplicate API calls
    const cacheKey = `session-prep:${therapistId}:${coupleId}`;
    const cached = sessionPrepCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return res.json(cached.data);
    }

    // 1. Validate couple exists (therapists can access all couples)
    const { data: couple, error: coupleError } = await supabaseAdmin
      .from("Couples_couples")
      .select("partner1_id, partner2_id, therapist_id")
      .eq("id", coupleId)
      .single();

    if (coupleError || !couple) {
      return res.status(404).json({ error: "Couple not found" });
    }

    // 2. Fetch all recent activity data (last 4 weeks) in parallel
    const fourWeeksAgo = new Date();
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28); // 4 weeks
    const fourWeeksAgoISO = fourWeeksAgo.toISOString();

    const [
      { data: checkins },
      { data: gratitude },
      { data: goals },
      { data: rituals },
      { data: conversations },
      { data: voiceMemos },
      { data: horsemenIncidents },
      { data: demonDialogues },
      { data: meditationSessions },
      { data: intimacyRatings },
      { data: intimacyGoals },
      { data: echoSessions },
      { data: ifsExercises },
      { data: pauseEvents },
    ] = await Promise.all([
      supabaseAdmin
        .from("Couples_weekly_checkins")
        .select("*")
        .eq("couple_id", coupleId)
        .gte("created_at", fourWeeksAgoISO)
        .order("created_at", { ascending: true }),
      supabaseAdmin
        .from("Couples_gratitude_logs")
        .select("*")
        .eq("couple_id", coupleId)
        .gte("created_at", fourWeeksAgoISO)
        .order("created_at", { ascending: true }),
      supabaseAdmin
        .from("Couples_shared_goals")
        .select("*")
        .eq("couple_id", coupleId)
        .gte("created_at", fourWeeksAgoISO)
        .order("created_at", { ascending: true }),
      supabaseAdmin
        .from("Couples_rituals")
        .select("*")
        .eq("couple_id", coupleId),
      supabaseAdmin
        .from("Couples_conversations")
        .select("*")
        .eq("couple_id", coupleId)
        .gte("created_at", fourWeeksAgoISO)
        .order("created_at", { ascending: true }),
      supabaseAdmin
        .from("Couples_voice_memos")
        .select("id, sender_id, recipient_id, created_at, is_listened")
        .eq("couple_id", coupleId)
        .gte("created_at", fourWeeksAgoISO)
        .order("created_at", { ascending: true }),
      supabaseAdmin
        .from("Couples_horsemen_incidents")
        .select("*")
        .eq("couple_id", coupleId)
        .gte("created_at", fourWeeksAgoISO)
        .order("created_at", { ascending: true }),
      supabaseAdmin
        .from("Couples_demon_dialogues")
        .select("*")
        .eq("couple_id", coupleId)
        .gte("created_at", fourWeeksAgoISO)
        .order("created_at", { ascending: true }),
      supabaseAdmin
        .from("Couples_meditation_sessions")
        .select("*")
        .eq("couple_id", coupleId)
        .gte("created_at", fourWeeksAgoISO)
        .order("created_at", { ascending: true }),
      supabaseAdmin
        .from("Couples_intimacy_ratings")
        .select("*")
        .eq("couple_id", coupleId)
        .gte("created_at", fourWeeksAgoISO)
        .order("created_at", { ascending: true }),
      supabaseAdmin
        .from("Couples_intimacy_goals")
        .select("*")
        .eq("couple_id", coupleId)
        .gte("created_at", fourWeeksAgoISO)
        .order("created_at", { ascending: true }),
      supabaseAdmin
        .from("Couples_echo_sessions")
        .select("*")
        .eq("couple_id", coupleId)
        .gte("created_at", fourWeeksAgoISO)
        .order("created_at", { ascending: true }),
      supabaseAdmin
        .from("Couples_ifs_exercises")
        .select("*")
        .eq("couple_id", coupleId)
        .gte("created_at", fourWeeksAgoISO)
        .order("created_at", { ascending: true }),
      supabaseAdmin
        .from("Couples_pause_events")
        .select("*")
        .eq("couple_id", coupleId)
        .gte("started_at", fourWeeksAgoISO)
        .order("started_at", { ascending: true }),
    ]);

    // Check if there's any recent activity
    const hasActivity =
      (checkins && checkins.length > 0) ||
      (gratitude && gratitude.length > 0) ||
      (goals && goals.length > 0) ||
      (conversations && conversations.length > 0) ||
      (horsemenIncidents && horsemenIncidents.length > 0) ||
      (demonDialogues && demonDialogues.length > 0) ||
      (meditationSessions && meditationSessions.length > 0) ||
      (intimacyRatings && intimacyRatings.length > 0) ||
      (echoSessions && echoSessions.length > 0) ||
      (ifsExercises && ifsExercises.length > 0) ||
      (pauseEvents && pauseEvents.length > 0);

    if (!hasActivity) {
      return res.status(400).json({
        error:
          "No recent activity data available for this couple in the last 4 weeks",
      });
    }

    // 3. Format data for AI analysis (PRIVACY-FOCUSED: anonymize partners)
    let userPrompt = `Analyze the following 4-week activity summary for a couple in therapy:\n\n`;

    // ENGAGEMENT METRICS
    userPrompt += `=== ENGAGEMENT OVERVIEW ===\n`;
    userPrompt += `Weekly Check-ins: ${checkins?.length || 0} completed\n`;

    // Calculate check-in completion by partner
    const partner1Checkins =
      checkins?.filter((c) => c.user_id === couple.partner1_id).length || 0;
    const partner2Checkins =
      checkins?.filter((c) => c.user_id === couple.partner2_id).length || 0;
    userPrompt += `  - Partner 1: ${partner1Checkins} check-ins\n`;
    userPrompt += `  - Partner 2: ${partner2Checkins} check-ins\n`;

    userPrompt += `Gratitude Logs: ${gratitude?.length || 0} entries\n`;
    userPrompt += `Shared Goals: ${goals?.length || 0} total (${goals?.filter((g) => g.status === "done").length || 0} completed)\n`;
    userPrompt += `Hold Me Tight Conversations: ${conversations?.length || 0} sessions\n`;
    userPrompt += `Voice Memos Exchanged: ${voiceMemos?.length || 0} messages\n`;
    userPrompt += `Echo & Empathy Sessions: ${echoSessions?.length || 0} completed\n`;
    userPrompt += `IFS Exercises: ${ifsExercises?.length || 0} completed\n`;
    userPrompt += `Meditation Sessions: ${meditationSessions?.length || 0} completed\n`;
    userPrompt += `Pause Button Uses: ${pauseEvents?.length || 0} times\n\n`;

    // CHECK-IN SCORES SUMMARY
    if (checkins && checkins.length > 0) {
      userPrompt += `=== WEEKLY CHECK-IN TRENDS ===\n`;

      const connectednessScores = checkins
        .map((c) => c.q_connectedness)
        .filter(Boolean);
      const conflictScores = checkins.map((c) => c.q_conflict).filter(Boolean);

      if (connectednessScores.length > 0) {
        const avgConnectedness = (
          connectednessScores.reduce((a, b) => a + b, 0) /
          connectednessScores.length
        ).toFixed(1);
        const minConnectedness = Math.min(...connectednessScores);
        const maxConnectedness = Math.max(...connectednessScores);
        userPrompt += `Connectedness Scores (1-10): Avg ${avgConnectedness}, Range ${minConnectedness}-${maxConnectedness}\n`;
      }

      if (conflictScores.length > 0) {
        const avgConflict = (
          conflictScores.reduce((a, b) => a + b, 0) / conflictScores.length
        ).toFixed(1);
        const minConflict = Math.min(...conflictScores);
        const maxConflict = Math.max(...conflictScores);
        userPrompt += `Conflict Scores (1-10): Avg ${avgConflict}, Range ${minConflict}-${maxConflict}\n`;
      }

      userPrompt += "\n";
    }

    // CONCERNING PATTERNS
    userPrompt += `=== CONCERNING PATTERNS ===\n`;

    if (horsemenIncidents && horsemenIncidents.length > 0) {
      const criticismCount = horsemenIncidents.filter(
        (h) => h.horseman_type === "criticism",
      ).length;
      const contemptCount = horsemenIncidents.filter(
        (h) => h.horseman_type === "contempt",
      ).length;
      const defensivenessCount = horsemenIncidents.filter(
        (h) => h.horseman_type === "defensiveness",
      ).length;
      const stonewallCount = horsemenIncidents.filter(
        (h) => h.horseman_type === "stonewalling",
      ).length;

      userPrompt += `Four Horsemen Incidents: ${horsemenIncidents.length} total\n`;
      userPrompt += `  - Criticism: ${criticismCount}\n`;
      userPrompt += `  - Contempt: ${contemptCount}\n`;
      userPrompt += `  - Defensiveness: ${defensivenessCount}\n`;
      userPrompt += `  - Stonewalling: ${stonewallCount}\n`;

      const antidotesPracticed = horsemenIncidents.filter(
        (h) => h.antidote_practiced,
      ).length;
      userPrompt += `  - Antidotes practiced: ${antidotesPracticed}/${horsemenIncidents.length}\n`;
    } else {
      userPrompt += `Four Horsemen Incidents: 0 (positive sign)\n`;
    }

    if (demonDialogues && demonDialogues.length > 0) {
      const findBadGuyCount = demonDialogues.filter(
        (d) => d.dialogue_type === "find_bad_guy",
      ).length;
      const protestPolkaCount = demonDialogues.filter(
        (d) => d.dialogue_type === "protest_polka",
      ).length;
      const freezeFleeCount = demonDialogues.filter(
        (d) => d.dialogue_type === "freeze_flee",
      ).length;
      const interruptedCount = demonDialogues.filter(
        (d) => d.interrupted,
      ).length;

      userPrompt += `Demon Dialogues Recognized: ${demonDialogues.length} total\n`;
      userPrompt += `  - Find the Bad Guy: ${findBadGuyCount}\n`;
      userPrompt += `  - Protest Polka: ${protestPolkaCount}\n`;
      userPrompt += `  - Freeze & Flee: ${freezeFleeCount}\n`;
      userPrompt += `  - Successfully interrupted: ${interruptedCount}/${demonDialogues.length}\n`;
    } else {
      userPrompt += `Demon Dialogues: 0 recognized\n`;
    }

    userPrompt += "\n";

    // POSITIVE PATTERNS
    userPrompt += `=== POSITIVE PATTERNS ===\n`;

    if (gratitude && gratitude.length > 0) {
      const partner1Gratitude = gratitude.filter(
        (g) => g.user_id === couple.partner1_id,
      ).length;
      const partner2Gratitude = gratitude.filter(
        (g) => g.user_id === couple.partner2_id,
      ).length;
      userPrompt += `Gratitude Practice: ${gratitude.length} entries\n`;
      userPrompt += `  - Partner 1: ${partner1Gratitude} entries\n`;
      userPrompt += `  - Partner 2: ${partner2Gratitude} entries\n`;
    }

    if (rituals && rituals.length > 0) {
      userPrompt += `Rituals of Connection: ${rituals.length} active rituals\n`;
    }

    if (intimacyRatings && intimacyRatings.length > 0) {
      userPrompt += `Intimacy Tracking: ${intimacyRatings.length} ratings submitted\n`;
    }

    if (intimacyGoals && intimacyGoals.length > 0) {
      const achievedGoals = intimacyGoals.filter((g) => g.is_achieved).length;
      userPrompt += `Intimacy Goals: ${achievedGoals}/${intimacyGoals.length} achieved\n`;
    }

    userPrompt += "\n";

    // REQUEST STRUCTURED OUTPUT
    userPrompt += `Based on this data, provide:\n`;
    userPrompt += `1. ENGAGEMENT SUMMARY: Brief overview of couple's engagement level and consistency\n`;
    userPrompt += `2. CONCERNING PATTERNS: List 3-5 specific concerns that need therapeutic attention\n`;
    userPrompt += `3. POSITIVE PATTERNS: List 3-5 strengths and positive developments to build upon\n`;
    userPrompt += `4. SESSION FOCUS AREAS: Top 3 priorities for the upcoming therapy session\n`;
    userPrompt += `5. RECOMMENDED INTERVENTIONS: 3-5 specific therapeutic tools or exercises to suggest\n`;

    const systemPrompt = `You are an expert couples therapist preparing for a therapy session. Analyze the couple's recent activity data and provide a structured session preparation summary.

Your analysis should be:
- Evidence-based and specific (cite metrics when relevant)
- Therapeutically sensitive and compassionate
- Action-oriented with clear recommendations
- Balanced (acknowledge both concerns and strengths)
- Focused on helping the therapist prepare for an effective session

Format your response with clear section headings.`;

    // 4. Call Perplexity API
    const analysisResult = await analyzeCheckInsWithPerplexity({
      systemPrompt,
      userPrompt,
    });

    // 5. Parse and structure the response
    const rawAnalysis = analysisResult.content;
    const parsed = safeJsonParse(rawAnalysis);

    if (!parsed) {
      return res.status(500).json({ error: "Failed to parse AI response" });
    }

    const sessionPrep: SessionPrepResult = {
      couple_id: coupleId,
      generated_at: new Date().toISOString(),
      engagement_summary:
        parsed.engagement_summary || rawAnalysis.substring(0, 200) + "...",
      concerning_patterns: parsed.concerning_patterns || [
        "See full analysis for details",
      ],
      positive_patterns: parsed.positive_patterns || [
        "See full analysis for details",
      ],
      session_focus_areas: parsed.session_focus_areas || [
        "See full analysis for details",
      ],
      recommended_interventions: parsed.recommended_interventions || [
        "See full analysis for details",
      ],
      ai_analysis: rawAnalysis,
      usage: analysisResult.usage,
    };

    // Cache the result
    sessionPrepCache.set(cacheKey, {
      data: sessionPrep,
      timestamp: Date.now(),
    });

    res.json(sessionPrep);
  } catch (error: any) {
    console.error("AI Session Prep error:", error);
    res.status(500).json({
      error: error.message || "Failed to generate session preparation summary",
    });
  }
});

// AI EMPATHY PROMPT (EFT-powered response suggestions for Hold Me Tight conversations)
aiRouter.post("/empathy-prompt", async (req, res) => {
  try {
    // Verify user session and get user info
    const authResult = await verifyUserSession(req);
    if (!authResult.success) {
      return res.status(authResult.status).json({ error: authResult.error });
    }

    const { userId, coupleId } = authResult;

    // Validate request body
    const requestBodySchema = z.object({
      conversation_id: z.string().uuid(),
      step_number: z.number().int().min(1).max(6),
      user_response: z.string().min(1),
    });

    const parseResult = requestBodySchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: "Invalid request body",
        details: parseResult.error.errors,
      });
    }

    const { conversation_id, step_number, user_response } = parseResult.data;

    // Verify conversation exists and belongs to user's couple
    const { data: conversation, error: conversationError } = await supabaseAdmin
      .from("Couples_conversations")
      .select("couple_id, initiator_id")
      .eq("id", conversation_id)
      .single();

    if (conversationError || !conversation) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    if (conversation.couple_id !== coupleId) {
      return res.status(403).json({
        error:
          "Access denied. This conversation does not belong to your couple.",
      });
    }

    // Verify user is a participant in this conversation
    const { data: couple, error: coupleError } = await supabaseAdmin
      .from("Couples_couples")
      .select("partner1_id, partner2_id")
      .eq("id", coupleId)
      .single();

    if (coupleError || !couple) {
      return res.status(404).json({ error: "Couple not found" });
    }

    const isParticipant =
      couple.partner1_id === userId || couple.partner2_id === userId;
    if (!isParticipant) {
      return res.status(403).json({
        error: "Access denied. You are not a participant in this conversation.",
      });
    }

    // Check cache first - use first 50 chars of user_response as cache key suffix
    const responseSuffix = user_response
      .substring(0, 50)
      .replace(/[^a-zA-Z0-9]/g, "_");
    const cacheKey = `empathy:${conversation_id}:${step_number}:${responseSuffix}`;
    const cached = empathyPromptCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < EMPATHY_CACHE_TTL_MS) {
      return res.json(cached.data);
    }

    // Build Perplexity prompts
    const systemPrompt =
      "You are an expert Emotionally Focused Therapy (EFT) therapist coaching couples through the Hold Me Tight conversation. Your role is to help the listening partner respond with empathy, validation, and emotional attunement.";

    const userPrompt = `Step ${step_number} of the Hold Me Tight Conversation.

One partner just shared:
"${user_response}"

Suggest 2-3 empathetic responses for their partner that:
1. Validate their feelings and experience
2. Show understanding and compassion
3. Invite deeper sharing
4. Avoid defensiveness or problem-solving
5. Use "I hear..." or "It sounds like..." language

Format as a numbered list of suggested responses.`;

    // Call Perplexity AI
    const analysisResult = await analyzeCheckInsWithPerplexity({
      systemPrompt,
      userPrompt,
    });

    const aiFullResponse = analysisResult.content;
    const parsed = safeJsonParse(aiFullResponse);

    if (!parsed) {
      return res.status(500).json({ error: "Failed to parse AI response" });
    }

    // Parse AI response to extract numbered suggestions
    const suggestedResponses: string[] = parsed.suggested_responses || [
      aiFullResponse,
    ];

    // Build response
    const response = {
      conversation_id,
      step_number,
      suggested_responses: suggestedResponses,
      ai_full_response: aiFullResponse,
      usage: analysisResult.usage,
    };

    // Cache the result
    empathyPromptCache.set(cacheKey, {
      data: response,
      timestamp: Date.now(),
    });

    res.json(response);
  } catch (error: any) {
    console.error("AI Empathy Prompt error:", error);
    res.status(500).json({
      error: error.message || "Failed to generate empathy prompts",
    });
  }
});

// AI EXERCISE RECOMMENDATIONS (Personalized therapy tool suggestions)
aiRouter.get("/exercise-recommendations", async (req, res) => {
  try {
    // Verify user session and get user info
    const authResult = await verifyUserSession(req);
    if (!authResult.success) {
      return res.status(authResult.status).json({ error: authResult.error });
    }

    const { coupleId } = authResult;

    // Check cache first
    const cacheKey = `recommendations:${coupleId}`;
    const cached = recommendationsCache.get(cacheKey);
    if (
      cached &&
      Date.now() - cached.timestamp < RECOMMENDATIONS_CACHE_TTL_MS
    ) {
      return res.json(cached.data);
    }

    // Calculate 30 days ago timestamp
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoISO = thirtyDaysAgo.toISOString();

    // Fetch activity counts for all therapy tools in parallel
    const [
      { data: weeklyCheckins },
      { data: gratitudeLogs },
      { data: sharedGoals },
      { data: rituals },
      { data: conversations },
      { data: voiceMemos },
      { data: fourHorsemen },
      { data: demonDialogues },
      { data: meditationSessions },
      { data: intimacyRatings },
      { data: intimacyGoals },
      { data: sharedDreams },
      { data: visionBoardItems },
      { data: coreValues },
      { data: parentingAgreements },
      { data: parentingStressCheckins },
      { data: echoSessions },
      { data: ifsExercises },
      { data: pauseEvents },
      { data: messages },
      { data: calendarEvents },
      { data: loveMapSessions },
    ] = await Promise.all([
      supabaseAdmin
        .from("Couples_weekly_checkins")
        .select("id")
        .eq("couple_id", coupleId)
        .gte("created_at", thirtyDaysAgoISO),
      supabaseAdmin
        .from("Couples_gratitude_logs")
        .select("id")
        .eq("couple_id", coupleId)
        .gte("created_at", thirtyDaysAgoISO),
      supabaseAdmin
        .from("Couples_shared_goals")
        .select("id")
        .eq("couple_id", coupleId)
        .gte("created_at", thirtyDaysAgoISO),
      supabaseAdmin
        .from("Couples_rituals")
        .select("id")
        .eq("couple_id", coupleId),
      supabaseAdmin
        .from("Couples_conversations")
        .select("id")
        .eq("couple_id", coupleId)
        .gte("created_at", thirtyDaysAgoISO),
      supabaseAdmin
        .from("Couples_voice_memos")
        .select("id")
        .eq("couple_id", coupleId)
        .gte("created_at", thirtyDaysAgoISO),
      supabaseAdmin
        .from("Couples_horsemen_incidents")
        .select("id")
        .eq("couple_id", coupleId)
        .gte("created_at", thirtyDaysAgoISO),
      supabaseAdmin
        .from("Couples_demon_dialogues")
        .select("id")
        .eq("couple_id", coupleId)
        .gte("created_at", thirtyDaysAgoISO),
      supabaseAdmin
        .from("Couples_meditation_sessions")
        .select("id")
        .eq("couple_id", coupleId)
        .gte("created_at", thirtyDaysAgoISO),
      supabaseAdmin
        .from("Couples_intimacy_ratings")
        .select("id")
        .eq("couple_id", coupleId)
        .gte("created_at", thirtyDaysAgoISO),
      supabaseAdmin
        .from("Couples_intimacy_goals")
        .select("id")
        .eq("couple_id", coupleId)
        .gte("created_at", thirtyDaysAgoISO),
      supabaseAdmin
        .from("Couples_shared_dreams")
        .select("id")
        .eq("couple_id", coupleId)
        .gte("created_at", thirtyDaysAgoISO),
      supabaseAdmin
        .from("Couples_vision_board_items")
        .select("id")
        .eq("couple_id", coupleId)
        .gte("created_at", thirtyDaysAgoISO),
      supabaseAdmin
        .from("Couples_core_values")
        .select("id")
        .eq("couple_id", coupleId)
        .gte("created_at", thirtyDaysAgoISO),
      supabaseAdmin
        .from("Couples_discipline_agreements")
        .select("id")
        .eq("couple_id", coupleId)
        .gte("created_at", thirtyDaysAgoISO),
      supabaseAdmin
        .from("Couples_parenting_stress_checkins")
        .select("id")
        .eq("couple_id", coupleId)
        .gte("created_at", thirtyDaysAgoISO),
      supabaseAdmin
        .from("Couples_echo_sessions")
        .select("id")
        .eq("couple_id", coupleId)
        .gte("created_at", thirtyDaysAgoISO),
      supabaseAdmin
        .from("Couples_ifs_exercises")
        .select("id")
        .eq("couple_id", coupleId)
        .gte("created_at", thirtyDaysAgoISO),
      supabaseAdmin
        .from("Couples_pause_events")
        .select("id")
        .eq("couple_id", coupleId)
        .gte("started_at", thirtyDaysAgoISO),
      supabaseAdmin
        .from("Couples_messages")
        .select("id")
        .eq("couple_id", coupleId)
        .gte("created_at", thirtyDaysAgoISO),
      supabaseAdmin
        .from("Couples_calendar_events")
        .select("id")
        .eq("couple_id", coupleId)
        .gte("created_at", thirtyDaysAgoISO),
      supabaseAdmin
        .from("Couples_love_map_sessions")
        .select("id")
        .eq("couple_id", coupleId)
        .gte("created_at", thirtyDaysAgoISO),
    ]);

    // Calculate activity counts
    const activityCounts = {
      "Weekly Check-ins": weeklyCheckins?.length || 0,
      "Gratitude Log": gratitudeLogs?.length || 0,
      "Shared Goals": sharedGoals?.length || 0,
      "Rituals of Connection": rituals?.length || 0,
      "Hold Me Tight Conversations": conversations?.length || 0,
      "Voice Memos": voiceMemos?.length || 0,
      "Four Horsemen Awareness": fourHorsemen?.length || 0,
      "Demon Dialogues": demonDialogues?.length || 0,
      "Meditation Library": meditationSessions?.length || 0,
      "Intimacy Mapping":
        (intimacyRatings?.length || 0) + (intimacyGoals?.length || 0),
      "Values & Vision":
        (sharedDreams?.length || 0) +
        (visionBoardItems?.length || 0) +
        (coreValues?.length || 0),
      "Parenting Partners":
        (parentingAgreements?.length || 0) +
        (parentingStressCheckins?.length || 0),
      "Echo & Empathy": echoSessions?.length || 0,
      "IFS Introduction": ifsExercises?.length || 0,
      "Pause Button": pauseEvents?.length || 0,
      Messages: messages?.length || 0,
      "Shared Calendar": calendarEvents?.length || 0,
      "Love Map Quiz": loveMapSessions?.length || 0,
    };

    // Categorize activities
    const notStarted: string[] = [];
    const underutilized: string[] = [];
    const active: string[] = [];

    Object.entries(activityCounts).forEach(([toolName, count]) => {
      if (count === 0) {
        notStarted.push(toolName);
      } else if (count >= 1 && count <= 3) {
        underutilized.push(`${toolName} (${count} uses)`);
      } else {
        active.push(`${toolName} (${count} uses)`);
      }
    });

    // Build Perplexity prompts - client-facing, warm and encouraging tone
    const systemPrompt =
      "You are a supportive relationship coach speaking directly to a couple. Your tone is warm, encouraging, and personal. Use 'you' and 'your' to address the couple directly. Keep rationales brief (1-2 sentences max). Focus on the positive benefits and make suggestions feel achievable and inviting. Always respond with valid JSON only.";

    let userPrompt = `Based on this couple's recent activity, suggest 2-3 connection tools to try:\n\n`;

    if (notStarted.length > 0) {
      userPrompt += `Haven't tried yet: ${notStarted.slice(0, 5).join(", ")}\n`;
    }

    if (underutilized.length > 0) {
      userPrompt += `Could use more: ${underutilized.slice(0, 5).join(", ")}\n`;
    }

    if (active.length > 0) {
      userPrompt += `Already enjoying: ${active.slice(0, 3).join(", ")}\n`;
    }

    userPrompt += `\nProvide 2-3 personalized suggestions. Keep rationales to 1-2 short sentences that speak directly to the couple. Suggested actions should be simple and specific.\n\n`;
    userPrompt += `IMPORTANT: Respond with ONLY valid JSON in this exact format:\n`;
    userPrompt += `{\n`;
    userPrompt += `  "recommendations": [\n`;
    userPrompt += `    {\n`;
    userPrompt += `      "tool_name": "name of the tool",\n`;
    userPrompt += `      "rationale": "Brief, warm explanation (1-2 sentences addressing 'you')",\n`;
    userPrompt += `      "suggested_action": "Simple action to try this week"\n`;
    userPrompt += `    }\n`;
    userPrompt += `  ]\n`;
    userPrompt += `}\n`;
    userPrompt += `Return ONLY the JSON, no additional text or markdown formatting.`;

    // Call Perplexity AI
    const analysisResult = await analyzeCheckInsWithPerplexity({
      systemPrompt,
      userPrompt,
    });

    const aiFullResponse = analysisResult.content;

    let parsed;
    try {
      parsed = safeJsonParse(aiFullResponse);

      if (
        !parsed ||
        !parsed.recommendations ||
        !Array.isArray(parsed.recommendations)
      ) {
        throw new Error("Invalid AI response structure");
      }
    } catch (parseError: any) {
      console.error(
        "Failed to parse AI exercise recommendations:",
        parseError.message,
        aiFullResponse,
      );
      return res.status(500).json({
        error: "Failed to parse AI response. Please try again.",
        details: parseError.message,
      });
    }

    // Parse AI response to extract recommendations
    const recommendations: Array<{
      tool_name: string;
      rationale: string;
      suggested_action: string;
    }> = parsed.recommendations;

    // Build response
    const response = {
      couple_id: coupleId,
      generated_at: new Date().toISOString(),
      activity_summary: {
        not_started: notStarted.map((t) => t.replace(/ \(\d+ uses\)/, "")),
        underutilized: underutilized.map((t) => t.replace(/ \(\d+ uses\)/, "")),
        active: active.map((t) => t.replace(/ \(\d+ uses\)/, "")),
      },
      recommendations,
      ai_full_response: aiFullResponse,
      usage: analysisResult.usage,
    };

    // Cache the result
    recommendationsCache.set(cacheKey, {
      data: response,
      timestamp: Date.now(),
    });

    res.json(response);
  } catch (error: any) {
    console.error("AI Exercise Recommendations error:", error);
    res.status(500).json({
      error: error.message || "Failed to generate exercise recommendations",
    });
  }
});

// AI ECHO & EMPATHY COACHING (Real-time active listening feedback)
aiRouter.post("/echo-coaching", async (req, res) => {
  try {
    // Verify user session
    const authResult = await verifyUserSession(req);
    if (!authResult.success) {
      return res.status(authResult.status).json({ error: authResult.error });
    }

    const { userId, coupleId } = authResult;

    // Validate request body with size limits to prevent Perplexity token overflow
    const requestSchema = z.object({
      session_id: z.string().uuid("Invalid session ID"),
      turn_id: z.string().uuid("Invalid turn ID"),
      speaker_message: z
        .string()
        .min(1, "Speaker message is required")
        .max(2000, "Speaker message too long (max 2000 characters)"),
      listener_response: z
        .string()
        .min(1, "Listener response is required")
        .max(2000, "Listener response too long (max 2000 characters)"),
    });

    const validationResult = requestSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: validationResult.error.errors[0].message,
      });
    }

    const { session_id, turn_id, speaker_message, listener_response } =
      validationResult.data;

    // Check cache first
    const cacheKey = `echo-coaching:${session_id}:${turn_id}`;
    const cached = echoCoachingCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < ECHO_COACHING_CACHE_TTL_MS) {
      return res.json(cached.data);
    }

    // Verify session exists and belongs to user's couple
    const { data: session, error: sessionError } = await supabaseAdmin
      .from("Couples_echo_sessions")
      .select("*")
      .eq("id", session_id)
      .single();

    if (sessionError || !session) {
      return res.status(404).json({ error: "Session not found" });
    }

    if (session.couple_id !== coupleId) {
      return res.status(403).json({
        error: "Unauthorized: Session does not belong to your couple",
      });
    }

    // Verify user is the listener in this session
    if (session.listener_id !== userId) {
      return res.status(403).json({
        error:
          "Unauthorized: You must be the listener in this session to receive coaching",
      });
    }

    // Verify turn exists and belongs to this session
    const { data: turn, error: turnError } = await supabaseAdmin
      .from("Couples_echo_turns")
      .select("*")
      .eq("id", turn_id)
      .single();

    if (turnError || !turn) {
      return res.status(404).json({ error: "Turn not found" });
    }

    if (turn.session_id !== session_id) {
      return res.status(403).json({
        error: "Unauthorized: Turn does not belong to this session",
      });
    }

    // Build Perplexity prompts
    const systemPrompt =
      "You are an expert communication coach specializing in active listening skills for couples. Your role is to provide constructive, encouraging feedback on how well the listener demonstrated active listening. Be supportive and specific.";

    const userPrompt = `SPEAKER SAID:
"${speaker_message}"

LISTENER RESPONDED:
"${listener_response}"

Analyze the listener's response and provide:

1. WHAT WENT WELL (2-3 specific positives about their active listening)
2. AREAS TO IMPROVE (1-2 gentle suggestions)
3. SUGGESTED BETTER RESPONSE (one example of how they could have responded even better)

Active listening checklist:
✓ Paraphrased the speaker's words
✓ Reflected the speaker's emotions
✓ Avoided defensiveness or problem-solving
✓ Asked clarifying questions
✓ Showed empathy and validation
✓ Used "I hear..." or "It sounds like..." language

Be encouraging and constructive. Focus on growth.`;

    // Call Perplexity AI
    const analysisResult = await analyzeCheckInsWithPerplexity({
      systemPrompt,
      userPrompt,
    });

    const aiFullResponse = analysisResult.content;
    const parsed = safeJsonParse(aiFullResponse);

    if (!parsed) {
      return res.status(500).json({ error: "Failed to parse AI response" });
    }

    // Parse AI response to extract structured feedback
    const whatWentWell: string[] = parsed.what_went_well || [
      "You showed effort in responding to your partner.",
    ];
    const areasToImprove: string[] = parsed.areas_to_improve || [
      "Continue practicing active listening techniques.",
    ];
    let suggestedResponse =
      parsed.suggested_response ||
      "Try incorporating more reflective statements like 'It sounds like you're feeling...'";

    // Calculate overall score (1-10) based on positive indicators
    // Count positive indicators mentioned in the response
    const positiveKeywords = [
      "paraphras",
      "reflect",
      "empathy",
      "validat",
      "acknowledg",
      "understand",
      "hear",
      "sounds like",
      "feel",
      "clarif",
    ];

    let positiveCount = 0;
    const lowerResponse = listener_response.toLowerCase();
    const lowerAiResponse = aiFullResponse.toLowerCase();

    positiveKeywords.forEach((keyword) => {
      if (
        lowerResponse.includes(keyword) ||
        lowerAiResponse.includes(keyword)
      ) {
        positiveCount++;
      }
    });

    // Score from 6-10 based on positive indicators and feedback
    // Start at 6 (baseline), add up to 4 points based on quality
    const baseScore = 6;
    const bonusPoints = Math.min(4, Math.floor(positiveCount / 2));
    const overallScore = Math.min(10, baseScore + bonusPoints);

    // Build response
    const response = {
      session_id,
      turn_id,
      feedback: {
        what_went_well: whatWentWell,
        areas_to_improve: areasToImprove,
        suggested_response:
          suggestedResponse || "Continue practicing empathetic responses.",
      },
      overall_score: overallScore,
      ai_full_response: aiFullResponse,
      usage: analysisResult.usage,
    };

    // Cache the result
    echoCoachingCache.set(cacheKey, {
      data: response,
      timestamp: Date.now(),
    });

    res.json(response);
  } catch (error: any) {
    console.error("AI Echo Coaching error:", error);
    res.status(500).json({
      error: error.message || "Failed to generate coaching feedback",
    });
  }
});

// AI VOICE MEMO SENTIMENT ANALYSIS
aiRouter.post("/voice-memo-sentiment", async (req, res) => {
  try {
    // Verify user session
    const authResult = await verifyUserSession(req);
    if (!authResult.success) {
      return res.status(authResult.status).json({ error: authResult.error });
    }

    const { userId, coupleId } = authResult;

    // Validate request body
    const requestSchema = z.object({
      memo_id: z.string().uuid("Invalid memo ID"),
    });

    const validationResult = requestSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: validationResult.error.errors[0].message,
      });
    }

    const { memo_id } = validationResult.data;

    // Check cache first
    const cacheKey = `voice-sentiment:${memo_id}`;
    const cached = voiceSentimentCache.get(cacheKey);
    if (
      cached &&
      Date.now() - cached.timestamp < VOICE_SENTIMENT_CACHE_TTL_MS
    ) {
      return res.json(cached.data);
    }

    // Fetch memo from database
    const { data: memo, error: memoError } = await supabaseAdmin
      .from("Couples_voice_memos")
      .select("*")
      .eq("id", memo_id)
      .single();

    if (memoError || !memo) {
      return res.status(404).json({ error: "Voice memo not found" });
    }

    // Verify memo belongs to user's couple
    if (memo.couple_id !== coupleId) {
      return res.status(403).json({
        error: "Unauthorized: Memo does not belong to your couple",
      });
    }

    // Verify user is the sender of the memo
    if (memo.sender_id !== userId) {
      return res.status(403).json({
        error:
          "Unauthorized: You must be the sender of this memo to analyze it",
      });
    }

    // Check if transcript is available
    if (!memo.transcript_text || memo.transcript_text.trim() === "") {
      return res.status(400).json({
        error: "Transcript not available yet. Please try again later.",
      });
    }

    // Validate transcript size to prevent Perplexity token overflow
    if (memo.transcript_text.length > 5000) {
      return res.status(413).json({
        error:
          "Voice memo transcript is too long for AI analysis (max 5000 characters). Please keep voice memos under 5 minutes.",
      });
    }

    // Build Perplexity prompts
    const systemPrompt =
      "You are a compassionate communication coach helping couples express love and appreciation. Analyze the tone and sentiment of voice messages and provide gentle, supportive feedback. Be kind and encouraging.";

    const userPrompt = `Analyze the tone and sentiment of this voice message sent from one partner to another:

"${memo.transcript_text}"

Provide:
1. OVERALL TONE (one word: loving, appreciative, neutral, concerned, frustrated, etc.)
2. SENTIMENT SCORE (1-10, where 10 is most positive/loving)
3. WHAT'S WORKING (1-2 things that feel warm and connective)
4. GENTLE SUGGESTIONS (0-1 optional suggestions only if the tone could be softer or more appreciative)
5. ENCOURAGEMENT (One sentence of positive reinforcement)

Be very gentle. Focus on the positive. Only suggest improvements if truly needed.`;

    // Call Perplexity AI
    const analysisResult = await analyzeCheckInsWithPerplexity({
      systemPrompt,
      userPrompt,
    });

    const aiFullResponse = analysisResult.content;
    const parsed = safeJsonParse(aiFullResponse);

    if (!parsed) {
      return res.status(500).json({ error: "Failed to parse AI response" });
    }

    // Build response
    const response = {
      memo_id,
      tone: parsed.tone || "neutral",
      sentiment_score: Math.max(1, Math.min(10, parsed.sentiment_score || 7)),
      whats_working: parsed.whats_working || [
        "Your message shows genuine effort to connect with your partner.",
      ],
      gentle_suggestions: parsed.gentle_suggestions || [],
      encouragement:
        parsed.encouragement || "Keep expressing yourself authentically!",
      ai_full_response: aiFullResponse,
      usage: analysisResult.usage,
    };

    // Cache the result (24-hour TTL since transcript doesn't change)
    voiceSentimentCache.set(cacheKey, {
      data: response,
      timestamp: Date.now(),
    });

    res.json(response);
  } catch (error: any) {
    console.error("AI Voice Memo Sentiment error:", error);
    res.status(500).json({
      error: error.message || "Failed to analyze voice memo sentiment",
    });
  }
});

// DATE NIGHT GENERATOR (Connection Concierge)
const dateNightPreferencesSchema = z.object({
  time: z.string().min(1, "Time preference is required"),
  location: z.string().min(1, "Location preference is required"),
  price: z.string().min(1, "Price preference is required"),
  participants: z.string().min(1, "Participants preference is required"),
  energy: z.string().min(1, "Energy level preference is required"),
});

aiRouter.post("/date-night", async (req, res) => {
  try {
    // Verify user session (client only, not therapist)
    const authResult = await verifyUserSession(req);
    if (!authResult.success) {
      return res.status(authResult.status).json({ error: authResult.error });
    }

    // Validate request body
    const validationResult = dateNightPreferencesSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: "Invalid preferences",
        details: validationResult.error.format(),
      });
    }

    const { time, location, price, participants, energy } =
      validationResult.data;

    // System prompt for the Connection Concierge
    const systemPrompt = `You are the "Connection Concierge," an AI assistant that helps couples design meaningful date nights. Your goal is to create positive memories and strengthen connections.

When given preferences (time, location, price, participants, energy level), you MUST generate exactly 3 distinct date night ideas.

Format each idea EXACTLY as follows:
✨ [Title of Date]
Description: [1-2 sentence summary]
Connection Tip: [Simple, actionable prompt to help the couple connect during the date]

Example Connection Tips:
- "While you cook, take turns sharing one small thing you appreciated about each other this week."
- "After the movie, spend 10 minutes (no phones!) sharing your favorite part of the film and why it resonated with you."
- "As you walk, try to find 3 'shared' things you both find beautiful or interesting."

Be warm, creative, and encouraging. Emphasize connection, fun, and breaking routines.`;

    // User message with preferences
    const userPrompt = `Generate 3 date night ideas with these preferences:
- Time available: ${time}
- Location: ${location}
- Budget: ${price}
- Participants: ${participants}
- Energy level: ${energy}`;

    // Call Perplexity API with custom temperature and max_tokens
    const apiKey = process.env.PERPLEXITY_API_KEY;
    if (!apiKey) {
      return res
        .status(500)
        .json({ error: "Perplexity API key not configured" });
    }

    const perplexityRequest = {
      model: "sonar",
      messages: [
        { role: "system" as const, content: systemPrompt },
        { role: "user" as const, content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 1500,
      stream: false,
    };

    const response = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(perplexityRequest),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Perplexity API error (${response.status}): ${errorText}`,
      );
    }

    const data = await response.json();

    if (!data.choices || data.choices.length === 0) {
      throw new Error("Perplexity API returned no choices");
    }

    const content = data.choices[0].message.content;
    const parsed = safeJsonParse(content);

    // Return the generated content
    res.json({
      content: parsed || content,
      citations: data.citations,
    });
  } catch (error: any) {
    console.error("Date night generation error:", error);
    res.status(500).json({
      error: error.message || "Failed to generate date night ideas",
    });
  }
});

export default aiRouter;

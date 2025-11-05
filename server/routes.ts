import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { supabaseAdmin } from "./supabase";
import type { TherapistAnalytics, CoupleAnalytics } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // THERAPIST ANALYTICS ENDPOINT
  app.get("/api/therapist/analytics", async (req, res) => {
    try {
      const therapistId = req.query.therapist_id as string;

      if (!therapistId) {
        return res.status(400).json({ error: "therapist_id is required" });
      }

      // Get all couples for this therapist
      const { data: couples, error: couplesError } = await supabaseAdmin
        .from('Couples_couples')
        .select('*')
        .eq('therapist_id', therapistId);

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

      const coupleIds = couples.map(c => c.id);
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

      // Fetch all profiles for partner names
      const { data: profiles } = await supabaseAdmin
        .from('Couples_profiles')
        .select('*')
        .in('couple_id', coupleIds);

      // Fetch all activity data in parallel
      const [
        { data: allCheckins },
        { data: allGratitude },
        { data: allGoals },
        { data: allConversations },
        { data: allRituals },
        { data: therapistComments },
      ] = await Promise.all([
        supabaseAdmin.from('Couples_weekly_checkins').select('*').in('couple_id', coupleIds),
        supabaseAdmin.from('Couples_gratitude_logs').select('*').in('couple_id', coupleIds),
        supabaseAdmin.from('Couples_shared_goals').select('*').in('couple_id', coupleIds),
        supabaseAdmin.from('Couples_conversations').select('*').in('couple_id', coupleIds),
        supabaseAdmin.from('Couples_rituals').select('*').in('couple_id', coupleIds),
        supabaseAdmin.from('Couples_therapist_comments').select('*').eq('therapist_id', therapistId),
      ]);

      // Calculate per-couple analytics
      const coupleAnalytics: CoupleAnalytics[] = couples.map(couple => {
        const partner1 = profiles?.find(p => p.id === couple.partner1_id);
        const partner2 = profiles?.find(p => p.id === couple.partner2_id);

        const checkins = allCheckins?.filter(c => c.couple_id === couple.id) || [];
        const gratitude = allGratitude?.filter(g => g.couple_id === couple.id) || [];
        const goals = allGoals?.filter(g => g.couple_id === couple.id) || [];
        const conversations = allConversations?.filter(c => c.couple_id === couple.id) || [];
        const rituals = allRituals?.filter(r => r.couple_id === couple.id) || [];

        // Calculate check-in completion rate (past 4 weeks)
        const currentDate = new Date();
        const fourWeeksAgo = new Date(currentDate.getTime() - 28 * 24 * 60 * 60 * 1000);
        const recentCheckins = checkins.filter(c => new Date(c.created_at) >= fourWeeksAgo);
        
        // Group by week and count unique users
        const weekGroups = recentCheckins.reduce((acc, c) => {
          const key = `${c.year}-${c.week_number}`;
          if (!acc[key]) acc[key] = new Set();
          acc[key].add(c.user_id);
          return acc;
        }, {} as Record<string, Set<string>>);

        const distinctWeeks = Object.keys(weekGroups).length;
        const weeksWithBothPartners = Object.values(weekGroups).filter(s => s.size === 2).length;
        // Use actual distinct weeks as denominator, minimum 1 to avoid division by zero
        const denominator = Math.max(distinctWeeks, 1);
        const checkinCompletionRate = Math.min(Math.round((weeksWithBothPartners / denominator) * 100), 100);

        // Calculate average scores
        const connectednessScores = checkins.map(c => c.q_connectedness).filter(Boolean);
        const conflictScores = checkins.map(c => c.q_conflict).filter(Boolean);
        const avgConnectedness = connectednessScores.length > 0
          ? Math.round((connectednessScores.reduce((a, b) => a + b, 0) / connectednessScores.length) * 10) / 10
          : 0;
        const avgConflict = conflictScores.length > 0
          ? Math.round((conflictScores.reduce((a, b) => a + b, 0) / conflictScores.length) * 10) / 10
          : 0;

        // Find last activity date
        const allDates = [
          ...checkins.map(c => c.created_at),
          ...gratitude.map(g => g.created_at),
          ...goals.map(g => g.created_at),
          ...conversations.map(c => c.created_at),
        ].filter(Boolean).map(d => new Date(d).getTime());
        
        const lastActivityDate = allDates.length > 0
          ? new Date(Math.max(...allDates)).toISOString()
          : null;

        // Calculate engagement score (0-100) - all metrics use last 30 days for consistency
        // Weighted: checkins (40%), gratitude (20%), goals (20%), conversations (10%), rituals (10%)
        const thirtyDaysAgoTime = currentDate.getTime() - 30 * 24 * 60 * 60 * 1000;
        const checkinsThisMonth = checkins.filter(c => new Date(c.created_at).getTime() >= thirtyDaysAgoTime).length;
        const gratitudeThisMonth = gratitude.filter(g => new Date(g.created_at).getTime() >= thirtyDaysAgoTime).length;
        const goalsCompletedThisMonth = goals.filter(g => g.status === 'done' && new Date(g.created_at).getTime() >= thirtyDaysAgoTime).length;
        const conversationsThisMonth = conversations.filter(c => new Date(c.created_at).getTime() >= thirtyDaysAgoTime).length;
        const ritualsThisMonth = rituals.filter(r => new Date(r.created_at || 0).getTime() >= thirtyDaysAgoTime).length;
        
        const checkinScore = Math.min((checkinsThisMonth / 8) * 40, 40); // 8 checkins/month = full score
        const gratitudeScore = Math.min((gratitudeThisMonth / 20) * 20, 20); // 20/month = full score
        const goalScore = Math.min((goalsCompletedThisMonth / 5) * 20, 20); // 5/month = full score
        const conversationScore = Math.min((conversationsThisMonth / 3) * 10, 10); // 3/month = full score
        const ritualScore = Math.min((ritualsThisMonth / 4) * 10, 10); // 4/month = full score
        
        const engagementScore = Math.round(checkinScore + gratitudeScore + goalScore + conversationScore + ritualScore);

        return {
          couple_id: couple.id,
          partner1_name: partner1?.full_name || 'Partner 1',
          partner2_name: partner2?.full_name || 'Partner 2',
          total_checkins: checkins.length,
          checkins_this_month: checkinsThisMonth,
          checkin_completion_rate: checkinCompletionRate,
          gratitude_count: gratitude.length,
          goals_total: goals.length,
          goals_completed: goals.filter(g => g.status === 'done').length,
          conversations_count: conversations.length,
          rituals_count: rituals.length,
          avg_connectedness: avgConnectedness,
          avg_conflict: avgConflict,
          last_activity_date: lastActivityDate,
          engagement_score: engagementScore,
        };
      });

      // Calculate therapist-wide stats
      const activeCouples = coupleAnalytics.filter(c => {
        return c.last_activity_date && new Date(c.last_activity_date) >= new Date(thirtyDaysAgo);
      }).length;

      const overallCheckinRate = coupleAnalytics.length > 0
        ? Math.round(coupleAnalytics.reduce((sum, c) => sum + c.checkin_completion_rate, 0) / coupleAnalytics.length)
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
      console.error('Analytics error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}

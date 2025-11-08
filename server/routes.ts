import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { supabaseAdmin } from "./supabase";
import type { TherapistAnalytics, CoupleAnalytics, AIInsight, InsertVoiceMemo, VoiceMemo } from "@shared/schema";
import { insertVoiceMemoSchema, insertCalendarEventSchema } from "@shared/schema";
import { analyzeCheckInsWithPerplexity } from "./perplexity";
import { generateCoupleReport } from "./csv-export";
import { generateVoiceMemoUploadUrl, generateVoiceMemoDownloadUrl, deleteVoiceMemo } from "./storage-helpers";
import { z } from "zod";
import crypto from "crypto";

// Helper function to extract access token from request (Authorization header or cookies)
function getAccessToken(req: Request): string | null {
  // First, try to get token from Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Fallback to cookies
  const cookies = req.headers.cookie;
  if (!cookies) return null;

  const cookieArray = cookies.split(';');
  for (const cookie of cookieArray) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'sb-access-token' || name.includes('access-token')) {
      return value;
    }
  }
  return null;
}

// Helper function to verify session and check if user is a therapist
async function verifyTherapistSession(req: Request): Promise<{ success: false; error: string; status: number } | { success: true; therapistId: string }> {
  const accessToken = getAccessToken(req);

  if (!accessToken) {
    return {
      success: false,
      error: 'No session found. Please log in.',
      status: 401
    };
  }

  // Verify the access token with Supabase
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(accessToken);

  if (authError || !user) {
    return {
      success: false,
      error: 'Invalid or expired session. Please log in again.',
      status: 401
    };
  }

  // Verify user has therapist role
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('Couples_profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    return {
      success: false,
      error: 'User profile not found.',
      status: 403
    };
  }

  if (profile.role !== 'therapist') {
    return {
      success: false,
      error: 'Access denied. Only therapists can perform this action.',
      status: 403
    };
  }

  return {
    success: true,
    therapistId: user.id
  };
}

// Helper function to verify session for regular client users
async function verifyUserSession(req: Request): Promise<{ success: false; error: string; status: number } | { success: true; userId: string; coupleId: string; partnerId: string }> {
  const accessToken = getAccessToken(req);

  if (!accessToken) {
    return {
      success: false,
      error: 'No session found. Please log in.',
      status: 401
    };
  }

  // Verify the access token with Supabase
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(accessToken);

  if (authError || !user) {
    return {
      success: false,
      error: 'Invalid or expired session. Please log in again.',
      status: 401
    };
  }

  // Get user profile and couple information
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('Couples_profiles')
    .select('role, couple_id')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    return {
      success: false,
      error: 'User profile not found.',
      status: 403
    };
  }

  if (!profile.couple_id) {
    return {
      success: false,
      error: 'User is not part of a couple.',
      status: 403
    };
  }

  // Get couple details to find partner
  const { data: couple, error: coupleError } = await supabaseAdmin
    .from('Couples_couples')
    .select('partner1_id, partner2_id')
    .eq('id', profile.couple_id)
    .single();

  if (coupleError || !couple) {
    return {
      success: false,
      error: 'Couple not found.',
      status: 404
    };
  }

  // Determine partner ID
  const partnerId = couple.partner1_id === user.id ? couple.partner2_id : couple.partner1_id;

  return {
    success: true,
    userId: user.id,
    coupleId: profile.couple_id,
    partnerId: partnerId
  };
}

export async function registerRoutes(app: Express): Promise<Server> {
  // ==============================================
  // AI ENDPOINTS
  // ==============================================

  // THERAPIST ANALYTICS (AI-Powered)
  app.get("/api/ai/analytics", async (req, res) => {
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
        const weeksWithBothPartners = (Object.values(weekGroups) as Set<string>[]).filter(s => s.size === 2).length;
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

  // Simple in-memory cache for AI insights (5-minute TTL)
  // This prevents expensive repeated API calls and provides basic rate limiting
  const aiInsightsCache = new Map<string, { data: AIInsight; timestamp: number }>();
  const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

  // AI INSIGHTS (Clinical Insights from Check-ins)
  // SECURITY NOTE: In production, therapist_id should come from authenticated session,
  // not from query parameters. This implementation assumes frontend authentication.
  app.get("/api/ai/insights", async (req, res) => {
    try {
      const coupleId = req.query.couple_id as string;
      const therapistId = req.query.therapist_id as string;

      if (!coupleId || !therapistId) {
        return res.status(400).json({ 
          error: "couple_id and therapist_id are required" 
        });
      }

      // Check cache first to prevent expensive duplicate API calls
      const cacheKey = `${therapistId}:${coupleId}`;
      const cached = aiInsightsCache.get(cacheKey);
      if (cached && (Date.now() - cached.timestamp) < CACHE_TTL_MS) {
        return res.json(cached.data);
      }

      // 1. Validate therapist has access to this couple
      const { data: couple, error: coupleError } = await supabaseAdmin
        .from('Couples_couples')
        .select('*')
        .eq('id', coupleId)
        .single();

      if (coupleError || !couple) {
        return res.status(404).json({ error: "Couple not found" });
      }

      if (couple.therapist_id !== therapistId) {
        return res.status(403).json({ 
          error: "You don't have access to this couple's data" 
        });
      }

      // 2. Fetch last 8-12 weeks of check-ins for BOTH partners
      const twelveWeeksAgo = new Date();
      twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - 84); // 12 weeks

      const { data: checkins, error: checkinsError } = await supabaseAdmin
        .from('Couples_weekly_checkins')
        .select('*')
        .eq('couple_id', coupleId)
        .gte('created_at', twelveWeeksAgo.toISOString())
        .order('year', { ascending: true })
        .order('week_number', { ascending: true });

      if (checkinsError) {
        throw checkinsError;
      }

      if (!checkins || checkins.length === 0) {
        return res.status(400).json({ 
          error: "No check-in data available for this couple in the last 12 weeks" 
        });
      }

      // 3. Format data for Perplexity AI analysis
      // PRIVACY: Use anonymized labels instead of actual names when sending to external AI service
      const weeklyData: Record<string, any[]> = {};
      
      checkins.forEach(checkin => {
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
      sortedWeeks.forEach(weekKey => {
        const weekCheckins = weeklyData[weekKey];
        const [year, weekNum] = weekKey.split('-W');
        const sampleDate = weekCheckins[0]?.createdAt ? 
          new Date(weekCheckins[0].createdAt).toLocaleDateString() : '';

        userPrompt += `Week ${weekNum}, ${year} (${sampleDate}):\n`;

        weekCheckins.forEach(checkin => {
          userPrompt += `- ${checkin.partnerLabel}: Connectedness: ${checkin.connectedness}/10, Conflict: ${checkin.conflict}/10\n`;
          userPrompt += `  Appreciation: "${checkin.appreciation}"\n`;
          userPrompt += `  Regrettable Incident: "${checkin.regrettableIncident}"\n`;
          userPrompt += `  Need: "${checkin.need}"\n`;
        });

        userPrompt += '\n';
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
      
      // Simple parsing - extract sections (this is a basic implementation)
      // In a production system, you might want more sophisticated parsing
      const lines = rawAnalysis.split('\n').filter(line => line.trim());
      
      let summary = '';
      const discrepancies: string[] = [];
      const patterns: string[] = [];
      const recommendations: string[] = [];
      
      let currentSection = '';
      
      lines.forEach(line => {
        const lowerLine = line.toLowerCase();
        
        if (lowerLine.includes('summary') || lowerLine.includes('dynamic')) {
          currentSection = 'summary';
        } else if (lowerLine.includes('discrepanc')) {
          currentSection = 'discrepancies';
        } else if (lowerLine.includes('pattern') || lowerLine.includes('trend')) {
          currentSection = 'patterns';
        } else if (lowerLine.includes('recommendation') || lowerLine.includes('therapeutic')) {
          currentSection = 'recommendations';
        } else if (line.trim().match(/^[\d\-\*•]/)) {
          // This is a list item
          const cleanedLine = line.trim().replace(/^[\d\-\*•.)\s]+/, '');
          if (currentSection === 'discrepancies') {
            discrepancies.push(cleanedLine);
          } else if (currentSection === 'patterns') {
            patterns.push(cleanedLine);
          } else if (currentSection === 'recommendations') {
            recommendations.push(cleanedLine);
          }
        } else if (currentSection === 'summary' && line.trim()) {
          summary += line.trim() + ' ';
        }
      });

      // If parsing didn't work well, provide fallback
      if (!summary) {
        summary = rawAnalysis.substring(0, 300) + '...';
      }
      if (discrepancies.length === 0) {
        discrepancies.push('Analysis completed - see raw analysis for details');
      }
      if (patterns.length === 0) {
        patterns.push('Analysis completed - see raw analysis for details');
      }
      if (recommendations.length === 0) {
        recommendations.push('Analysis completed - see raw analysis for details');
      }

      const insights: AIInsight = {
        couple_id: coupleId,
        generated_at: new Date().toISOString(),
        summary: summary.trim(),
        discrepancies,
        patterns,
        recommendations,
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
      console.error('AI Insights error:', error);
      res.status(500).json({ 
        error: error.message || 'Failed to generate AI insights' 
      });
    }
  });

  // CSV EXPORT ENDPOINT
  // SECURITY NOTE: In production, therapist_id should come from authenticated session,
  // not from query parameters. This implementation assumes frontend authentication.
  app.get("/api/therapist/export-couple-report", async (req, res) => {
    try {
      const coupleId = req.query.couple_id as string;
      const therapistId = req.query.therapist_id as string;
      const format = req.query.format as string;

      // Validate required parameters
      if (!coupleId || !therapistId) {
        return res.status(400).json({ 
          error: "couple_id and therapist_id are required" 
        });
      }

      if (format && format !== 'csv') {
        return res.status(400).json({ 
          error: "Only CSV format is currently supported" 
        });
      }

      // 1. Validate therapist has access to this couple
      const { data: couple, error: coupleError } = await supabaseAdmin
        .from('Couples_couples')
        .select('*')
        .eq('id', coupleId)
        .single();

      if (coupleError || !couple) {
        return res.status(404).json({ error: "Couple not found" });
      }

      if (couple.therapist_id !== therapistId) {
        return res.status(403).json({ 
          error: "Unauthorized: You don't have access to this couple's data" 
        });
      }

      // 2. Fetch all necessary data in parallel
      const [
        { data: profiles },
        { data: therapistProfile },
        { data: checkins },
        { data: gratitudeLogs },
        { data: sharedGoals },
        { data: conversations },
        { data: rituals },
      ] = await Promise.all([
        supabaseAdmin
          .from('Couples_profiles')
          .select('*')
          .in('id', [couple.partner1_id, couple.partner2_id]),
        supabaseAdmin
          .from('Couples_profiles')
          .select('full_name')
          .eq('id', therapistId)
          .single(),
        supabaseAdmin
          .from('Couples_weekly_checkins')
          .select('*')
          .eq('couple_id', coupleId)
          .order('year', { ascending: true })
          .order('week_number', { ascending: true }),
        supabaseAdmin
          .from('Couples_gratitude_logs')
          .select('*')
          .eq('couple_id', coupleId)
          .order('created_at', { ascending: true }),
        supabaseAdmin
          .from('Couples_shared_goals')
          .select('*')
          .eq('couple_id', coupleId)
          .order('created_at', { ascending: true }),
        supabaseAdmin
          .from('Couples_conversations')
          .select('*')
          .eq('couple_id', coupleId)
          .order('created_at', { ascending: true }),
        supabaseAdmin
          .from('Couples_rituals')
          .select('*')
          .eq('couple_id', coupleId),
      ]);

      // 3. Organize profiles
      const partner1 = profiles?.find(p => p.id === couple.partner1_id);
      const partner2 = profiles?.find(p => p.id === couple.partner2_id);

      if (!partner1 || !partner2) {
        return res.status(500).json({ 
          error: "Failed to retrieve partner profiles" 
        });
      }

      // 4. Transform data for CSV generation
      const reportData = {
        couple: {
          id: coupleId,
          partner1_name: partner1.full_name || 'Partner 1',
          partner2_name: partner2.full_name || 'Partner 2',
          therapist_name: therapistProfile?.full_name || 'Therapist',
        },
        weeklyCheckins: (checkins || []).map(checkin => ({
          week_number: checkin.week_number,
          year: checkin.year,
          created_at: checkin.created_at,
          partner: (checkin.user_id === couple.partner1_id ? 1 : 2) as 1 | 2,
          q_connectedness: checkin.q_connectedness,
          q_conflict: checkin.q_conflict,
          q_appreciation: checkin.q_appreciation,
          q_regrettable_incident: checkin.q_regrettable_incident,
          q_my_need: checkin.q_my_need,
        })),
        gratitudeLogs: (gratitudeLogs || []).map(log => ({
          created_at: log.created_at,
          partner: (log.user_id === couple.partner1_id ? 1 : 2) as 1 | 2,
          text_content: log.text_content,
          image_url: log.image_url,
        })),
        sharedGoals: (sharedGoals || []).map(goal => ({
          title: goal.title,
          status: goal.status,
          created_at: goal.created_at,
          completed_at: goal.completed_at || null,
        })),
        conversations: (conversations || []).map(conv => ({
          conversation_type: conv.conversation_type || 'Hold Me Tight',
          created_at: conv.created_at,
          notes_summary: [
            conv.initiator_statement_feel,
            conv.initiator_statement_need,
            conv.partner_reflection,
            conv.partner_response,
          ].filter(Boolean).join(' | '),
        })),
        rituals: (rituals || []).map(ritual => ({
          category: ritual.category,
          description: ritual.description,
          created_at: ritual.created_at,
        })),
      };

      // 5. Generate CSV
      const csvContent = generateCoupleReport(reportData);

      // 6. Set headers for file download
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader(
        'Content-Disposition', 
        `attachment; filename="couple-report-${coupleId}-${Date.now()}.csv"`
      );

      // 7. Send CSV
      res.send(csvContent);
    } catch (error: any) {
      console.error('CSV Export error:', error);
      res.status(500).json({ 
        error: error.message || 'Failed to generate CSV export' 
      });
    }
  });

  // VALIDATION SCHEMAS FOR USER MANAGEMENT
  const createCoupleSchema = z.object({
    partner1_email: z.string().email(),
    partner1_password: z.string().min(6),
    partner1_name: z.string().min(1),
    partner2_email: z.string().email(),
    partner2_password: z.string().min(6),
    partner2_name: z.string().min(1),
  });

  const createTherapistSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
    full_name: z.string().min(1),
  });

  // CREATE COUPLE ENDPOINT
  app.post("/api/therapist/create-couple", async (req, res) => {
    try {
      // Verify session and therapist authorization
      const authResult = await verifyTherapistSession(req);
      if (!authResult.success) {
        return res.status(authResult.status).json({ error: authResult.error });
      }

      const therapistId = authResult.therapistId;

      // Validate request body (therapist_id no longer accepted from client)
      const validatedData = createCoupleSchema.parse(req.body);

      // Create auth user for Partner 1
      const { data: partner1Auth, error: partner1AuthError } = await supabaseAdmin.auth.admin.createUser({
        email: validatedData.partner1_email,
        password: validatedData.partner1_password,
        email_confirm: true,
      });

      if (partner1AuthError) {
        return res.status(400).json({ error: `Failed to create Partner 1: ${partner1AuthError.message}` });
      }

      // Create auth user for Partner 2
      const { data: partner2Auth, error: partner2AuthError } = await supabaseAdmin.auth.admin.createUser({
        email: validatedData.partner2_email,
        password: validatedData.partner2_password,
        email_confirm: true,
      });

      if (partner2AuthError) {
        // Rollback: delete partner1 if partner2 creation fails
        await supabaseAdmin.auth.admin.deleteUser(partner1Auth.user.id);
        return res.status(400).json({ error: `Failed to create Partner 2: ${partner2AuthError.message}` });
      }

      // Create couple record using authenticated therapist's ID
      const { data: couple, error: coupleError } = await supabaseAdmin
        .from('Couples_couples')
        .insert({
          partner1_id: partner1Auth.user.id,
          partner2_id: partner2Auth.user.id,
          therapist_id: therapistId,
        })
        .select()
        .single();

      if (coupleError) {
        // Rollback: delete both users
        await supabaseAdmin.auth.admin.deleteUser(partner1Auth.user.id);
        await supabaseAdmin.auth.admin.deleteUser(partner2Auth.user.id);
        return res.status(500).json({ error: `Failed to create couple: ${coupleError.message}` });
      }

      // Generate join code from couple ID
      const joinCode = couple.id.substring(0, 8).toUpperCase();

      // Update couple with join_code
      const { error: joinCodeError } = await supabaseAdmin
        .from('Couples_couples')
        .update({ join_code: joinCode })
        .eq('id', couple.id);

      if (joinCodeError) {
        console.error('Failed to update join_code:', joinCodeError);
      }

      // Create profile for Partner 1
      const { error: profile1Error } = await supabaseAdmin
        .from('Couples_profiles')
        .insert({
          id: partner1Auth.user.id,
          full_name: validatedData.partner1_name,
          role: 'client',
          couple_id: couple.id,
        });

      if (profile1Error) {
        console.error('Failed to create Partner 1 profile:', profile1Error);
      }

      // Create profile for Partner 2
      const { error: profile2Error } = await supabaseAdmin
        .from('Couples_profiles')
        .insert({
          id: partner2Auth.user.id,
          full_name: validatedData.partner2_name,
          role: 'client',
          couple_id: couple.id,
        });

      if (profile2Error) {
        console.error('Failed to create Partner 2 profile:', profile2Error);
      }

      res.json({
        success: true,
        couple: {
          id: couple.id,
          join_code: joinCode,
          partner1_id: partner1Auth.user.id,
          partner1_email: validatedData.partner1_email,
          partner1_name: validatedData.partner1_name,
          partner2_id: partner2Auth.user.id,
          partner2_email: validatedData.partner2_email,
          partner2_name: validatedData.partner2_name,
        },
      });
    } catch (error: any) {
      console.error('Create couple error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors[0].message });
      }
      res.status(500).json({ error: error.message || 'Failed to create couple' });
    }
  });

  // CREATE THERAPIST ENDPOINT
  app.post("/api/therapist/create-therapist", async (req, res) => {
    try {
      // Verify session and therapist authorization
      const authResult = await verifyTherapistSession(req);
      if (!authResult.success) {
        return res.status(authResult.status).json({ error: authResult.error });
      }

      // Validate request body
      const validatedData = createTherapistSchema.parse(req.body);

      // Create auth user for the new therapist
      const { data: therapistAuth, error: therapistAuthError } = await supabaseAdmin.auth.admin.createUser({
        email: validatedData.email,
        password: validatedData.password,
        email_confirm: true,
      });

      if (therapistAuthError) {
        return res.status(400).json({ error: `Failed to create therapist auth: ${therapistAuthError.message}` });
      }

      // Create profile with role='therapist'
      const { error: profileError } = await supabaseAdmin
        .from('Couples_profiles')
        .insert({
          id: therapistAuth.user.id,
          full_name: validatedData.full_name,
          role: 'therapist',
          couple_id: null,
        });

      if (profileError) {
        // Rollback: delete auth user
        await supabaseAdmin.auth.admin.deleteUser(therapistAuth.user.id);
        return res.status(500).json({ error: `Failed to create therapist profile: ${profileError.message}` });
      }

      res.json({
        success: true,
        therapist: {
          id: therapistAuth.user.id,
          email: validatedData.email,
          full_name: validatedData.full_name,
          role: 'therapist',
        },
      });
    } catch (error: any) {
      console.error('Create therapist error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors[0].message });
      }
      res.status(500).json({ error: error.message || 'Failed to create therapist' });
    }
  });

  // ============================================================
  // NEW SECURE INVITATION-BASED COUPLE REGISTRATION
  // ============================================================

  const coupleWithInvitationSchema = z.object({
    invitation_code: z.string().min(1),
    partner1_email: z.string().email(),
    partner1_password: z.string().min(8),
    partner1_name: z.string().min(1),
    partner2_email: z.string().email(),
    partner2_password: z.string().min(8),
    partner2_name: z.string().min(1),
  }).refine(data => data.partner1_email !== data.partner2_email, {
    message: "Partners must have different email addresses",
  });

  // POST /api/public/register-couple - Secure couple registration with invitation code
  app.post("/api/public/register-couple", async (req, res) => {
    try {
      // Validate request body
      const validatedData = coupleWithInvitationSchema.parse(req.body);

      // Step 1: Validate invitation code (using service role for security)
      const { data: invitation, error: codeError } = await supabaseAdmin
        .from('Couples_invitation_codes')
        .select('id, therapist_id, is_active, used_at, expires_at')
        .eq('code', validatedData.invitation_code.trim().toUpperCase())
        .single();

      if (codeError || !invitation) {
        return res.status(400).json({ error: 'Invalid invitation code' });
      }

      if (!invitation.is_active || invitation.used_at) {
        return res.status(400).json({ error: 'This invitation code has already been used' });
      }

      // Check expiration
      if (invitation.expires_at && new Date(invitation.expires_at) < new Date()) {
        return res.status(400).json({ error: 'This invitation code has expired' });
      }

      // Step 2: Create Partner 1 account
      const { data: partner1Auth, error: partner1Error } = await supabaseAdmin.auth.admin.createUser({
        email: validatedData.partner1_email,
        password: validatedData.partner1_password,
        email_confirm: true,
      });

      if (partner1Error) {
        return res.status(400).json({ error: `Failed to create Partner 1: ${partner1Error.message}` });
      }

      // Step 3: Create Partner 2 account
      const { data: partner2Auth, error: partner2Error } = await supabaseAdmin.auth.admin.createUser({
        email: validatedData.partner2_email,
        password: validatedData.partner2_password,
        email_confirm: true,
      });

      if (partner2Error) {
        // Rollback: delete partner1
        await supabaseAdmin.auth.admin.deleteUser(partner1Auth.user.id);
        return res.status(400).json({ error: `Failed to create Partner 2: ${partner2Error.message}` });
      }

      // Step 4: Create couple record
      const { data: couple, error: coupleError } = await supabaseAdmin
        .from('Couples_couples')
        .insert({
          partner1_id: partner1Auth.user.id,
          partner2_id: partner2Auth.user.id,
          therapist_id: invitation.therapist_id,
        })
        .select()
        .single();

      if (coupleError) {
        // Rollback: delete both users
        await supabaseAdmin.auth.admin.deleteUser(partner1Auth.user.id);
        await supabaseAdmin.auth.admin.deleteUser(partner2Auth.user.id);
        return res.status(500).json({ error: `Failed to create couple: ${coupleError.message}` });
      }

      // Step 5: Create profiles for both partners
      const { error: profile1Error } = await supabaseAdmin
        .from('Couples_profiles')
        .insert({
          id: partner1Auth.user.id,
          full_name: validatedData.partner1_name,
          role: 'client',
          couple_id: couple.id,
        });

      if (profile1Error) {
        // Rollback: delete couple and both users
        await supabaseAdmin.from('Couples_couples').delete().eq('id', couple.id);
        await supabaseAdmin.auth.admin.deleteUser(partner1Auth.user.id);
        await supabaseAdmin.auth.admin.deleteUser(partner2Auth.user.id);
        return res.status(500).json({ error: `Failed to create Partner 1 profile: ${profile1Error.message}` });
      }

      const { error: profile2Error } = await supabaseAdmin
        .from('Couples_profiles')
        .insert({
          id: partner2Auth.user.id,
          full_name: validatedData.partner2_name,
          role: 'client',
          couple_id: couple.id,
        });

      if (profile2Error) {
        // Rollback: delete couple, profile1, and both users
        await supabaseAdmin.from('Couples_profiles').delete().eq('id', partner1Auth.user.id);
        await supabaseAdmin.from('Couples_couples').delete().eq('id', couple.id);
        await supabaseAdmin.auth.admin.deleteUser(partner1Auth.user.id);
        await supabaseAdmin.auth.admin.deleteUser(partner2Auth.user.id);
        return res.status(500).json({ error: `Failed to create Partner 2 profile: ${profile2Error.message}` });
      }

      // Step 6: Mark invitation code as used
      const { error: updateCodeError } = await supabaseAdmin
        .from('Couples_invitation_codes')
        .update({
          used_at: new Date().toISOString(),
          used_by_couple_id: couple.id,
          is_active: false,
        })
        .eq('id', invitation.id);

      if (updateCodeError) {
        console.error('Failed to mark invitation code as used:', updateCodeError);
        // Don't rollback - couple is created successfully, just log the error
      }

      res.json({
        success: true,
        message: 'Couple registered successfully',
        couple: {
          id: couple.id,
          partner1_name: validatedData.partner1_name,
          partner2_name: validatedData.partner2_name,
        },
      });
    } catch (error: any) {
      console.error('Couple registration error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors[0].message });
      }
      res.status(500).json({ error: error.message || 'Failed to register couple' });
    }
  });

  // ============================================================
  // JOIN CODE MANAGEMENT AND LINKING ENDPOINTS
  // ============================================================

  // GET /api/therapist/my-couples - Get all couples assigned to current therapist
  app.get("/api/therapist/my-couples", async (req, res) => {
    try {
      // Verify session and therapist authorization
      const authResult = await verifyTherapistSession(req);
      if (!authResult.success) {
        return res.status(authResult.status).json({ error: authResult.error });
      }

      const { therapistId } = authResult;

      // Get all couples for this therapist
      const { data: couples, error: couplesError } = await supabaseAdmin
        .from('Couples_couples')
        .select('id, partner1_id, partner2_id, join_code')
        .eq('therapist_id', therapistId);

      if (couplesError) {
        console.error('Error fetching couples:', couplesError);
        return res.status(500).json({ error: 'Failed to fetch couples' });
      }

      if (!couples || couples.length === 0) {
        return res.json({ couples: [] });
      }

      // Get all partner profiles
      const partnerIds = couples.flatMap(c => [c.partner1_id, c.partner2_id]).filter(Boolean);
      
      const { data: profiles, error: profilesError } = await supabaseAdmin
        .from('Couples_profiles')
        .select('id, full_name')
        .in('id', partnerIds);

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        return res.status(500).json({ error: 'Failed to fetch partner profiles' });
      }

      // Map couples with partner names
      const couplesWithNames = couples.map(couple => {
        const partner1 = profiles?.find(p => p.id === couple.partner1_id);
        const partner2 = profiles?.find(p => p.id === couple.partner2_id);

        return {
          couple_id: couple.id,
          partner1_name: partner1?.full_name || 'Partner 1',
          partner2_name: partner2?.full_name || 'Partner 2',
          join_code: couple.join_code || '',
        };
      });

      res.json({ couples: couplesWithNames });
    } catch (error: any) {
      console.error('Get my couples error:', error);
      res.status(500).json({ error: error.message || 'Failed to fetch couples' });
    }
  });

  // POST /api/therapist/regenerate-join-code - Regenerate join code for a couple
  app.post("/api/therapist/regenerate-join-code", async (req, res) => {
    try {
      // Verify session and therapist authorization
      const authResult = await verifyTherapistSession(req);
      if (!authResult.success) {
        return res.status(authResult.status).json({ error: authResult.error });
      }

      const { therapistId } = authResult;
      const { couple_id } = req.body;

      if (!couple_id) {
        return res.status(400).json({ error: 'couple_id is required' });
      }

      // Verify this couple belongs to the therapist
      const { data: couple, error: coupleError } = await supabaseAdmin
        .from('Couples_couples')
        .select('therapist_id')
        .eq('id', couple_id)
        .single();

      if (coupleError || !couple) {
        return res.status(404).json({ error: 'Couple not found' });
      }

      if (couple.therapist_id !== therapistId) {
        return res.status(403).json({ error: 'You can only regenerate join codes for your own couples' });
      }

      // Generate new 8-character join code (first 8 chars of UUID)
      const newJoinCode = crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase();

      // Update the join code
      const { error: updateError } = await supabaseAdmin
        .from('Couples_couples')
        .update({ join_code: newJoinCode })
        .eq('id', couple_id);

      if (updateError) {
        console.error('Error updating join code:', updateError);
        return res.status(500).json({ error: 'Failed to regenerate join code' });
      }

      res.json({ join_code: newJoinCode });
    } catch (error: any) {
      console.error('Regenerate join code error:', error);
      res.status(500).json({ error: error.message || 'Failed to regenerate join code' });
    }
  });

  // GET /api/therapist/unassigned-couples - Get couples without a therapist
  app.get("/api/therapist/unassigned-couples", async (req, res) => {
    try {
      // Verify session and therapist authorization
      const authResult = await verifyTherapistSession(req);
      if (!authResult.success) {
        return res.status(authResult.status).json({ error: authResult.error });
      }

      // Get all couples without a therapist
      const { data: couples, error: couplesError } = await supabaseAdmin
        .from('Couples_couples')
        .select('id, partner1_id, partner2_id, join_code')
        .is('therapist_id', null);

      if (couplesError) {
        console.error('Error fetching unassigned couples:', couplesError);
        return res.status(500).json({ error: 'Failed to fetch unassigned couples' });
      }

      if (!couples || couples.length === 0) {
        return res.json({ couples: [] });
      }

      // Get all partner profiles
      const partnerIds = couples.flatMap(c => [c.partner1_id, c.partner2_id]).filter(Boolean);
      
      const { data: profiles, error: profilesError } = await supabaseAdmin
        .from('Couples_profiles')
        .select('id, full_name')
        .in('id', partnerIds);

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        return res.status(500).json({ error: 'Failed to fetch partner profiles' });
      }

      // Map couples with partner names
      const couplesWithNames = couples.map(couple => {
        const partner1 = profiles?.find(p => p.id === couple.partner1_id);
        const partner2 = profiles?.find(p => p.id === couple.partner2_id);

        return {
          couple_id: couple.id,
          partner1_name: partner1?.full_name || 'Partner 1',
          partner2_name: partner2?.full_name || 'Partner 2',
          join_code: couple.join_code || '',
        };
      });

      res.json({ couples: couplesWithNames });
    } catch (error: any) {
      console.error('Get unassigned couples error:', error);
      res.status(500).json({ error: error.message || 'Failed to fetch unassigned couples' });
    }
  });

  // POST /api/therapist/link-couple - Link a couple to the current therapist
  app.post("/api/therapist/link-couple", async (req, res) => {
    try {
      // Verify session and therapist authorization
      const authResult = await verifyTherapistSession(req);
      if (!authResult.success) {
        return res.status(authResult.status).json({ error: authResult.error });
      }

      const { therapistId } = authResult;
      const { couple_id } = req.body;

      if (!couple_id) {
        return res.status(400).json({ error: 'couple_id is required' });
      }

      // Verify couple exists and is unassigned
      const { data: couple, error: coupleError } = await supabaseAdmin
        .from('Couples_couples')
        .select('therapist_id')
        .eq('id', couple_id)
        .single();

      if (coupleError || !couple) {
        return res.status(404).json({ error: 'Couple not found' });
      }

      if (couple.therapist_id) {
        return res.status(400).json({ error: 'This couple is already assigned to a therapist' });
      }

      // Link the couple to this therapist
      const { error: updateError } = await supabaseAdmin
        .from('Couples_couples')
        .update({ therapist_id: therapistId })
        .eq('id', couple_id);

      if (updateError) {
        console.error('Error linking couple:', updateError);
        return res.status(500).json({ error: 'Failed to link couple' });
      }

      res.json({ success: true, message: 'Couple successfully linked to your account' });
    } catch (error: any) {
      console.error('Link couple error:', error);
      res.status(500).json({ error: error.message || 'Failed to link couple' });
    }
  });

  // ============================================================
  // VOICE MEMOS ENDPOINTS
  // ============================================================

  // POST /api/voice-memos - Create new voice memo and get upload URL
  app.post("/api/voice-memos", async (req, res) => {
    try {
      // Verify user session
      const authResult = await verifyUserSession(req);
      if (!authResult.success) {
        return res.status(authResult.status).json({ error: authResult.error });
      }

      const { userId, coupleId, partnerId } = authResult;

      // Validate request body
      const { recipient_id } = req.body;

      if (!recipient_id) {
        return res.status(400).json({ error: "recipient_id is required" });
      }

      // Validate recipient is the partner
      if (recipient_id !== partnerId) {
        return res.status(403).json({ error: "Can only send voice memos to your partner" });
      }

      // Create voice memo record with initial data
      const { data: voiceMemo, error: insertError } = await supabaseAdmin
        .from('Couples_voice_memos')
        .insert({
          couple_id: coupleId,
          sender_id: userId,
          recipient_id: recipient_id,
          storage_path: null,
          duration_secs: null,
          transcript_text: null,
          is_listened: false,
        })
        .select()
        .single();

      if (insertError) {
        console.error('Failed to create voice memo record:', insertError);
        return res.status(500).json({ error: "Failed to create voice memo record" });
      }

      // Generate signed upload URL
      const { data: uploadData, error: uploadError, path } = await generateVoiceMemoUploadUrl(
        coupleId,
        voiceMemo.id
      );

      if (uploadError || !uploadData) {
        console.error('Failed to generate upload URL:', uploadError);
        // Clean up the DB record if upload URL generation fails
        await supabaseAdmin
          .from('Couples_voice_memos')
          .delete()
          .eq('id', voiceMemo.id);
        return res.status(500).json({ error: "Failed to generate upload URL" });
      }

      res.json({
        memo_id: voiceMemo.id,
        upload_url: uploadData.signedUrl,
        token: uploadData.token,
        storage_path: path,
      });
    } catch (error: any) {
      console.error('Create voice memo error:', error);
      res.status(500).json({ error: error.message || 'Failed to create voice memo' });
    }
  });

  // POST /api/voice-memos/:id/complete - Finalize upload
  app.post("/api/voice-memos/:id/complete", async (req, res) => {
    try {
      // Verify user session
      const authResult = await verifyUserSession(req);
      if (!authResult.success) {
        return res.status(authResult.status).json({ error: authResult.error });
      }

      const { userId } = authResult;
      const memoId = req.params.id;
      const { storage_path, duration_secs } = req.body;

      if (!storage_path) {
        return res.status(400).json({ error: "storage_path is required" });
      }

      // Verify user owns this voice memo
      const { data: memo, error: fetchError } = await supabaseAdmin
        .from('Couples_voice_memos')
        .select('sender_id')
        .eq('id', memoId)
        .single();

      if (fetchError || !memo) {
        return res.status(404).json({ error: "Voice memo not found" });
      }

      if (memo.sender_id !== userId) {
        return res.status(403).json({ error: "You don't have permission to complete this voice memo" });
      }

      // Update storage path and duration
      const { error: updateError } = await supabaseAdmin
        .from('Couples_voice_memos')
        .update({
          storage_path,
          duration_secs: duration_secs || null,
        })
        .eq('id', memoId);

      if (updateError) {
        console.error('Failed to update voice memo:', updateError);
        return res.status(500).json({ error: "Failed to finalize voice memo" });
      }

      res.json({ success: true });
    } catch (error: any) {
      console.error('Complete voice memo error:', error);
      res.status(500).json({ error: error.message || 'Failed to complete voice memo' });
    }
  });

  // PATCH /api/voice-memos/:id/listened - Mark as listened
  app.patch("/api/voice-memos/:id/listened", async (req, res) => {
    try {
      // Verify user session
      const authResult = await verifyUserSession(req);
      if (!authResult.success) {
        return res.status(authResult.status).json({ error: authResult.error });
      }

      const { userId } = authResult;
      const memoId = req.params.id;

      // Verify user is the recipient of this voice memo
      const { data: memo, error: fetchError } = await supabaseAdmin
        .from('Couples_voice_memos')
        .select('recipient_id')
        .eq('id', memoId)
        .single();

      if (fetchError || !memo) {
        return res.status(404).json({ error: "Voice memo not found" });
      }

      if (memo.recipient_id !== userId) {
        return res.status(403).json({ error: "You don't have permission to mark this voice memo as listened" });
      }

      // Update is_listened to true
      const { error: updateError } = await supabaseAdmin
        .from('Couples_voice_memos')
        .update({ is_listened: true })
        .eq('id', memoId);

      if (updateError) {
        console.error('Failed to mark voice memo as listened:', updateError);
        return res.status(500).json({ error: "Failed to mark voice memo as listened" });
      }

      res.json({ success: true });
    } catch (error: any) {
      console.error('Mark listened error:', error);
      res.status(500).json({ error: error.message || 'Failed to mark voice memo as listened' });
    }
  });

  // GET /api/voice-memos - Get voice memos for couple
  app.get("/api/voice-memos", async (req, res) => {
    try {
      // Verify user session
      const authResult = await verifyUserSession(req);
      if (!authResult.success) {
        return res.status(authResult.status).json({ error: authResult.error });
      }

      const { coupleId } = authResult;

      // Get all voice memos for this couple
      const { data: memos, error: memosError } = await supabaseAdmin
        .from('Couples_voice_memos')
        .select('*')
        .eq('couple_id', coupleId)
        .order('created_at', { ascending: false });

      if (memosError) {
        console.error('Failed to fetch voice memos:', memosError);
        return res.status(500).json({ error: "Failed to fetch voice memos" });
      }

      if (!memos || memos.length === 0) {
        return res.json([]);
      }

      // Get sender and recipient profile details
      const userIds = Array.from(new Set([
        ...memos.map(m => m.sender_id),
        ...memos.map(m => m.recipient_id),
      ]));

      const { data: profiles } = await supabaseAdmin
        .from('Couples_profiles')
        .select('id, full_name')
        .in('id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p.full_name]) || []);

      // Generate signed download URLs and format response
      const memosWithUrls = await Promise.all(
        memos.map(async (memo) => {
          let downloadUrl = null;
          
          if (memo.storage_path) {
            const { data: urlData } = await generateVoiceMemoDownloadUrl(memo.storage_path);
            downloadUrl = urlData?.signedUrl || null;
          }

          return {
            id: memo.id,
            couple_id: memo.couple_id,
            sender_id: memo.sender_id,
            sender_name: profileMap.get(memo.sender_id) || 'Unknown',
            recipient_id: memo.recipient_id,
            recipient_name: profileMap.get(memo.recipient_id) || 'Unknown',
            storage_path: memo.storage_path,
            download_url: downloadUrl,
            duration_secs: memo.duration_secs,
            transcript_text: memo.transcript_text,
            is_listened: memo.is_listened,
            created_at: memo.created_at,
          };
        })
      );

      res.json(memosWithUrls);
    } catch (error: any) {
      console.error('Get voice memos error:', error);
      res.status(500).json({ error: error.message || 'Failed to get voice memos' });
    }
  });

  // GET /api/voice-memos/therapist/:coupleId - Get metadata for therapist
  app.get("/api/voice-memos/therapist/:coupleId", async (req, res) => {
    try {
      // Verify therapist session
      const authResult = await verifyTherapistSession(req);
      if (!authResult.success) {
        return res.status(authResult.status).json({ error: authResult.error });
      }

      const { therapistId } = authResult;
      const coupleId = req.params.coupleId;

      // Verify therapist has access to this couple
      const { data: couple, error: coupleError } = await supabaseAdmin
        .from('Couples_couples')
        .select('partner1_id, partner2_id, therapist_id')
        .eq('id', coupleId)
        .single();

      if (coupleError || !couple) {
        return res.status(404).json({ error: "Couple not found" });
      }

      if (couple.therapist_id !== therapistId) {
        return res.status(403).json({ error: "You don't have access to this couple's data" });
      }

      // Fetch voice memos with ONLY non-sensitive fields - explicitly exclude storage_path and transcript_text
      const { data: memos, error: memosError } = await supabaseAdmin
        .from('Couples_voice_memos')
        .select('id, sender_id, recipient_id, duration_secs, is_listened, created_at')
        .eq('couple_id', coupleId)
        .order('created_at', { ascending: false });

      if (memosError) {
        console.error('Failed to fetch voice memos:', memosError);
        return res.status(500).json({ error: "Failed to fetch voice memos" });
      }

      if (!memos || memos.length === 0) {
        return res.json([]);
      }

      // Get profile names for sender and recipient
      const { data: profiles } = await supabaseAdmin
        .from('Couples_profiles')
        .select('id, full_name')
        .in('id', [couple.partner1_id, couple.partner2_id]);

      const profileMap = new Map(profiles?.map(p => [p.id, p.full_name]) || []);

      // Return METADATA ONLY - no storage paths, no transcripts, no download URLs
      const metadata = memos.map((memo) => ({
        id: memo.id,
        sender_name: profileMap.get(memo.sender_id) || 'Unknown',
        recipient_name: profileMap.get(memo.recipient_id) || 'Unknown',
        duration_secs: memo.duration_secs,
        is_listened: memo.is_listened,
        created_at: memo.created_at,
      }));

      res.json(metadata);
    } catch (error: any) {
      console.error('Error fetching voice memo metadata:', error);
      res.status(500).json({ error: error.message || 'Failed to fetch voice memo metadata' });
    }
  });

  // MESSAGING ENDPOINTS

  // GET /api/messages/:couple_id - Get all messages for a couple
  app.get("/api/messages/:couple_id", async (req, res) => {
    try {
      const accessToken = getAccessToken(req);
      if (!accessToken) {
        return res.status(401).json({ error: 'No session found. Please log in.' });
      }

      // Verify the access token with Supabase
      const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(accessToken);
      if (authError || !user) {
        return res.status(401).json({ error: 'Invalid or expired session. Please log in again.' });
      }

      const coupleId = req.params.couple_id;

      // Get user profile to check access
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('Couples_profiles')
        .select('role, couple_id')
        .eq('id', user.id)
        .single();

      if (profileError || !profile) {
        return res.status(403).json({ error: 'User profile not found.' });
      }

      // Verify user has access to this couple
      let hasAccess = false;
      if (profile.role === 'therapist') {
        // Check if therapist is assigned to this couple
        const { data: couple } = await supabaseAdmin
          .from('Couples_couples')
          .select('therapist_id')
          .eq('id', coupleId)
          .single();
        hasAccess = couple?.therapist_id === user.id;
      } else {
        // Check if client is part of this couple
        hasAccess = profile.couple_id === coupleId;
      }

      if (!hasAccess) {
        return res.status(403).json({ error: 'Access denied to this couple\'s messages.' });
      }

      // Fetch messages with sender information
      const { data: messages, error: messagesError } = await supabaseAdmin
        .from('Couples_messages')
        .select('*')
        .eq('couple_id', coupleId)
        .order('created_at', { ascending: true });

      if (messagesError) throw messagesError;

      // Fetch sender profiles
      const senderIds = Array.from(new Set(messages?.map(m => m.sender_id) || []));
      const { data: senders } = await supabaseAdmin
        .from('Couples_profiles')
        .select('id, full_name, role')
        .in('id', senderIds);

      const senderMap = new Map(senders?.map(s => [s.id, s]) || []);

      // Attach sender information to messages
      const messagesWithSenders = (messages || []).map(msg => ({
        ...msg,
        sender: senderMap.get(msg.sender_id) || { id: msg.sender_id, full_name: 'Unknown', role: 'client' }
      }));

      res.json(messagesWithSenders);
    } catch (error: any) {
      console.error('Get messages error:', error);
      res.status(500).json({ error: error.message || 'Failed to get messages' });
    }
  });

  // POST /api/messages - Send a new message
  app.post("/api/messages", async (req, res) => {
    try {
      const accessToken = getAccessToken(req);
      if (!accessToken) {
        return res.status(401).json({ error: 'No session found. Please log in.' });
      }

      // Verify the access token with Supabase
      const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(accessToken);
      if (authError || !user) {
        return res.status(401).json({ error: 'Invalid or expired session. Please log in again.' });
      }

      // Validate request body
      const { couple_id, message_text } = req.body;
      if (!couple_id || !message_text || !message_text.trim()) {
        return res.status(400).json({ error: 'couple_id and message_text are required' });
      }

      // Get user profile to check access
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('Couples_profiles')
        .select('role, couple_id')
        .eq('id', user.id)
        .single();

      if (profileError || !profile) {
        return res.status(403).json({ error: 'User profile not found.' });
      }

      // Verify user has access to send messages to this couple
      let hasAccess = false;
      if (profile.role === 'therapist') {
        // Check if therapist is assigned to this couple
        const { data: couple } = await supabaseAdmin
          .from('Couples_couples')
          .select('therapist_id')
          .eq('id', couple_id)
          .single();
        hasAccess = couple?.therapist_id === user.id;
      } else {
        // Check if client is part of this couple
        hasAccess = profile.couple_id === couple_id;
      }

      if (!hasAccess) {
        return res.status(403).json({ error: 'Access denied to send messages to this couple.' });
      }

      // Insert the message
      const { data: newMessage, error: insertError } = await supabaseAdmin
        .from('Couples_messages')
        .insert({
          couple_id,
          sender_id: user.id,
          message_text: message_text.trim(),
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Fetch sender information
      const { data: sender } = await supabaseAdmin
        .from('Couples_profiles')
        .select('id, full_name, role')
        .eq('id', user.id)
        .single();

      res.json({
        ...newMessage,
        sender: sender || { id: user.id, full_name: 'Unknown', role: 'client' }
      });
    } catch (error: any) {
      console.error('Send message error:', error);
      res.status(500).json({ error: error.message || 'Failed to send message' });
    }
  });

  // PUT /api/messages/:message_id/read - Mark message as read
  app.put("/api/messages/:message_id/read", async (req, res) => {
    try {
      const accessToken = getAccessToken(req);
      if (!accessToken) {
        return res.status(401).json({ error: 'No session found. Please log in.' });
      }

      // Verify the access token with Supabase
      const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(accessToken);
      if (authError || !user) {
        return res.status(401).json({ error: 'Invalid or expired session. Please log in again.' });
      }

      const messageId = req.params.message_id;

      // Get the message to verify access
      const { data: message, error: messageError } = await supabaseAdmin
        .from('Couples_messages')
        .select('couple_id')
        .eq('id', messageId)
        .single();

      if (messageError || !message) {
        return res.status(404).json({ error: 'Message not found' });
      }

      // Get user profile to check access
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('Couples_profiles')
        .select('role, couple_id')
        .eq('id', user.id)
        .single();

      if (profileError || !profile) {
        return res.status(403).json({ error: 'User profile not found.' });
      }

      // Verify user has access to this message
      let hasAccess = false;
      if (profile.role === 'therapist') {
        // Check if therapist is assigned to this couple
        const { data: couple } = await supabaseAdmin
          .from('Couples_couples')
          .select('therapist_id')
          .eq('id', message.couple_id)
          .single();
        hasAccess = couple?.therapist_id === user.id;
      } else {
        // Check if client is part of this couple
        hasAccess = profile.couple_id === message.couple_id;
      }

      if (!hasAccess) {
        return res.status(403).json({ error: 'Access denied to update this message.' });
      }

      // Update the message
      const { error: updateError } = await supabaseAdmin
        .from('Couples_messages')
        .update({ is_read: true })
        .eq('id', messageId);

      if (updateError) throw updateError;

      res.json({ success: true, message: 'Message marked as read' });
    } catch (error: any) {
      console.error('Mark message as read error:', error);
      res.status(500).json({ error: error.message || 'Failed to mark message as read' });
    }
  });

  // ==========================================
  // CALENDAR EVENTS ENDPOINTS
  // ==========================================

  // GET /api/calendar/:couple_id - Fetch all events for a couple
  app.get("/api/calendar/:couple_id", async (req, res) => {
    try {
      const { couple_id } = req.params;
      const accessToken = getAccessToken(req);

      if (!accessToken) {
        return res.status(401).json({ error: 'No session found. Please log in.' });
      }

      // Verify the access token with Supabase
      const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(accessToken);

      if (authError || !user) {
        return res.status(401).json({ error: 'Invalid or expired session. Please log in again.' });
      }

      // Get user profile
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('Couples_profiles')
        .select('role, couple_id')
        .eq('id', user.id)
        .single();

      if (profileError || !profile) {
        return res.status(403).json({ error: 'User profile not found.' });
      }

      // Verify user has access to this couple's calendar
      let hasAccess = false;
      if (profile.role === 'therapist') {
        // Check if therapist is assigned to this couple
        const { data: couple } = await supabaseAdmin
          .from('Couples_couples')
          .select('therapist_id')
          .eq('id', couple_id)
          .single();
        hasAccess = couple?.therapist_id === user.id;
      } else {
        // Check if client is part of this couple
        hasAccess = profile.couple_id === couple_id;
      }

      if (!hasAccess) {
        return res.status(403).json({ error: 'Access denied to view this calendar.' });
      }

      // Fetch events using RLS-enabled query
      const { data: events, error: eventsError } = await supabaseAdmin
        .from('Couples_calendar_events')
        .select('*')
        .eq('couple_id', couple_id)
        .order('start_at', { ascending: true });

      if (eventsError) throw eventsError;

      res.json(events || []);
    } catch (error: any) {
      console.error('Fetch calendar events error:', error);
      res.status(500).json({ error: error.message || 'Failed to fetch calendar events' });
    }
  });

  // POST /api/calendar - Create new event
  app.post("/api/calendar", async (req, res) => {
    try {
      const authResult = await verifyUserSession(req);
      if (!authResult.success) {
        return res.status(authResult.status).json({ error: authResult.error });
      }

      const { userId, coupleId } = authResult;

      // Validate request body
      const eventData = {
        ...req.body,
        start_at: req.body.start_at ? new Date(req.body.start_at) : undefined,
        end_at: req.body.end_at ? new Date(req.body.end_at) : undefined,
      };

      const validationResult = insertCalendarEventSchema.safeParse(eventData);
      if (!validationResult.success) {
        return res.status(400).json({ 
          error: "Invalid event data", 
          details: validationResult.error.format() 
        });
      }

      // Insert event
      const { data: newEvent, error: insertError } = await supabaseAdmin
        .from('Couples_calendar_events')
        .insert({
          ...validationResult.data,
          couple_id: coupleId,
          created_by: userId,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      res.status(201).json(newEvent);
    } catch (error: any) {
      console.error('Create calendar event error:', error);
      res.status(500).json({ error: error.message || 'Failed to create calendar event' });
    }
  });

  // PATCH /api/calendar/:event_id - Update event
  app.patch("/api/calendar/:event_id", async (req, res) => {
    try {
      const { event_id } = req.params;
      const authResult = await verifyUserSession(req);
      if (!authResult.success) {
        return res.status(authResult.status).json({ error: authResult.error });
      }

      const { coupleId } = authResult;

      // Verify event exists and belongs to user's couple
      const { data: existingEvent, error: fetchError } = await supabaseAdmin
        .from('Couples_calendar_events')
        .select('couple_id')
        .eq('id', event_id)
        .single();

      if (fetchError || !existingEvent) {
        return res.status(404).json({ error: 'Event not found' });
      }

      if (existingEvent.couple_id !== coupleId) {
        return res.status(403).json({ error: 'Access denied to update this event' });
      }

      // Prepare update data
      const updateData = {
        ...req.body,
        start_at: req.body.start_at ? new Date(req.body.start_at) : undefined,
        end_at: req.body.end_at ? new Date(req.body.end_at) : undefined,
      };

      // Remove fields that shouldn't be updated
      delete updateData.id;
      delete updateData.couple_id;
      delete updateData.created_by;
      delete updateData.created_at;
      delete updateData.updated_at;

      // Update event
      const { data: updatedEvent, error: updateError } = await supabaseAdmin
        .from('Couples_calendar_events')
        .update(updateData)
        .eq('id', event_id)
        .select()
        .single();

      if (updateError) throw updateError;

      res.json(updatedEvent);
    } catch (error: any) {
      console.error('Update calendar event error:', error);
      res.status(500).json({ error: error.message || 'Failed to update calendar event' });
    }
  });

  // DELETE /api/calendar/:event_id - Delete event
  app.delete("/api/calendar/:event_id", async (req, res) => {
    try {
      const { event_id } = req.params;
      const authResult = await verifyUserSession(req);
      if (!authResult.success) {
        return res.status(authResult.status).json({ error: authResult.error });
      }

      const { coupleId } = authResult;

      // Verify event exists and belongs to user's couple
      const { data: existingEvent, error: fetchError } = await supabaseAdmin
        .from('Couples_calendar_events')
        .select('couple_id')
        .eq('id', event_id)
        .single();

      if (fetchError || !existingEvent) {
        return res.status(404).json({ error: 'Event not found' });
      }

      if (existingEvent.couple_id !== coupleId) {
        return res.status(403).json({ error: 'Access denied to delete this event' });
      }

      // Delete event
      const { error: deleteError } = await supabaseAdmin
        .from('Couples_calendar_events')
        .delete()
        .eq('id', event_id);

      if (deleteError) throw deleteError;

      res.json({ success: true, message: 'Event deleted successfully' });
    } catch (error: any) {
      console.error('Delete calendar event error:', error);
      res.status(500).json({ error: error.message || 'Failed to delete calendar event' });
    }
  });

  // ==============================================
  // AI ENDPOINTS
  // ==============================================

  // DATE NIGHT GENERATOR (Connection Concierge)
  const dateNightPreferencesSchema = z.object({
    time: z.string().min(1, "Time preference is required"),
    location: z.string().min(1, "Location preference is required"),
    price: z.string().min(1, "Price preference is required"),
    participants: z.string().min(1, "Participants preference is required"),
    energy: z.string().min(1, "Energy level preference is required"),
  });

  app.post("/api/ai/date-night", async (req, res) => {
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
          details: validationResult.error.format() 
        });
      }

      const { time, location, price, participants, energy } = validationResult.data;

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
        return res.status(500).json({ error: 'Perplexity API key not configured' });
      }

      const perplexityRequest = {
        model: 'sonar',
        messages: [
          { role: 'system' as const, content: systemPrompt },
          { role: 'user' as const, content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 1500,
        stream: false,
      };

      const response = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(perplexityRequest),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Perplexity API error (${response.status}): ${errorText}`);
      }

      const data = await response.json();

      if (!data.choices || data.choices.length === 0) {
        throw new Error('Perplexity API returned no choices');
      }

      // Return the generated content
      res.json({
        content: data.choices[0].message.content,
        citations: data.citations,
      });
    } catch (error: any) {
      console.error('Date night generation error:', error);
      res.status(500).json({ 
        error: error.message || 'Failed to generate date night ideas' 
      });
    }
  });

  // ==============================================
  // LOVE MAP QUIZ API ROUTES
  // ==============================================

  // GET /api/love-map/questions - Fetch all active questions
  app.get("/api/love-map/questions", async (req, res) => {
    try {
      const authResult = await verifyUserSession(req);
      if (!authResult.success) {
        return res.status(authResult.status).json({ error: authResult.error });
      }

      const { data: questions, error } = await supabaseAdmin
        .from('Couples_love_map_questions')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: true });

      if (error) throw error;

      res.json(questions || []);
    } catch (error: any) {
      console.error('Error fetching Love Map questions:', error);
      res.status(500).json({ error: error.message || 'Failed to fetch questions' });
    }
  });

  // GET /api/love-map/session/:couple_id - Get or create active session for couple
  app.get("/api/love-map/session/:couple_id", async (req, res) => {
    try {
      const authResult = await verifyUserSession(req);
      if (!authResult.success) {
        return res.status(authResult.status).json({ error: authResult.error });
      }

      const { couple_id } = req.params;
      const { userId, coupleId } = authResult;

      // Verify user belongs to this couple
      if (couple_id !== coupleId) {
        return res.status(403).json({ error: 'Access denied to this couple' });
      }

      // Look for active session (not completed)
      const { data: sessions, error: sessionError } = await supabaseAdmin
        .from('Couples_love_map_sessions')
        .select('*')
        .eq('couple_id', couple_id)
        .is('completed_at', null)
        .order('created_at', { ascending: false })
        .limit(1);

      if (sessionError) throw sessionError;

      // If active session exists, return it
      if (sessions && sessions.length > 0) {
        return res.json(sessions[0]);
      }

      // Create new session
      const { data: newSession, error: createError } = await supabaseAdmin
        .from('Couples_love_map_sessions')
        .insert({ couple_id })
        .select()
        .single();

      if (createError) throw createError;

      res.json(newSession);
    } catch (error: any) {
      console.error('Error getting/creating Love Map session:', error);
      res.status(500).json({ error: error.message || 'Failed to get session' });
    }
  });

  // POST /api/love-map/truths - Submit self-answers (batch insert)
  app.post("/api/love-map/truths", async (req, res) => {
    try {
      const authResult = await verifyUserSession(req);
      if (!authResult.success) {
        return res.status(authResult.status).json({ error: authResult.error });
      }

      const { userId, coupleId } = authResult;
      const { session_id, truths } = req.body;

      // Validate truths array
      if (!Array.isArray(truths) || truths.length === 0) {
        return res.status(400).json({ error: 'Truths array is required' });
      }

      // Verify session belongs to user's couple
      const { data: session, error: sessionError } = await supabaseAdmin
        .from('Couples_love_map_sessions')
        .select('couple_id, partner1_truths_completed, partner2_truths_completed')
        .eq('id', session_id)
        .single();

      if (sessionError || !session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      if (session.couple_id !== coupleId) {
        return res.status(403).json({ error: 'Access denied to this session' });
      }

      // Get couple info to determine which partner this is
      const { data: couple, error: coupleError } = await supabaseAdmin
        .from('Couples_couples')
        .select('partner1_id, partner2_id')
        .eq('id', coupleId)
        .single();

      if (coupleError || !couple) {
        return res.status(404).json({ error: 'Couple not found' });
      }

      const isPartner1 = couple.partner1_id === userId;

      // Delete existing truths for this user and session (allow re-submission)
      await supabaseAdmin
        .from('Couples_love_map_truths')
        .delete()
        .eq('session_id', session_id)
        .eq('author_id', userId);

      // Insert new truths
      const truthsToInsert = truths.map((truth: any) => ({
        session_id,
        question_id: truth.question_id,
        author_id: userId,
        answer_text: truth.answer_text,
      }));

      const { data: insertedTruths, error: insertError } = await supabaseAdmin
        .from('Couples_love_map_truths')
        .insert(truthsToInsert)
        .select();

      if (insertError) throw insertError;

      // Update session to mark truths as completed for this partner
      const updateField = isPartner1 ? 'partner1_truths_completed' : 'partner2_truths_completed';
      const { error: updateError } = await supabaseAdmin
        .from('Couples_love_map_sessions')
        .update({ [updateField]: true })
        .eq('id', session_id);

      if (updateError) throw updateError;

      res.json({ success: true, truths: insertedTruths });
    } catch (error: any) {
      console.error('Error submitting Love Map truths:', error);
      res.status(500).json({ error: error.message || 'Failed to submit truths' });
    }
  });

  // POST /api/love-map/guesses - Submit partner guesses (batch insert)
  app.post("/api/love-map/guesses", async (req, res) => {
    try {
      const authResult = await verifyUserSession(req);
      if (!authResult.success) {
        return res.status(authResult.status).json({ error: authResult.error });
      }

      const { userId, coupleId, partnerId } = authResult;
      const { session_id, guesses } = req.body;

      // Validate guesses array
      if (!Array.isArray(guesses) || guesses.length === 0) {
        return res.status(400).json({ error: 'Guesses array is required' });
      }

      // Verify session belongs to user's couple
      const { data: session, error: sessionError } = await supabaseAdmin
        .from('Couples_love_map_sessions')
        .select('couple_id')
        .eq('id', session_id)
        .single();

      if (sessionError || !session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      if (session.couple_id !== coupleId) {
        return res.status(403).json({ error: 'Access denied to this session' });
      }

      // Get partner's truths for this session
      const { data: partnerTruths, error: truthsError } = await supabaseAdmin
        .from('Couples_love_map_truths')
        .select('*')
        .eq('session_id', session_id)
        .eq('author_id', partnerId);

      if (truthsError) throw truthsError;

      if (!partnerTruths || partnerTruths.length === 0) {
        return res.status(400).json({ error: 'Partner has not completed truths yet' });
      }

      // Create truth lookup map
      const truthMap = new Map(partnerTruths.map(t => [t.question_id, t]));

      // Delete existing guesses for this user and session (allow re-submission)
      await supabaseAdmin
        .from('Couples_love_map_guesses')
        .delete()
        .eq('session_id', session_id)
        .eq('guesser_id', userId);

      // Calculate correctness and prepare guesses to insert
      const guessesToInsert = guesses.map((guess: any) => {
        const partnerTruth = truthMap.get(guess.question_id);
        if (!partnerTruth) {
          throw new Error(`No truth found for question ${guess.question_id}`);
        }

        // Case-insensitive comparison, trimmed
        const guessText = guess.guess_text.trim().toLowerCase();
        const truthText = partnerTruth.answer_text.trim().toLowerCase();
        const isCorrect = guessText === truthText;

        return {
          session_id,
          question_id: guess.question_id,
          guesser_id: userId,
          truth_id: partnerTruth.id,
          guess_text: guess.guess_text,
          is_correct: isCorrect,
        };
      });

      const { data: insertedGuesses, error: insertError } = await supabaseAdmin
        .from('Couples_love_map_guesses')
        .insert(guessesToInsert)
        .select();

      if (insertError) throw insertError;

      // Get couple info to determine which partner this is
      const { data: couple, error: coupleError } = await supabaseAdmin
        .from('Couples_couples')
        .select('partner1_id, partner2_id')
        .eq('id', coupleId)
        .single();

      if (coupleError || !couple) {
        return res.status(404).json({ error: 'Couple not found' });
      }

      const isPartner1 = couple.partner1_id === userId;

      // Calculate score (percentage correct)
      const correctCount = guessesToInsert.filter(g => g.is_correct).length;
      const totalCount = guessesToInsert.length;
      const score = totalCount > 0 ? (correctCount / totalCount) * 100 : 0;

      // Update session to mark guesses as completed and store score
      const updateField = isPartner1 ? 'partner1_guesses_completed' : 'partner2_guesses_completed';
      const scoreField = isPartner1 ? 'partner1_score' : 'partner2_score';
      
      const { error: updateError } = await supabaseAdmin
        .from('Couples_love_map_sessions')
        .update({ 
          [updateField]: true,
          [scoreField]: score.toFixed(2),
        })
        .eq('id', session_id);

      if (updateError) throw updateError;

      res.json({ success: true, guesses: insertedGuesses, score });
    } catch (error: any) {
      console.error('Error submitting Love Map guesses:', error);
      res.status(500).json({ error: error.message || 'Failed to submit guesses' });
    }
  });

  // GET /api/love-map/results/:session_id - Get reveal results with side-by-side comparison
  app.get("/api/love-map/results/:session_id", async (req, res) => {
    try {
      const authResult = await verifyUserSession(req);
      if (!authResult.success) {
        return res.status(authResult.status).json({ error: authResult.error });
      }

      const { userId, coupleId, partnerId } = authResult;
      const { session_id } = req.params;

      // Verify session belongs to user's couple
      const { data: session, error: sessionError } = await supabaseAdmin
        .from('Couples_love_map_sessions')
        .select('*')
        .eq('id', session_id)
        .single();

      if (sessionError || !session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      if (session.couple_id !== coupleId) {
        return res.status(403).json({ error: 'Access denied to this session' });
      }

      // Get all questions
      const { data: questions, error: questionsError } = await supabaseAdmin
        .from('Couples_love_map_questions')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: true });

      if (questionsError) throw questionsError;

      // Get all truths for this session
      const { data: truths, error: truthsError } = await supabaseAdmin
        .from('Couples_love_map_truths')
        .select('*')
        .eq('session_id', session_id);

      if (truthsError) throw truthsError;

      // Get all guesses for this session
      const { data: guesses, error: guessesError } = await supabaseAdmin
        .from('Couples_love_map_guesses')
        .select('*')
        .eq('session_id', session_id);

      if (guessesError) throw guessesError;

      // Build comparison data
      const myTruths = (truths || []).filter(t => t.author_id === userId);
      const partnerTruths = (truths || []).filter(t => t.author_id === partnerId);
      const myGuesses = (guesses || []).filter(g => g.guesser_id === userId);
      const partnerGuesses = (guesses || []).filter(g => g.guesser_id === partnerId);

      const results = (questions || []).map(question => {
        const myTruth = myTruths.find(t => t.question_id === question.id);
        const partnerTruth = partnerTruths.find(t => t.question_id === question.id);
        const myGuess = myGuesses.find(g => g.question_id === question.id);
        const partnerGuess = partnerGuesses.find(g => g.question_id === question.id);

        return {
          question_id: question.id,
          question_text: question.question_text,
          category: question.category,
          my_answer: myTruth?.answer_text || null,
          partner_answer: partnerTruth?.answer_text || null,
          my_guess: myGuess?.guess_text || null,
          partner_guess: partnerGuess?.guess_text || null,
          my_guess_correct: myGuess?.is_correct || false,
          partner_guess_correct: partnerGuess?.is_correct || false,
        };
      });

      res.json({
        session,
        results,
        my_score: session.partner1_id === userId ? session.partner1_score : session.partner2_score,
        partner_score: session.partner1_id === userId ? session.partner2_score : session.partner1_score,
      });
    } catch (error: any) {
      console.error('Error fetching Love Map results:', error);
      res.status(500).json({ error: error.message || 'Failed to fetch results' });
    }
  });

  // PATCH /api/love-map/session/:session_id/complete - Mark session as complete
  app.patch("/api/love-map/session/:session_id/complete", async (req, res) => {
    try {
      const authResult = await verifyUserSession(req);
      if (!authResult.success) {
        return res.status(authResult.status).json({ error: authResult.error });
      }

      const { coupleId } = authResult;
      const { session_id } = req.params;

      // Verify session belongs to user's couple
      const { data: session, error: sessionError } = await supabaseAdmin
        .from('Couples_love_map_sessions')
        .select('*')
        .eq('id', session_id)
        .single();

      if (sessionError || !session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      if (session.couple_id !== coupleId) {
        return res.status(403).json({ error: 'Access denied to this session' });
      }

      // Mark as complete
      const { data: updatedSession, error: updateError } = await supabaseAdmin
        .from('Couples_love_map_sessions')
        .update({ completed_at: new Date().toISOString() })
        .eq('id', session_id)
        .select()
        .single();

      if (updateError) throw updateError;

      res.json(updatedSession);
    } catch (error: any) {
      console.error('Error completing Love Map session:', error);
      res.status(500).json({ error: error.message || 'Failed to complete session' });
    }
  });

  // Therapist endpoint: GET /api/love-map/therapist/:couple_id - View Love Map results for assigned couple
  app.get("/api/love-map/therapist/:couple_id", async (req, res) => {
    try {
      const therapistAuth = await verifyTherapistSession(req);
      if (!therapistAuth.success) {
        return res.status(therapistAuth.status).json({ error: therapistAuth.error });
      }

      const { couple_id } = req.params;

      // Verify therapist is assigned to this couple
      const { data: couple, error: coupleError } = await supabaseAdmin
        .from('Couples_couples')
        .select('*')
        .eq('id', couple_id)
        .eq('therapist_id', therapistAuth.therapistId)
        .single();

      if (coupleError || !couple) {
        return res.status(403).json({ error: 'Access denied to this couple' });
      }

      // Get most recent completed session
      const { data: sessions, error: sessionError } = await supabaseAdmin
        .from('Couples_love_map_sessions')
        .select('*')
        .eq('couple_id', couple_id)
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: false })
        .limit(1);

      if (sessionError) throw sessionError;

      if (!sessions || sessions.length === 0) {
        return res.json({ session: null, results: [] });
      }

      const session = sessions[0];

      // Get all questions
      const { data: questions, error: questionsError } = await supabaseAdmin
        .from('Couples_love_map_questions')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: true });

      if (questionsError) throw questionsError;

      // Get all truths
      const { data: truths, error: truthsError } = await supabaseAdmin
        .from('Couples_love_map_truths')
        .select('*')
        .eq('session_id', session.id);

      if (truthsError) throw truthsError;

      // Get all guesses
      const { data: guesses, error: guessesError } = await supabaseAdmin
        .from('Couples_love_map_guesses')
        .select('*')
        .eq('session_id', session.id);

      if (guessesError) throw guessesError;

      // Get partner profiles
      const { data: profiles, error: profilesError } = await supabaseAdmin
        .from('Couples_profiles')
        .select('id, full_name')
        .in('id', [couple.partner1_id, couple.partner2_id]);

      if (profilesError) throw profilesError;

      const partner1 = profiles?.find(p => p.id === couple.partner1_id);
      const partner2 = profiles?.find(p => p.id === couple.partner2_id);

      const partner1Truths = (truths || []).filter(t => t.author_id === couple.partner1_id);
      const partner2Truths = (truths || []).filter(t => t.author_id === couple.partner2_id);
      const partner1Guesses = (guesses || []).filter(g => g.guesser_id === couple.partner1_id);
      const partner2Guesses = (guesses || []).filter(g => g.guesser_id === couple.partner2_id);

      const results = (questions || []).map(question => {
        const p1Truth = partner1Truths.find(t => t.question_id === question.id);
        const p2Truth = partner2Truths.find(t => t.question_id === question.id);
        const p1Guess = partner1Guesses.find(g => g.question_id === question.id);
        const p2Guess = partner2Guesses.find(g => g.question_id === question.id);

        return {
          question_id: question.id,
          question_text: question.question_text,
          category: question.category,
          partner1_answer: p1Truth?.answer_text || null,
          partner2_answer: p2Truth?.answer_text || null,
          partner1_guess: p1Guess?.guess_text || null,
          partner2_guess: p2Guess?.guess_text || null,
          partner1_guess_correct: p1Guess?.is_correct || false,
          partner2_guess_correct: p2Guess?.is_correct || false,
        };
      });

      res.json({
        session,
        partner1_name: partner1?.full_name || 'Partner 1',
        partner2_name: partner2?.full_name || 'Partner 2',
        partner1_score: session.partner1_score,
        partner2_score: session.partner2_score,
        results,
      });
    } catch (error: any) {
      console.error('Error fetching therapist Love Map view:', error);
      res.status(500).json({ error: error.message || 'Failed to fetch Love Map data' });
    }
  });

  // ==============================================
  // ECHO & EMPATHY FEATURE - Active Listening Communication Skill Builder
  // ==============================================

  // Validation schemas
  const insertEchoSessionSchema = z.object({
    couple_id: z.string().uuid(),
    speaker_id: z.string().uuid(),
    listener_id: z.string().uuid(),
    current_step: z.number().min(1).max(3).default(1),
    status: z.enum(["in_progress", "completed"]).default("in_progress"),
  });

  const insertEchoTurnSchema = z.object({
    session_id: z.string().uuid(),
    step: z.number().min(1).max(3),
    author_id: z.string().uuid(),
    content: z.string().min(1),
  });

  // POST /api/echo/session - Start new Echo & Empathy session
  app.post("/api/echo/session", async (req, res) => {
    try {
      const userAuth = await verifyUserSession(req);
      if (!userAuth.success) {
        return res.status(userAuth.status).json({ error: userAuth.error });
      }

      const validatedData = insertEchoSessionSchema.parse(req.body);

      // Verify session belongs to user's couple
      if (validatedData.couple_id !== userAuth.coupleId) {
        return res.status(403).json({ error: 'Cannot create session for different couple' });
      }

      const { data, error } = await supabaseAdmin
        .from('Couples_echo_sessions')
        .insert(validatedData)
        .select()
        .single();

      if (error) throw error;
      res.json(data);
    } catch (error: any) {
      console.error('Error creating echo session:', error);
      res.status(500).json({ error: error.message || 'Failed to create session' });
    }
  });

  // POST /api/echo/turn - Submit turn content
  app.post("/api/echo/turn", async (req, res) => {
    try {
      const userAuth = await verifyUserSession(req);
      if (!userAuth.success) {
        return res.status(userAuth.status).json({ error: userAuth.error });
      }

      const validatedData = insertEchoTurnSchema.parse(req.body);

      // Verify turn belongs to user's couple's session
      const { data: session, error: sessionError } = await supabaseAdmin
        .from('Couples_echo_sessions')
        .select('couple_id, current_step')
        .eq('id', validatedData.session_id)
        .single();

      if (sessionError || !session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      if (session.couple_id !== userAuth.coupleId) {
        return res.status(403).json({ error: 'Cannot add turn to different couple session' });
      }

      // Validate step sequence
      if (validatedData.step !== session.current_step) {
        return res.status(400).json({ error: `Invalid step. Current step is ${session.current_step}` });
      }

      // Insert turn
      const { data: turn, error: turnError } = await supabaseAdmin
        .from('Couples_echo_turns')
        .insert(validatedData)
        .select()
        .single();

      if (turnError) throw turnError;

      // Update session's current_step if not on last step
      if (validatedData.step < 3) {
        const { error: updateError } = await supabaseAdmin
          .from('Couples_echo_sessions')
          .update({ current_step: validatedData.step + 1 })
          .eq('id', validatedData.session_id);

        if (updateError) throw updateError;
      }

      res.json(turn);
    } catch (error: any) {
      console.error('Error creating echo turn:', error);
      res.status(500).json({ error: error.message || 'Failed to create turn' });
    }
  });

  // PATCH /api/echo/session/:id/complete - Mark session complete
  app.patch("/api/echo/session/:id/complete", async (req, res) => {
    try {
      const userAuth = await verifyUserSession(req);
      if (!userAuth.success) {
        return res.status(userAuth.status).json({ error: userAuth.error });
      }

      const { id } = req.params;

      // Verify session belongs to user's couple
      const { data: session, error: sessionError } = await supabaseAdmin
        .from('Couples_echo_sessions')
        .select('couple_id')
        .eq('id', id)
        .single();

      if (sessionError || !session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      if (session.couple_id !== userAuth.coupleId) {
        return res.status(403).json({ error: 'Cannot complete different couple session' });
      }

      const { data, error } = await supabaseAdmin
        .from('Couples_echo_sessions')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      res.json(data);
    } catch (error: any) {
      console.error('Error completing echo session:', error);
      res.status(500).json({ error: error.message || 'Failed to complete session' });
    }
  });

  // GET /api/echo/sessions/:couple_id - Get session history
  app.get("/api/echo/sessions/:couple_id", async (req, res) => {
    try {
      const userAuth = await verifyUserSession(req);
      if (!userAuth.success) {
        return res.status(userAuth.status).json({ error: userAuth.error });
      }

      const { couple_id } = req.params;

      // Verify couple_id matches user's couple
      if (couple_id !== userAuth.coupleId) {
        return res.status(403).json({ error: 'Cannot view different couple sessions' });
      }

      const { data: sessions, error: sessionsError } = await supabaseAdmin
        .from('Couples_echo_sessions')
        .select('*')
        .eq('couple_id', couple_id)
        .order('created_at', { ascending: false });

      if (sessionsError) throw sessionsError;

      // Get all turns for these sessions
      const sessionIds = sessions?.map(s => s.id) || [];
      const { data: turns, error: turnsError } = await supabaseAdmin
        .from('Couples_echo_turns')
        .select('*')
        .in('session_id', sessionIds)
        .order('created_at', { ascending: true });

      if (turnsError) throw turnsError;

      // Combine sessions with their turns
      const sessionsWithTurns = sessions?.map(session => ({
        ...session,
        turns: turns?.filter(t => t.session_id === session.id) || [],
      }));

      res.json(sessionsWithTurns);
    } catch (error: any) {
      console.error('Error fetching echo sessions:', error);
      res.status(500).json({ error: error.message || 'Failed to fetch sessions' });
    }
  });

  // ==============================================
  // IFS INTRODUCTION FEATURE - Inner Family Systems Exercise
  // ==============================================

  // Validation schemas
  const insertIfsExerciseSchema = z.object({
    user_id: z.string().uuid(),
    couple_id: z.string().uuid(),
    status: z.enum(["in_progress", "completed"]).default("in_progress"),
  });

  const insertIfsPartSchema = z.object({
    exercise_id: z.string().uuid(),
    user_id: z.string().uuid(),
    part_name: z.string().min(1),
    when_appears: z.string().min(1),
    letter_content: z.string().min(1),
  });

  // POST /api/ifs/exercise - Create new IFS exercise
  app.post("/api/ifs/exercise", async (req, res) => {
    try {
      const userAuth = await verifyUserSession(req);
      if (!userAuth.success) {
        return res.status(userAuth.status).json({ error: userAuth.error });
      }

      const validatedData = insertIfsExerciseSchema.parse(req.body);

      // Verify user_id matches authenticated user
      if (validatedData.user_id !== userAuth.userId) {
        return res.status(403).json({ error: 'Cannot create exercise for different user' });
      }

      // Verify couple_id matches user's couple
      if (validatedData.couple_id !== userAuth.coupleId) {
        return res.status(403).json({ error: 'Cannot create exercise for different couple' });
      }

      const { data, error } = await supabaseAdmin
        .from('Couples_ifs_exercises')
        .insert(validatedData)
        .select()
        .single();

      if (error) throw error;
      res.json(data);
    } catch (error: any) {
      console.error('Error creating IFS exercise:', error);
      res.status(500).json({ error: error.message || 'Failed to create exercise' });
    }
  });

  // POST /api/ifs/part - Add protective part
  app.post("/api/ifs/part", async (req, res) => {
    try {
      const userAuth = await verifyUserSession(req);
      if (!userAuth.success) {
        return res.status(userAuth.status).json({ error: userAuth.error });
      }

      const validatedData = insertIfsPartSchema.parse(req.body);

      // Verify user_id matches authenticated user
      if (validatedData.user_id !== userAuth.userId) {
        return res.status(403).json({ error: 'Cannot create part for different user' });
      }

      // Verify exercise belongs to user
      const { data: exercise, error: exerciseError } = await supabaseAdmin
        .from('Couples_ifs_exercises')
        .select('user_id')
        .eq('id', validatedData.exercise_id)
        .single();

      if (exerciseError || !exercise) {
        return res.status(404).json({ error: 'Exercise not found' });
      }

      if (exercise.user_id !== userAuth.userId) {
        return res.status(403).json({ error: 'Cannot add part to different user exercise' });
      }

      const { data, error } = await supabaseAdmin
        .from('Couples_ifs_parts')
        .insert(validatedData)
        .select()
        .single();

      if (error) throw error;
      res.json(data);
    } catch (error: any) {
      console.error('Error creating IFS part:', error);
      res.status(500).json({ error: error.message || 'Failed to create part' });
    }
  });

  // PATCH /api/ifs/part/:id - Update part
  app.patch("/api/ifs/part/:id", async (req, res) => {
    try {
      const userAuth = await verifyUserSession(req);
      if (!userAuth.success) {
        return res.status(userAuth.status).json({ error: userAuth.error });
      }

      const { id } = req.params;
      const updates = req.body;

      // Verify part belongs to user
      const { data: part, error: partError } = await supabaseAdmin
        .from('Couples_ifs_parts')
        .select('user_id')
        .eq('id', id)
        .single();

      if (partError || !part) {
        return res.status(404).json({ error: 'Part not found' });
      }

      if (part.user_id !== userAuth.userId) {
        return res.status(403).json({ error: 'Cannot update different user part' });
      }

      const { data, error } = await supabaseAdmin
        .from('Couples_ifs_parts')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      res.json(data);
    } catch (error: any) {
      console.error('Error updating IFS part:', error);
      res.status(500).json({ error: error.message || 'Failed to update part' });
    }
  });

  // DELETE /api/ifs/part/:id - Delete part
  app.delete("/api/ifs/part/:id", async (req, res) => {
    try {
      const userAuth = await verifyUserSession(req);
      if (!userAuth.success) {
        return res.status(userAuth.status).json({ error: userAuth.error });
      }

      const { id } = req.params;

      // Verify part belongs to user
      const { data: part, error: partError } = await supabaseAdmin
        .from('Couples_ifs_parts')
        .select('user_id')
        .eq('id', id)
        .single();

      if (partError || !part) {
        return res.status(404).json({ error: 'Part not found' });
      }

      if (part.user_id !== userAuth.userId) {
        return res.status(403).json({ error: 'Cannot delete different user part' });
      }

      const { error } = await supabaseAdmin
        .from('Couples_ifs_parts')
        .delete()
        .eq('id', id);

      if (error) throw error;
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error deleting IFS part:', error);
      res.status(500).json({ error: error.message || 'Failed to delete part' });
    }
  });

  // GET /api/ifs/exercises/:user_id - Get user's exercises
  app.get("/api/ifs/exercises/:user_id", async (req, res) => {
    try {
      const userAuth = await verifyUserSession(req);
      if (!userAuth.success) {
        return res.status(userAuth.status).json({ error: userAuth.error });
      }

      const { user_id } = req.params;

      // Verify user_id matches authenticated user
      if (user_id !== userAuth.userId) {
        return res.status(403).json({ error: 'Cannot view different user exercises' });
      }

      const { data: exercises, error: exercisesError } = await supabaseAdmin
        .from('Couples_ifs_exercises')
        .select('*')
        .eq('user_id', user_id)
        .order('created_at', { ascending: false });

      if (exercisesError) throw exercisesError;

      // Get all parts for these exercises
      const exerciseIds = exercises?.map(e => e.id) || [];
      const { data: parts, error: partsError } = await supabaseAdmin
        .from('Couples_ifs_parts')
        .select('*')
        .in('exercise_id', exerciseIds)
        .order('created_at', { ascending: true });

      if (partsError) throw partsError;

      // Combine exercises with their parts
      const exercisesWithParts = exercises?.map(exercise => ({
        ...exercise,
        parts: parts?.filter(p => p.exercise_id === exercise.id) || [],
      }));

      res.json(exercisesWithParts);
    } catch (error: any) {
      console.error('Error fetching IFS exercises:', error);
      res.status(500).json({ error: error.message || 'Failed to fetch exercises' });
    }
  });

  // ==============================================
  // SHARED PAUSE BUTTON FEATURE - Real-time De-escalation Tool
  // ==============================================

  // Validation schemas
  const insertPauseEventSchema = z.object({
    couple_id: z.string().uuid(),
    initiated_by: z.string().uuid(),
    reflection: z.string().optional(),
  });

  // POST /api/pause/activate - Activate pause (20-min timer)
  app.post("/api/pause/activate", async (req, res) => {
    try {
      const userAuth = await verifyUserSession(req);
      if (!userAuth.success) {
        return res.status(userAuth.status).json({ error: userAuth.error });
      }

      const validatedData = insertPauseEventSchema.parse(req.body);

      // Verify couple_id matches user's couple
      if (validatedData.couple_id !== userAuth.coupleId) {
        return res.status(403).json({ error: 'Cannot activate pause for different couple' });
      }

      // Check if there's already an active pause
      const { data: couple, error: coupleError } = await supabaseAdmin
        .from('Couples_couples')
        .select('active_pause_id')
        .eq('id', userAuth.coupleId)
        .single();

      if (coupleError) throw coupleError;

      if (couple.active_pause_id) {
        return res.status(400).json({ error: 'A pause is already active for this couple' });
      }

      // Create new pause event
      const { data: pauseEvent, error: pauseError } = await supabaseAdmin
        .from('Couples_pause_events')
        .insert(validatedData)
        .select()
        .single();

      if (pauseError) throw pauseError;

      // Update couple's active_pause_id
      const { error: updateError } = await supabaseAdmin
        .from('Couples_couples')
        .update({ active_pause_id: pauseEvent.id })
        .eq('id', userAuth.coupleId);

      if (updateError) throw updateError;

      res.json(pauseEvent);
    } catch (error: any) {
      console.error('Error activating pause:', error);
      res.status(500).json({ error: error.message || 'Failed to activate pause' });
    }
  });

  // POST /api/pause/end/:id - End pause early (with reflection)
  app.post("/api/pause/end/:id", async (req, res) => {
    try {
      const userAuth = await verifyUserSession(req);
      if (!userAuth.success) {
        return res.status(userAuth.status).json({ error: userAuth.error });
      }

      const { id } = req.params;
      const { reflection } = req.body;

      // Verify pause belongs to user's couple
      const { data: pauseEvent, error: pauseError } = await supabaseAdmin
        .from('Couples_pause_events')
        .select('couple_id')
        .eq('id', id)
        .single();

      if (pauseError || !pauseEvent) {
        return res.status(404).json({ error: 'Pause event not found' });
      }

      if (pauseEvent.couple_id !== userAuth.coupleId) {
        return res.status(403).json({ error: 'Cannot end different couple pause' });
      }

      // Update pause event
      const { data, error } = await supabaseAdmin
        .from('Couples_pause_events')
        .update({ 
          ended_at: new Date().toISOString(),
          reflection: reflection || null,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Clear couple's active_pause_id
      const { error: clearError } = await supabaseAdmin
        .from('Couples_couples')
        .update({ active_pause_id: null })
        .eq('id', userAuth.coupleId);

      if (clearError) throw clearError;

      res.json(data);
    } catch (error: any) {
      console.error('Error ending pause:', error);
      res.status(500).json({ error: error.message || 'Failed to end pause' });
    }
  });

  // GET /api/pause/active/:couple_id - Check if pause is active
  app.get("/api/pause/active/:couple_id", async (req, res) => {
    try {
      const userAuth = await verifyUserSession(req);
      if (!userAuth.success) {
        return res.status(userAuth.status).json({ error: userAuth.error });
      }

      const { couple_id } = req.params;

      // Verify couple_id matches user's couple
      if (couple_id !== userAuth.coupleId) {
        return res.status(403).json({ error: 'Cannot view different couple pause status' });
      }

      const { data: couple, error: coupleError } = await supabaseAdmin
        .from('Couples_couples')
        .select('active_pause_id')
        .eq('id', couple_id)
        .single();

      if (coupleError) throw coupleError;

      if (!couple.active_pause_id) {
        return res.json({ active: false, pauseEvent: null });
      }

      // Get active pause event details
      const { data: pauseEvent, error: pauseError } = await supabaseAdmin
        .from('Couples_pause_events')
        .select('*')
        .eq('id', couple.active_pause_id)
        .single();

      if (pauseError) throw pauseError;

      res.json({ active: true, pauseEvent });
    } catch (error: any) {
      console.error('Error checking active pause:', error);
      res.status(500).json({ error: error.message || 'Failed to check pause status' });
    }
  });

  // GET /api/pause/history/:couple_id - Get pause history
  app.get("/api/pause/history/:couple_id", async (req, res) => {
    try {
      const userAuth = await verifyUserSession(req);
      if (!userAuth.success) {
        return res.status(userAuth.status).json({ error: userAuth.error });
      }

      const { couple_id } = req.params;

      // Verify couple_id matches user's couple
      if (couple_id !== userAuth.coupleId) {
        return res.status(403).json({ error: 'Cannot view different couple pause history' });
      }

      const { data, error } = await supabaseAdmin
        .from('Couples_pause_events')
        .select('*')
        .eq('couple_id', couple_id)
        .order('started_at', { ascending: false });

      if (error) throw error;
      res.json(data);
    } catch (error: any) {
      console.error('Error fetching pause history:', error);
      res.status(500).json({ error: error.message || 'Failed to fetch pause history' });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}

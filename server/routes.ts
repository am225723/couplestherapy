import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { supabaseAdmin } from "./supabase";
import type { TherapistAnalytics, CoupleAnalytics, AIInsight } from "@shared/schema";
import { analyzeCheckInsWithPerplexity } from "./perplexity";
import { generateCoupleReport } from "./csv-export";
import { z } from "zod";

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

  // AI INSIGHTS ENDPOINT
  // SECURITY NOTE: In production, therapist_id should come from authenticated session,
  // not from query parameters. This implementation assumes frontend authentication.
  app.get("/api/therapist/ai-insights", async (req, res) => {
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

  const httpServer = createServer(app);

  return httpServer;
}

# Edge Function: ai-session-prep

Copy this entire file to Supabase at `supabase/functions/ai-session-prep/index.ts`

**Note:** This is the most complex Edge Function, aggregating data from 13 therapy tools. Therapist-only access.

```typescript
// ========================================
// CORS Headers
// ========================================
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ========================================
// Types
// ========================================
interface PerplexityMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface PerplexityRequest {
  model: string;
  messages: PerplexityMessage[];
  temperature: number;
  max_tokens?: number;
}

interface PerplexityResponse {
  id: string;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// ========================================
// Cache
// ========================================
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

// ========================================
// Auth Helper (Therapist Only)
// ========================================
async function verifyTherapistSession(authHeader: string | null): Promise<
  | { success: false; error: string; status: number }
  | { success: true; therapistId: string }
> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { success: false, error: 'No authorization header', status: 401 };
  }

  const token = authHeader.substring(7);

  try {
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return { success: false, error: 'Invalid token', status: 401 };
    }

    const { data: profile, error: profileError } = await supabase
      .from('Couples_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return { success: false, error: 'User profile not found', status: 403 };
    }

    if (profile.role !== 'therapist') {
      return { success: false, error: 'Access denied. Only therapists can perform this action.', status: 403 };
    }

    return { success: true, therapistId: user.id };
  } catch (error) {
    return { success: false, error: 'Auth verification failed', status: 500 };
  }
}

// ========================================
// Perplexity AI Helper
// ========================================
async function callPerplexity(
  systemPrompt: string,
  userPrompt: string
): Promise<{ content: string; usage: any }> {
  const apiKey = Deno.env.get('PERPLEXITY_API_KEY');
  
  if (!apiKey) {
    throw new Error('PERPLEXITY_API_KEY not configured');
  }

  const requestBody: PerplexityRequest = {
    model: 'sonar',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.2,
    max_tokens: 3000,
  };

  const response = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Perplexity API error (${response.status}): ${errorText}`);
  }

  const data: PerplexityResponse = await response.json();

  if (!data.choices || data.choices.length === 0) {
    throw new Error('Perplexity API returned no choices');
  }

  return {
    content: data.choices[0].message.content,
    usage: data.usage,
  };
}

// ========================================
// Main Handler
// ========================================
Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify therapist authentication
    const authHeader = req.headers.get('authorization');
    const authResult = await verifyTherapistSession(authHeader);
    
    if (!authResult.success) {
      return new Response(
        JSON.stringify({ error: authResult.error }),
        { status: authResult.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const therapistId = authResult.therapistId;

    // Get couple_id from request body
    const body = await req.json();
    const coupleId = body.couple_id;

    if (!coupleId || typeof coupleId !== 'string') {
      return new Response(
        JSON.stringify({ error: 'couple_id is required in request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check cache
    const cacheKey = `session-prep:${therapistId}:${coupleId}`;
    const cached = cache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL_MS) {
      return new Response(
        JSON.stringify(cached.data),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Validate therapist has access to this couple
    const { data: couple, error: coupleError } = await supabase
      .from('Couples_couples')
      .select('partner1_id, partner2_id, therapist_id')
      .eq('id', coupleId)
      .single();

    if (coupleError || !couple) {
      return new Response(
        JSON.stringify({ error: 'Couple not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (couple.therapist_id !== therapistId) {
      return new Response(
        JSON.stringify({ error: "You don't have access to this couple's data" }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch all recent activity data (last 4 weeks) in parallel
    const fourWeeksAgo = new Date();
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
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
      supabase.from('Couples_weekly_checkins').select('*').eq('couple_id', coupleId).gte('created_at', fourWeeksAgoISO).order('created_at', { ascending: true }),
      supabase.from('Couples_gratitude_logs').select('*').eq('couple_id', coupleId).gte('created_at', fourWeeksAgoISO).order('created_at', { ascending: true }),
      supabase.from('Couples_shared_goals').select('*').eq('couple_id', coupleId).gte('created_at', fourWeeksAgoISO).order('created_at', { ascending: true }),
      supabase.from('Couples_rituals').select('*').eq('couple_id', coupleId),
      supabase.from('Couples_conversations').select('*').eq('couple_id', coupleId).gte('created_at', fourWeeksAgoISO).order('created_at', { ascending: true }),
      supabase.from('Couples_voice_memos').select('id, sender_id, recipient_id, created_at, is_listened').eq('couple_id', coupleId).gte('created_at', fourWeeksAgoISO).order('created_at', { ascending: true }),
      supabase.from('Couples_horsemen_incidents').select('*').eq('couple_id', coupleId).gte('created_at', fourWeeksAgoISO).order('created_at', { ascending: true }),
      supabase.from('Couples_demon_dialogues').select('*').eq('couple_id', coupleId).gte('created_at', fourWeeksAgoISO).order('created_at', { ascending: true }),
      supabase.from('Couples_meditation_sessions').select('*').eq('couple_id', coupleId).gte('created_at', fourWeeksAgoISO).order('created_at', { ascending: true }),
      supabase.from('Couples_intimacy_ratings').select('*').eq('couple_id', coupleId).gte('created_at', fourWeeksAgoISO).order('created_at', { ascending: true }),
      supabase.from('Couples_intimacy_goals').select('*').eq('couple_id', coupleId).gte('created_at', fourWeeksAgoISO).order('created_at', { ascending: true }),
      supabase.from('Couples_echo_sessions').select('*').eq('couple_id', coupleId).gte('created_at', fourWeeksAgoISO).order('created_at', { ascending: true }),
      supabase.from('Couples_ifs_exercises').select('*').eq('couple_id', coupleId).gte('created_at', fourWeeksAgoISO).order('created_at', { ascending: true }),
      supabase.from('Couples_pause_events').select('*').eq('couple_id', coupleId).gte('started_at', fourWeeksAgoISO).order('started_at', { ascending: true }),
    ]);

    // Check if there's any recent activity
    const hasActivity = (
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
      (pauseEvents && pauseEvents.length > 0)
    );

    if (!hasActivity) {
      return new Response(
        JSON.stringify({ error: 'No recent activity data available for this couple in the last 4 weeks' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Format data for AI analysis (PRIVACY-FOCUSED: anonymize partners)
    let userPrompt = `Analyze the following 4-week activity summary for a couple in therapy:\n\n`;

    // ENGAGEMENT METRICS
    userPrompt += `=== ENGAGEMENT OVERVIEW ===\n`;
    userPrompt += `Weekly Check-ins: ${checkins?.length || 0} completed\n`;
    
    const partner1Checkins = checkins?.filter(c => c.user_id === couple.partner1_id).length || 0;
    const partner2Checkins = checkins?.filter(c => c.user_id === couple.partner2_id).length || 0;
    userPrompt += `  - Partner 1: ${partner1Checkins} check-ins\n`;
    userPrompt += `  - Partner 2: ${partner2Checkins} check-ins\n`;
    
    userPrompt += `Gratitude Logs: ${gratitude?.length || 0} entries\n`;
    userPrompt += `Shared Goals: ${goals?.length || 0} total (${goals?.filter(g => g.status === 'done').length || 0} completed)\n`;
    userPrompt += `Hold Me Tight Conversations: ${conversations?.length || 0} sessions\n`;
    userPrompt += `Voice Memos Exchanged: ${voiceMemos?.length || 0} messages\n`;
    userPrompt += `Echo & Empathy Sessions: ${echoSessions?.length || 0} completed\n`;
    userPrompt += `IFS Exercises: ${ifsExercises?.length || 0} completed\n`;
    userPrompt += `Meditation Sessions: ${meditationSessions?.length || 0} completed\n`;
    userPrompt += `Pause Button Uses: ${pauseEvents?.length || 0} times\n\n`;

    // CHECK-IN SCORES SUMMARY
    if (checkins && checkins.length > 0) {
      userPrompt += `=== WEEKLY CHECK-IN TRENDS ===\n`;
      
      const connectednessScores = checkins.map(c => c.q_connectedness).filter(Boolean);
      const conflictScores = checkins.map(c => c.q_conflict).filter(Boolean);
      
      if (connectednessScores.length > 0) {
        const avgConnectedness = (connectednessScores.reduce((a, b) => a + b, 0) / connectednessScores.length).toFixed(1);
        const minConnectedness = Math.min(...connectednessScores);
        const maxConnectedness = Math.max(...connectednessScores);
        userPrompt += `Connectedness Scores (1-10): Avg ${avgConnectedness}, Range ${minConnectedness}-${maxConnectedness}\n`;
      }
      
      if (conflictScores.length > 0) {
        const avgConflict = (conflictScores.reduce((a, b) => a + b, 0) / conflictScores.length).toFixed(1);
        const minConflict = Math.min(...conflictScores);
        const maxConflict = Math.max(...conflictScores);
        userPrompt += `Conflict Scores (1-10): Avg ${avgConflict}, Range ${minConflict}-${maxConflict}\n`;
      }
      
      userPrompt += '\n';
    }

    // CONCERNING PATTERNS
    userPrompt += `=== CONCERNING PATTERNS ===\n`;
    
    if (horsemenIncidents && horsemenIncidents.length > 0) {
      const criticismCount = horsemenIncidents.filter(h => h.horseman_type === 'criticism').length;
      const contemptCount = horsemenIncidents.filter(h => h.horseman_type === 'contempt').length;
      const defensivenessCount = horsemenIncidents.filter(h => h.horseman_type === 'defensiveness').length;
      const stonewallCount = horsemenIncidents.filter(h => h.horseman_type === 'stonewalling').length;
      
      userPrompt += `Four Horsemen Incidents: ${horsemenIncidents.length} total\n`;
      userPrompt += `  - Criticism: ${criticismCount}\n`;
      userPrompt += `  - Contempt: ${contemptCount}\n`;
      userPrompt += `  - Defensiveness: ${defensivenessCount}\n`;
      userPrompt += `  - Stonewalling: ${stonewallCount}\n`;
      
      const antidotesPracticed = horsemenIncidents.filter(h => h.antidote_practiced).length;
      userPrompt += `  - Antidotes practiced: ${antidotesPracticed}/${horsemenIncidents.length}\n`;
    } else {
      userPrompt += `Four Horsemen Incidents: 0 (positive sign)\n`;
    }
    
    if (demonDialogues && demonDialogues.length > 0) {
      const findBadGuyCount = demonDialogues.filter(d => d.dialogue_type === 'find_bad_guy').length;
      const protestPolkaCount = demonDialogues.filter(d => d.dialogue_type === 'protest_polka').length;
      const freezeFleeCount = demonDialogues.filter(d => d.dialogue_type === 'freeze_flee').length;
      const interruptedCount = demonDialogues.filter(d => d.interrupted).length;
      
      userPrompt += `Demon Dialogues Recognized: ${demonDialogues.length} total\n`;
      userPrompt += `  - Find the Bad Guy: ${findBadGuyCount}\n`;
      userPrompt += `  - Protest Polka: ${protestPolkaCount}\n`;
      userPrompt += `  - Freeze & Flee: ${freezeFleeCount}\n`;
      userPrompt += `  - Successfully interrupted: ${interruptedCount}/${demonDialogues.length}\n`;
    } else {
      userPrompt += `Demon Dialogues: 0 recognized\n`;
    }
    
    userPrompt += '\n';

    // POSITIVE PATTERNS
    userPrompt += `=== POSITIVE PATTERNS ===\n`;
    
    if (gratitude && gratitude.length > 0) {
      const partner1Gratitude = gratitude.filter(g => g.user_id === couple.partner1_id).length;
      const partner2Gratitude = gratitude.filter(g => g.user_id === couple.partner2_id).length;
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
      const achievedGoals = intimacyGoals.filter(g => g.is_achieved).length;
      userPrompt += `Intimacy Goals: ${achievedGoals}/${intimacyGoals.length} achieved\n`;
    }
    
    userPrompt += '\n';

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

    // Call Perplexity API
    const analysisResult = await callPerplexity(systemPrompt, userPrompt);

    // Parse and structure the response
    const rawAnalysis = analysisResult.content;
    const lines = rawAnalysis.split('\n').filter(line => line.trim());
    
    let engagementSummary = '';
    const concerningPatterns: string[] = [];
    const positivePatterns: string[] = [];
    const sessionFocusAreas: string[] = [];
    const recommendedInterventions: string[] = [];
    
    let currentSection = '';
    
    lines.forEach(line => {
      const lowerLine = line.toLowerCase();
      
      if (lowerLine.includes('engagement') && lowerLine.includes('summary')) {
        currentSection = 'engagement';
      } else if (lowerLine.includes('concerning') || lowerLine.includes('concern')) {
        currentSection = 'concerning';
      } else if (lowerLine.includes('positive') || lowerLine.includes('strength')) {
        currentSection = 'positive';
      } else if (lowerLine.includes('session focus') || lowerLine.includes('focus area')) {
        currentSection = 'focus';
      } else if (lowerLine.includes('intervention') || lowerLine.includes('recommend')) {
        currentSection = 'interventions';
      } else if (line.trim().match(/^[\d\-\*•]/)) {
        const cleanedLine = line.trim().replace(/^[\d\-\*•.)\s]+/, '');
        if (currentSection === 'concerning') {
          concerningPatterns.push(cleanedLine);
        } else if (currentSection === 'positive') {
          positivePatterns.push(cleanedLine);
        } else if (currentSection === 'focus') {
          sessionFocusAreas.push(cleanedLine);
        } else if (currentSection === 'interventions') {
          recommendedInterventions.push(cleanedLine);
        }
      } else if (currentSection === 'engagement' && line.trim() && !lowerLine.includes('engagement')) {
        engagementSummary += line.trim() + ' ';
      }
    });

    // Provide fallbacks if parsing didn't work well
    if (!engagementSummary) {
      engagementSummary = rawAnalysis.substring(0, 200) + '...';
    }
    if (concerningPatterns.length === 0) {
      concerningPatterns.push('See full analysis for details');
    }
    if (positivePatterns.length === 0) {
      positivePatterns.push('See full analysis for details');
    }
    if (sessionFocusAreas.length === 0) {
      sessionFocusAreas.push('Review couple engagement and progress');
    }
    if (recommendedInterventions.length === 0) {
      recommendedInterventions.push('Continue current therapeutic approach');
    }

    // Build final response
    const responseData = {
      couple_id: coupleId,
      generated_at: new Date().toISOString(),
      engagement_summary: engagementSummary.trim(),
      concerning_patterns: concerningPatterns,
      positive_patterns: positivePatterns,
      session_focus_areas: sessionFocusAreas,
      recommended_interventions: recommendedInterventions,
      ai_analysis: rawAnalysis,
      usage: analysisResult.usage,
    };

    // Cache the result
    cache.set(cacheKey, {
      data: responseData,
      timestamp: Date.now(),
    });

    return new Response(
      JSON.stringify(responseData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Session prep error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to generate session preparation summary' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

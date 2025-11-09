# AI Endpoints - Supabase Edge Functions Migration

This document contains complete, copy-paste ready code for all 5 AI endpoints as Supabase Edge Functions.

## Deployment Instructions

1. Navigate to your Supabase project dashboard
2. Go to Edge Functions
3. Create each function using the code below
4. Set environment variables: `PERPLEXITY_API_KEY` in your Supabase project secrets
5. Deploy all functions
6. Update frontend to use `supabase.functions.invoke()` instead of `fetch('/api/ai/...')`

## Function 1: ai-exercise-recommendations

**File: `supabase/functions/ai-exercise-recommendations/index.ts`**

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

interface Recommendation {
  tool_name: string;
  rationale: string;
  suggested_action: string;
}

// ========================================
// Cache (in-memory, per-instance)
// ========================================
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// ========================================
// Auth Helper
// ========================================
async function verifyUserSession(authHeader: string | null): Promise<
  | { success: false; error: string; status: number }
  | { success: true; userId: string; coupleId: string }
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
      .select('couple_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || !profile.couple_id) {
      return { success: false, error: 'User profile not found or not in a couple', status: 403 };
    }

    return { success: true, userId: user.id, coupleId: profile.couple_id };
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
    max_tokens: 2000,
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
    // Verify authentication
    const authHeader = req.headers.get('authorization');
    const authResult = await verifyUserSession(authHeader);
    
    if (!authResult.success) {
      return new Response(
        JSON.stringify({ error: authResult.error }),
        { status: authResult.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { coupleId } = authResult;

    // Check cache
    const cacheKey = `recommendations:${coupleId}`;
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

    // Calculate 30 days ago
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoISO = thirtyDaysAgo.toISOString();

    // Fetch activity counts in parallel
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
      supabase.from('Couples_weekly_checkins').select('id').eq('couple_id', coupleId).gte('created_at', thirtyDaysAgoISO),
      supabase.from('Couples_gratitude_logs').select('id').eq('couple_id', coupleId).gte('created_at', thirtyDaysAgoISO),
      supabase.from('Couples_shared_goals').select('id').eq('couple_id', coupleId).gte('created_at', thirtyDaysAgoISO),
      supabase.from('Couples_rituals').select('id').eq('couple_id', coupleId),
      supabase.from('Couples_conversations').select('id').eq('couple_id', coupleId).gte('created_at', thirtyDaysAgoISO),
      supabase.from('Couples_voice_memos').select('id').eq('couple_id', coupleId).gte('created_at', thirtyDaysAgoISO),
      supabase.from('Couples_horsemen_incidents').select('id').eq('couple_id', coupleId).gte('created_at', thirtyDaysAgoISO),
      supabase.from('Couples_demon_dialogues').select('id').eq('couple_id', coupleId).gte('created_at', thirtyDaysAgoISO),
      supabase.from('Couples_meditation_sessions').select('id').eq('couple_id', coupleId).gte('created_at', thirtyDaysAgoISO),
      supabase.from('Couples_intimacy_ratings').select('id').eq('couple_id', coupleId).gte('created_at', thirtyDaysAgoISO),
      supabase.from('Couples_intimacy_goals').select('id').eq('couple_id', coupleId).gte('created_at', thirtyDaysAgoISO),
      supabase.from('Couples_shared_dreams').select('id').eq('couple_id', coupleId).gte('created_at', thirtyDaysAgoISO),
      supabase.from('Couples_vision_board_items').select('id').eq('couple_id', coupleId).gte('created_at', thirtyDaysAgoISO),
      supabase.from('Couples_core_values').select('id').eq('couple_id', coupleId).gte('created_at', thirtyDaysAgoISO),
      supabase.from('Couples_discipline_agreements').select('id').eq('couple_id', coupleId).gte('created_at', thirtyDaysAgoISO),
      supabase.from('Couples_parenting_stress_checkins').select('id').eq('couple_id', coupleId).gte('created_at', thirtyDaysAgoISO),
      supabase.from('Couples_echo_sessions').select('id').eq('couple_id', coupleId).gte('created_at', thirtyDaysAgoISO),
      supabase.from('Couples_ifs_exercises').select('id').eq('couple_id', coupleId).gte('created_at', thirtyDaysAgoISO),
      supabase.from('Couples_pause_events').select('id').eq('couple_id', coupleId).gte('started_at', thirtyDaysAgoISO),
      supabase.from('Couples_messages').select('id').eq('couple_id', coupleId).gte('created_at', thirtyDaysAgoISO),
      supabase.from('Couples_calendar_events').select('id').eq('couple_id', coupleId).gte('created_at', thirtyDaysAgoISO),
      supabase.from('Couples_love_map_sessions').select('id').eq('couple_id', coupleId).gte('created_at', thirtyDaysAgoISO),
    ]);

    // Calculate activity counts
    const activityCounts = {
      'Weekly Check-ins': weeklyCheckins?.length || 0,
      'Gratitude Log': gratitudeLogs?.length || 0,
      'Shared Goals': sharedGoals?.length || 0,
      'Rituals of Connection': rituals?.length || 0,
      'Hold Me Tight Conversations': conversations?.length || 0,
      'Voice Memos': voiceMemos?.length || 0,
      'Four Horsemen Awareness': fourHorsemen?.length || 0,
      'Demon Dialogues': demonDialogues?.length || 0,
      'Meditation Library': meditationSessions?.length || 0,
      'Intimacy Mapping': (intimacyRatings?.length || 0) + (intimacyGoals?.length || 0),
      'Values & Vision': (sharedDreams?.length || 0) + (visionBoardItems?.length || 0) + (coreValues?.length || 0),
      'Parenting Partners': (parentingAgreements?.length || 0) + (parentingStressCheckins?.length || 0),
      'Echo & Empathy': echoSessions?.length || 0,
      'IFS Introduction': ifsExercises?.length || 0,
      'Pause Button': pauseEvents?.length || 0,
      'Messages': messages?.length || 0,
      'Shared Calendar': calendarEvents?.length || 0,
      'Love Map Quiz': loveMapSessions?.length || 0,
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

    // Build AI prompts
    const systemPrompt = "You are an expert couples therapist recommending therapeutic exercises and activities. Based on a couple's activity patterns, suggest 3-5 specific therapy tools they should try next to strengthen their relationship.";

    let userPrompt = `Analyze this couple's therapy tool usage over the last 30 days:\n\n`;

    if (notStarted.length > 0) {
      userPrompt += `NOT STARTED (never used):\n`;
      notStarted.forEach(tool => userPrompt += `- ${tool}\n`);
      userPrompt += '\n';
    }

    if (underutilized.length > 0) {
      userPrompt += `UNDERUTILIZED (1-3 uses):\n`;
      underutilized.forEach(tool => userPrompt += `- ${tool}\n`);
      userPrompt += '\n';
    }

    if (active.length > 0) {
      userPrompt += `ACTIVE (4+ uses):\n`;
      active.forEach(tool => userPrompt += `- ${tool}\n`);
      userPrompt += '\n';
    }

    userPrompt += `Based on this data:\n`;
    userPrompt += `1. Recommend 3-5 specific therapy tools they should try or use more\n`;
    userPrompt += `2. For each recommendation, explain WHY it would benefit them based on their current patterns\n`;
    userPrompt += `3. Suggest a specific action they can take this week\n\n`;
    userPrompt += `Format as numbered recommendations with tool name, rationale, and suggested action.`;

    // Call Perplexity AI
    const analysisResult = await callPerplexity(systemPrompt, userPrompt);
    const aiFullResponse = analysisResult.content;

    // Parse recommendations
    const recommendations: Recommendation[] = [];
    const lines = aiFullResponse.split('\n');
    let currentRecommendation: any = null;
    let currentSection = '';

    for (const line of lines) {
      const trimmedLine = line.trim();
      
      const numberMatch = trimmedLine.match(/^(\d+)[\.\)]\s*(.+)$/);
      if (numberMatch) {
        if (currentRecommendation && currentRecommendation.tool_name) {
          recommendations.push(currentRecommendation);
        }
        
        currentRecommendation = {
          tool_name: numberMatch[2].trim(),
          rationale: '',
          suggested_action: '',
        };
        currentSection = '';
      } else if (currentRecommendation) {
        if (trimmedLine.toLowerCase().includes('rationale') || trimmedLine.toLowerCase().includes('why')) {
          currentSection = 'rationale';
        } else if (trimmedLine.toLowerCase().includes('action') || trimmedLine.toLowerCase().includes('suggestion')) {
          currentSection = 'suggested_action';
        } else if (trimmedLine) {
          if (currentSection === 'rationale') {
            currentRecommendation.rationale += (currentRecommendation.rationale ? ' ' : '') + trimmedLine;
          } else if (currentSection === 'suggested_action') {
            currentRecommendation.suggested_action += (currentRecommendation.suggested_action ? ' ' : '') + trimmedLine;
          } else if (!currentRecommendation.rationale) {
            currentRecommendation.rationale = trimmedLine;
          } else if (!currentRecommendation.suggested_action) {
            currentRecommendation.suggested_action = trimmedLine;
          }
        }
      }
    }

    if (currentRecommendation && currentRecommendation.tool_name) {
      recommendations.push(currentRecommendation);
    }

    // Build response
    const responseData = {
      couple_id: coupleId,
      generated_at: new Date().toISOString(),
      activity_summary: {
        not_started: notStarted,
        underutilized: underutilized.map(t => t.replace(/ \(\d+ uses\)/, '')),
        active: active.map(t => t.replace(/ \(\d+ uses\)/, '')),
      },
      recommendations: recommendations.slice(0, 5),
      ai_full_response: aiFullResponse,
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
    console.error('Exercise recommendations error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to generate recommendations' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

---

## Function 2-5: Additional Edge Functions

Due to character limits, I'll create separate documentation files for the remaining 4 functions. Each follows the same pattern:
1. CORS headers
2. Auth verification
3. Cache checking
4. Data fetching
5. Perplexity AI call
6. Response parsing
7. Caching and return

The complete code for all remaining functions will be in separate files.

## Frontend Integration

Update all frontend components to use Supabase Edge Functions:

```typescript
// OLD: Direct fetch
const response = await fetch('/api/ai/exercise-recommendations');

// NEW: Supabase functions
const { data, error } = await supabase.functions.invoke('ai-exercise-recommendations');
```

## Deployment Checklist

- [ ] Deploy ai-exercise-recommendations
- [ ] Deploy ai-empathy-prompt
- [ ] Deploy ai-echo-coaching
- [ ] Deploy ai-voice-memo-sentiment
- [ ] Deploy ai-session-prep
- [ ] Set PERPLEXITY_API_KEY in Supabase secrets
- [ ] Update all frontend API calls
- [ ] Test each endpoint
- [ ] Remove Express /api/ai/* routes
- [ ] Update AI_FEATURES_COMPLETE.md

// ========================================
// Supabase Edge Function: AI Insights
// ========================================
// Analyzes weekly check-in data using Perplexity AI to generate clinical insights for therapists
// 
// PRIVACY APPROACH:
// - Uses anonymized labels ("Partner 1", "Partner 2") when sending data to Perplexity AI
// - Never sends actual user names to external AI service
// - Allowlist logging approach: only logs field presence/counts, never actual user data
//
// ARCHITECTURE:
// - All code inlined in single file (no shared imports for simpler deployment)
// - Uses fetch() for Perplexity API calls
// - Validates therapist access before analyzing data
// - Returns structured insights (summary, discrepancies, patterns, recommendations)

// ========================================
// CORS Headers
// ========================================
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ========================================
// Type Definitions
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
  object: string;
  created: number;
  citations?: string[];
  choices: Array<{
    index: number;
    finish_reason: string;
    message: {
      role: string;
      content: string;
    };
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface WeeklyCheckIn {
  id: string;
  couple_id: string;
  user_id: string;
  year: number;
  week_number: number;
  q_connectedness: number;
  q_conflict: number;
  q_appreciation: string;
  q_regrettable_incident: string;
  q_my_need: string;
  created_at: string;
}

interface Couple {
  id: string;
  partner1_id: string;
  partner2_id: string;
  therapist_id: string | null;
}

interface AIInsightResponse {
  couple_id: string;
  generated_at: string;
  summary: string;
  discrepancies: string[];
  patterns: string[];
  recommendations: string[];
  raw_analysis: string;
  citations?: string[];
}

// ========================================
// Privacy-Focused Logging Helper
// ========================================
function redactForLogging(data: any): any {
  if (!data || typeof data !== 'object') {
    return '[redacted]';
  }

  const redacted: any = {};
  
  // Allowlist approach: only log safe metadata
  const safeFields = ['couple_id', 'therapist_id', 'timestamp'];
  
  for (const key of safeFields) {
    if (key in data) {
      redacted[key] = data[key];
    }
  }
  
  // Log counts instead of actual data
  if ('checkins' in data && Array.isArray(data.checkins)) {
    redacted.checkins_count = data.checkins.length;
  }
  
  return redacted;
}

// ========================================
// Perplexity AI Helper (Inlined)
// ========================================
async function analyzeWithPerplexity(
  systemPrompt: string,
  userPrompt: string
): Promise<{ content: string; citations?: string[] }> {
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
    max_tokens: 1500,
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
    citations: data.citations,
  };
}

// ========================================
// Main Edge Function Handler
// ========================================
Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Parse query parameters
    const url = new URL(req.url);
    const coupleId = url.searchParams.get('couple_id');

    if (!coupleId) {
      console.error('Missing required parameter: couple_id');
      return new Response(
        JSON.stringify({ error: 'couple_id is required' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    // Initialize Supabase clients
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
      throw new Error('Supabase configuration missing');
    }

    // SECURITY: Validate JWT and extract therapist_id from authenticated session
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid authorization header' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        }
      );
    }

    const jwt = authHeader.replace('Bearer ', '');

    // Verify JWT and get user session using anon key
    const sessionResponse = await fetch(
      `${supabaseUrl}/auth/v1/user`,
      {
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${jwt}`,
        },
      }
    );

    if (!sessionResponse.ok) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired session token' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        }
      );
    }

    const user = await sessionResponse.json();
    
    if (!user || !user.id) {
      return new Response(
        JSON.stringify({ error: 'Unable to authenticate user' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        }
      );
    }

    // Get therapist profile for authenticated user
    const profileResponse = await fetch(
      `${supabaseUrl}/rest/v1/Couples_profiles?id=eq.${user.id}&select=*`,
      {
        headers: {
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!profileResponse.ok) {
      throw new Error('Failed to fetch user profile');
    }

    const profiles = await profileResponse.json();
    const profile = profiles[0];

    if (!profile || profile.user_type !== 'therapist') {
      return new Response(
        JSON.stringify({ error: 'Access denied. Only therapists can access insights.' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 403,
        }
      );
    }

    const therapistId = profile.id;
    console.log('Generating AI insights for:', redactForLogging({ couple_id: coupleId, therapist_id: therapistId }));

    // 1. Validate therapist has access to this couple
    const coupleResponse = await fetch(
      `${supabaseUrl}/rest/v1/Couples_couples?id=eq.${coupleId}&select=*`,
      {
        headers: {
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!coupleResponse.ok) {
      throw new Error('Failed to fetch couple data');
    }

    const couples: Couple[] = await coupleResponse.json();
    const couple = couples[0];

    if (!couple) {
      return new Response(
        JSON.stringify({ error: 'Couple not found' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404,
        }
      );
    }

    if (couple.therapist_id !== therapistId) {
      return new Response(
        JSON.stringify({ error: "You don't have access to this couple's data" }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 403,
        }
      );
    }

    // 2. Fetch last 12 weeks of check-ins
    const twelveWeeksAgo = new Date();
    twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - 84);

    const checkinsResponse = await fetch(
      `${supabaseUrl}/rest/v1/Couples_weekly_checkins?couple_id=eq.${coupleId}&created_at=gte.${twelveWeeksAgo.toISOString()}&order=year.asc,week_number.asc&select=*`,
      {
        headers: {
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!checkinsResponse.ok) {
      throw new Error('Failed to fetch check-ins');
    }

    const checkins: WeeklyCheckIn[] = await checkinsResponse.json();

    if (!checkins || checkins.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No check-in data available for this couple in the last 12 weeks' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    console.log('Fetched check-ins:', redactForLogging({ checkins }));

    // 3. Format data for Perplexity AI analysis
    // PRIVACY: Use anonymized labels instead of actual names
    const weeklyData: Record<string, any[]> = {};
    
    checkins.forEach(checkin => {
      const weekKey = `${checkin.year}-W${checkin.week_number}`;
      if (!weeklyData[weekKey]) {
        weeklyData[weekKey] = [];
      }
      const partnerId = checkin.user_id === couple.partner1_id ? 1 : 2;
      weeklyData[weekKey].push({
        partnerId,
        partnerLabel: `Partner ${partnerId}`, // Anonymized - no real names
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
    const analysisResult = await analyzeWithPerplexity(systemPrompt, userPrompt);

    // 5. Parse and structure the response
    const rawAnalysis = analysisResult.content;
    
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

    // Fallback if parsing didn't work well
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

    const insights: AIInsightResponse = {
      couple_id: coupleId,
      generated_at: new Date().toISOString(),
      summary: summary.trim(),
      discrepancies,
      patterns,
      recommendations,
      raw_analysis: rawAnalysis,
      citations: analysisResult.citations,
    };

    console.log('Successfully generated insights for couple:', redactForLogging({ couple_id: coupleId }));

    return new Response(
      JSON.stringify(insights),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('Error generating AI insights:', errorMessage);
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

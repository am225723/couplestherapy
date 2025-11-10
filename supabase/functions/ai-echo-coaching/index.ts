// ========================================
// CORS Headers
// ========================================
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

// ========================================
// Supabase Client Setup
// ========================================
function createSupabaseClient(authHeader: string) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: { Authorization: authHeader },
    },
  });
}

// ========================================
// Type Definitions
// ========================================
interface EchoCoachingRequest {
  session_id: string;
  turn_id: string;
  speaker_message: string;
  listener_response: string;
}

interface PerplexityMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface PerplexityRequest {
  model: string;
  messages: PerplexityMessage[];
  temperature?: number;
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
// Validation
// ========================================
function validateRequest(data: any): { valid: boolean; error?: string } {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Request body must be an object' };
  }

  const required = ['session_id', 'turn_id', 'speaker_message', 'listener_response'];
  for (const field of required) {
    if (!data[field] || typeof data[field] !== 'string' || data[field].trim().length === 0) {
      return { valid: false, error: `${field} is required and cannot be empty` };
    }
  }

  if (data.speaker_message.length > 2000) {
    return { valid: false, error: 'speaker_message exceeds maximum length of 2000 characters' };
  }

  if (data.listener_response.length > 2000) {
    return { valid: false, error: 'listener_response exceeds maximum length of 2000 characters' };
  }

  return { valid: true };
}

// ========================================
// Perplexity API Integration
// ========================================
async function analyzeWithPerplexity(
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
    temperature: 0.7,
    max_tokens: 1500,
  };

  const response = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Perplexity API error: ${response.status} - ${errorText}`);
  }

  const data: PerplexityResponse = await response.json();

  return {
    content: data.choices[0]?.message?.content || '',
    usage: data.usage,
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
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    const supabase = createSupabaseClient(authHeader);
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    const rawBody = await req.json();
    
    // Validate request
    const validation = validateRequest(rawBody);
    if (!validation.valid) {
      return new Response(
        JSON.stringify({ error: validation.error }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const { session_id, turn_id, speaker_message, listener_response } = rawBody as EchoCoachingRequest;

    const systemPrompt = `You are a compassionate couples therapist specializing in active listening skills. Your role is to coach the listener on how well they echoed back what the speaker said.

Active listening evaluation criteria:
- Accuracy: Did they capture the key points?
- Emotion validation: Did they acknowledge feelings?
- Non-judgment: Did they avoid criticism or defensiveness?
- Paraphrasing: Did they use their own words vs. just repeating?
- Checking understanding: Did they ask if they got it right?

Scoring: 6-10 scale where:
- 6-7: Basic attempt but missing key elements
- 8: Good listening with minor improvements needed
- 9: Excellent listening with strong validation
- 10: Perfect active listening demonstration`;

    const userPrompt = `Evaluate this active listening exchange:

SPEAKER SAID: "${speaker_message}"

LISTENER RESPONDED: "${listener_response}"

IMPORTANT: Respond ONLY with valid JSON in this exact format:
{
  "feedback": {
    "what_went_well": ["strength 1", "strength 2"],
    "areas_to_improve": ["suggestion 1", "suggestion 2"],
    "suggested_response": "A better version of what the listener could have said"
  },
  "overall_score": 8
}

The score must be between 6 and 10.`;

    const result = await analyzeWithPerplexity(systemPrompt, userPrompt);
    
    // Parse JSON from AI response
    const parsed = JSON.parse(result.content);

    return new Response(
      JSON.stringify({
        session_id,
        turn_id,
        feedback: parsed.feedback,
        overall_score: parsed.overall_score,
        ai_full_response: result.content,
        usage: result.usage,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('Error generating echo coaching:', errorMessage);
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

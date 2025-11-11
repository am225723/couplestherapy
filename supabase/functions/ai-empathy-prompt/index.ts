// ========================================
// CORS Headers
// ========================================
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { safeJsonParse } from '../_shared/safe-json-parse.ts';

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
interface EmpathyPromptRequest {
  conversation_id: string;
  step_number: number;
  user_response: string;
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

  if (!data.conversation_id || typeof data.conversation_id !== 'string') {
    return { valid: false, error: 'conversation_id is required and must be a string' };
  }

  if (typeof data.step_number !== 'number' || data.step_number < 1 || data.step_number > 7) {
    return { valid: false, error: 'step_number must be between 1 and 7' };
  }

  if (!data.user_response || typeof data.user_response !== 'string' || data.user_response.trim().length === 0) {
    return { valid: false, error: 'user_response is required and cannot be empty' };
  }

  if (data.user_response.length > 2000) {
    return { valid: false, error: 'user_response exceeds maximum length of 2000 characters' };
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

    const { conversation_id, step_number, user_response } = rawBody as EmpathyPromptRequest;

    const systemPrompt = `You are a compassionate couples therapist trained in Emotionally Focused Therapy (EFT) and the Hold Me Tight conversation protocol developed by Dr. Sue Johnson. Your role is to help partners express vulnerability and respond with empathy.

Guidelines for Hold Me Tight conversations:
- Focus on underlying emotions, not just surface conflicts
- Help partners recognize their attachment fears and needs
- Encourage vulnerability and emotional honesty
- Suggest responses that validate and soothe
- Use EFT principles: access emotions, reframe problems as cycles, create new interactions`;

    const stepTitles = {
      1: 'Identifying the Demon Dialogues',
      2: 'Finding the Raw Spots',
      3: 'Revisiting a Rocky Moment',
      4: 'Hold Me Tight - Engagement & Connection',
      5: 'Forgiving Injuries',
      6: 'Bonding Through Sex and Touch',
      7: 'Keeping Your Love Alive'
    };

    const userPrompt = `The couple is on Step ${step_number}: "${stepTitles[step_number as keyof typeof stepTitles]}".

One partner shared: "${user_response}"

IMPORTANT: Respond ONLY with valid JSON in this exact format:
{
  "suggested_responses": [
    "First empathetic response option",
    "Second empathetic response option",
    "Third empathetic response option"
  ]
}

Generate 3 empathetic, vulnerable responses that the listening partner could use, based on EFT principles.`;

    const result = await analyzeWithPerplexity(systemPrompt, userPrompt);
    
    // Parse JSON from AI response
    const parsed = safeJsonParse(result.content);

    if (!parsed) {
      return new Response(
        JSON.stringify({ error: 'Failed to parse AI response' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    return new Response(
      JSON.stringify({
        conversation_id,
        step_number,
        suggested_responses: parsed.suggested_responses,
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
    console.error('Error generating empathy prompt:', errorMessage);
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

# Edge Function: ai-empathy-prompt

Copy this entire file to Supabase at `supabase/functions/ai-empathy-prompt/index.ts`

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
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

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
    usage: data.usage,
  };
}

// ========================================
// Request Validation
// ========================================
function validateRequest(body: any): 
  | { valid: false; error: string }
  | { valid: true; data: { conversation_id: string; step_number: number; user_response: string } }
{
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Request body must be an object' };
  }

  const { conversation_id, step_number, user_response } = body;

  if (!conversation_id || typeof conversation_id !== 'string') {
    return { valid: false, error: 'conversation_id is required and must be a string' };
  }

  if (typeof step_number !== 'number' || step_number < 1 || step_number > 6) {
    return { valid: false, error: 'step_number must be a number between 1 and 6' };
  }

  if (!user_response || typeof user_response !== 'string' || user_response.trim().length === 0) {
    return { valid: false, error: 'user_response is required and must be a non-empty string' };
  }

  return {
    valid: true,
    data: {
      conversation_id: conversation_id.trim(),
      step_number,
      user_response: user_response.trim(),
    },
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

    const { userId, coupleId } = authResult;

    // Parse and validate request body
    const body = await req.json();
    const validation = validateRequest(body);

    if (!validation.valid) {
      return new Response(
        JSON.stringify({ error: validation.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { conversation_id, step_number, user_response } = validation.data;

    // Check cache
    const responseSuffix = user_response.substring(0, 50).replace(/[^a-zA-Z0-9]/g, '_');
    const cacheKey = `empathy:${conversation_id}:${step_number}:${responseSuffix}`;
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

    // Verify conversation exists and belongs to user's couple
    const { data: conversation, error: conversationError } = await supabase
      .from('Couples_conversations')
      .select('couple_id')
      .eq('id', conversation_id)
      .single();

    if (conversationError || !conversation) {
      return new Response(
        JSON.stringify({ error: 'Conversation not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (conversation.couple_id !== coupleId) {
      return new Response(
        JSON.stringify({ error: 'Access denied. This conversation does not belong to your couple.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user is a participant
    const { data: couple, error: coupleError } = await supabase
      .from('Couples_couples')
      .select('partner1_id, partner2_id')
      .eq('id', coupleId)
      .single();

    if (coupleError || !couple) {
      return new Response(
        JSON.stringify({ error: 'Couple not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const isParticipant = couple.partner1_id === userId || couple.partner2_id === userId;
    if (!isParticipant) {
      return new Response(
        JSON.stringify({ error: 'Access denied. You are not a participant in this conversation.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build Perplexity prompts
    const systemPrompt = "You are an expert Emotionally Focused Therapy (EFT) therapist coaching couples through the Hold Me Tight conversation. Your role is to help the listening partner respond with empathy, validation, and emotional attunement.";

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
    const analysisResult = await callPerplexity(systemPrompt, userPrompt);
    const aiFullResponse = analysisResult.content;

    // Parse AI response to extract numbered suggestions
    const suggestedResponses: string[] = [];
    const lines = aiFullResponse.split('\n');
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      const match = trimmedLine.match(/^[\d]+[\.\)]\s*(.+)$/);
      if (match && match[1]) {
        suggestedResponses.push(match[1].trim());
        if (suggestedResponses.length >= 3) {
          break;
        }
      }
    }

    // If parsing failed, return full response as single item
    if (suggestedResponses.length === 0) {
      suggestedResponses.push(aiFullResponse);
    }

    // Build response
    const responseData = {
      conversation_id,
      step_number,
      suggested_responses: suggestedResponses,
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
    console.error('Empathy prompt error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to generate empathy prompts' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

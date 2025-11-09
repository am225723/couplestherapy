# Edge Function: ai-voice-memo-sentiment

Copy this entire file to Supabase at `supabase/functions/ai-voice-memo-sentiment/index.ts`

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
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours (transcript doesn't change)

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
  | { valid: true; data: { memo_id: string } }
{
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Request body must be an object' };
  }

  const { memo_id } = body;

  if (!memo_id || typeof memo_id !== 'string') {
    return { valid: false, error: 'memo_id is required and must be a string' };
  }

  return {
    valid: true,
    data: { memo_id: memo_id.trim() },
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

    const { memo_id } = validation.data;

    // Check cache
    const cacheKey = `voice-sentiment:${memo_id}`;
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

    // Fetch memo from database
    const { data: memo, error: memoError } = await supabase
      .from('Couples_voice_memos')
      .select('couple_id, sender_id, transcript_text')
      .eq('id', memo_id)
      .single();

    if (memoError || !memo) {
      return new Response(
        JSON.stringify({ error: 'Voice memo not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify memo belongs to user's couple
    if (memo.couple_id !== coupleId) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Memo does not belong to your couple' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user is the sender
    if (memo.sender_id !== userId) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: You must be the sender of this memo to analyze it' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if transcript is available
    if (!memo.transcript_text || memo.transcript_text.trim() === '') {
      return new Response(
        JSON.stringify({ error: 'Transcript not available yet. Please try again later.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate transcript size
    if (memo.transcript_text.length > 5000) {
      return new Response(
        JSON.stringify({ error: 'Voice memo transcript is too long for AI analysis (max 5000 characters). Please keep voice memos under 5 minutes.' }),
        { status: 413, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build Perplexity prompts
    const systemPrompt = "You are a compassionate communication coach helping couples express love and appreciation. Analyze the tone and sentiment of voice messages and provide gentle, supportive feedback. Be kind and encouraging.";

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
    const analysisResult = await callPerplexity(systemPrompt, userPrompt);
    const aiFullResponse = analysisResult.content;

    // Parse AI response
    let tone = "neutral";
    let sentimentScore = 7;
    const whatsWorking: string[] = [];
    const gentleSuggestions: string[] = [];
    let encouragement = "Keep expressing yourself authentically!";

    const lines = aiFullResponse.split('\n');
    let currentSection = '';

    for (const line of lines) {
      const trimmedLine = line.trim();
      
      if (trimmedLine.match(/^1\.|OVERALL TONE/i)) {
        currentSection = 'tone';
        const toneMatch = trimmedLine.match(/OVERALL TONE[:\s]+(\w+)/i);
        if (toneMatch) {
          tone = toneMatch[1].toLowerCase();
        }
        continue;
      }
      if (trimmedLine.match(/^2\.|SENTIMENT SCORE/i)) {
        currentSection = 'sentiment';
        const scoreMatch = trimmedLine.match(/SENTIMENT SCORE[:\s]+(\d+)/i);
        if (scoreMatch) {
          sentimentScore = parseInt(scoreMatch[1], 10);
        }
        continue;
      }
      if (trimmedLine.match(/^3\.|WHAT'S WORKING/i)) {
        currentSection = 'whats_working';
        continue;
      }
      if (trimmedLine.match(/^4\.|GENTLE SUGGESTIONS/i)) {
        currentSection = 'gentle_suggestions';
        continue;
      }
      if (trimmedLine.match(/^5\.|ENCOURAGEMENT/i)) {
        currentSection = 'encouragement';
        continue;
      }

      if (trimmedLine) {
        const bulletMatch = trimmedLine.match(/^[-•*]\s*(.+)$/);
        const subNumberMatch = trimmedLine.match(/^[a-z]\)|^\d+\)\s*(.+)$/);
        
        if (currentSection === 'tone' && !tone.match(/neutral|loving|appreciative|concerned|frustrated/i)) {
          const words = trimmedLine.toLowerCase().split(/\s+/);
          const toneWords = ['loving', 'appreciative', 'neutral', 'concerned', 'frustrated', 'warm', 'caring', 'supportive', 'anxious', 'tense'];
          for (const word of words) {
            if (toneWords.includes(word)) {
              tone = word;
              break;
            }
          }
        } else if (currentSection === 'sentiment' && sentimentScore === 7) {
          const scoreMatch = trimmedLine.match(/(\d+)/);
          if (scoreMatch) {
            const parsed = parseInt(scoreMatch[1], 10);
            if (parsed >= 1 && parsed <= 10) {
              sentimentScore = parsed;
            }
          }
        } else if (currentSection === 'whats_working') {
          if (bulletMatch || subNumberMatch) {
            const content = bulletMatch ? bulletMatch[1] : (subNumberMatch ? subNumberMatch[1] : trimmedLine);
            whatsWorking.push(content.trim());
          } else if (whatsWorking.length === 0 && trimmedLine.length > 20) {
            whatsWorking.push(trimmedLine);
          }
        } else if (currentSection === 'gentle_suggestions') {
          if (bulletMatch || subNumberMatch) {
            const content = bulletMatch ? bulletMatch[1] : (subNumberMatch ? subNumberMatch[1] : trimmedLine);
            gentleSuggestions.push(content.trim());
          } else if (gentleSuggestions.length === 0 && trimmedLine.length > 20 && !trimmedLine.toLowerCase().includes('none')) {
            gentleSuggestions.push(trimmedLine);
          }
        } else if (currentSection === 'encouragement') {
          if (!trimmedLine.match(/^[\d]+[\.\)]/)) {
            encouragement = trimmedLine;
          }
        }
      }
    }

    // Fallback
    if (whatsWorking.length === 0) {
      whatsWorking.push("Your message shows genuine effort to connect with your partner.");
    }

    const finalWhatsWorking = whatsWorking.slice(0, 2);
    const finalGentleSuggestions = gentleSuggestions.slice(0, 1);

    // Ensure sentiment score is in valid range
    sentimentScore = Math.max(1, Math.min(10, sentimentScore));

    // Build response
    const responseData = {
      memo_id,
      tone,
      sentiment_score: sentimentScore,
      whats_working: finalWhatsWorking,
      gentle_suggestions: finalGentleSuggestions,
      encouragement,
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
    console.error('Voice memo sentiment error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to analyze voice memo sentiment' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

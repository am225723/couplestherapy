// ========================================
// CORS Headers
// ========================================
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

// ========================================
// Supabase Client Setup
// ========================================
function createSupabaseClient(token: string) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    global: {
      headers: { Authorization: `Bearer ${token}` },
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// ========================================
// Type Definitions
// ========================================
interface VoiceMemoSentimentRequest {
  memo_id: string;
}

interface PerplexityMessage {
  role: "system" | "user" | "assistant";
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
  if (!data || typeof data !== "object") {
    return { valid: false, error: "Request body must be an object" };
  }

  if (!data.memo_id || typeof data.memo_id !== "string") {
    return { valid: false, error: "memo_id is required and must be a string" };
  }

  return { valid: true };
}

// ========================================
// Perplexity API Integration
// ========================================
async function analyzeWithPerplexity(
  systemPrompt: string,
  userPrompt: string,
): Promise<{ content: string; usage: any }> {
  const apiKey = Deno.env.get("PERPLEXITY_API_KEY");

  if (!apiKey) {
    throw new Error("PERPLEXITY_API_KEY not configured");
  }

  const requestBody: PerplexityRequest = {
    model: "sonar",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.7,
    max_tokens: 1500,
  };

  const response = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Perplexity API error: ${response.status} - ${errorText}`);
  }

  const data: PerplexityResponse = await response.json();

  return {
    content: data.choices[0]?.message?.content || "",
    usage: data.usage,
  };
}

// ========================================
// Main Edge Function Handler
// ========================================
Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const rawBody = await req.json();

    // Validate request
    const validation = validateRequest(rawBody);
    if (!validation.valid) {
      return new Response(JSON.stringify({ error: validation.error }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const { memo_id } = rawBody as VoiceMemoSentimentRequest;

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        },
      );
    }

    const token = authHeader.replace("Bearer ", "");
    
    // Validate JWT using Supabase Auth endpoint
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    
    const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${token}`,
      },
    });

    if (!userResponse.ok) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const user = await userResponse.json();
    if (!user || !user.id) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const supabase = createSupabaseClient(token);

    // Fetch the voice memo
    const { data: memo } = await supabase
      .from("Couples_VoiceMemos")
      .select("transcript")
      .eq("id", memo_id)
      .single();

    if (!memo || !memo.transcript) {
      return new Response(
        JSON.stringify({ error: "Voice memo not found or has no transcript" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 404,
        },
      );
    }

    const systemPrompt = `You are a compassionate couples therapist analyzing voice memos sent between partners. Focus on emotional tone, affection, and communication quality based on research from the Gottman Institute and attachment theory.

Guidelines:
- Identify overall tone (loving, appreciative, supportive, neutral, tense, etc.)
- Score sentiment from 1-10 (1=very negative, 10=very positive)
- Highlight what's working in the communication
- Offer gentle, actionable suggestions
- Be encouraging and supportive`;

    const userPrompt = `Analyze this voice memo transcript:

"${memo.transcript}"

IMPORTANT: Respond ONLY with valid JSON in this exact format:
{
  "tone": "loving",
  "sentiment_score": 9,
  "whats_working": ["specific strength 1", "specific strength 2"],
  "gentle_suggestions": ["actionable tip 1", "actionable tip 2"],
  "encouragement": "Brief positive message for the sender"
}`;

    const result = await analyzeWithPerplexity(systemPrompt, userPrompt);

    // Parse JSON from AI response
    const parsed = JSON.parse(result.content);

    return new Response(
      JSON.stringify({
        memo_id,
        tone: parsed.tone,
        sentiment_score: parsed.sentiment_score,
        whats_working: parsed.whats_working,
        gentle_suggestions: parsed.gentle_suggestions,
        encouragement: parsed.encouragement,
        ai_full_response: result.content,
        usage: result.usage,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    console.error("Error analyzing voice memo sentiment:", errorMessage);

    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

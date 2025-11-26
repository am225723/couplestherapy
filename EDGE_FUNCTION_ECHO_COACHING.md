# Edge Function: ai-echo-coaching

Copy this entire file to Supabase at `supabase/functions/ai-echo-coaching/index.ts`

```typescript
// ========================================
// CORS Headers
// ========================================
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ========================================
// Types
// ========================================
interface PerplexityMessage {
  role: "system" | "user" | "assistant";
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
async function verifyUserSession(
  authHeader: string | null,
): Promise<
  | { success: false; error: string; status: number }
  | { success: true; userId: string; coupleId: string }
> {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { success: false, error: "No authorization header", status: 401 };
  }

  const token = authHeader.substring(7);

  try {
    const { createClient } = await import(
      "https://esm.sh/@supabase/supabase-js@2"
    );
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return { success: false, error: "Invalid token", status: 401 };
    }

    const { data: profile, error: profileError } = await supabase
      .from("Couples_profiles")
      .select("couple_id")
      .eq("id", user.id)
      .single();

    if (profileError || !profile || !profile.couple_id) {
      return {
        success: false,
        error: "User profile not found or not in a couple",
        status: 403,
      };
    }

    return { success: true, userId: user.id, coupleId: profile.couple_id };
  } catch (error) {
    return { success: false, error: "Auth verification failed", status: 500 };
  }
}

// ========================================
// Perplexity AI Helper
// ========================================
async function callPerplexity(
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
    temperature: 0.2,
    max_tokens: 2000,
  };

  const response = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Perplexity API error (${response.status}): ${errorText}`);
  }

  const data: PerplexityResponse = await response.json();

  if (!data.choices || data.choices.length === 0) {
    throw new Error("Perplexity API returned no choices");
  }

  return {
    content: data.choices[0].message.content,
    usage: data.usage,
  };
}

// ========================================
// Request Validation
// ========================================
function validateRequest(
  body: any,
):
  | { valid: false; error: string }
  | {
      valid: true;
      data: {
        session_id: string;
        turn_id: string;
        speaker_message: string;
        listener_response: string;
      };
    } {
  if (!body || typeof body !== "object") {
    return { valid: false, error: "Request body must be an object" };
  }

  const { session_id, turn_id, speaker_message, listener_response } = body;

  if (!session_id || typeof session_id !== "string") {
    return {
      valid: false,
      error: "session_id is required and must be a string",
    };
  }

  if (!turn_id || typeof turn_id !== "string") {
    return { valid: false, error: "turn_id is required and must be a string" };
  }

  if (
    !speaker_message ||
    typeof speaker_message !== "string" ||
    speaker_message.trim().length === 0
  ) {
    return {
      valid: false,
      error: "speaker_message is required and must be a non-empty string",
    };
  }

  if (speaker_message.length > 2000) {
    return {
      valid: false,
      error: "speaker_message too long (max 2000 characters)",
    };
  }

  if (
    !listener_response ||
    typeof listener_response !== "string" ||
    listener_response.trim().length === 0
  ) {
    return {
      valid: false,
      error: "listener_response is required and must be a non-empty string",
    };
  }

  if (listener_response.length > 2000) {
    return {
      valid: false,
      error: "listener_response too long (max 2000 characters)",
    };
  }

  return {
    valid: true,
    data: {
      session_id: session_id.trim(),
      turn_id: turn_id.trim(),
      speaker_message: speaker_message.trim(),
      listener_response: listener_response.trim(),
    },
  };
}

// ========================================
// Main Handler
// ========================================
Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get("authorization");
    const authResult = await verifyUserSession(authHeader);

    if (!authResult.success) {
      return new Response(JSON.stringify({ error: authResult.error }), {
        status: authResult.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { userId, coupleId } = authResult;

    // Parse and validate request body
    const body = await req.json();
    const validation = validateRequest(body);

    if (!validation.valid) {
      return new Response(JSON.stringify({ error: validation.error }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { session_id, turn_id, speaker_message, listener_response } =
      validation.data;

    // Check cache
    const cacheKey = `echo-coaching:${session_id}:${turn_id}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return new Response(JSON.stringify(cached.data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Initialize Supabase client
    const { createClient } = await import(
      "https://esm.sh/@supabase/supabase-js@2"
    );
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify session exists and belongs to user's couple
    const { data: session, error: sessionError } = await supabase
      .from("Couples_echo_sessions")
      .select("couple_id, listener_id")
      .eq("id", session_id)
      .single();

    if (sessionError || !session) {
      return new Response(JSON.stringify({ error: "Session not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (session.couple_id !== coupleId) {
      return new Response(
        JSON.stringify({
          error: "Unauthorized: Session does not belong to your couple",
        }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Verify user is the listener
    if (session.listener_id !== userId) {
      return new Response(
        JSON.stringify({
          error:
            "Unauthorized: You must be the listener in this session to receive coaching",
        }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Verify turn exists
    const { data: turn, error: turnError } = await supabase
      .from("Couples_echo_turns")
      .select("session_id")
      .eq("id", turn_id)
      .single();

    if (turnError || !turn || turn.session_id !== session_id) {
      return new Response(
        JSON.stringify({
          error: "Turn not found or does not belong to this session",
        }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Build Perplexity prompts
    const systemPrompt =
      "You are an expert communication coach specializing in active listening skills for couples. Your role is to provide constructive, encouraging feedback on how well the listener demonstrated active listening. Be supportive and specific.";

    const userPrompt = `SPEAKER SAID:
"${speaker_message}"

LISTENER RESPONDED:
"${listener_response}"

Analyze the listener's response and provide:

1. WHAT WENT WELL (2-3 specific positives about their active listening)
2. AREAS TO IMPROVE (1-2 gentle suggestions)
3. SUGGESTED BETTER RESPONSE (one example of how they could have responded even better)

Active listening checklist:
✓ Paraphrased the speaker's words
✓ Reflected the speaker's emotions
✓ Avoided defensiveness or problem-solving
✓ Asked clarifying questions
✓ Showed empathy and validation
✓ Used "I hear..." or "It sounds like..." language

Be encouraging and constructive. Focus on growth.`;

    // Call Perplexity AI
    const analysisResult = await callPerplexity(systemPrompt, userPrompt);
    const aiFullResponse = analysisResult.content;

    // Parse AI response
    const whatWentWell: string[] = [];
    const areasToImprove: string[] = [];
    let suggestedResponse = "";

    const lines = aiFullResponse.split("\n");
    let currentSection = "";

    for (const line of lines) {
      const trimmedLine = line.trim();

      if (trimmedLine.match(/^1\.|WHAT WENT WELL/i)) {
        currentSection = "what_went_well";
        continue;
      }
      if (trimmedLine.match(/^2\.|AREAS TO IMPROVE/i)) {
        currentSection = "areas_to_improve";
        continue;
      }
      if (trimmedLine.match(/^3\.|SUGGESTED (BETTER )?RESPONSE/i)) {
        currentSection = "suggested_response";
        continue;
      }

      if (trimmedLine && !trimmedLine.match(/^[\d]+[\.\)]/)) {
        const bulletMatch = trimmedLine.match(/^[-•*]\s*(.+)$/);
        const subNumberMatch = trimmedLine.match(/^[a-z]\)|^\d+\)\s*(.+)$/);

        if (currentSection === "what_went_well") {
          if (bulletMatch || subNumberMatch) {
            const content = bulletMatch
              ? bulletMatch[1]
              : subNumberMatch
                ? subNumberMatch[1]
                : trimmedLine;
            whatWentWell.push(content.trim());
          } else if (whatWentWell.length === 0 || trimmedLine.length > 30) {
            whatWentWell.push(trimmedLine);
          }
        } else if (currentSection === "areas_to_improve") {
          if (bulletMatch || subNumberMatch) {
            const content = bulletMatch
              ? bulletMatch[1]
              : subNumberMatch
                ? subNumberMatch[1]
                : trimmedLine;
            areasToImprove.push(content.trim());
          } else if (areasToImprove.length === 0 || trimmedLine.length > 30) {
            areasToImprove.push(trimmedLine);
          }
        } else if (currentSection === "suggested_response") {
          if (
            trimmedLine.startsWith('"') ||
            trimmedLine.includes("could say") ||
            trimmedLine.includes("might respond")
          ) {
            suggestedResponse += (suggestedResponse ? " " : "") + trimmedLine;
          } else if (!suggestedResponse) {
            suggestedResponse = trimmedLine;
          }
        }
      }
    }

    // Fallback parsing
    if (
      whatWentWell.length === 0 &&
      areasToImprove.length === 0 &&
      !suggestedResponse
    ) {
      const allBullets = aiFullResponse.match(/[-•*]\s*(.+)/g);
      if (allBullets && allBullets.length >= 3) {
        whatWentWell.push(allBullets[0].replace(/^[-•*]\s*/, "").trim());
        whatWentWell.push(allBullets[1].replace(/^[-•*]\s*/, "").trim());
        if (allBullets.length > 2) {
          areasToImprove.push(allBullets[2].replace(/^[-•*]\s*/, "").trim());
        }
        if (allBullets.length > 3) {
          suggestedResponse = allBullets[3].replace(/^[-•*]\s*/, "").trim();
        }
      }
    }

    // Ensure minimums
    if (whatWentWell.length === 0) {
      whatWentWell.push("You showed effort in listening to your partner.");
    }
    if (areasToImprove.length === 0) {
      areasToImprove.push("Continue practicing active listening techniques.");
    }

    const finalWhatWentWell = whatWentWell.slice(0, 3);
    const finalAreasToImprove = areasToImprove.slice(0, 2);

    // Calculate score (6-10 range)
    let overallScore = 8;
    if (finalWhatWentWell.length >= 2 && finalAreasToImprove.length <= 1) {
      overallScore = 9;
    } else if (finalAreasToImprove.length >= 2) {
      overallScore = 7;
    }

    // Build response
    const responseData = {
      session_id,
      turn_id,
      feedback: {
        what_went_well: finalWhatWentWell,
        areas_to_improve: finalAreasToImprove,
        suggested_response:
          suggestedResponse || "Continue practicing empathetic responses.",
      },
      overall_score: overallScore,
      ai_full_response: aiFullResponse,
      usage: analysisResult.usage,
    };

    // Cache the result
    cache.set(cacheKey, {
      data: responseData,
      timestamp: Date.now(),
    });

    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Echo coaching error:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Failed to generate coaching feedback",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
```

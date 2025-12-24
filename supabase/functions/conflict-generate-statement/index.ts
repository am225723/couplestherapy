// ========================================
// Conflict Resolution - Generate Enhanced I-Statement
// ========================================

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface GenerateRequest {
  feeling: string;
  situation: string;
  because: string;
  request: string;
  firmness: number; // 0-100, where 0=gentle, 100=assertive
  mode?: "express" | "structured";
  free_text?: string;
}

interface GenerateResponse {
  enhanced_statement: string;
  impact_preview: string;
  tone_description: string;
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
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

function cleanAIResponse(text: string): string {
  return text.replace(/\[\d+\]/g, "").trim();
}

function safeJsonParse(text: string): any {
  const cleaned = cleanAIResponse(text);

  try {
    return JSON.parse(cleaned);
  } catch {
    const jsonMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1].trim());
      } catch {
        // Continue to next attempt
      }
    }

    const objectMatch = cleaned.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      try {
        return JSON.parse(objectMatch[0]);
      } catch {
        // Continue to fallback
      }
    }

    return null;
  }
}

async function analyzeWithPerplexity(
  systemPrompt: string,
  userPrompt: string,
): Promise<{ content: string }> {
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
  };
}

function getToneDescription(firmness: number): string {
  if (firmness < 25) return "gentle and soft";
  if (firmness < 50) return "warm but clear";
  if (firmness < 75) return "balanced and direct";
  return "assertive and firm";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    // Validate authorization
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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify user token
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
    const userId = user.id;

    // Parse request body
    const body: GenerateRequest = await req.json();
    const {
      feeling,
      situation,
      because,
      request,
      firmness = 50,
      mode = "structured",
      free_text,
    } = body;

    // Validate based on mode
    if (mode === "express") {
      if (!free_text || free_text.trim().length < 10) {
        return new Response(
          JSON.stringify({
            error:
              "Please express what you want to say (at least 10 characters)",
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          },
        );
      }
    } else {
      if (!feeling || !situation || !because || !request) {
        return new Response(
          JSON.stringify({
            error:
              "Missing required fields: feeling, situation, because, request",
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          },
        );
      }
    }

    const toneDescription = getToneDescription(firmness);

    const systemPrompt = `You are an expert couples therapist specializing in non-violent communication (NVC) and I-statements. 
Your role is to help individuals express their feelings and needs in a way that promotes understanding and connection.
You craft I-statements that are emotionally honest, specific, and constructive.
Always respond with valid JSON only.`;

    let userPrompt: string;

    if (mode === "express") {
      userPrompt = `Transform this raw, unfiltered expression into a healthy, constructive I-statement:

RAW EXPRESSION (user's honest feelings - may contain blame, frustration, or harsh language):
"${free_text}"

DESIRED TONE: ${toneDescription} (firmness level: ${firmness}/100)

Your task:
1. Identify the underlying feelings and needs in this raw expression
2. Extract the specific situation or behavior being referenced
3. Understand the emotional impact on the speaker
4. Determine what the speaker is actually asking for or needing
5. Transform this into a non-blaming, emotionally honest I-statement that matches the requested tone

The I-statement should follow this structure:
- "I feel [emotion]..."
- "when [specific observable behavior/situation without blame]..."
- "because [personal impact/need]..."
- "Could we [specific request]?"

Also provide a brief "impact preview" - how this transformed statement might be received by a partner.

IMPORTANT: Respond with ONLY valid JSON in this exact format:
{
  "enhanced_statement": "The complete I-statement ready to use",
  "impact_preview": "Brief prediction of how this might be received",
  "tone_description": "Description of the tone used"
}
Return ONLY the JSON, no additional text.`;
    } else {
      userPrompt = `Transform these raw inputs into an enhanced I-statement:

INPUTS:
- Feeling: "${feeling}"
- Situation (When...): "${situation}"
- Impact (Because...): "${because}"
- Request (Could we...): "${request}"

DESIRED TONE: ${toneDescription} (firmness level: ${firmness}/100)

Create an enhanced I-statement that:
1. Validates the speaker's feelings
2. Describes the situation objectively without blame
3. Explains the emotional impact clearly
4. Makes a specific, actionable request
5. Matches the requested tone (${toneDescription})

Also provide a brief "impact preview" - a 1-2 sentence prediction of how this statement might be received and why it could be effective.

IMPORTANT: Respond with ONLY valid JSON in this exact format:
{
  "enhanced_statement": "The complete I-statement ready to use",
  "impact_preview": "Brief prediction of how this might be received",
  "tone_description": "Description of the tone used"
}
Return ONLY the JSON, no additional text.`;
    }

    const result = await analyzeWithPerplexity(systemPrompt, userPrompt);
    const parsed = safeJsonParse(result.content);

    // Log the AI event
    const { createClient } = await import(
      "https://esm.sh/@supabase/supabase-js@2.39.3"
    );
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

    const durationMs = Date.now() - startTime;

    await supabaseAdmin.from("Couples_conflict_ai_events").insert({
      user_id: userId,
      request_type: "generate_statement",
      prompt_payload:
        mode === "express"
          ? { mode, free_text, firmness }
          : { mode, feeling, situation, because, request, firmness },
      response_text: result.content,
      response_parsed: parsed,
      error_message: parsed ? null : "Failed to parse AI response",
      duration_ms: durationMs,
    });

    if (!parsed || !parsed.enhanced_statement) {
      // Fallback response - construct a meaningful message based on mode
      let fallbackStatement: string;
      if (mode === "express" && free_text) {
        // For express mode, create a generic but helpful I-statement
        const truncatedContext = free_text.slice(0, 100);
        fallbackStatement = `I'm feeling something important that I need to express about: "${truncatedContext}..." Could we talk about this together so I can share what's on my mind?`;
      } else if (feeling && situation) {
        fallbackStatement = `I feel ${feeling} when ${situation}${because ? `, because ${because}` : ""}. ${request ? `Could we ${request}?` : "Can we talk about this?"}`;
      } else {
        fallbackStatement =
          "I have something important I'd like to discuss with you. Could we find a good time to talk?";
      }
      return new Response(
        JSON.stringify({
          enhanced_statement: fallbackStatement,
          impact_preview:
            "This I-statement focuses on expressing your feelings without blame, opening the door for constructive dialogue.",
          tone_description: toneDescription,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        },
      );
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    console.error("Conflict Generate Statement error:", errorMessage);

    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

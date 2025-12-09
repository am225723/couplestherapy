// ========================================
// Conflict Resolution - Generate AI Suggestions
// ========================================

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface SuggestionsRequest {
  feeling: string;
  situation: string;
  because: string;
  request: string;
  enhanced_statement?: string;
}

interface SuggestionsResponse {
  suggestions: Array<{
    title: string;
    content: string;
    category: string;
  }>;
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
    temperature: 0.8,
    max_tokens: 2000,
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
    const body: SuggestionsRequest = await req.json();
    const { feeling, situation, because, request, enhanced_statement } = body;

    if (!feeling || !situation) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: feeling, situation" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        },
      );
    }

    const systemPrompt = `You are an expert couples therapist specializing in conflict resolution, communication, and emotional intelligence.
You provide thoughtful, practical suggestions that help couples navigate difficult conversations.
Your advice is grounded in evidence-based approaches like Gottman Method, Emotionally Focused Therapy, and Non-Violent Communication.
Always respond with valid JSON only.`;

    const userPrompt = `Based on this conflict situation, provide 3 helpful suggestions:

CONTEXT:
- The person feels: "${feeling}"
- Situation: "${situation}"
- Impact: "${because || 'Not specified'}"
- Their request: "${request || 'Not specified'}"
${enhanced_statement ? `- Their I-statement: "${enhanced_statement}"` : ''}

Provide 3 different types of suggestions:
1. TIMING: When and how to initiate this conversation for best reception
2. UNDERSTANDING: What might be happening from their partner's perspective
3. FOLLOW-UP: What to do after sharing the I-statement to foster connection

IMPORTANT: Respond with ONLY valid JSON in this exact format:
{
  "suggestions": [
    {
      "title": "Short title for suggestion 1",
      "content": "Detailed suggestion content (2-3 sentences)",
      "category": "timing"
    },
    {
      "title": "Short title for suggestion 2", 
      "content": "Detailed suggestion content (2-3 sentences)",
      "category": "understanding"
    },
    {
      "title": "Short title for suggestion 3",
      "content": "Detailed suggestion content (2-3 sentences)",
      "category": "follow-up"
    }
  ]
}
Return ONLY the JSON, no additional text.`;

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
      request_type: "generate_suggestions",
      prompt_payload: { feeling, situation, because, request, enhanced_statement },
      response_text: result.content,
      response_parsed: parsed,
      error_message: parsed ? null : "Failed to parse AI response",
      duration_ms: durationMs,
    });

    if (!parsed || !parsed.suggestions) {
      // Fallback suggestions
      return new Response(
        JSON.stringify({
          suggestions: [
            {
              title: "Choose the Right Moment",
              content: "Wait for a calm moment when both of you have time and emotional bandwidth. Avoid starting this conversation when either of you is tired, hungry, or stressed.",
              category: "timing",
            },
            {
              title: "Consider Their Perspective",
              content: "Your partner may not be aware of how their actions affected you. They might have their own stressors or concerns that influenced the situation.",
              category: "understanding",
            },
            {
              title: "Listen and Connect",
              content: "After sharing your I-statement, pause and give your partner space to respond. Show you value their perspective by listening without interrupting.",
              category: "follow-up",
            },
          ],
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
    console.error("Conflict Generate Suggestions error:", errorMessage);

    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

// ========================================
// CORS Headers
// ========================================
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ========================================
// Type Definitions
// ========================================
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
  citations?: string[];
}

interface PersonalizedTip {
  category: string;
  title: string;
  description: string;
  action_prompt: string;
  is_personalized: boolean;
  generated_at?: string;
  assessment_summary?: {
    has_attachment: boolean;
    has_enneagram: boolean;
    has_love_language: boolean;
  };
}

// ========================================
// Text Cleaning & Safe JSON Parsing
// ========================================
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

// ========================================
// Perplexity API Integration
// ========================================
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
    max_tokens: 1000,
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

// ========================================
// Main Edge Function Handler
// ========================================
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
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

    const { createClient } = await import(
      "https://esm.sh/@supabase/supabase-js@2.39.3"
    );
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("Couples_profiles")
      .select("id, role, couple_id")
      .eq("id", userId)
      .single();

    if (profileError || !profile) {
      return new Response(JSON.stringify({ error: "User profile not found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 403,
      });
    }

    const coupleId = profile.couple_id;
    if (!coupleId) {
      return new Response(
        JSON.stringify({ error: "User not linked to a couple" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        },
      );
    }

    const today = new Date().toISOString().split("T")[0];

    const { data: cachedTip } = await supabaseAdmin
      .from("Couples_personalized_tips_cache")
      .select("*")
      .eq("couple_id", coupleId)
      .eq("tip_date", today)
      .maybeSingle();

    if (cachedTip && cachedTip.tip_data) {
      return new Response(JSON.stringify(cachedTip.tip_data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const [
      { data: attachmentResults },
      { data: enneagramResults },
      { data: loveLanguageResults },
    ] = await Promise.all([
      supabaseAdmin
        .from("Couples_attachment_assessments")
        .select("user_id, attachment_style, score")
        .eq("couple_id", coupleId)
        .order("created_at", { ascending: false })
        .limit(2),
      supabaseAdmin
        .from("Couples_enneagram_assessments")
        .select("user_id, primary_type, secondary_type, primary_score")
        .eq("couple_id", coupleId)
        .order("created_at", { ascending: false })
        .limit(2),
      supabaseAdmin
        .from("Couples_love_languages")
        .select("user_id, primary_language, secondary_language")
        .eq("couple_id", coupleId)
        .order("created_at", { ascending: false })
        .limit(2),
    ]);

    let assessmentContext = "Couple Assessment Profile:\n";
    let hasAssessmentData = false;

    if (attachmentResults && attachmentResults.length > 0) {
      hasAssessmentData = true;
      assessmentContext += "\nAttachment Styles:\n";
      attachmentResults.forEach((r: any, i: number) => {
        assessmentContext += `- Partner ${i + 1}: ${r.attachment_style || "Not assessed"}\n`;
      });
    }

    if (enneagramResults && enneagramResults.length > 0) {
      hasAssessmentData = true;
      assessmentContext += "\nEnneagram Types:\n";
      enneagramResults.forEach((r: any, i: number) => {
        assessmentContext += `- Partner ${i + 1}: Type ${r.primary_type || "Not assessed"}${r.secondary_type ? ` (wing ${r.secondary_type})` : ""}\n`;
      });
    }

    if (loveLanguageResults && loveLanguageResults.length > 0) {
      hasAssessmentData = true;
      assessmentContext += "\nLove Languages:\n";
      loveLanguageResults.forEach((r: any, i: number) => {
        assessmentContext += `- Partner ${i + 1}: ${r.primary_language || "Not assessed"}${r.secondary_language ? ` and ${r.secondary_language}` : ""}\n`;
      });
    }

    if (!hasAssessmentData) {
      const genericTip: PersonalizedTip = {
        category: "growth",
        title: "Start Your Journey",
        description:
          "Take an assessment together to get personalized relationship tips tailored to your unique dynamic.",
        action_prompt:
          "Complete the Attachment Style or Love Language assessment today",
        is_personalized: false,
      };
      return new Response(JSON.stringify(genericTip), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const systemPrompt = `You are a warm, supportive couples therapist speaking directly to a couple. 
Generate ONE personalized daily relationship tip based on their assessment profiles. 
The tip should be actionable, specific to their dynamic, and achievable in a single day.
Use 'you' and 'your' to address them directly. Keep it encouraging and practical.
Always respond with valid JSON only.`;

    const userPrompt = `${assessmentContext}

Based on these assessment results, generate ONE personalized daily tip for this couple that addresses their unique dynamic.

Consider:
- How their attachment styles interact
- How their personality types complement or challenge each other
- How they can best express love in ways their partner receives it

IMPORTANT: Respond with ONLY valid JSON in this exact format:
{
  "category": "connection|communication|intimacy|gratitude|growth",
  "title": "Short, engaging title (5-8 words)",
  "description": "2-3 sentences explaining the tip and why it matters for this specific couple",
  "action_prompt": "One specific action they can take today"
}
Return ONLY the JSON, no additional text or markdown formatting.`;

    const result = await analyzeWithPerplexity(systemPrompt, userPrompt);
    const parsed = safeJsonParse(result.content);

    if (!parsed || !parsed.title || !parsed.description) {
      console.error("Failed to parse AI response:", result.content);
      const fallbackTip: PersonalizedTip = {
        category: "connection",
        title: "Connect With Your Partner Today",
        description:
          "Take a moment to share something you appreciate about your partner. Small gestures of gratitude strengthen your bond.",
        action_prompt: "Tell your partner one thing you love about them today",
        is_personalized: true,
        generated_at: new Date().toISOString(),
        assessment_summary: {
          has_attachment: (attachmentResults?.length || 0) > 0,
          has_enneagram: (enneagramResults?.length || 0) > 0,
          has_love_language: (loveLanguageResults?.length || 0) > 0,
        },
      };
      return new Response(JSON.stringify(fallbackTip), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const response: PersonalizedTip = {
      ...parsed,
      is_personalized: true,
      generated_at: new Date().toISOString(),
      assessment_summary: {
        has_attachment: (attachmentResults?.length || 0) > 0,
        has_enneagram: (enneagramResults?.length || 0) > 0,
        has_love_language: (loveLanguageResults?.length || 0) > 0,
      },
    };

    try {
      await supabaseAdmin.from("Couples_personalized_tips_cache").upsert(
        {
          couple_id: coupleId,
          tip_date: today,
          tip_data: response,
          created_at: new Date().toISOString(),
        },
        { onConflict: "couple_id,tip_date" },
      );
    } catch (cacheError) {
      console.error("Failed to cache tip (non-fatal):", cacheError);
    }

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    console.error("AI Personalized Daily Tip error:", errorMessage);

    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

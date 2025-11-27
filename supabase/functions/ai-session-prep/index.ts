// ========================================
// CORS Headers
// ========================================
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { safeJsonParse } from "../_shared/safe-json-parse.ts";

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

function createSupabaseAdminClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  return createClient(supabaseUrl, supabaseServiceRoleKey);
}

// ========================================
// Type Definitions
// ========================================
interface SessionPrepRequest {
  couple_id: string;
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

  if (!data.couple_id || typeof data.couple_id !== "string") {
    return {
      valid: false,
      error: "couple_id is required and must be a string",
    };
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
    temperature: 0.5,
    max_tokens: 3000,
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

    const { couple_id } = rawBody as SessionPrepRequest;

    // Verify user is a therapist
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
    const supabase = createSupabaseClient(token);
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    // Check if user is a therapist
    const { data: profile } = await supabase
      .from("Couples_Profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "therapist") {
      return new Response(
        JSON.stringify({ error: "Access denied. Therapist access required." }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 403,
        },
      );
    }

    // Use admin client to fetch couple data
    const adminSupabase = createSupabaseAdminClient();

    // Fetch recent activity across all 13 therapy tools (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Get partner IDs
    const { data: partners } = await adminSupabase
      .from("Couples_Profiles")
      .select("id, full_name")
      .eq("couple_id", couple_id)
      .eq("role", "client");

    if (!partners || partners.length < 2) {
      return new Response(
        JSON.stringify({ error: "Couple not found or incomplete" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 404,
        },
      );
    }

    const partnerIds = partners.map((p) => p.id);

    // Gather activity counts
    const activityData: Record<string, number> = {};

    // Weekly check-ins
    const { count: checkinsCount } = await adminSupabase
      .from("Couples_WeeklyCheckIns")
      .select("*", { count: "exact", head: true })
      .in("user_id", partnerIds)
      .gte("created_at", thirtyDaysAgo.toISOString());
    activityData["weekly_checkins"] = checkinsCount || 0;

    // Gratitude logs
    const { count: gratitudeCount } = await adminSupabase
      .from("Couples_GratitudeLogs")
      .select("*", { count: "exact", head: true })
      .eq("couple_id", couple_id)
      .gte("created_at", thirtyDaysAgo.toISOString());
    activityData["gratitude_logs"] = gratitudeCount || 0;

    // Shared goals
    const { count: goalsCount } = await adminSupabase
      .from("Couples_SharedGoals")
      .select("*", { count: "exact", head: true })
      .eq("couple_id", couple_id)
      .gte("created_at", thirtyDaysAgo.toISOString());
    activityData["shared_goals"] = goalsCount || 0;

    // Rituals
    const { count: ritualsCount } = await adminSupabase
      .from("Couples_Rituals")
      .select("*", { count: "exact", head: true })
      .eq("couple_id", couple_id)
      .gte("created_at", thirtyDaysAgo.toISOString());
    activityData["rituals"] = ritualsCount || 0;

    // Hold Me Tight conversations
    const { count: hmtCount } = await adminSupabase
      .from("Couples_HoldMeTightConversations")
      .select("*", { count: "exact", head: true })
      .eq("couple_id", couple_id)
      .gte("created_at", thirtyDaysAgo.toISOString());
    activityData["hold_me_tight"] = hmtCount || 0;

    // Echo & Empathy sessions
    const { count: echoCount } = await adminSupabase
      .from("Couples_EchoSessions")
      .select("*", { count: "exact", head: true })
      .eq("couple_id", couple_id)
      .gte("created_at", thirtyDaysAgo.toISOString());
    activityData["echo_empathy"] = echoCount || 0;

    // Pause button usage
    const { count: pauseCount } = await adminSupabase
      .from("Couples_PauseHistory")
      .select("*", { count: "exact", head: true })
      .eq("couple_id", couple_id)
      .gte("created_at", thirtyDaysAgo.toISOString());
    activityData["pause_button"] = pauseCount || 0;

    const systemPrompt = `You are an expert couples therapist preparing for a session. Analyze the couple's recent engagement with 13 therapy tools and provide clinical insights based on Gottman Method, EFT, and IFS principles.

Guidelines:
- Identify engagement patterns (high/low activity, which tools used)
- Note concerning patterns (conflict avoidance, disconnection, escalation)
- Highlight positive patterns (consistent effort, emotional bids, growth)
- Recommend session focus areas
- Suggest evidence-based interventions`;

    const userPrompt = `Prepare session notes for a couple. Recent activity (last 30 days):

ANONYMIZED ACTIVITY DATA:
${Object.entries(activityData)
  .map(([tool, count]) => `- ${tool}: ${count} uses`)
  .join("\n")}

IMPORTANT: Respond ONLY with valid JSON in this exact format:
{
  "engagement_summary": "Brief overview of overall engagement",
  "concerning_patterns": ["pattern 1", "pattern 2"],
  "positive_patterns": ["pattern 1", "pattern 2"],
  "session_focus_areas": ["focus area 1", "focus area 2", "focus area 3"],
  "recommended_interventions": ["intervention 1", "intervention 2", "intervention 3"],
  "ai_analysis": "Detailed clinical analysis paragraph"
}`;

    const result = await analyzeWithPerplexity(systemPrompt, userPrompt);

    // Parse JSON from AI response
    const parsed = safeJsonParse(result.content);

    if (!parsed) {
      return new Response(
        JSON.stringify({ error: "Failed to parse AI response" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        },
      );
    }

    return new Response(
      JSON.stringify({
        couple_id,
        generated_at: new Date().toISOString(),
        engagement_summary: parsed.engagement_summary,
        concerning_patterns: parsed.concerning_patterns,
        positive_patterns: parsed.positive_patterns,
        session_focus_areas: parsed.session_focus_areas,
        recommended_interventions: parsed.recommended_interventions,
        ai_analysis: parsed.ai_analysis,
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
    console.error("Error generating session prep:", errorMessage);

    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

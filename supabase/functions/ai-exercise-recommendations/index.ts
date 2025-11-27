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

    // Get couple_id for this user using service role REST API
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const profileResponse = await fetch(
      `${supabaseUrl}/rest/v1/Couples_profiles?id=eq.${user.id}&select=*`,
      {
        headers: {
          apikey: supabaseServiceKey,
          Authorization: `Bearer ${supabaseServiceKey}`,
          "Content-Type": "application/json",
        },
      },
    );

    if (!profileResponse.ok) {
      throw new Error("Failed to fetch user profile");
    }

    const profiles = await profileResponse.json();
    const profile = profiles[0];

    if (!profile?.couple_id) {
      return new Response(
        JSON.stringify({ error: "No couple association found" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 403,
        },
      );
    }

    const couple_id = profile.couple_id;

    // Fetch usage data for all 13 therapy tools
    const tools = [
      "love_languages",
      "gratitude_log",
      "weekly_checkins",
      "shared_goals",
      "rituals",
      "hold_me_tight",
      "echo_empathy",
      "ifs_exercises",
      "voice_memos",
      "messages",
      "calendar",
      "love_map",
      "pause_button",
    ];

    const usageData: Record<string, number> = {};

    // Simplified - just check if any records exist using REST API
    for (const tool of tools) {
      let tableName = "";
      let column = "couple_id";

      switch (tool) {
        case "love_languages":
          tableName = "Couples_LoveLanguageResults";
          break;
        case "gratitude_log":
          tableName = "Couples_GratitudeLogs";
          break;
        case "weekly_checkins":
          tableName = "Couples_WeeklyCheckIns";
          column = "user_id";
          break;
        case "shared_goals":
          tableName = "Couples_SharedGoals";
          break;
        case "rituals":
          tableName = "Couples_Rituals";
          break;
        case "hold_me_tight":
          tableName = "Couples_HoldMeTightConversations";
          break;
        case "echo_empathy":
          tableName = "Couples_EchoSessions";
          break;
        case "ifs_exercises":
          tableName = "Couples_IFSExercises";
          column = "user_id";
          break;
        case "voice_memos":
          tableName = "Couples_VoiceMemos";
          column = "sender_id";
          break;
        case "messages":
          tableName = "Couples_Messages";
          column = "sender_id";
          break;
        case "calendar":
          tableName = "Couples_CalendarEvents";
          break;
        case "love_map":
          tableName = "Couples_LoveMapSessions";
          break;
        case "pause_button":
          tableName = "Couples_PauseHistory";
          break;
      }

      try {
        let query = `${supabaseUrl}/rest/v1/${tableName}?select=*`;
        
        if (column === "couple_id") {
          query += `&couple_id=eq.${couple_id}`;
        } else {
          // For user-based columns, just check if any exist for this couple
          query += `&couple_id=eq.${couple_id}`;
        }

        const countResponse = await fetch(query, {
          headers: {
            apikey: supabaseServiceKey,
            Authorization: `Bearer ${supabaseServiceKey}`,
          },
        });

        if (countResponse.ok) {
          const items = await countResponse.json();
          usageData[tool] = Array.isArray(items) ? items.length : 0;
        } else {
          usageData[tool] = 0;
        }
      } catch (e) {
        console.error(`Error counting ${tool}:`, e);
        usageData[tool] = 0;
      }
    }

    const systemPrompt = `You are a compassionate couples therapist trained in evidence-based modalities including Gottman Method, Emotionally Focused Therapy (EFT), and Internal Family Systems (IFS). Your role is to analyze a couple's engagement with therapy tools and provide personalized recommendations.

Guidelines:
- Classify tools as: "Not Started" (0 uses), "Underutilized" (1-3 uses), "Active" (4+ uses)
- Recommend 2-3 tools that would most benefit this couple
- Base recommendations on their current engagement patterns
- Reference research evidence where applicable
- Be encouraging and actionable`;

    const userPrompt = `Analyze this couple's therapy tool usage and provide recommendations:

USAGE DATA:
${Object.entries(usageData)
  .map(([tool, count]) => `- ${tool}: ${count} uses`)
  .join("\n")}

IMPORTANT: Respond ONLY with valid JSON in this exact format:
{
  "activity_summary": {
    "not_started": ["tool1", "tool2"],
    "underutilized": ["tool3"],
    "active": ["tool4", "tool5"]
  },
  "recommendations": [
    {
      "tool_name": "Tool Name",
      "rationale": "Why this tool would help based on usage patterns",
      "suggested_action": "Specific first step to take"
    }
  ]
}`;

    const result = await analyzeWithPerplexity(systemPrompt, userPrompt);

    // Parse JSON from AI response
    const parsed = JSON.parse(result.content);

    return new Response(
      JSON.stringify({
        couple_id,
        generated_at: new Date().toISOString(),
        activity_summary: parsed.activity_summary,
        recommendations: parsed.recommendations,
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
    console.error("Error generating exercise recommendations:", errorMessage);

    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

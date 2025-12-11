// ========================================
// AI-Powered Relationship Growth Plan
// Generates personalized exercises and goals based on couple's assessments
// ========================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

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

interface GrowthExercise {
  id: string;
  title: string;
  description: string;
  category: "communication" | "intimacy" | "conflict" | "appreciation" | "goals";
  duration_minutes: number;
  frequency: "daily" | "weekly" | "bi-weekly";
  rationale: string;
}

interface GrowthGoal {
  id: string;
  title: string;
  description: string;
  target_date_weeks: number;
  milestones: string[];
  category: string;
}

interface GrowthPlanResponse {
  couple_id: string;
  generated_at: string;
  plan_summary: string;
  focus_areas: string[];
  exercises: GrowthExercise[];
  goals: GrowthGoal[];
  personalization_context: {
    attachment_styles?: string[];
    love_languages?: string[];
    enneagram_types?: string[];
  };
  ai_full_response: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
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
        // Continue
      }
    }

    const objectMatch = cleaned.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      try {
        return JSON.parse(objectMatch[0]);
      } catch {
        // Continue
      }
    }

    return {
      plan_summary: "We recommend focusing on daily connection rituals and weekly appreciation exercises.",
      focus_areas: ["Communication", "Appreciation"],
      exercises: [
        {
          id: "default-1",
          title: "Daily Check-in",
          description: "Share one high and one low from your day with your partner.",
          category: "communication",
          duration_minutes: 10,
          frequency: "daily",
          rationale: "Regular check-ins help maintain emotional connection.",
        },
      ],
      goals: [
        {
          id: "default-goal-1",
          title: "Strengthen Communication",
          description: "Improve daily communication habits over the next month.",
          target_date_weeks: 4,
          milestones: ["Complete 7 daily check-ins", "Have one weekly deeper conversation"],
          category: "communication",
        },
      ],
      parse_error: true,
    };
  }
}

// ========================================
// Perplexity API Integration
// ========================================
async function analyzeWithPerplexity(
  systemPrompt: string,
  userPrompt: string
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

  if (!data.choices || data.choices.length === 0) {
    throw new Error("No response from Perplexity API");
  }

  return {
    content: data.choices[0].message.content,
    usage: data.usage,
  };
}

// ========================================
// Main Handler
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
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: profile } = await supabase
      .from("Couples_profiles")
      .select("couple_id, full_name")
      .eq("id", user.id)
      .single();

    if (!profile?.couple_id) {
      return new Response(
        JSON.stringify({ error: "User not linked to a couple" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const coupleId = profile.couple_id;

    const { data: couple } = await supabase
      .from("Couples_couples")
      .select("partner1_id, partner2_id")
      .eq("id", coupleId)
      .single();

    if (!couple) {
      return new Response(
        JSON.stringify({ error: "Couple not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const partnerIds = [couple.partner1_id, couple.partner2_id];

    const [loveLanguages, attachments, enneagrams, checkins, goals] = await Promise.all([
      supabase
        .from("Couples_love_languages")
        .select("user_id, primary_language, secondary_language")
        .in("user_id", partnerIds),
      supabase
        .from("Couples_attachment_results")
        .select("user_id, attachment_style, scores")
        .in("user_id", partnerIds),
      supabase
        .from("Couples_enneagram_results")
        .select("user_id, dominant_type, wing")
        .in("user_id", partnerIds),
      supabase
        .from("Couples_weekly_checkins")
        .select("user_id, overall_satisfaction, communication_rating, created_at")
        .in("user_id", partnerIds)
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("Couples_shared_goals")
        .select("title, status, category")
        .eq("couple_id", coupleId)
        .limit(10),
    ]);

    const personalizationContext: any = {};

    if (loveLanguages.data?.length) {
      personalizationContext.love_languages = loveLanguages.data.map(
        (ll) => `${ll.primary_language}${ll.secondary_language ? ` (secondary: ${ll.secondary_language})` : ""}`
      );
    }

    if (attachments.data?.length) {
      personalizationContext.attachment_styles = attachments.data.map((a) => a.attachment_style);
    }

    if (enneagrams.data?.length) {
      personalizationContext.enneagram_types = enneagrams.data.map(
        (e) => `Type ${e.dominant_type}${e.wing ? `w${e.wing}` : ""}`
      );
    }

    let avgSatisfaction = 0;
    let avgCommunication = 0;
    if (checkins.data?.length) {
      avgSatisfaction = checkins.data.reduce((sum, c) => sum + (c.overall_satisfaction || 0), 0) / checkins.data.length;
      avgCommunication = checkins.data.reduce((sum, c) => sum + (c.communication_rating || 0), 0) / checkins.data.length;
    }

    const completedGoals = goals.data?.filter((g) => g.status === "completed").length || 0;
    const activeGoals = goals.data?.filter((g) => g.status === "active").length || 0;

    const systemPrompt = `You are a couples therapy AI assistant specializing in creating personalized relationship growth plans. Based on the couple's assessment results and recent activity, create a comprehensive but achievable growth plan.

Your response MUST be valid JSON with exactly this structure:
{
  "plan_summary": "A 2-3 sentence overview of the personalized growth plan",
  "focus_areas": ["Area 1", "Area 2", "Area 3"],
  "exercises": [
    {
      "id": "exercise-1",
      "title": "Exercise Title",
      "description": "Detailed description of the exercise",
      "category": "communication|intimacy|conflict|appreciation|goals",
      "duration_minutes": 15,
      "frequency": "daily|weekly|bi-weekly",
      "rationale": "Why this exercise is recommended based on their profile"
    }
  ],
  "goals": [
    {
      "id": "goal-1",
      "title": "Goal Title",
      "description": "What they will achieve",
      "target_date_weeks": 4,
      "milestones": ["Milestone 1", "Milestone 2", "Milestone 3"],
      "category": "communication|intimacy|trust|appreciation"
    }
  ]
}

Generate 4-6 exercises and 2-3 goals. Make them specific to the couple's attachment styles, love languages, and enneagram types if available.`;

    const userPrompt = `Create a personalized relationship growth plan for this couple:

ASSESSMENT DATA:
${personalizationContext.love_languages ? `Love Languages: ${personalizationContext.love_languages.join(", ")}` : "Love Languages: Not assessed yet"}
${personalizationContext.attachment_styles ? `Attachment Styles: ${personalizationContext.attachment_styles.join(", ")}` : "Attachment Styles: Not assessed yet"}
${personalizationContext.enneagram_types ? `Enneagram Types: ${personalizationContext.enneagram_types.join(", ")}` : "Enneagram Types: Not assessed yet"}

RECENT ACTIVITY:
- Average satisfaction rating: ${avgSatisfaction.toFixed(1)}/5
- Average communication rating: ${avgCommunication.toFixed(1)}/5
- Completed goals: ${completedGoals}
- Active goals: ${activeGoals}

Please create a growth plan that:
1. Addresses any gaps in their communication or connection
2. Builds on their existing strengths
3. Considers their personality types and love languages
4. Includes both daily habits and longer-term goals`;

    const aiResult = await analyzeWithPerplexity(systemPrompt, userPrompt);
    const parsed = safeJsonParse(aiResult.content);

    const response: GrowthPlanResponse = {
      couple_id: coupleId,
      generated_at: new Date().toISOString(),
      plan_summary: parsed.plan_summary || "Focus on daily connection and weekly appreciation rituals.",
      focus_areas: parsed.focus_areas || ["Communication", "Appreciation"],
      exercises: (parsed.exercises || []).map((e: any, idx: number) => ({
        id: e.id || `exercise-${idx + 1}`,
        title: e.title || "Connection Exercise",
        description: e.description || "",
        category: e.category || "communication",
        duration_minutes: e.duration_minutes || 15,
        frequency: e.frequency || "weekly",
        rationale: e.rationale || "",
      })),
      goals: (parsed.goals || []).map((g: any, idx: number) => ({
        id: g.id || `goal-${idx + 1}`,
        title: g.title || "Relationship Goal",
        description: g.description || "",
        target_date_weeks: g.target_date_weeks || 4,
        milestones: g.milestones || [],
        category: g.category || "communication",
      })),
      personalization_context: personalizationContext,
      ai_full_response: aiResult.content,
      usage: aiResult.usage,
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Growth Plan Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

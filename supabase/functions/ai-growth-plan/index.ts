// ========================================
// AI-Powered Relationship Growth Plan
// Generates personalized exercises and goals based on couple's assessments
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

    return getDefaultGrowthPlan();
  }
}

function getDefaultGrowthPlan() {
  return {
    exercises: [
      {
        id: "exercise-1",
        title: "Daily Appreciation Share",
        description: "Take turns sharing one thing you appreciate about each other. Be specific about actions, qualities, or moments that made an impact.",
        category: "appreciation",
        duration_minutes: 10,
        frequency: "daily",
        rationale: "Regular appreciation builds emotional connection and reinforces positive behaviors.",
      },
      {
        id: "exercise-2",
        title: "Stress-Reducing Conversation",
        description: "Spend 20 minutes discussing each other's day. Focus on listening without offering solutions unless asked.",
        category: "communication",
        duration_minutes: 20,
        frequency: "daily",
        rationale: "Daily check-ins reduce emotional distance and build understanding.",
      },
      {
        id: "exercise-3",
        title: "Weekly Dream Sharing",
        description: "Share a dream, hope, or aspiration with your partner. Ask curious questions to understand their inner world better.",
        category: "intimacy",
        duration_minutes: 30,
        frequency: "weekly",
        rationale: "Understanding each other's dreams deepens emotional intimacy.",
      },
      {
        id: "exercise-4",
        title: "Repair Conversation Practice",
        description: "Practice using 'I feel' statements and making repair attempts after minor disagreements.",
        category: "conflict",
        duration_minutes: 15,
        frequency: "weekly",
        rationale: "Building repair skills prevents negative cycles from escalating.",
      },
    ],
    goals: [
      {
        id: "goal-1",
        title: "Establish Daily Connection Ritual",
        description: "Create a consistent daily practice of meaningful connection.",
        category: "communication",
        milestones: ["Choose a ritual", "Practice for one week", "Reflect and adjust"],
        target_date_weeks: 4,
      },
      {
        id: "goal-2",
        title: "Improve Conflict Resolution",
        description: "Develop healthier patterns for handling disagreements.",
        category: "conflict",
        milestones: ["Identify triggers", "Create a repair toolkit", "Practice during low-stakes moments"],
        target_date_weeks: 6,
      },
      {
        id: "goal-3",
        title: "Deepen Emotional Intimacy",
        description: "Build a stronger emotional bond through vulnerability and understanding.",
        category: "intimacy",
        milestones: ["Share childhood memories", "Discuss fears and dreams", "Create shared meaning"],
        target_date_weeks: 8,
      },
    ],
    personalization_summary: "This general growth plan focuses on building connection, improving communication, and deepening intimacy.",
  };
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
    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const user = await userResponse.json();
    if (!user || !user.id) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get couple_id for this user using service role REST API
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const profileResponse = await fetch(
      `${supabaseUrl}/rest/v1/Couples_profiles?id=eq.${user.id}&select=couple_id,full_name`,
      {
        headers: {
          apikey: supabaseServiceKey,
          Authorization: `Bearer ${supabaseServiceKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!profileResponse.ok) {
      throw new Error("Failed to fetch user profile");
    }

    const profiles = await profileResponse.json();
    const profile = profiles[0];

    if (!profile?.couple_id) {
      return new Response(
        JSON.stringify({ error: "User not linked to a couple" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const coupleId = profile.couple_id;

    // Get couple info
    const coupleResponse = await fetch(
      `${supabaseUrl}/rest/v1/Couples_couples?id=eq.${coupleId}&select=partner1_id,partner2_id`,
      {
        headers: {
          apikey: supabaseServiceKey,
          Authorization: `Bearer ${supabaseServiceKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!coupleResponse.ok) {
      throw new Error("Failed to fetch couple");
    }

    const couples = await coupleResponse.json();
    const couple = couples[0];

    if (!couple) {
      return new Response(
        JSON.stringify({ error: "Couple not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const partnerIds = [couple.partner1_id, couple.partner2_id];

    // Fetch all assessment data in parallel
    const [loveLanguagesRes, attachmentsRes, enneagramsRes] = await Promise.all([
      fetch(
        `${supabaseUrl}/rest/v1/Couples_love_languages?user_id=in.(${partnerIds.join(",")})&select=user_id,primary_language,secondary_language`,
        {
          headers: {
            apikey: supabaseServiceKey,
            Authorization: `Bearer ${supabaseServiceKey}`,
            "Content-Type": "application/json",
          },
        }
      ),
      fetch(
        `${supabaseUrl}/rest/v1/Couples_attachment_results?user_id=in.(${partnerIds.join(",")})&select=user_id,attachment_style,scores`,
        {
          headers: {
            apikey: supabaseServiceKey,
            Authorization: `Bearer ${supabaseServiceKey}`,
            "Content-Type": "application/json",
          },
        }
      ),
      fetch(
        `${supabaseUrl}/rest/v1/Couples_enneagram_results?user_id=in.(${partnerIds.join(",")})&select=user_id,dominant_type,wing`,
        {
          headers: {
            apikey: supabaseServiceKey,
            Authorization: `Bearer ${supabaseServiceKey}`,
            "Content-Type": "application/json",
          },
        }
      ),
    ]);

    const loveLanguages = loveLanguagesRes.ok ? await loveLanguagesRes.json() : [];
    const attachments = attachmentsRes.ok ? await attachmentsRes.json() : [];
    const enneagrams = enneagramsRes.ok ? await enneagramsRes.json() : [];

    // Build personalization context
    const personalizationContext: any = {};

    if (loveLanguages?.length) {
      personalizationContext.love_languages = loveLanguages.map(
        (ll: any) => `${ll.primary_language}${ll.secondary_language ? ` (secondary: ${ll.secondary_language})` : ""}`
      );
    }

    if (attachments?.length) {
      personalizationContext.attachment_styles = attachments.map((a: any) => a.attachment_style);
    }

    if (enneagrams?.length) {
      personalizationContext.enneagram_types = enneagrams.map(
        (e: any) => `Type ${e.dominant_type}${e.wing ? `w${e.wing}` : ""}`
      );
    }

    const hasPersonalization = Object.keys(personalizationContext).length > 0;

    // Build prompt for AI
    const systemPrompt = `You are an expert couples therapist creating a personalized relationship growth plan. 
Based on the couple's assessment results, create a tailored set of exercises and goals that will strengthen their relationship.
Focus on their specific dynamics, attachment patterns, and communication needs.
Always respond with valid JSON only.`;

    let userPrompt = "";
    if (hasPersonalization) {
      userPrompt = `Create a personalized relationship growth plan based on this couple's profile:

${JSON.stringify(personalizationContext, null, 2)}

Generate exercises and goals that specifically address their attachment dynamics, love language preferences, and personality types.`;
    } else {
      userPrompt = `Create a general relationship growth plan with exercises and goals that help couples build stronger connections, improve communication, and deepen intimacy.`;
    }

    userPrompt += `

IMPORTANT: Respond with ONLY valid JSON in this exact format:
{
  "exercises": [
    {
      "id": "exercise-1",
      "title": "Exercise name",
      "description": "2-3 sentences describing the exercise",
      "category": "communication|intimacy|conflict|appreciation|goals",
      "duration_minutes": 15,
      "frequency": "daily|weekly|bi-weekly",
      "rationale": "Why this exercise helps this specific couple"
    }
  ],
  "goals": [
    {
      "id": "goal-1",
      "title": "Goal name",
      "description": "What this goal achieves",
      "category": "communication|intimacy|conflict|appreciation|goals",
      "milestones": ["First milestone", "Second milestone", "Third milestone"],
      "target_date_weeks": 4
    }
  ],
  "personalization_summary": "Brief summary of how this plan is tailored to the couple"
}

Generate 4-6 exercises and 3-4 goals. Return ONLY the JSON, no additional text.`;

    // Call Perplexity AI
    const analysisResult = await analyzeWithPerplexity(systemPrompt, userPrompt);
    const aiFullResponse = analysisResult.content;

    const parsed = safeJsonParse(aiFullResponse);

    // Build response
    const response = {
      couple_id: coupleId,
      generated_at: new Date().toISOString(),
      exercises: parsed.exercises || [],
      goals: parsed.goals || [],
      personalization_summary: parsed.personalization_summary || "General relationship growth plan",
      personalization_context: hasPersonalization ? personalizationContext : null,
      usage: analysisResult.usage,
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    console.error("AI Growth Plan error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to generate growth plan" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

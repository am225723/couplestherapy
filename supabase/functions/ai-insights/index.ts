// ========================================
// Supabase Edge Function: AI Insights
// ========================================
// Analyzes ALL couple data using Perplexity AI to generate clinical insights for therapists
//
// DATA SOURCES:
// - Weekly Check-ins (connectedness, conflict, appreciation, needs)
// - Love Languages (primary/secondary languages for each partner)
// - Attachment Styles (anxious, avoidant, secure, disorganized)
// - Gratitude Logs (what partners appreciate about each other)
// - Shared Goals (progress on joint goals)
// - Rituals of Connection (relationship rituals)
// - Hold Me Tight Conversations (EFT-based conversations)
// - Echo & Empathy Sessions (communication exercises)
// - Couple Journal Entries (shared reflections)
//
// PRIVACY APPROACH:
// - Uses anonymized labels ("Partner 1", "Partner 2") when sending data to Perplexity AI
// - Never sends actual user names to external AI service
// - Allowlist logging approach: only logs field presence/counts, never actual user data
//
// ACCESS MODEL:
// - Cross-therapist access: Any authenticated therapist can view any couple's insights

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
  temperature: number;
  max_tokens?: number;
}

interface PerplexityResponse {
  id: string;
  model: string;
  object: string;
  created: number;
  citations?: string[];
  choices: Array<{
    index: number;
    finish_reason: string;
    message: {
      role: string;
      content: string;
    };
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface WeeklyCheckIn {
  id: string;
  couple_id: string;
  user_id: string;
  year: number;
  week_number: number;
  q_connectedness: number;
  q_conflict: number;
  q_appreciation: string;
  q_regrettable_incident: string;
  q_my_need: string;
  created_at: string;
}

interface LoveLanguage {
  id: string;
  user_id: string;
  couple_id: string;
  primary_language: string;
  secondary_language: string;
  created_at: string;
}

interface AttachmentStyle {
  id: string;
  user_id: string;
  couple_id: string;
  attachment_style: string;
  anxious_score: number;
  avoidant_score: number;
  secure_score: number;
  created_at: string;
}

interface GratitudeLog {
  id: string;
  couple_id: string;
  user_id: string;
  content: string;
  created_at: string;
}

interface SharedGoal {
  id: string;
  couple_id: string;
  title: string;
  description: string;
  status: string;
  progress: number;
  created_at: string;
}

interface Ritual {
  id: string;
  couple_id: string;
  name: string;
  frequency: string;
  last_completed: string;
  created_at: string;
}

interface Conversation {
  id: string;
  couple_id: string;
  type: string;
  status: string;
  created_at: string;
}

interface JournalEntry {
  id: string;
  couple_id: string;
  user_id: string;
  content: string;
  mood: string;
  created_at: string;
}

interface Couple {
  id: string;
  partner1_id: string;
  partner2_id: string;
  therapist_id: string | null;
}

interface AIInsightResponse {
  couple_id: string;
  generated_at: string;
  summary: string;
  discrepancies: string[];
  patterns: string[];
  recommendations: string[];
  strengths: string[];
  raw_analysis: string;
  citations?: string[];
  data_sources: string[];
}

// ========================================
// Privacy-Focused Logging Helper
// ========================================
function redactForLogging(data: any): any {
  if (!data || typeof data !== "object") {
    return "[redacted]";
  }

  const redacted: any = {};
  const safeFields = ["couple_id", "therapist_id", "timestamp"];

  for (const key of safeFields) {
    if (key in data) {
      redacted[key] = data[key];
    }
  }

  if ("checkins" in data && Array.isArray(data.checkins)) {
    redacted.checkins_count = data.checkins.length;
  }

  return redacted;
}

// ========================================
// Perplexity AI Helper
// ========================================
async function analyzeWithPerplexity(
  systemPrompt: string,
  userPrompt: string,
): Promise<{ content: string; citations?: string[] }> {
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
    citations: data.citations,
  };
}

// ========================================
// Data Fetching Helpers
// ========================================
async function fetchFromSupabase(
  supabaseUrl: string,
  supabaseServiceKey: string,
  table: string,
  query: string,
): Promise<any[]> {
  const response = await fetch(
    `${supabaseUrl}/rest/v1/${table}?${query}`,
    {
      headers: {
        apikey: supabaseServiceKey,
        Authorization: `Bearer ${supabaseServiceKey}`,
        "Content-Type": "application/json",
      },
    },
  );

  if (!response.ok) {
    console.error(`Failed to fetch from ${table}:`, response.statusText);
    return [];
  }

  return response.json();
}

// ========================================
// Main Edge Function Handler
// ========================================
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Support both query params (GET) and body (POST) for couple_id
    const url = new URL(req.url);
    let coupleId = url.searchParams.get("couple_id");
    
    // If not in query params, try to get from request body
    if (!coupleId && req.method === "POST") {
      try {
        const body = await req.json();
        coupleId = body.couple_id;
      } catch {
        // Body parsing failed, coupleId remains null
      }
    }

    if (!coupleId) {
      console.error("Missing required parameter: couple_id");
      return new Response(JSON.stringify({ error: "couple_id is required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
      throw new Error("Supabase configuration missing");
    }

    // Validate JWT and authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Missing or invalid authorization header" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        },
      );
    }

    const jwt = authHeader.replace("Bearer ", "");

    const sessionResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${jwt}`,
      },
    });

    if (!sessionResponse.ok) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired session token" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        },
      );
    }

    const user = await sessionResponse.json();

    if (!user || !user.id) {
      return new Response(
        JSON.stringify({ error: "Unable to authenticate user" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        },
      );
    }

    // Get user profile to verify therapist role
    const profiles = await fetchFromSupabase(
      supabaseUrl,
      supabaseServiceKey,
      "Couples_profiles",
      `id=eq.${user.id}&select=*`,
    );
    const profile = profiles[0];

    if (!profile || profile.user_type !== "therapist") {
      return new Response(
        JSON.stringify({
          error: "Access denied. Only therapists can access insights.",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 403,
        },
      );
    }

    console.log(
      "Generating AI insights for:",
      redactForLogging({ couple_id: coupleId, therapist_id: profile.id }),
    );

    // Fetch couple data (cross-therapist access - any therapist can view any couple)
    const couples: Couple[] = await fetchFromSupabase(
      supabaseUrl,
      supabaseServiceKey,
      "Couples_couples",
      `id=eq.${coupleId}&select=*`,
    );
    const couple = couples[0];

    if (!couple) {
      return new Response(JSON.stringify({ error: "Couple not found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 404,
      });
    }

    // Fetch ALL data sources in parallel
    const twelveWeeksAgo = new Date();
    twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - 84);
    const dateFilter = twelveWeeksAgo.toISOString();

    const [
      checkins,
      loveLanguages,
      attachmentStyles,
      gratitudeLogs,
      sharedGoals,
      rituals,
      conversations,
      journalEntries,
    ] = await Promise.all([
      fetchFromSupabase(
        supabaseUrl,
        supabaseServiceKey,
        "Couples_weekly_checkins",
        `couple_id=eq.${coupleId}&created_at=gte.${dateFilter}&order=created_at.desc&select=*`,
      ),
      fetchFromSupabase(
        supabaseUrl,
        supabaseServiceKey,
        "Couples_love_languages",
        `couple_id=eq.${coupleId}&select=*`,
      ),
      fetchFromSupabase(
        supabaseUrl,
        supabaseServiceKey,
        "Couples_attachment_style",
        `couple_id=eq.${coupleId}&select=*`,
      ),
      fetchFromSupabase(
        supabaseUrl,
        supabaseServiceKey,
        "Couples_gratitude_logs",
        `couple_id=eq.${coupleId}&created_at=gte.${dateFilter}&order=created_at.desc&limit=20&select=*`,
      ),
      fetchFromSupabase(
        supabaseUrl,
        supabaseServiceKey,
        "Couples_shared_goals",
        `couple_id=eq.${coupleId}&select=*`,
      ),
      fetchFromSupabase(
        supabaseUrl,
        supabaseServiceKey,
        "Couples_rituals",
        `couple_id=eq.${coupleId}&select=*`,
      ),
      fetchFromSupabase(
        supabaseUrl,
        supabaseServiceKey,
        "Couples_conversations",
        `couple_id=eq.${coupleId}&created_at=gte.${dateFilter}&order=created_at.desc&select=*`,
      ),
      fetchFromSupabase(
        supabaseUrl,
        supabaseServiceKey,
        "Couples_journal_entries",
        `couple_id=eq.${coupleId}&created_at=gte.${dateFilter}&order=created_at.desc&limit=10&select=*`,
      ),
    ]);

    // Track which data sources have content
    const dataSources: string[] = [];
    
    // Check if we have ANY data at all
    const hasAnyData = 
      checkins.length > 0 ||
      loveLanguages.length > 0 ||
      attachmentStyles.length > 0 ||
      gratitudeLogs.length > 0 ||
      sharedGoals.length > 0 ||
      rituals.length > 0 ||
      conversations.length > 0 ||
      journalEntries.length > 0;

    if (!hasAnyData) {
      return new Response(
        JSON.stringify({
          error: "No data available for this couple. Clients need to complete at least one activity or assessment to generate insights.",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        },
      );
    }

    // Build comprehensive user prompt
    let userPrompt = `Analyze the following relationship data for a couple in therapy. Use all available data to provide comprehensive insights.\n\n`;

    // Add Love Languages
    if (loveLanguages.length > 0) {
      dataSources.push("Love Languages");
      userPrompt += `=== LOVE LANGUAGES ===\n`;
      loveLanguages.forEach((ll: LoveLanguage) => {
        const partnerId = ll.user_id === couple.partner1_id ? 1 : 2;
        userPrompt += `Partner ${partnerId}: Primary - ${ll.primary_language}, Secondary - ${ll.secondary_language}\n`;
      });
      userPrompt += "\n";
    }

    // Add Attachment Styles
    if (attachmentStyles.length > 0) {
      dataSources.push("Attachment Styles");
      userPrompt += `=== ATTACHMENT STYLES ===\n`;
      attachmentStyles.forEach((as: AttachmentStyle) => {
        const partnerId = as.user_id === couple.partner1_id ? 1 : 2;
        userPrompt += `Partner ${partnerId}: Style - ${as.attachment_style}\n`;
        userPrompt += `  Anxious: ${as.anxious_score}/100, Avoidant: ${as.avoidant_score}/100, Secure: ${as.secure_score}/100\n`;
      });
      userPrompt += "\n";
    }

    // Add Weekly Check-ins
    if (checkins.length > 0) {
      dataSources.push("Weekly Check-ins");
      userPrompt += `=== WEEKLY CHECK-INS (Last 12 weeks) ===\n`;
      
      const weeklyData: Record<string, any[]> = {};
      checkins.forEach((checkin: WeeklyCheckIn) => {
        const weekKey = `${checkin.year}-W${checkin.week_number}`;
        if (!weeklyData[weekKey]) {
          weeklyData[weekKey] = [];
        }
        const partnerId = checkin.user_id === couple.partner1_id ? 1 : 2;
        weeklyData[weekKey].push({
          partnerId,
          connectedness: checkin.q_connectedness,
          conflict: checkin.q_conflict,
          appreciation: checkin.q_appreciation,
          regrettableIncident: checkin.q_regrettable_incident,
          need: checkin.q_my_need,
        });
      });

      Object.keys(weeklyData).sort().forEach((weekKey) => {
        userPrompt += `\n${weekKey}:\n`;
        weeklyData[weekKey].forEach((c) => {
          userPrompt += `Partner ${c.partnerId}: Connectedness ${c.connectedness}/10, Conflict ${c.conflict}/10\n`;
          if (c.appreciation) userPrompt += `  Appreciation: "${c.appreciation}"\n`;
          if (c.need) userPrompt += `  Need: "${c.need}"\n`;
        });
      });
      userPrompt += "\n";
    }

    // Add Gratitude Logs
    if (gratitudeLogs.length > 0) {
      dataSources.push("Gratitude Logs");
      userPrompt += `=== RECENT GRATITUDE LOGS ===\n`;
      gratitudeLogs.slice(0, 10).forEach((gl: GratitudeLog) => {
        const partnerId = gl.user_id === couple.partner1_id ? 1 : 2;
        userPrompt += `Partner ${partnerId}: "${gl.content}"\n`;
      });
      userPrompt += "\n";
    }

    // Add Shared Goals
    if (sharedGoals.length > 0) {
      dataSources.push("Shared Goals");
      userPrompt += `=== SHARED GOALS ===\n`;
      sharedGoals.forEach((sg: SharedGoal) => {
        userPrompt += `- "${sg.title}" (Status: ${sg.status}, Progress: ${sg.progress}%)\n`;
        if (sg.description) userPrompt += `  Description: ${sg.description}\n`;
      });
      userPrompt += "\n";
    }

    // Add Rituals
    if (rituals.length > 0) {
      dataSources.push("Rituals of Connection");
      userPrompt += `=== RITUALS OF CONNECTION ===\n`;
      rituals.forEach((r: Ritual) => {
        userPrompt += `- "${r.name}" (Frequency: ${r.frequency})\n`;
      });
      userPrompt += "\n";
    }

    // Add Conversations (Hold Me Tight, Echo & Empathy)
    if (conversations.length > 0) {
      dataSources.push("Therapeutic Conversations");
      userPrompt += `=== THERAPEUTIC CONVERSATIONS ===\n`;
      const convCounts: Record<string, number> = {};
      conversations.forEach((c: Conversation) => {
        convCounts[c.type] = (convCounts[c.type] || 0) + 1;
      });
      Object.entries(convCounts).forEach(([type, count]) => {
        userPrompt += `- ${type}: ${count} sessions\n`;
      });
      userPrompt += "\n";
    }

    // Add Journal Entries
    if (journalEntries.length > 0) {
      dataSources.push("Journal Entries");
      userPrompt += `=== RECENT JOURNAL ENTRIES ===\n`;
      journalEntries.slice(0, 5).forEach((je: JournalEntry) => {
        const partnerId = je.user_id === couple.partner1_id ? 1 : 2;
        userPrompt += `Partner ${partnerId} (Mood: ${je.mood || "not specified"}): "${je.content?.substring(0, 200)}..."\n`;
      });
      userPrompt += "\n";
    }

    // Request structured analysis
    userPrompt += `\n=== ANALYSIS REQUEST ===
Based on ALL the data above, provide:
1. A comprehensive summary of this couple's relationship dynamics (2-3 paragraphs)
2. Key discrepancies or differences between partners (list 3-5 specific points)
3. Important patterns and trends observed (list 3-5 specific observations)
4. Relationship strengths to build upon (list 3-5 strengths)
5. Therapeutic recommendations for the therapist (list 5-7 actionable items)

Consider how different data sources inform each other (e.g., how love languages affect appreciation expressions, how attachment styles influence conflict patterns).`;

    const systemPrompt = `You are an expert couples therapist with training in Emotionally Focused Therapy (EFT), the Gottman Method, and attachment theory. You are analyzing comprehensive relationship data from a therapeutic intervention platform.

Your task is to synthesize ALL available data sources to provide clinically meaningful insights:
- Consider how love languages and attachment styles interact
- Identify patterns across different activities (check-ins, gratitude, goals)
- Look for discrepancies between partners' perceptions and experiences
- Note engagement levels with different therapeutic tools
- Provide evidence-based, actionable recommendations

Be precise, therapeutically sensitive, and solution-focused. Use anonymized labels ("Partner 1", "Partner 2") throughout your analysis.

Format your response with clear sections:
**SUMMARY**
[2-3 paragraph overview]

**DISCREPANCIES**
- [bullet points]

**PATTERNS**
- [bullet points]

**STRENGTHS**
- [bullet points]

**RECOMMENDATIONS**
- [numbered actionable items]`;

    // Call Perplexity API
    const analysisResult = await analyzeWithPerplexity(
      systemPrompt,
      userPrompt,
    );

    // Parse and structure the response
    const rawAnalysis = analysisResult.content;
    const lines = rawAnalysis.split("\n").filter((line) => line.trim());

    let summary = "";
    const discrepancies: string[] = [];
    const patterns: string[] = [];
    const strengths: string[] = [];
    const recommendations: string[] = [];

    let currentSection = "";

    lines.forEach((line) => {
      const lowerLine = line.toLowerCase();
      const trimmedLine = line.trim();

      if (lowerLine.includes("**summary**") || lowerLine.includes("summary:")) {
        currentSection = "summary";
      } else if (lowerLine.includes("**discrepanc") || lowerLine.includes("discrepancies:")) {
        currentSection = "discrepancies";
      } else if (lowerLine.includes("**pattern") || lowerLine.includes("patterns:")) {
        currentSection = "patterns";
      } else if (lowerLine.includes("**strength") || lowerLine.includes("strengths:")) {
        currentSection = "strengths";
      } else if (lowerLine.includes("**recommendation") || lowerLine.includes("recommendations:")) {
        currentSection = "recommendations";
      } else if (trimmedLine.match(/^[\d\-\*•]/)) {
        const cleanedLine = trimmedLine.replace(/^[\d\-\*•.)\s]+/, "").trim();
        if (cleanedLine) {
          if (currentSection === "discrepancies") {
            discrepancies.push(cleanedLine);
          } else if (currentSection === "patterns") {
            patterns.push(cleanedLine);
          } else if (currentSection === "strengths") {
            strengths.push(cleanedLine);
          } else if (currentSection === "recommendations") {
            recommendations.push(cleanedLine);
          }
        }
      } else if (currentSection === "summary" && trimmedLine && !trimmedLine.startsWith("**")) {
        summary += trimmedLine + " ";
      }
    });

    // Fallbacks
    if (!summary) {
      summary = rawAnalysis.substring(0, 500) + "...";
    }
    if (discrepancies.length === 0) {
      discrepancies.push("See detailed analysis below");
    }
    if (patterns.length === 0) {
      patterns.push("See detailed analysis below");
    }
    if (strengths.length === 0) {
      strengths.push("See detailed analysis below");
    }
    if (recommendations.length === 0) {
      recommendations.push("See detailed analysis below");
    }

    const insights: AIInsightResponse = {
      couple_id: coupleId,
      generated_at: new Date().toISOString(),
      summary: summary.trim(),
      discrepancies,
      patterns,
      recommendations,
      strengths,
      raw_analysis: rawAnalysis,
      citations: analysisResult.citations,
      data_sources: dataSources,
    };

    console.log(
      "Successfully generated comprehensive insights for couple:",
      redactForLogging({ couple_id: coupleId }),
    );

    return new Response(JSON.stringify(insights), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    console.error("Error generating AI insights:", errorMessage);

    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

import { Router } from "express";
import { supabaseAdmin } from "../supabase.js";
import { verifyTherapistSession, verifyUserSession } from "../helpers.js";
import { z } from "zod";

const saveAssessmentSchema = z.object({
  attachment_style: z.enum(["secure", "anxious", "avoidant", "disorganized"]),
  score: z.number().optional(),
  dynamics_with_partner: z.string().optional().nullable(),
  triggers: z.array(z.string()).optional().nullable(),
  repair_strategies: z.array(z.string()).optional().nullable(),
});

const router = Router();

// GET /questions - Get all attachment questions
router.get("/questions", async (req, res) => {
  try {
    const authResult = await verifyUserSession(req);
    if (!authResult.success) {
      return res.status(authResult.status).json({ error: authResult.error });
    }

    const { data, error } = await supabaseAdmin
      .from("Couples_attachment_questions")
      .select("*")
      .order("id");

    if (error) throw error;

    res.json(data);
  } catch (error: any) {
    console.error("Error fetching attachment questions:", error);
    res
      .status(500)
      .json({ error: error.message || "Failed to fetch questions" });
  }
});

// POST /sessions - Create a new assessment session
router.post("/sessions", async (req, res) => {
  try {
    const authResult = await verifyUserSession(req);
    if (!authResult.success) {
      return res.status(authResult.status).json({ error: authResult.error });
    }

    // Get user's couple_id from their profile
    const { data: profile } = await supabaseAdmin
      .from("Couples_profiles")
      .select("couple_id")
      .eq("id", authResult.userId)
      .single();

    if (!profile?.couple_id) {
      return res.status(400).json({ error: "User is not part of a couple" });
    }

    const { data, error } = await supabaseAdmin
      .from("Couples_attachment_sessions")
      .insert({
        user_id: authResult.userId,
        couple_id: profile.couple_id,
        is_completed: false,
      })
      .select()
      .single();

    if (error) throw error;

    res.json(data);
  } catch (error: any) {
    console.error("Error creating attachment session:", error);
    res
      .status(500)
      .json({ error: error.message || "Failed to create session" });
  }
});

// GET /sessions/my - Get user's sessions
router.get("/sessions/my", async (req, res) => {
  try {
    const authResult = await verifyUserSession(req);
    if (!authResult.success) {
      return res.status(authResult.status).json({ error: authResult.error });
    }

    const { data, error } = await supabaseAdmin
      .from("Couples_attachment_sessions")
      .select("*")
      .eq("user_id", authResult.userId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    res.json(data);
  } catch (error: any) {
    console.error("Error fetching attachment sessions:", error);
    res
      .status(500)
      .json({ error: error.message || "Failed to fetch sessions" });
  }
});

// POST /responses - Save response to a question
router.post("/responses", async (req, res) => {
  try {
    const authResult = await verifyUserSession(req);
    if (!authResult.success) {
      return res.status(authResult.status).json({ error: authResult.error });
    }

    const { session_id, question_id, response_value } = req.body;

    // Verify the session belongs to the user
    const { data: session } = await supabaseAdmin
      .from("Couples_attachment_sessions")
      .select("user_id")
      .eq("id", session_id)
      .single();

    if (!session || session.user_id !== authResult.userId) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Validate response value
    if (!response_value || response_value < 1 || response_value > 5) {
      return res
        .status(400)
        .json({ error: "Response value must be between 1 and 5" });
    }

    const { data, error } = await supabaseAdmin
      .from("Couples_attachment_responses")
      .upsert(
        {
          session_id,
          question_id,
          response_value,
        },
        { onConflict: "session_id,question_id" },
      )
      .select()
      .single();

    if (error) throw error;

    res.json(data);
  } catch (error: any) {
    console.error("Error saving attachment response:", error);
    res.status(500).json({ error: error.message || "Failed to save response" });
  }
});

// POST /sessions/:id/complete - Complete session and calculate results
router.post("/sessions/:id/complete", async (req, res) => {
  try {
    const authResult = await verifyUserSession(req);
    if (!authResult.success) {
      return res.status(authResult.status).json({ error: authResult.error });
    }

    const { id } = req.params;

    // Verify the session belongs to the user
    const { data: session } = await supabaseAdmin
      .from("Couples_attachment_sessions")
      .select("user_id, couple_id")
      .eq("id", id)
      .single();

    if (!session || session.user_id !== authResult.userId) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Get all responses for this session with question details
    const { data: responses } = await supabaseAdmin
      .from("Couples_attachment_responses")
      .select(
        `
        response_value,
        Couples_attachment_questions!inner (
          attachment_category,
          reverse_scored
        )
      `,
      )
      .eq("session_id", id);

    if (!responses || responses.length < 20) {
      return res
        .status(400)
        .json({ error: "Not enough responses to calculate results" });
    }

    // Calculate scores for each attachment style
    const scores = {
      secure: 0,
      anxious: 0,
      avoidant: 0,
      disorganized: 0,
    };

    const counts = {
      secure: 0,
      anxious: 0,
      avoidant: 0,
      disorganized: 0,
    };

    for (const response of responses) {
      const question = response.Couples_attachment_questions as any;
      const category = question.attachment_category;
      const isReversed = question.reverse_scored;
      let value = response.response_value;

      // Reverse score if needed
      if (isReversed) {
        value = 6 - value;
      }

      scores[category as keyof typeof scores] += value;
      counts[category as keyof typeof counts]++;
    }

    // Normalize scores (average per category)
    const normalizedScores = {
      secure:
        counts.secure > 0
          ? Math.round((scores.secure / counts.secure) * 20)
          : 0,
      anxious:
        counts.anxious > 0
          ? Math.round((scores.anxious / counts.anxious) * 20)
          : 0,
      avoidant:
        counts.avoidant > 0
          ? Math.round((scores.avoidant / counts.avoidant) * 20)
          : 0,
      disorganized:
        counts.disorganized > 0
          ? Math.round((scores.disorganized / counts.disorganized) * 20)
          : 0,
    };

    // Determine primary attachment style
    const primaryStyle = Object.entries(normalizedScores).reduce((a, b) =>
      normalizedScores[b[0] as keyof typeof normalizedScores] >
      normalizedScores[a[0] as keyof typeof normalizedScores]
        ? b
        : a,
    )[0];

    // Mark session as completed
    await supabaseAdmin
      .from("Couples_attachment_sessions")
      .update({
        is_completed: true,
        completed_at: new Date().toISOString(),
      })
      .eq("id", id);

    // Save results
    const { data: result, error } = await supabaseAdmin
      .from("Couples_attachment_results")
      .insert({
        session_id: id,
        user_id: authResult.userId,
        couple_id: session.couple_id,
        primary_attachment_style: primaryStyle,
        attachment_scores: normalizedScores,
      })
      .select()
      .single();

    if (error) throw error;

    res.json(result);
  } catch (error: any) {
    console.error("Error completing attachment session:", error);
    res
      .status(500)
      .json({ error: error.message || "Failed to complete session" });
  }
});

// GET /results/my - Get user's results
router.get("/results/my", async (req, res) => {
  try {
    const authResult = await verifyUserSession(req);
    if (!authResult.success) {
      return res.status(authResult.status).json({ error: authResult.error });
    }

    const { data, error } = await supabaseAdmin
      .from("Couples_attachment_results")
      .select("*")
      .eq("user_id", authResult.userId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    res.json(data);
  } catch (error: any) {
    console.error("Error fetching attachment results:", error);
    res.status(500).json({ error: error.message || "Failed to fetch results" });
  }
});

// GET /results/couple - Get couple's results (both partners)
router.get("/results/couple", async (req, res) => {
  try {
    const authResult = await verifyUserSession(req);
    if (!authResult.success) {
      return res.status(authResult.status).json({ error: authResult.error });
    }

    // Get user's couple_id
    const { data: profile } = await supabaseAdmin
      .from("Couples_profiles")
      .select("couple_id")
      .eq("id", authResult.userId)
      .single();

    if (!profile?.couple_id) {
      return res.status(400).json({ error: "User is not part of a couple" });
    }

    const { data, error } = await supabaseAdmin
      .from("Couples_attachment_results")
      .select(
        `
        *,
        Couples_profiles!Couples_attachment_results_user_id_fkey (
          full_name
        )
      `,
      )
      .eq("couple_id", profile.couple_id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    res.json(data);
  } catch (error: any) {
    console.error("Error fetching couple attachment results:", error);
    res
      .status(500)
      .json({ error: error.message || "Failed to fetch couple results" });
  }
});

// POST /assessments - Save assessment results directly (without session flow)
router.post("/assessments", async (req, res) => {
  try {
    const authResult = await verifyUserSession(req);
    if (!authResult.success) {
      return res.status(authResult.status).json({ error: authResult.error });
    }

    // Validate request body
    const parseResult = saveAssessmentSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res
        .status(400)
        .json({ error: parseResult.error.errors[0].message });
    }

    // Get user's couple_id from their profile
    const { data: profile } = await supabaseAdmin
      .from("Couples_profiles")
      .select("couple_id")
      .eq("id", authResult.userId)
      .single();

    if (!profile?.couple_id) {
      return res.status(400).json({ error: "User is not part of a couple" });
    }

    const {
      attachment_style,
      score,
      dynamics_with_partner,
      triggers,
      repair_strategies,
    } = parseResult.data;

    const { data, error } = await supabaseAdmin
      .from("Couples_attachment_assessments")
      .insert({
        couple_id: profile.couple_id,
        user_id: authResult.userId,
        attachment_style,
        score,
        dynamics_with_partner,
        triggers,
        repair_strategies,
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json(data);
  } catch (error: any) {
    console.error("Error saving attachment assessment:", error);
    res
      .status(500)
      .json({ error: error.message || "Failed to save assessment" });
  }
});

// GET /assessments/my - Get user's assessment results
router.get("/assessments/my", async (req, res) => {
  try {
    const authResult = await verifyUserSession(req);
    if (!authResult.success) {
      return res.status(authResult.status).json({ error: authResult.error });
    }

    const { data, error } = await supabaseAdmin
      .from("Couples_attachment_assessments")
      .select("*")
      .eq("user_id", authResult.userId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    res.json(data);
  } catch (error: any) {
    console.error("Error fetching attachment assessments:", error);
    res
      .status(500)
      .json({ error: error.message || "Failed to fetch assessments" });
  }
});

// GET /assessments/couple - Get couple's assessment results
router.get("/assessments/couple", async (req, res) => {
  try {
    const authResult = await verifyUserSession(req);
    if (!authResult.success) {
      return res.status(authResult.status).json({ error: authResult.error });
    }

    // Get user's couple_id
    const { data: profile } = await supabaseAdmin
      .from("Couples_profiles")
      .select("couple_id")
      .eq("id", authResult.userId)
      .single();

    if (!profile?.couple_id) {
      return res.status(400).json({ error: "User is not part of a couple" });
    }

    const { data, error } = await supabaseAdmin
      .from("Couples_attachment_assessments")
      .select("*")
      .eq("couple_id", profile.couple_id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    res.json(data);
  } catch (error: any) {
    console.error("Error fetching couple attachment assessments:", error);
    res
      .status(500)
      .json({ error: error.message || "Failed to fetch couple assessments" });
  }
});

// GET /repair-scripts - Get repair scripts for specific attachment style
router.get("/repair-scripts", async (req, res) => {
  try {
    const authResult = await verifyUserSession(req);
    if (!authResult.success) {
      return res.status(authResult.status).json({ error: authResult.error });
    }

    const { style } = req.query;

    let query = supabaseAdmin
      .from("Couples_attachment_repair_scripts")
      .select("*");

    if (style) {
      query = query.eq("attachment_style", style);
    }

    const { data, error } = await query;

    if (error) throw error;

    res.json(data);
  } catch (error: any) {
    console.error("Error fetching repair scripts:", error);
    res
      .status(500)
      .json({ error: error.message || "Failed to fetch repair scripts" });
  }
});

export default router;

import { Router } from "express";
import { supabaseAdmin } from "../supabase.js";
import { verifyUserSession, verifyTherapistSession } from "../helpers.js";

const router = Router();

// GET /available - Get all active meditations
router.get("/available", async (req, res) => {
  try {
    const userAuth = await verifyUserSession(req);
    if (!userAuth.success) {
      return res.status(userAuth.status).json({ error: userAuth.error });
    }

    const { data, error } = await supabaseAdmin
      .from("Couples_meditations")
      .select("*")
      .eq("is_active", true)
      .order("category", { ascending: true });

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    console.error("Error fetching meditations:", error);
    res
      .status(500)
      .json({ error: error.message || "Failed to fetch meditations" });
  }
});

// POST /session - Start a meditation session
router.post("/session", async (req, res) => {
  try {
    const userAuth = await verifyUserSession(req);
    if (!userAuth.success) {
      return res.status(userAuth.status).json({ error: userAuth.error });
    }

    const { meditation_id } = req.body;

    if (!meditation_id) {
      return res.status(400).json({ error: "meditation_id is required" });
    }

    const { data, error } = await supabaseAdmin
      .from("Couples_meditation_sessions")
      .insert({
        couple_id: userAuth.coupleId,
        meditation_id,
        user_id: userAuth.userId,
      })
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    console.error("Error starting meditation session:", error);
    res.status(500).json({ error: error.message || "Failed to start session" });
  }
});

// PATCH /session/:id/complete - Complete a meditation session
router.patch("/session/:id/complete", async (req, res) => {
  try {
    const userAuth = await verifyUserSession(req);
    if (!userAuth.success) {
      return res.status(userAuth.status).json({ error: userAuth.error });
    }

    const { id } = req.params;
    const { feedback } = req.body;

    const { data, error } = await supabaseAdmin
      .from("Couples_meditation_sessions")
      .update({
        completed: true,
        completed_at: new Date().toISOString(),
        feedback,
      })
      .eq("id", id)
      .eq("user_id", userAuth.userId)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    console.error("Error completing meditation session:", error);
    res
      .status(500)
      .json({ error: error.message || "Failed to complete session" });
  }
});

// GET /sessions/:couple_id - Get meditation history for a couple
router.get("/sessions/:couple_id", async (req, res) => {
  try {
    const userAuth = await verifyUserSession(req);
    if (!userAuth.success) {
      return res.status(userAuth.status).json({ error: userAuth.error });
    }

    const { couple_id } = req.params;

    if (couple_id !== userAuth.coupleId) {
      return res
        .status(403)
        .json({ error: "Cannot view different couple sessions" });
    }

    const { data, error } = await supabaseAdmin
      .from("Couples_meditation_sessions")
      .select(
        `
        *,
        meditation:Couples_meditations(*)
      `,
      )
      .eq("couple_id", couple_id)
      .order("created_at", { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    console.error("Error fetching meditation sessions:", error);
    res
      .status(500)
      .json({ error: error.message || "Failed to fetch sessions" });
  }
});

// GET /couple/:couple_id/sessions - THERAPIST: Get all meditation sessions for a couple
router.get("/couple/:couple_id/sessions", async (req, res) => {
  try {
    const therapistAuth = await verifyTherapistSession(req);
    if (!therapistAuth.success) {
      return res
        .status(therapistAuth.status)
        .json({ error: therapistAuth.error });
    }

    const { couple_id } = req.params;

    // Verify couple is assigned to this therapist
    const { data: couple } = await supabaseAdmin
      .from("Couples_couples")
      .select("therapist_id")
      .eq("id", couple_id)
      .single();

    if (!couple || couple.therapist_id !== therapistAuth.therapistId) {
      return res
        .status(403)
        .json({ error: "Not authorized to view this couple" });
    }

    // Fetch all meditation sessions
    const { data, error } = await supabaseAdmin
      .from("Couples_meditation_sessions")
      .select("*")
      .eq("couple_id", couple_id)
      .order("session_date", { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    console.error("Error fetching meditation sessions:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

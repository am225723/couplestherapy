import { Router } from "express";
import { supabaseAdmin } from "../supabase.js";
import { verifyUserSession } from "../helpers.js";
import { z } from "zod";

const router = Router();

// Validation schemas
const insertPauseEventSchema = z.object({
  couple_id: z.string().uuid(),
  initiated_by: z.string().uuid(),
  reflection: z.string().optional(),
});

// POST /activate - Activate pause (20-min timer)
router.post("/activate", async (req, res) => {
  try {
    const userAuth = await verifyUserSession(req);
    if (!userAuth.success) {
      return res.status(userAuth.status).json({ error: userAuth.error });
    }

    const validatedData = insertPauseEventSchema.parse(req.body);

    // Verify couple_id matches user's couple
    if (validatedData.couple_id !== userAuth.coupleId) {
      return res
        .status(403)
        .json({ error: "Cannot activate pause for different couple" });
    }

    // Check if there's already an active pause
    const { data: couple, error: coupleError } = await supabaseAdmin
      .from("Couples_couples")
      .select("active_pause_id")
      .eq("id", userAuth.coupleId)
      .single();

    if (coupleError) throw coupleError;

    if (couple.active_pause_id) {
      return res
        .status(400)
        .json({ error: "A pause is already active for this couple" });
    }

    // Create new pause event
    const { data: pauseEvent, error: pauseError } = await supabaseAdmin
      .from("Couples_pause_events")
      .insert(validatedData)
      .select()
      .single();

    if (pauseError) throw pauseError;

    // Update couple's active_pause_id
    const { error: updateError } = await supabaseAdmin
      .from("Couples_couples")
      .update({ active_pause_id: pauseEvent.id })
      .eq("id", userAuth.coupleId);

    if (updateError) throw updateError;

    res.json(pauseEvent);
  } catch (error: any) {
    console.error("Error activating pause:", error.message, error.stack);
    res
      .status(500)
      .json({ error: error.message || "Failed to activate pause" });
  }
});

// POST /end/:id - End pause early (with reflection)
router.post("/end/:id", async (req, res) => {
  try {
    const userAuth = await verifyUserSession(req);
    if (!userAuth.success) {
      return res.status(userAuth.status).json({ error: userAuth.error });
    }

    const { id } = req.params;
    const { reflection } = req.body;

    // Verify pause belongs to user's couple
    const { data: pauseEvent, error: pauseError } = await supabaseAdmin
      .from("Couples_pause_events")
      .select("couple_id")
      .eq("id", id)
      .single();

    if (pauseError || !pauseEvent) {
      return res.status(404).json({ error: "Pause event not found" });
    }

    if (pauseEvent.couple_id !== userAuth.coupleId) {
      return res
        .status(403)
        .json({ error: "Cannot end different couple pause" });
    }

    // Update pause event
    const { data, error } = await supabaseAdmin
      .from("Couples_pause_events")
      .update({
        ended_at: new Date().toISOString(),
        reflection: reflection || null,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    // Clear couple's active_pause_id
    const { error: clearError } = await supabaseAdmin
      .from("Couples_couples")
      .update({ active_pause_id: null })
      .eq("id", userAuth.coupleId);

    if (clearError) throw clearError;

    res.json(data);
  } catch (error: any) {
    console.error("Error ending pause:", error.message, error.stack);
    res.status(500).json({ error: error.message || "Failed to end pause" });
  }
});

// GET /active/:couple_id - Check if pause is active
router.get("/active/:couple_id", async (req, res) => {
  try {
    const userAuth = await verifyUserSession(req);
    if (!userAuth.success) {
      return res.status(userAuth.status).json({ error: userAuth.error });
    }

    const { couple_id } = req.params;

    // Verify couple_id matches user's couple
    if (couple_id !== userAuth.coupleId) {
      return res
        .status(403)
        .json({ error: "Cannot view different couple pause status" });
    }

    const { data: couple, error: coupleError } = await supabaseAdmin
      .from("Couples_couples")
      .select("active_pause_id")
      .eq("id", couple_id)
      .single();

    if (coupleError) throw coupleError;

    if (!couple.active_pause_id) {
      return res.json({ active: false, pauseEvent: null });
    }

    // Get active pause event details
    const { data: pauseEvent, error: pauseError } = await supabaseAdmin
      .from("Couples_pause_events")
      .select("*")
      .eq("id", couple.active_pause_id)
      .single();

    if (pauseError) throw pauseError;

    res.json({ active: true, pauseEvent });
  } catch (error: any) {
    console.error("Error checking active pause:", error.message, error.stack);
    res
      .status(500)
      .json({ error: error.message || "Failed to check pause status" });
  }
});

// GET /history/:couple_id - Get pause history
router.get("/history/:couple_id", async (req, res) => {
  try {
    const userAuth = await verifyUserSession(req);
    if (!userAuth.success) {
      return res.status(userAuth.status).json({ error: userAuth.error });
    }

    const { couple_id } = req.params;

    // Verify couple_id matches user's couple
    if (couple_id !== userAuth.coupleId) {
      return res
        .status(403)
        .json({ error: "Cannot view different couple pause history" });
    }

    const { data, error } = await supabaseAdmin
      .from("Couples_pause_events")
      .select("*")
      .eq("couple_id", couple_id)
      .order("started_at", { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    console.error("Error fetching pause history:", error.message, error.stack);
    res
      .status(500)
      .json({ error: error.message || "Failed to fetch pause history" });
  }
});

export default router;

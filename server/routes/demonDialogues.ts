import { Router } from "express";
import { supabaseAdmin } from "../supabase.js";
import { verifyUserSession, verifyTherapistSession } from "../helpers.js";

const router = Router();

// POST / - Create a demon dialogue record
router.post("/", async (req, res) => {
  try {
    const userAuth = await verifyUserSession(req);
    if (!userAuth.success) {
      return res.status(userAuth.status).json({ error: userAuth.error });
    }

    const { dialogue_type, interrupted, notes, pause_event_id } = req.body;

    if (
      !dialogue_type ||
      !["find_bad_guy", "protest_polka", "freeze_flee"].includes(dialogue_type)
    ) {
      return res.status(400).json({ error: "Valid dialogue_type is required" });
    }

    const { data, error } = await supabaseAdmin
      .from("Couples_demon_dialogues")
      .insert({
        couple_id: userAuth.coupleId,
        recognized_by: userAuth.userId,
        dialogue_type,
        interrupted: interrupted || false,
        notes,
        pause_event_id,
      })
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    console.error("Error creating demon dialogue:", error);
    res.status(500).json({ error: error.message || "Failed to create record" });
  }
});

// GET /:couple_id - Get all demon dialogues for a couple
router.get("/:couple_id", async (req, res) => {
  try {
    const userAuth = await verifyUserSession(req);
    if (!userAuth.success) {
      return res.status(userAuth.status).json({ error: userAuth.error });
    }

    const { couple_id } = req.params;

    if (couple_id !== userAuth.coupleId) {
      return res
        .status(403)
        .json({ error: "Cannot view different couple records" });
    }

    const { data, error } = await supabaseAdmin
      .from("Couples_demon_dialogues")
      .select("*")
      .eq("couple_id", couple_id)
      .order("created_at", { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    console.error("Error fetching demon dialogues:", error);
    res.status(500).json({ error: error.message || "Failed to fetch records" });
  }
});

// GET /couple/:couple_id - THERAPIST: Get all dialogues for a couple
router.get("/couple/:couple_id", async (req, res) => {
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

    // Fetch all Demon Dialogues
    const { data, error } = await supabaseAdmin
      .from("Couples_demon_dialogues")
      .select("*")
      .eq("couple_id", couple_id)
      .order("created_at", { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    console.error("Error fetching Demon Dialogues data:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

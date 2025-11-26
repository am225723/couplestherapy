import { Router } from "express";
import type { Request, Response } from "express";
import { supabaseAdmin } from "../supabase.js";
import { z } from "zod";
import { verifyTherapistSession, verifyUserSession } from "../helpers.js";

const router = Router();

// Schema for therapist thoughts
const thoughtSchema = z.object({
  thought_type: z.enum(["todo", "message", "file_reference"]),
  title: z.string().optional(),
  content: z.string().min(1),
  file_reference: z.string().optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
});

// GET /couple/:coupleId - Get all therapist thoughts for a couple
router.get("/couple/:coupleId", async (req: Request, res: Response) => {
  try {
    const authResult = await verifyTherapistSession(req);
    if (!authResult.success) {
      return res.status(authResult.status).json({ error: authResult.error });
    }

    const { coupleId } = req.params;

    // Verify therapist has access to this couple
    const { data: couple } = await supabaseAdmin
      .from("Couples_couples")
      .select("id")
      .eq("id", coupleId)
      .eq("therapist_id", authResult.therapistId)
      .single();

    if (!couple) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Fetch therapist thoughts for the couple
    const { data, error } = await supabaseAdmin
      .from("Couples_therapist_thoughts")
      .select("*")
      .eq("couple_id", coupleId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (error: any) {
    console.error("Error fetching therapist thoughts:", error);
    res.status(500).json({ error: error.message });
  }
});

// GET /client/messages - Get therapist messages for the logged-in client (client-facing endpoint)
// Security: This endpoint uses verifyUserSession which fetches the couple_id from the
// authenticated user's profile in the database. The coupleId is never taken from client input.
router.get("/client/messages", async (req: Request, res: Response) => {
  try {
    const authResult = await verifyUserSession(req);
    if (!authResult.success) {
      return res.status(authResult.status).json({ error: authResult.error });
    }

    // coupleId is fetched from the authenticated user's profile (server-side),
    // not from any client-provided input, ensuring couple-level authorization
    const { coupleId, userId } = authResult;

    // Verify coupleId is valid (defensive check)
    if (!coupleId || typeof coupleId !== "string") {
      return res.status(403).json({ error: "User is not associated with a couple" });
    }

    // Fetch only "message" type thoughts for the couple
    const { data, error } = await supabaseAdmin
      .from("Couples_therapist_thoughts")
      .select("id, title, content, created_at")
      .eq("couple_id", coupleId)
      .eq("thought_type", "message")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw error;

    // Transform to include audience type for UI
    const messages = (data || []).map(msg => ({
      ...msg,
      audience: "couple"
    }));

    res.json(messages);
  } catch (error: any) {
    console.error("Error fetching therapist messages for client:", error);
    res.status(500).json({ error: error.message });
  }
});

// POST /couple/:coupleId - Create new therapist thought
router.post("/couple/:coupleId", async (req: Request, res: Response) => {
  try {
    const authResult = await verifyTherapistSession(req);
    if (!authResult.success) {
      return res.status(authResult.status).json({ error: authResult.error });
    }

    const { coupleId } = req.params;
    const body = thoughtSchema.parse(req.body);

    // Verify therapist has access
    const { data: couple } = await supabaseAdmin
      .from("Couples_couples")
      .select("id")
      .eq("id", coupleId)
      .eq("therapist_id", authResult.therapistId)
      .single();

    if (!couple) {
      return res.status(403).json({ error: "Access denied" });
    }

    const { data, error } = await supabaseAdmin
      .from("Couples_therapist_thoughts")
      .insert({
        couple_id: coupleId,
        therapist_id: authResult.therapistId,
        thought_type: body.thought_type,
        title: body.title,
        content: body.content,
        file_reference: body.file_reference,
        priority: body.priority || "medium",
        is_completed: false,
      })
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    console.error("Error creating therapist thought:", error);
    res.status(500).json({ error: error.message });
  }
});

// PATCH /:id - Update therapist thought
router.patch("/:id", async (req: Request, res: Response) => {
  try {
    const authResult = await verifyTherapistSession(req);
    if (!authResult.success) {
      return res.status(authResult.status).json({ error: authResult.error });
    }

    const { id } = req.params;

    // Verify ownership
    const { data: thought } = await supabaseAdmin
      .from("Couples_therapist_thoughts")
      .select("therapist_id")
      .eq("id", id)
      .single();

    if (!thought || thought.therapist_id !== authResult.therapistId) {
      return res.status(403).json({ error: "Access denied" });
    }

    const { data, error } = await supabaseAdmin
      .from("Couples_therapist_thoughts")
      .update(req.body)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    console.error("Error updating therapist thought:", error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /:id - Delete therapist thought
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const authResult = await verifyTherapistSession(req);
    if (!authResult.success) {
      return res.status(authResult.status).json({ error: authResult.error });
    }

    const { id } = req.params;

    // Verify ownership
    const { data: thought } = await supabaseAdmin
      .from("Couples_therapist_thoughts")
      .select("therapist_id")
      .eq("id", id)
      .single();

    if (!thought || thought.therapist_id !== authResult.therapistId) {
      return res.status(403).json({ error: "Access denied" });
    }

    const { error } = await supabaseAdmin
      .from("Couples_therapist_thoughts")
      .delete()
      .eq("id", id);

    if (error) throw error;
    res.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting therapist thought:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

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
  individual_id: z.string().uuid().optional().nullable(),
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
      return res
        .status(403)
        .json({ error: "User is not associated with a couple" });
    }

    // Fetch ALL thought types for the couple that are:
    // 1. Targeted at both partners (individual_id is null), OR
    // 2. Targeted specifically at this user
    const { data, error } = await supabaseAdmin
      .from("Couples_therapist_thoughts")
      .select(
        "id, title, content, created_at, individual_id, thought_type, file_reference, priority, is_completed",
      )
      .eq("couple_id", coupleId)
      .or(`individual_id.is.null,individual_id.eq.${userId}`)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      console.error("Error in client thoughts query:", error);
      throw error;
    }

    console.log(
      `Fetched ${data?.length || 0} thoughts for user ${userId} in couple ${coupleId}`,
    );

    // Transform to include audience type for UI
    const thoughts = (data || []).map((thought) => ({
      ...thought,
      audience: thought.individual_id ? "individual" : "couple",
    }));

    res.json(thoughts);
  } catch (error: any) {
    console.error("Error fetching therapist thoughts for client:", error);
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
        individual_id: body.individual_id || null,
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

// PATCH /client/:id/complete - Client toggles todo completion status
router.patch("/client/:id/complete", async (req: Request, res: Response) => {
  try {
    const authResult = await verifyUserSession(req);
    if (!authResult.success) {
      return res.status(authResult.status).json({ error: authResult.error });
    }

    const { id } = req.params;
    const { coupleId, userId } = authResult;

    // Verify the thought exists and belongs to this user's couple
    const { data: thought, error: fetchError } = await supabaseAdmin
      .from("Couples_therapist_thoughts")
      .select("id, couple_id, thought_type, individual_id, is_completed")
      .eq("id", id)
      .single();

    if (fetchError || !thought) {
      return res.status(404).json({ error: "Thought not found" });
    }

    // Verify thought belongs to user's couple
    if (thought.couple_id !== coupleId) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Verify thought is addressed to this user (individual_id is null OR matches userId)
    if (thought.individual_id && thought.individual_id !== userId) {
      return res
        .status(403)
        .json({ error: "This thought is not addressed to you" });
    }

    // Only allow completion toggle for todos
    if (thought.thought_type !== "todo") {
      return res
        .status(400)
        .json({ error: "Only to-do items can be marked as complete" });
    }

    // Toggle completion status
    const { data, error } = await supabaseAdmin
      .from("Couples_therapist_thoughts")
      .update({ is_completed: !thought.is_completed })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    console.error("Error toggling thought completion:", error);
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

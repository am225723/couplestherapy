import { Router } from "express";
import type { Request, Response } from "express";
import { supabaseAdmin } from "../supabase.js";
import { verifyTherapistSession } from "../helpers.js";
import { z } from "zod";

const sessionNotesRouter = Router();

const sessionNoteSchema = z.object({
  session_date: z.string().optional(),
  title: z.string().min(1, "Title is required"),
  summary: z.string().optional(),
  key_themes: z.array(z.string()).optional(),
  interventions_used: z.array(z.string()).optional(),
  homework_assigned: z.string().optional(),
  progress_notes: z.string().optional(),
  next_session_goals: z.string().optional(),
  is_private: z.boolean().optional(),
});

sessionNotesRouter.get(
  "/couple/:coupleId",
  async (req: Request, res: Response) => {
    try {
      const authResult = await verifyTherapistSession(req);
      if (!authResult.success) {
        return res.status(authResult.status).json({ error: authResult.error });
      }

      const { coupleId } = req.params;

      const { data: couple } = await supabaseAdmin
        .from("Couples_couples")
        .select("id")
        .eq("id", coupleId)
        .single();

      if (!couple) {
        return res.status(404).json({ error: "Couple not found" });
      }

      // Cross-therapist access: all therapists can view session notes for any couple
      const { data, error } = await supabaseAdmin
        .from("Couples_session_notes")
        .select("*")
        .eq("couple_id", coupleId)
        .order("session_date", { ascending: false });

      if (error) throw error;

      res.json(data || []);
    } catch (error) {
      console.error("Error fetching session notes:", error);
      res.status(500).json({ error: "Failed to fetch session notes" });
    }
  },
);

sessionNotesRouter.get("/:id", async (req: Request, res: Response) => {
  try {
    const authResult = await verifyTherapistSession(req);
    if (!authResult.success) {
      return res.status(authResult.status).json({ error: authResult.error });
    }

    const { id } = req.params;

    // Cross-therapist access: all therapists can view any session note
    const { data, error } = await supabaseAdmin
      .from("Couples_session_notes")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({ error: "Session note not found" });
    }

    res.json(data);
  } catch (error) {
    console.error("Error fetching session note:", error);
    res.status(500).json({ error: "Failed to fetch session note" });
  }
});

sessionNotesRouter.post("/", async (req: Request, res: Response) => {
  try {
    const authResult = await verifyTherapistSession(req);
    if (!authResult.success) {
      return res.status(authResult.status).json({ error: authResult.error });
    }

    const { couple_id } = req.body;

    if (!couple_id) {
      return res.status(400).json({ error: "couple_id is required" });
    }

    const { data: couple } = await supabaseAdmin
      .from("Couples_couples")
      .select("id")
      .eq("id", couple_id)
      .single();

    if (!couple) {
      return res.status(404).json({ error: "Couple not found" });
    }

    // Cross-therapist access: all therapists can create session notes for any couple
    const validationResult = sessionNoteSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res
        .status(400)
        .json({
          error:
            validationResult.error.errors[0]?.message || "Validation failed",
        });
    }

    const noteData = validationResult.data;

    const { data, error } = await supabaseAdmin
      .from("Couples_session_notes")
      .insert({
        couple_id,
        therapist_id: authResult.therapistId,
        session_date:
          noteData.session_date || new Date().toISOString().split("T")[0],
        title: noteData.title,
        summary: noteData.summary,
        key_themes: noteData.key_themes || [],
        interventions_used: noteData.interventions_used || [],
        homework_assigned: noteData.homework_assigned,
        progress_notes: noteData.progress_notes,
        next_session_goals: noteData.next_session_goals,
        is_private: noteData.is_private || false,
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json(data);
  } catch (error) {
    console.error("Error creating session note:", error);
    res.status(500).json({ error: "Failed to create session note" });
  }
});

sessionNotesRouter.patch("/:id", async (req: Request, res: Response) => {
  try {
    const authResult = await verifyTherapistSession(req);
    if (!authResult.success) {
      return res.status(authResult.status).json({ error: authResult.error });
    }

    const { id } = req.params;

    const { data: existingNote } = await supabaseAdmin
      .from("Couples_session_notes")
      .select("therapist_id")
      .eq("id", id)
      .single();

    if (!existingNote) {
      return res.status(404).json({ error: "Session note not found" });
    }

    if (existingNote.therapist_id !== authResult.therapistId) {
      return res
        .status(403)
        .json({ error: "You can only edit your own session notes" });
    }

    const { therapist_id, couple_id, id: _, ...updates } = req.body;

    const { data, error } = await supabaseAdmin
      .from("Couples_session_notes")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error("Error updating session note:", error);
    res.status(500).json({ error: "Failed to update session note" });
  }
});

sessionNotesRouter.delete("/:id", async (req: Request, res: Response) => {
  try {
    const authResult = await verifyTherapistSession(req);
    if (!authResult.success) {
      return res.status(authResult.status).json({ error: authResult.error });
    }

    const { id } = req.params;

    const { data: existingNote } = await supabaseAdmin
      .from("Couples_session_notes")
      .select("therapist_id")
      .eq("id", id)
      .single();

    if (!existingNote) {
      return res.status(404).json({ error: "Session note not found" });
    }

    if (existingNote.therapist_id !== authResult.therapistId) {
      return res
        .status(403)
        .json({ error: "You can only delete your own session notes" });
    }

    const { error } = await supabaseAdmin
      .from("Couples_session_notes")
      .delete()
      .eq("id", id);

    if (error) throw error;

    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting session note:", error);
    res.status(500).json({ error: "Failed to delete session note" });
  }
});

export default sessionNotesRouter;

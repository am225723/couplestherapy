import { Router } from "express";
import type { Request, Response } from "express";
import { supabaseAdmin } from "../supabase.js";

const sessionNotesRouter = Router();

interface SessionNote {
  id: string;
  couple_id: string;
  therapist_id: string;
  session_date: string;
  title: string;
  summary?: string;
  key_themes?: string[];
  interventions_used?: string[];
  homework_assigned?: string;
  progress_notes?: string;
  next_session_goals?: string;
  is_private?: boolean;
  created_at?: string;
  updated_at?: string;
}

sessionNotesRouter.get("/couple/:coupleId", async (req: Request, res: Response) => {
  try {
    const { coupleId } = req.params;

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
});

sessionNotesRouter.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabaseAdmin
      .from("Couples_session_notes")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error("Error fetching session note:", error);
    res.status(500).json({ error: "Failed to fetch session note" });
  }
});

sessionNotesRouter.post("/", async (req: Request, res: Response) => {
  try {
    const {
      couple_id,
      therapist_id,
      session_date,
      title,
      summary,
      key_themes,
      interventions_used,
      homework_assigned,
      progress_notes,
      next_session_goals,
      is_private,
    } = req.body;

    if (!couple_id || !therapist_id || !title) {
      return res.status(400).json({ error: "couple_id, therapist_id, and title are required" });
    }

    const { data, error } = await supabaseAdmin
      .from("Couples_session_notes")
      .insert({
        couple_id,
        therapist_id,
        session_date: session_date || new Date().toISOString().split("T")[0],
        title,
        summary,
        key_themes: key_themes || [],
        interventions_used: interventions_used || [],
        homework_assigned,
        progress_notes,
        next_session_goals,
        is_private: is_private || false,
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
    const { id } = req.params;
    const updates = req.body;

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
    const { id } = req.params;

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

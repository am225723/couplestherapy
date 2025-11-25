import { Router } from "express";
import { supabase } from "../supabaseClient";
import { z } from "zod";
import { insertChoreSchema } from "@shared/schema";

const router = Router();

// Get all chores for a couple
router.get("/couple/:coupleId", async (req, res) => {
  try {
    const { coupleId } = req.params;

    const { data, error } = await supabase
      .from("Couples_chores")
      .select("*")
      .eq("couple_id", coupleId)
      .order("recurrence")
      .order("created_at");

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create a new chore
router.post("/couple/:coupleId", async (req, res) => {
  try {
    const { coupleId } = req.params;
    const validated = insertChoreSchema.parse(req.body);

    const { data, error } = await supabase
      .from("Couples_chores")
      .insert([{ ...validated, couple_id: coupleId }])
      .select();

    if (error) throw error;
    res.json(data[0]);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Mark chore as complete
router.patch("/:choreId/complete", async (req, res) => {
  try {
    const { choreId } = req.params;
    const { completed_by } = req.body;

    const { data, error } = await supabase
      .from("Couples_chores")
      .update({
        is_completed: true,
        completed_by,
        completed_at: new Date().toISOString(),
      })
      .eq("id", choreId)
      .select();

    if (error) throw error;
    res.json(data[0]);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Mark chore as incomplete (undo)
router.patch("/:choreId/incomplete", async (req, res) => {
  try {
    const { choreId } = req.params;

    const { data, error } = await supabase
      .from("Couples_chores")
      .update({
        is_completed: false,
        completed_by: null,
        completed_at: null,
      })
      .eq("id", choreId)
      .select();

    if (error) throw error;
    res.json(data[0]);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Update a chore
router.patch("/:choreId", async (req, res) => {
  try {
    const { choreId } = req.params;

    const { data, error } = await supabase
      .from("Couples_chores")
      .update(req.body)
      .eq("id", choreId)
      .select();

    if (error) throw error;
    res.json(data[0]);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Delete a chore
router.delete("/:choreId", async (req, res) => {
  try {
    const { choreId } = req.params;

    const { error } = await supabase
      .from("Couples_chores")
      .delete()
      .eq("id", choreId);

    if (error) throw error;
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;

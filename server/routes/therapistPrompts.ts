import { Router } from "express";
import type { Request, Response } from "express";
import { supabaseAdmin } from "../supabase.js";

const therapistPromptsRouter = Router();

// GET - Fetch all prompts for a couple
therapistPromptsRouter.get(
  "/couple/:coupleId",
  async (req: Request, res: Response) => {
    try {
      const { coupleId } = req.params;

      const { data, error } = await supabaseAdmin
        .from("Couples_therapist_prompts")
        .select("*")
        .eq("couple_id", coupleId)
        .eq("is_enabled", true)
        .order("display_order", { ascending: true });

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      res.json(data || []);
    } catch (error) {
      console.error("Error fetching therapist prompts:", error);
      res.status(500).json({ error: "Failed to fetch prompts" });
    }
  },
);

// GET - Fetch all prompts for a couple (therapist view - includes disabled)
therapistPromptsRouter.get(
  "/therapist/:coupleId",
  async (req: Request, res: Response) => {
    try {
      const { coupleId } = req.params;

      const { data, error } = await supabaseAdmin
        .from("Couples_therapist_prompts")
        .select("*")
        .eq("couple_id", coupleId)
        .order("display_order", { ascending: true });

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      res.json(data || []);
    } catch (error) {
      console.error("Error fetching therapist prompts:", error);
      res.status(500).json({ error: "Failed to fetch prompts" });
    }
  },
);

// POST - Create a new prompt
therapistPromptsRouter.post("/", async (req: Request, res: Response) => {
  try {
    const {
      couple_id,
      therapist_id,
      tool_name,
      title,
      description,
      suggested_action,
      is_enabled,
      display_order,
    } = req.body;

    if (!couple_id || !therapist_id || !tool_name || !title || !suggested_action) {
      return res.status(400).json({
        error: "Missing required fields: couple_id, therapist_id, tool_name, title, suggested_action",
      });
    }

    const { data, error } = await supabaseAdmin
      .from("Couples_therapist_prompts")
      .insert({
        couple_id,
        therapist_id,
        tool_name,
        title,
        description: description || null,
        suggested_action,
        is_enabled: is_enabled !== false,
        display_order: display_order || 0,
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json(data);
  } catch (error) {
    console.error("Error creating therapist prompt:", error);
    res.status(500).json({ error: "Failed to create prompt" });
  }
});

// PUT - Update a prompt
therapistPromptsRouter.put("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      tool_name,
      title,
      description,
      suggested_action,
      is_enabled,
      display_order,
    } = req.body;

    const { data, error } = await supabaseAdmin
      .from("Couples_therapist_prompts")
      .update({
        tool_name,
        title,
        description,
        suggested_action,
        is_enabled,
        display_order,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error("Error updating therapist prompt:", error);
    res.status(500).json({ error: "Failed to update prompt" });
  }
});

// DELETE - Delete a prompt
therapistPromptsRouter.delete("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { error } = await supabaseAdmin
      .from("Couples_therapist_prompts")
      .delete()
      .eq("id", id);

    if (error) throw error;

    res.status(204).send();
  } catch (error) {
    console.error("Error deleting therapist prompt:", error);
    res.status(500).json({ error: "Failed to delete prompt" });
  }
});

// PUT - Bulk update display order
therapistPromptsRouter.put(
  "/reorder/:coupleId",
  async (req: Request, res: Response) => {
    try {
      const { coupleId } = req.params;
      const { prompt_orders } = req.body; // Array of { id, display_order }

      if (!Array.isArray(prompt_orders)) {
        return res.status(400).json({ error: "prompt_orders must be an array" });
      }

      // Update each prompt's display order
      const updates = prompt_orders.map(
        ({ id, display_order }: { id: string; display_order: number }) =>
          supabaseAdmin
            .from("Couples_therapist_prompts")
            .update({ display_order, updated_at: new Date().toISOString() })
            .eq("id", id)
            .eq("couple_id", coupleId),
      );

      await Promise.all(updates);

      // Fetch updated prompts
      const { data, error } = await supabaseAdmin
        .from("Couples_therapist_prompts")
        .select("*")
        .eq("couple_id", coupleId)
        .order("display_order", { ascending: true });

      if (error) throw error;

      res.json(data);
    } catch (error) {
      console.error("Error reordering prompts:", error);
      res.status(500).json({ error: "Failed to reorder prompts" });
    }
  },
);

export default therapistPromptsRouter;

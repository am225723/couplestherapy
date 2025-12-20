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
      target_user_id,
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
        target_user_id: target_user_id || null,
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
      target_user_id,
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
        target_user_id: target_user_id || null,
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

// ============ REFLECTION RESPONSES ============

// Helper to get authenticated user from request
async function getAuthenticatedUser(req: Request) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }
  const token = authHeader.substring(7);
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

// POST - Create or update a reflection response
therapistPromptsRouter.post("/reflection-responses", async (req: Request, res: Response) => {
  try {
    // Authenticate user
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { prompt_id, response_text, is_shared_with_partner } = req.body;

    // Validate required fields
    if (!prompt_id || typeof prompt_id !== "string") {
      return res.status(400).json({ error: "prompt_id is required" });
    }
    if (!response_text || typeof response_text !== "string" || response_text.trim().length === 0) {
      return res.status(400).json({ error: "response_text is required" });
    }

    // Get user's profile to verify couple_id
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("Couples_profiles")
      .select("id, couple_id")
      .eq("id", user.id)
      .single();

    if (profileError || !profile?.couple_id) {
      return res.status(403).json({ error: "User is not part of a couple" });
    }

    // Verify the prompt exists and belongs to the user's couple
    const { data: prompt, error: promptError } = await supabaseAdmin
      .from("Couples_therapist_prompts")
      .select("id, couple_id, target_user_id")
      .eq("id", prompt_id)
      .single();

    if (promptError || !prompt) {
      return res.status(404).json({ error: "Prompt not found" });
    }

    if (prompt.couple_id !== profile.couple_id) {
      return res.status(403).json({ error: "Prompt does not belong to your couple" });
    }

    // Check if prompt is targeted to a specific user
    if (prompt.target_user_id && prompt.target_user_id !== user.id) {
      return res.status(403).json({ error: "This prompt is not for you" });
    }

    // Check if a response already exists for this prompt and user
    const { data: existing } = await supabaseAdmin
      .from("Couples_reflection_responses")
      .select("id")
      .eq("prompt_id", prompt_id)
      .eq("responder_id", user.id)
      .single();

    let data;
    let error;

    if (existing) {
      // Update existing response
      const result = await supabaseAdmin
        .from("Couples_reflection_responses")
        .update({
          response_text: response_text.trim(),
          is_shared_with_partner: is_shared_with_partner === true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
        .select()
        .single();
      data = result.data;
      error = result.error;
    } else {
      // Create new response
      const result = await supabaseAdmin
        .from("Couples_reflection_responses")
        .insert({
          prompt_id,
          couple_id: profile.couple_id,
          responder_id: user.id,
          response_text: response_text.trim(),
          is_shared_with_partner: is_shared_with_partner === true,
        })
        .select()
        .single();
      data = result.data;
      error = result.error;
    }

    if (error) throw error;

    res.status(201).json(data);
  } catch (error) {
    console.error("Error saving reflection response:", error);
    res.status(500).json({ error: "Failed to save response" });
  }
});

// GET - Fetch responses for a prompt (couple view - only shows partner's if shared)
therapistPromptsRouter.get(
  "/reflection-responses/prompt/:promptId",
  async (req: Request, res: Response) => {
    try {
      // Authenticate user
      const user = await getAuthenticatedUser(req);
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { promptId } = req.params;

      // Verify user belongs to a couple
      const { data: profile } = await supabaseAdmin
        .from("Couples_profiles")
        .select("id, couple_id")
        .eq("id", user.id)
        .single();

      if (!profile?.couple_id) {
        return res.status(403).json({ error: "User is not part of a couple" });
      }

      // Verify prompt belongs to user's couple and is accessible to this user
      const { data: prompt } = await supabaseAdmin
        .from("Couples_therapist_prompts")
        .select("id, couple_id, target_user_id")
        .eq("id", promptId)
        .single();

      if (!prompt || prompt.couple_id !== profile.couple_id) {
        return res.status(403).json({ error: "Prompt not accessible" });
      }

      // If prompt is targeted to a specific user, only that user can access it
      if (prompt.target_user_id && prompt.target_user_id !== user.id) {
        return res.status(403).json({ error: "This prompt is not for you" });
      }

      // Get own response
      const { data: ownResponse } = await supabaseAdmin
        .from("Couples_reflection_responses")
        .select("*")
        .eq("prompt_id", promptId)
        .eq("responder_id", user.id)
        .single();

      // Get partner's response only if shared
      const { data: partnerResponses } = await supabaseAdmin
        .from("Couples_reflection_responses")
        .select("*")
        .eq("prompt_id", promptId)
        .eq("couple_id", profile.couple_id)
        .neq("responder_id", user.id)
        .eq("is_shared_with_partner", true);

      res.json({
        own: ownResponse || null,
        partner: partnerResponses?.[0] || null,
      });
    } catch (error) {
      console.error("Error fetching reflection responses:", error);
      res.status(500).json({ error: "Failed to fetch responses" });
    }
  },
);

// GET - Fetch all responses for a couple (therapist view - sees all)
therapistPromptsRouter.get(
  "/reflection-responses/couple/:coupleId",
  async (req: Request, res: Response) => {
    try {
      // Authenticate user
      const user = await getAuthenticatedUser(req);
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Verify user is a therapist
      const { data: profile } = await supabaseAdmin
        .from("Couples_profiles")
        .select("id, role")
        .eq("id", user.id)
        .single();

      if (!profile || profile.role !== "therapist") {
        return res.status(403).json({ error: "Only therapists can view all responses" });
      }

      const { coupleId } = req.params;

      const { data, error } = await supabaseAdmin
        .from("Couples_reflection_responses")
        .select("*, responder:responder_id(id, full_name, avatar_url)")
        .eq("couple_id", coupleId)
        .order("created_at", { ascending: false });

      if (error && error.code !== "PGRST116") throw error;

      res.json(data || []);
    } catch (error) {
      console.error("Error fetching couple reflection responses:", error);
      res.status(500).json({ error: "Failed to fetch responses" });
    }
  },
);

// PATCH - Toggle share status for a response
therapistPromptsRouter.patch(
  "/reflection-responses/:id/share",
  async (req: Request, res: Response) => {
    try {
      // Authenticate user
      const user = await getAuthenticatedUser(req);
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { id } = req.params;
      const { is_shared_with_partner } = req.body;

      // Verify user owns the response
      const { data: response } = await supabaseAdmin
        .from("Couples_reflection_responses")
        .select("id, responder_id")
        .eq("id", id)
        .single();

      if (!response || response.responder_id !== user.id) {
        return res.status(403).json({ error: "You can only share your own responses" });
      }

      const { data, error } = await supabaseAdmin
        .from("Couples_reflection_responses")
        .update({
          is_shared_with_partner: is_shared_with_partner === true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      res.json(data);
    } catch (error) {
      console.error("Error updating share status:", error);
      res.status(500).json({ error: "Failed to update share status" });
    }
  },
);

export default therapistPromptsRouter;

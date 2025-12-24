import { Router, Request, Response } from "express";
import { supabaseAdmin } from "../supabase.js";
import { insertConflictSessionSchema } from "../../shared/schema.js";
import { z } from "zod";

const router = Router();

// Get authenticated user from request
async function getAuthUser(
  req: Request,
): Promise<{ id: string; couple_id: string | null } | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }
  const token = authHeader.replace("Bearer ", "");

  const { data: userData, error: userError } =
    await supabaseAdmin.auth.getUser(token);
  if (userError || !userData.user) {
    return null;
  }

  const { data: profile } = await supabaseAdmin
    .from("Couples_profiles")
    .select("id, couple_id")
    .eq("id", userData.user.id)
    .single();

  return profile ? { id: profile.id, couple_id: profile.couple_id } : null;
}

// GET /api/conflict/sessions - Get user's conflict sessions
router.get("/sessions", async (req: Request, res: Response) => {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!user.couple_id) {
      return res.status(400).json({ error: "User not linked to a couple" });
    }

    const { data, error } = await supabaseAdmin
      .from("Couples_conflict_sessions")
      .select("*")
      .eq("couple_id", user.couple_id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching conflict sessions:", error);
      return res.status(500).json({ error: "Failed to fetch sessions" });
    }

    res.json({ sessions: data || [] });
  } catch (error) {
    console.error("Conflict sessions error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/conflict/sessions - Create a new conflict session
router.post("/sessions", async (req: Request, res: Response) => {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!user.couple_id) {
      return res.status(400).json({ error: "User not linked to a couple" });
    }

    // Validate request body
    const validationResult = insertConflictSessionSchema.safeParse({
      ...req.body,
      user_id: user.id,
      couple_id: user.couple_id,
    });

    if (!validationResult.success) {
      return res.status(400).json({
        error: "Invalid request data",
        details: validationResult.error.errors,
      });
    }

    const { data, error } = await supabaseAdmin
      .from("Couples_conflict_sessions")
      .insert({
        ...validationResult.data,
        user_id: user.id,
        couple_id: user.couple_id,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating conflict session:", error);
      return res.status(500).json({ error: "Failed to create session" });
    }

    res.status(201).json(data);
  } catch (error) {
    console.error("Create conflict session error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/conflict/sessions/:id - Delete a conflict session
router.delete("/sessions/:id", async (req: Request, res: Response) => {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const sessionId = req.params.id;

    // Verify ownership before delete
    const { data: existing } = await supabaseAdmin
      .from("Couples_conflict_sessions")
      .select("user_id")
      .eq("id", sessionId)
      .single();

    if (!existing) {
      return res.status(404).json({ error: "Session not found" });
    }

    if (existing.user_id !== user.id) {
      return res
        .status(403)
        .json({ error: "Not authorized to delete this session" });
    }

    const { error } = await supabaseAdmin
      .from("Couples_conflict_sessions")
      .delete()
      .eq("id", sessionId);

    if (error) {
      console.error("Error deleting conflict session:", error);
      return res.status(500).json({ error: "Failed to delete session" });
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Delete conflict session error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;

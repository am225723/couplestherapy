import { Router } from "express";
import type { Request, Response } from "express";
import { supabaseAdmin } from "../supabase.js";
import { z } from "zod";
import { verifyUserSession } from "../helpers.js";

const router = Router();

// Schema for mood entries
const moodEntrySchema = z.object({
  mood_level: z.number().min(1).max(10),
  emotion_primary: z.string().min(1),
  emotion_secondary: z.string().optional(),
  notes: z.string().optional(),
});

// GET /couple/:coupleId - Get all mood entries for a couple
router.get("/couple/:coupleId", async (req: Request, res: Response) => {
  try {
    const authResult = await verifyUserSession(req);
    if (!authResult.success) {
      return res.status(authResult.status).json({ error: authResult.error });
    }

    const { coupleId } = req.params;

    // Verify user has access to this couple
    const { data: couple } = await supabaseAdmin
      .from("Couples_couples")
      .select("id")
      .eq("id", coupleId)
      .in("partner1_id", [authResult.userId])
      .single();

    if (!couple) {
      const { data: couple2 } = await supabaseAdmin
        .from("Couples_couples")
        .select("id")
        .eq("id", coupleId)
        .eq("partner2_id", authResult.userId)
        .single();
      if (!couple2) {
        return res.status(403).json({ error: "Access denied" });
      }
    }

    // Fetch mood entries with user profiles
    const { data, error } = await supabaseAdmin
      .from("Couples_mood_entries")
      .select("*, user:user_id(full_name)")
      .eq("couple_id", coupleId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (error: any) {
    console.error("Error fetching mood entries:", error);
    res.status(500).json({ error: error.message });
  }
});

// GET /couple/:coupleId/stats - Get mood statistics for a couple
router.get("/couple/:coupleId/stats", async (req: Request, res: Response) => {
  try {
    const authResult = await verifyUserSession(req);
    if (!authResult.success) {
      return res.status(authResult.status).json({ error: authResult.error });
    }

    const { coupleId } = req.params;

    // Get couple info
    const { data: couple } = await supabaseAdmin
      .from("Couples_couples")
      .select("partner1_id, partner2_id")
      .eq("id", coupleId)
      .single();

    if (!couple) {
      return res.status(404).json({ error: "Couple not found" });
    }

    // Get recent mood entries
    const { data: entries } = await supabaseAdmin
      .from("Couples_mood_entries")
      .select("*")
      .eq("couple_id", coupleId)
      .gte(
        "created_at",
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      )
      .order("created_at", { ascending: false });

    if (!entries || entries.length === 0) {
      return res.json({
        partner1: { name: "", avgMood: 0, entries: 0 },
        partner2: { name: "", avgMood: 0, entries: 0 },
        overallTrend: "no_data",
      });
    }

    // Get partner names
    const { data: profiles } = await supabaseAdmin
      .from("Couples_profiles")
      .select("id, full_name")
      .in("id", [couple.partner1_id, couple.partner2_id]);

    const p1 = profiles?.find((p) => p.id === couple.partner1_id);
    const p2 = profiles?.find((p) => p.id === couple.partner2_id);

    // Calculate stats per partner
    const p1Entries = entries.filter((e) => e.user_id === couple.partner1_id);
    const p2Entries = entries.filter((e) => e.user_id === couple.partner2_id);

    const p1Avg =
      p1Entries.length > 0
        ? p1Entries.reduce((sum, e) => sum + e.mood_level, 0) / p1Entries.length
        : 0;
    const p2Avg =
      p2Entries.length > 0
        ? p2Entries.reduce((sum, e) => sum + e.mood_level, 0) / p2Entries.length
        : 0;

    res.json({
      partner1: {
        name: p1?.full_name || "Partner 1",
        avgMood: Math.round(p1Avg * 10) / 10,
        entries: p1Entries.length,
      },
      partner2: {
        name: p2?.full_name || "Partner 2",
        avgMood: Math.round(p2Avg * 10) / 10,
        entries: p2Entries.length,
      },
      overallTrend:
        p1Avg > p2Avg
          ? "partner1_higher"
          : p2Avg > p1Avg
            ? "partner2_higher"
            : "balanced",
    });
  } catch (error: any) {
    console.error("Error calculating mood stats:", error);
    res.status(500).json({ error: error.message });
  }
});

// POST /couple/:coupleId - Create new mood entry
router.post("/couple/:coupleId", async (req: Request, res: Response) => {
  try {
    const authResult = await verifyUserSession(req);
    if (!authResult.success) {
      return res.status(authResult.status).json({ error: authResult.error });
    }

    const { coupleId } = req.params;
    const body = moodEntrySchema.parse(req.body);

    // Verify user is part of the couple
    const { data: couple } = await supabaseAdmin
      .from("Couples_couples")
      .select("id")
      .eq("id", coupleId)
      .or(
        `partner1_id.eq.${authResult.userId},partner2_id.eq.${authResult.userId}`,
      )
      .single();

    if (!couple) {
      return res.status(403).json({ error: "Access denied" });
    }

    const { data, error } = await supabaseAdmin
      .from("Couples_mood_entries")
      .insert({
        couple_id: coupleId,
        user_id: authResult.userId,
        mood_level: body.mood_level,
        emotion_primary: body.emotion_primary,
        emotion_secondary: body.emotion_secondary,
        notes: body.notes,
      })
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    console.error("Error creating mood entry:", error);
    res.status(500).json({ error: error.message });
  }
});

// PATCH /:id - Update mood entry
router.patch("/:id", async (req: Request, res: Response) => {
  try {
    const authResult = await verifyUserSession(req);
    if (!authResult.success) {
      return res.status(authResult.status).json({ error: authResult.error });
    }

    const { id } = req.params;
    const body = moodEntrySchema.partial().parse(req.body);

    // Verify ownership
    const { data: entry } = await supabaseAdmin
      .from("Couples_mood_entries")
      .select("*")
      .eq("id", id)
      .single();

    if (!entry || entry.user_id !== authResult.userId) {
      return res.status(403).json({ error: "Access denied" });
    }

    const { data, error } = await supabaseAdmin
      .from("Couples_mood_entries")
      .update(body)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    console.error("Error updating mood entry:", error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /:id - Delete mood entry
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const authResult = await verifyUserSession(req);
    if (!authResult.success) {
      return res.status(authResult.status).json({ error: authResult.error });
    }

    const { id } = req.params;

    // Verify ownership
    const { data: entry } = await supabaseAdmin
      .from("Couples_mood_entries")
      .select("*")
      .eq("id", id)
      .single();

    if (!entry || entry.user_id !== authResult.userId) {
      return res.status(403).json({ error: "Access denied" });
    }

    const { error } = await supabaseAdmin
      .from("Couples_mood_entries")
      .delete()
      .eq("id", id);

    if (error) throw error;
    res.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting mood entry:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

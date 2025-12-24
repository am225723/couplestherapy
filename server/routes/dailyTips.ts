import { Router } from "express";
import type { Request, Response } from "express";
import { supabaseAdmin } from "../supabase.js";
import { z } from "zod";
import { verifyUserSession } from "../helpers.js";

const router = Router();

interface PerplexityMessage {
  role: "user" | "assistant";
  content: string;
}

// Generate AI relationship tip using Perplexity
async function generateAiTip(category: string): Promise<string> {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) {
    throw new Error("Perplexity API key not configured");
  }

  const categoryPrompts: Record<string, string> = {
    communication:
      "Give a concise, actionable tip for improving couple communication and active listening.",
    intimacy:
      "Give a concise, actionable tip for deepening emotional or physical intimacy between partners.",
    conflict:
      "Give a concise, actionable tip for navigating and resolving couple conflicts healthily.",
    gratitude:
      "Give a concise, actionable tip for expressing gratitude and appreciation in a relationship.",
    connection:
      "Give a concise, actionable tip for deepening emotional connection and bonding.",
    growth:
      "Give a concise, actionable tip for personal and relationship growth.",
  };

  const prompt = categoryPrompts[category] || categoryPrompts.connection;

  const messages: PerplexityMessage[] = [
    {
      role: "user",
      content: `${prompt} Keep it under 100 words. Make it practical and specific.`,
    },
  ];

  try {
    const response = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "sonar-pro",
        messages: messages,
        max_tokens: 200,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`Perplexity API error: ${response.statusText}`);
    }

    const data = await response.json();
    return (
      data.choices?.[0]?.message?.content ||
      "Start each day by sharing one specific thing you appreciate about your partner."
    );
  } catch (error) {
    console.error("Error generating AI tip:", error);
    return "Start each day by sharing one specific thing you appreciate about your partner.";
  }
}

// Helper to verify access (either couple member or therapist)
async function verifyAccessToCouple(
  userId: string,
  coupleId: string,
): Promise<boolean> {
  // Check if user is a partner in the couple
  const { data: couple } = await supabaseAdmin
    .from("Couples_couples")
    .select("id, partner1_id, partner2_id")
    .eq("id", coupleId)
    .single();

  if (!couple) return false;

  // User is a partner
  if (couple.partner1_id === userId || couple.partner2_id === userId) {
    return true;
  }

  // Check if user is a therapist
  const { data: profile } = await supabaseAdmin
    .from("Couples_profiles")
    .select("role")
    .eq("id", userId)
    .single();

  if (profile?.role === "therapist") {
    return true;
  }

  return false;
}

// GET /couple/:coupleId - Get daily tips
router.get("/couple/:coupleId", async (req: Request, res: Response) => {
  try {
    const authResult = await verifyUserSession(req);
    if (!authResult.success) {
      return res.status(authResult.status).json({ error: authResult.error });
    }

    const { coupleId } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 30;

    // Verify access (either couple member or therapist)
    const hasAccess = await verifyAccessToCouple(authResult.userId, coupleId);
    if (!hasAccess) {
      return res.status(403).json({ error: "Access denied" });
    }

    const { data: tips, error } = await supabaseAdmin
      .from("Couples_daily_tips")
      .select("*")
      .eq("couple_id", coupleId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    res.json(tips || []);
  } catch (error: any) {
    console.error("Error fetching daily tips:", error);
    res.status(500).json({ error: error.message });
  }
});

// GET /couple/:coupleId/today - Get today's tip
router.get("/couple/:coupleId/today", async (req: Request, res: Response) => {
  try {
    const authResult = await verifyUserSession(req);
    if (!authResult.success) {
      return res.status(authResult.status).json({ error: authResult.error });
    }

    const { coupleId } = req.params;

    // Verify access (either couple member or therapist)
    const hasAccess = await verifyAccessToCouple(authResult.userId, coupleId);
    if (!hasAccess) {
      return res.status(403).json({ error: "Access denied" });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data: tips, error } = await supabaseAdmin
      .from("Couples_daily_tips")
      .select("*")
      .eq("couple_id", coupleId)
      .gte("created_at", today.toISOString())
      .order("created_at", { ascending: false })
      .limit(1);

    if (error) throw error;

    if (tips && tips.length > 0) {
      return res.json(tips[0]);
    }

    // Generate a new tip if none exists
    const categories = [
      "communication",
      "intimacy",
      "conflict",
      "gratitude",
      "connection",
      "growth",
    ];
    const category = categories[Math.floor(Math.random() * categories.length)];

    try {
      const tipText = await generateAiTip(category);
      const { data: newTip, error: insertError } = await supabaseAdmin
        .from("Couples_daily_tips")
        .insert({
          couple_id: coupleId,
          tip_text: tipText,
          category: category,
          source: "ai",
        })
        .select()
        .single();

      if (insertError) throw insertError;
      res.json(newTip);
    } catch (tipError) {
      res.status(500).json({ error: "Failed to generate tip" });
    }
  } catch (error: any) {
    console.error("Error fetching today's tip:", error);
    res.status(500).json({ error: error.message });
  }
});

// POST /couple/:coupleId - Generate new tip
router.post("/couple/:coupleId", async (req: Request, res: Response) => {
  try {
    const authResult = await verifyUserSession(req);
    if (!authResult.success) {
      return res.status(authResult.status).json({ error: authResult.error });
    }

    const { coupleId } = req.params;
    const { category = "connection" } = req.body;

    // Verify access (either couple member or therapist)
    const hasAccess = await verifyAccessToCouple(authResult.userId, coupleId);
    if (!hasAccess) {
      return res.status(403).json({ error: "Access denied" });
    }

    try {
      const tipText = await generateAiTip(category);
      const { data: newTip, error } = await supabaseAdmin
        .from("Couples_daily_tips")
        .insert({
          couple_id: coupleId,
          tip_text: tipText,
          category: category,
          source: "ai",
        })
        .select()
        .single();

      if (error) throw error;
      res.json(newTip);
    } catch (tipError) {
      res.status(500).json({ error: "Failed to generate tip" });
    }
  } catch (error: any) {
    console.error("Error generating new tip:", error);
    res.status(500).json({ error: error.message });
  }
});

// GET /preferences/:coupleId - Get user notification preferences
router.get("/preferences/:coupleId", async (req: Request, res: Response) => {
  try {
    const authResult = await verifyUserSession(req);
    if (!authResult.success) {
      return res.status(authResult.status).json({ error: authResult.error });
    }

    const { coupleId } = req.params;

    const { data: prefs, error } = await supabaseAdmin
      .from("Couples_notification_preferences")
      .select("*")
      .eq("couple_id", coupleId)
      .eq("user_id", authResult.userId)
      .single();

    if (error && error.code !== "PGRST116") throw error;

    if (!prefs) {
      const { data: newPrefs, error: insertError } = await supabaseAdmin
        .from("Couples_notification_preferences")
        .insert({
          couple_id: coupleId,
          user_id: authResult.userId,
          tips_enabled: true,
          tips_frequency: "daily",
          tips_time: "08:00:00",
          push_notifications_enabled: true,
          email_notifications_enabled: false,
        })
        .select()
        .single();

      if (insertError) throw insertError;
      return res.json(newPrefs);
    }

    res.json(prefs);
  } catch (error: any) {
    console.error("Error fetching notification preferences:", error);
    res.status(500).json({ error: error.message });
  }
});

// PATCH /preferences/:coupleId - Update notification preferences
router.patch("/preferences/:coupleId", async (req: Request, res: Response) => {
  try {
    const authResult = await verifyUserSession(req);
    if (!authResult.success) {
      return res.status(authResult.status).json({ error: authResult.error });
    }

    const { coupleId } = req.params;
    const updates = req.body;

    const { data: prefs, error } = await supabaseAdmin
      .from("Couples_notification_preferences")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("couple_id", coupleId)
      .eq("user_id", authResult.userId)
      .select()
      .single();

    if (error) throw error;
    res.json(prefs);
  } catch (error: any) {
    console.error("Error updating notification preferences:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

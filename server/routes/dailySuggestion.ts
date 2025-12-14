import { Router } from "express";
import type { Request, Response } from "express";
import { supabaseAdmin } from "../supabase.js";
import { format, subDays } from "date-fns";
import { randomUUID } from "node:crypto";

const dailySuggestionRouter = Router();

dailySuggestionRouter.get("/today/:coupleId", async (req: Request, res: Response) => {
  try {
    const { coupleId } = req.params;
    const today = format(new Date(), "yyyy-MM-dd");

    const { data: existing, error: existingError } = await supabaseAdmin
      .from("Couples_suggestion_history")
      .select("*, suggestion:Couples_daily_suggestions(*)")
      .eq("couple_id", coupleId)
      .eq("shown_date", today)
      .single();

    if (existing && !existingError) {
      return res.json({
        ...existing,
        suggestion: existing.suggestion,
      });
    }

    const sevenDaysAgo = format(subDays(new Date(), 7), "yyyy-MM-dd");
    const { data: recentShown } = await supabaseAdmin
      .from("Couples_suggestion_history")
      .select("suggestion_id")
      .eq("couple_id", coupleId)
      .gte("shown_date", sevenDaysAgo);

    const recentIds = new Set(recentShown?.map((r) => r.suggestion_id) || []);

    const { data: allSuggestions, error: suggestionsError } = await supabaseAdmin
      .from("Couples_daily_suggestions")
      .select("*")
      .eq("is_active", true);

    if (suggestionsError) throw suggestionsError;

    const suggestions = (allSuggestions || []).filter(
      (s) => !recentIds.has(s.id)
    );

    let selectedSuggestion;
    if (!suggestions || suggestions.length === 0) {
      const { data: anySuggestion } = await supabaseAdmin
        .from("Couples_daily_suggestions")
        .select("*")
        .eq("is_active", true)
        .limit(1)
        .single();

      if (!anySuggestion) {
        return res.json(null);
      }
      selectedSuggestion = anySuggestion;
    } else {
      const randomIndex = Math.floor(Math.random() * suggestions.length);
      selectedSuggestion = suggestions[randomIndex];
    }

    const { data: newHistory, error: insertError } = await supabaseAdmin
      .from("Couples_suggestion_history")
      .insert({
        id: randomUUID(),
        couple_id: coupleId,
        suggestion_id: selectedSuggestion.id,
        shown_date: today,
        completed: false,
      })
      .select("*, suggestion:Couples_daily_suggestions(*)")
      .single();

    if (insertError) throw insertError;

    res.json({
      ...newHistory,
      suggestion: newHistory.suggestion,
    });
  } catch (error) {
    console.error("Error fetching daily suggestion:", error);
    res.status(500).json({ error: "Failed to fetch daily suggestion" });
  }
});

dailySuggestionRouter.get("/history/:coupleId", async (req: Request, res: Response) => {
  try {
    const { coupleId } = req.params;
    const { data, error } = await supabaseAdmin
      .from("Couples_suggestion_history")
      .select("*, suggestion:Couples_daily_suggestions(*)")
      .eq("couple_id", coupleId)
      .order("shown_date", { ascending: false })
      .limit(14);

    if (error) throw error;

    res.json(data || []);
  } catch (error) {
    console.error("Error fetching suggestion history:", error);
    res.status(500).json({ error: "Failed to fetch suggestion history" });
  }
});

dailySuggestionRouter.patch("/complete/:historyId", async (req: Request, res: Response) => {
  try {
    const { historyId } = req.params;
    const { error } = await supabaseAdmin
      .from("Couples_suggestion_history")
      .update({ completed: true })
      .eq("id", historyId);

    if (error) throw error;

    res.json({ success: true });
  } catch (error) {
    console.error("Error completing suggestion:", error);
    res.status(500).json({ error: "Failed to complete suggestion" });
  }
});

export default dailySuggestionRouter;

import { Router } from "express";
import type { Request, Response } from "express";
import { supabaseAdmin } from "../supabase.js";
import { format, subDays, startOfDay } from "date-fns";

const dailySuggestionRouter = Router();

dailySuggestionRouter.get(
  "/today/:coupleId",
  async (req: Request, res: Response) => {
    try {
      const { coupleId } = req.params;
      const today = startOfDay(new Date()).toISOString();

      const { data: todayTip, error } = await supabaseAdmin
        .from("Couples_daily_tips")
        .select("*")
        .eq("couple_id", coupleId)
        .gte("created_at", today)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("Error fetching daily suggestion:", error);
        return res
          .status(500)
          .json({ error: "Failed to fetch daily suggestion" });
      }

      if (todayTip) {
        return res.json({
          id: todayTip.id,
          suggestion: {
            id: todayTip.id,
            title: getCategoryTitle(todayTip.category),
            description: todayTip.tip_text,
            category: todayTip.category,
            duration_minutes: 5,
            difficulty: "easy",
          },
          shown_date: format(new Date(todayTip.created_at), "yyyy-MM-dd"),
          completed: false,
        });
      }

      const { data: latestTip } = await supabaseAdmin
        .from("Couples_daily_tips")
        .select("*")
        .eq("couple_id", coupleId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (latestTip) {
        return res.json({
          id: latestTip.id,
          suggestion: {
            id: latestTip.id,
            title: getCategoryTitle(latestTip.category),
            description: latestTip.tip_text,
            category: latestTip.category,
            duration_minutes: 5,
            difficulty: "easy",
          },
          shown_date: format(new Date(latestTip.created_at), "yyyy-MM-dd"),
          completed: false,
        });
      }

      res.json(null);
    } catch (error) {
      console.error("Error fetching daily suggestion:", error);
      res.status(500).json({ error: "Failed to fetch daily suggestion" });
    }
  },
);

dailySuggestionRouter.get(
  "/history/:coupleId",
  async (req: Request, res: Response) => {
    try {
      const { coupleId } = req.params;
      const { data: tips, error } = await supabaseAdmin
        .from("Couples_daily_tips")
        .select("*")
        .eq("couple_id", coupleId)
        .order("created_at", { ascending: false })
        .limit(14);

      if (error) {
        console.error("Error fetching suggestion history:", error);
        return res
          .status(500)
          .json({ error: "Failed to fetch suggestion history" });
      }

      const history = (tips || []).map((tip) => ({
        id: tip.id,
        suggestion: {
          id: tip.id,
          title: getCategoryTitle(tip.category),
          description: tip.tip_text,
          category: tip.category,
          duration_minutes: 5,
          difficulty: "easy",
        },
        shown_date: format(new Date(tip.created_at), "yyyy-MM-dd"),
        completed: false,
      }));

      res.json(history);
    } catch (error) {
      console.error("Error fetching suggestion history:", error);
      res.status(500).json({ error: "Failed to fetch suggestion history" });
    }
  },
);

dailySuggestionRouter.patch(
  "/complete/:historyId",
  async (req: Request, res: Response) => {
    try {
      res.json({ success: true });
    } catch (error) {
      console.error("Error completing suggestion:", error);
      res.status(500).json({ error: "Failed to complete suggestion" });
    }
  },
);

function getCategoryTitle(category: string): string {
  const titles: Record<string, string> = {
    communication: "Improve Communication",
    intimacy: "Deepen Intimacy",
    conflict: "Navigate Conflict",
    gratitude: "Express Gratitude",
    connection: "Strengthen Connection",
    growth: "Foster Growth",
  };
  return titles[category] || "Daily Relationship Tip";
}

export default dailySuggestionRouter;

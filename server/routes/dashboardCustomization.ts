import { Router } from "express";
import type { Request, Response } from "express";
import { supabaseAdmin } from "../supabase.js";

const dashboardCustomizationRouter = Router();

// GET - Fetch dashboard customization for a couple
dashboardCustomizationRouter.get(
  "/couple/:coupleId",
  async (req: Request, res: Response) => {
    try {
      const { coupleId } = req.params;

      const { data, error } = await supabaseAdmin
        .from("Couples_dashboard_customization")
        .select("*")
        .eq("couple_id", coupleId)
        .single();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      if (!data) {
        // Return defaults if not found
        return res.json({
          couple_id: coupleId,
          widget_order: [
            "weekly-checkin",
            "love-languages",
            "gratitude",
            "shared-goals",
            "conversations",
            "love-map",
            "voice-memos",
            "calendar",
            "rituals",
          ],
          enabled_widgets: {
            "weekly-checkin": true,
            "love-languages": true,
            gratitude: true,
            "shared-goals": true,
            conversations: true,
            "love-map": true,
            "voice-memos": true,
            calendar: true,
            rituals: true,
          },
          widget_sizes: {},
          widget_content_overrides: {},
        });
      }

      res.json(data);
    } catch (error) {
      console.error("Error fetching dashboard customization:", error);
      res.status(500).json({ error: "Failed to fetch customization" });
    }
  },
);

// POST/PATCH - Update dashboard customization
dashboardCustomizationRouter.post(
  "/couple/:coupleId",
  async (req: Request, res: Response) => {
    try {
      const { coupleId } = req.params;
      const { therapist_id, widget_order, enabled_widgets, widget_sizes, widget_content_overrides } =
        req.body;

      const { data, error } = await supabaseAdmin
        .from("Couples_dashboard_customization")
        .upsert({
          couple_id: coupleId,
          therapist_id,
          widget_order: widget_order || [
            "weekly-checkin",
            "love-languages",
            "gratitude",
            "shared-goals",
            "conversations",
            "love-map",
            "voice-memos",
            "calendar",
            "rituals",
          ],
          enabled_widgets: enabled_widgets || {},
          widget_sizes: widget_sizes || {},
          widget_content_overrides: widget_content_overrides || {},
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      res.json(data);
    } catch (error) {
      console.error("Error updating dashboard customization:", error);
      res.status(500).json({ error: "Failed to update customization" });
    }
  },
);

export default dashboardCustomizationRouter;

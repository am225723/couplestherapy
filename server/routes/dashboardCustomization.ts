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

// POST - Create/update dashboard customization (full replace)
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

// PATCH - Partial update dashboard customization (merge fields)
dashboardCustomizationRouter.patch(
  "/couple/:coupleId",
  async (req: Request, res: Response) => {
    try {
      const { coupleId } = req.params;
      const updates = req.body;

      // First get existing data (don't use .single() as it throws if no row exists)
      const { data: existingArray, error: fetchError } = await supabaseAdmin
        .from("Couples_dashboard_customization")
        .select("*")
        .eq("couple_id", coupleId);

      const existing = Array.isArray(existingArray) && existingArray.length > 0 ? existingArray[0] : null;

      // Merge updates with existing data
      const merged = {
        couple_id: coupleId,
        therapist_id: updates.therapist_id ?? existing?.therapist_id,
        widget_order: updates.widget_order ?? existing?.widget_order ?? [
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
        enabled_widgets: updates.enabled_widgets !== undefined 
          ? { ...(existing?.enabled_widgets || {}), ...updates.enabled_widgets }
          : existing?.enabled_widgets || {},
        widget_sizes: updates.widget_sizes !== undefined
          ? { ...(existing?.widget_sizes || {}), ...updates.widget_sizes }
          : existing?.widget_sizes || {},
        widget_content_overrides: updates.widget_content_overrides !== undefined
          ? { ...(existing?.widget_content_overrides || {}), ...updates.widget_content_overrides }
          : existing?.widget_content_overrides || {},
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabaseAdmin
        .from("Couples_dashboard_customization")
        .upsert(merged, { onConflict: "couple_id" })
        .select()
        .single();

      if (error) throw error;

      res.json(data);
    } catch (error) {
      console.error("Error patching dashboard customization:", error);
      res.status(500).json({ error: "Failed to update customization" });
    }
  },
);

export default dashboardCustomizationRouter;

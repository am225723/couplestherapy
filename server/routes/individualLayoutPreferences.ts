import { Router } from "express";
import type { Request, Response } from "express";
import { supabaseAdmin } from "../supabase.js";

const individualLayoutPreferencesRouter = Router();

// GET - Fetch individual layout preferences for a user
individualLayoutPreferencesRouter.get(
  "/user/:userId",
  async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;

      const { data, error } = await supabaseAdmin
        .from("Couples_individual_layout_preferences")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      if (!data) {
        return res.json({
          user_id: userId,
          use_personal_layout: false,
          widget_order: null,
          enabled_widgets: null,
          widget_sizes: null,
          hidden_widgets: [],
        });
      }

      res.json(data);
    } catch (error) {
      console.error("Error fetching individual layout preferences:", error);
      res.status(500).json({ error: "Failed to fetch preferences" });
    }
  },
);

// POST - Create or update individual layout preferences
individualLayoutPreferencesRouter.post(
  "/user/:userId",
  async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const { couple_id, use_personal_layout, widget_order, enabled_widgets, widget_sizes, hidden_widgets } = req.body;

      const { data, error } = await supabaseAdmin
        .from("Couples_individual_layout_preferences")
        .upsert({
          user_id: userId,
          couple_id: couple_id,
          use_personal_layout: use_personal_layout ?? false,
          widget_order: widget_order,
          enabled_widgets: enabled_widgets,
          widget_sizes: widget_sizes,
          hidden_widgets: hidden_widgets || [],
          updated_at: new Date().toISOString(),
        }, {
          onConflict: "user_id"
        })
        .select()
        .single();

      if (error) throw error;

      res.json(data);
    } catch (error) {
      console.error("Error updating individual layout preferences:", error);
      res.status(500).json({ error: "Failed to update preferences" });
    }
  },
);

// PATCH - Toggle use_personal_layout
individualLayoutPreferencesRouter.patch(
  "/user/:userId/toggle",
  async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const { use_personal_layout } = req.body;

      const { data: existing } = await supabaseAdmin
        .from("Couples_individual_layout_preferences")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (!existing) {
        return res.status(404).json({ error: "Preferences not found" });
      }

      const { data, error } = await supabaseAdmin
        .from("Couples_individual_layout_preferences")
        .update({
          use_personal_layout: use_personal_layout,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId)
        .select()
        .single();

      if (error) throw error;

      res.json(data);
    } catch (error) {
      console.error("Error toggling personal layout:", error);
      res.status(500).json({ error: "Failed to toggle personal layout" });
    }
  },
);

// PUT - Hide specific widgets (adds to hidden_widgets array)
individualLayoutPreferencesRouter.put(
  "/user/:userId/hide-widget",
  async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const { widget_id, hidden, couple_id } = req.body;

      if (!widget_id) {
        return res.status(400).json({ error: "widget_id is required" });
      }

      const { data: existing } = await supabaseAdmin
        .from("Couples_individual_layout_preferences")
        .select("*")
        .eq("user_id", userId)
        .single();

      let hiddenWidgets: string[] = (existing?.hidden_widgets as string[]) || [];

      if (hidden && !hiddenWidgets.includes(widget_id)) {
        hiddenWidgets.push(widget_id);
      } else if (!hidden) {
        hiddenWidgets = hiddenWidgets.filter(w => w !== widget_id);
      }

      const upsertData: Record<string, any> = {
        user_id: userId,
        hidden_widgets: hiddenWidgets,
        updated_at: new Date().toISOString(),
      };

      if (!existing && couple_id) {
        upsertData.couple_id = couple_id;
      } else if (existing) {
        upsertData.couple_id = existing.couple_id;
      } else {
        return res.status(400).json({ error: "couple_id is required for new preference" });
      }

      const { data, error } = await supabaseAdmin
        .from("Couples_individual_layout_preferences")
        .upsert(upsertData, {
          onConflict: "user_id"
        })
        .select()
        .single();

      if (error) throw error;

      res.json(data);
    } catch (error) {
      console.error("Error hiding widget:", error);
      res.status(500).json({ error: "Failed to hide widget" });
    }
  },
);

// DELETE - Reset to couple defaults
individualLayoutPreferencesRouter.delete(
  "/user/:userId",
  async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;

      const { error } = await supabaseAdmin
        .from("Couples_individual_layout_preferences")
        .delete()
        .eq("user_id", userId);

      if (error) throw error;

      res.json({ success: true, message: "Preferences reset to couple defaults" });
    } catch (error) {
      console.error("Error resetting preferences:", error);
      res.status(500).json({ error: "Failed to reset preferences" });
    }
  },
);

export default individualLayoutPreferencesRouter;

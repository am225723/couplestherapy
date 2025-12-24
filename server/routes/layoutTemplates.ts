import { Router } from "express";
import type { Request, Response } from "express";
import { supabaseAdmin } from "../supabase.js";
import { insertLayoutTemplateSchema } from "../../shared/schema.js";

const layoutTemplatesRouter = Router();

// GET - Fetch all layout templates for a therapist
layoutTemplatesRouter.get(
  "/therapist/:therapistId",
  async (req: Request, res: Response) => {
    try {
      const { therapistId } = req.params;

      const { data, error } = await supabaseAdmin
        .from("Couples_layout_templates")
        .select("*")
        .or(`therapist_id.eq.${therapistId},is_shared.eq.true`)
        .order("created_at", { ascending: false });

      if (error) throw error;

      res.json(data || []);
    } catch (error) {
      console.error("Error fetching layout templates:", error);
      res.status(500).json({ error: "Failed to fetch layout templates" });
    }
  },
);

// GET - Fetch a single layout template
layoutTemplatesRouter.get(
  "/:templateId",
  async (req: Request, res: Response) => {
    try {
      const { templateId } = req.params;

      const { data, error } = await supabaseAdmin
        .from("Couples_layout_templates")
        .select("*")
        .eq("id", templateId)
        .single();

      if (error) throw error;

      res.json(data);
    } catch (error) {
      console.error("Error fetching layout template:", error);
      res.status(500).json({ error: "Failed to fetch layout template" });
    }
  },
);

// POST - Create a new layout template
layoutTemplatesRouter.post("/", async (req: Request, res: Response) => {
  try {
    const validatedData = insertLayoutTemplateSchema.parse(req.body);

    const { data, error } = await supabaseAdmin
      .from("Couples_layout_templates")
      .insert({
        ...validatedData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json(data);
  } catch (error: any) {
    console.error("Error creating layout template:", error);
    if (error.name === "ZodError") {
      return res
        .status(400)
        .json({ error: "Invalid template data", details: error.errors });
    }
    res.status(500).json({ error: "Failed to create layout template" });
  }
});

// PUT - Update a layout template
layoutTemplatesRouter.put(
  "/:templateId",
  async (req: Request, res: Response) => {
    try {
      const { templateId } = req.params;
      const {
        name,
        description,
        widget_order,
        enabled_widgets,
        widget_sizes,
        widget_content_overrides,
        is_shared,
      } = req.body;

      const updateData: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };

      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (widget_order !== undefined) updateData.widget_order = widget_order;
      if (enabled_widgets !== undefined)
        updateData.enabled_widgets = enabled_widgets;
      if (widget_sizes !== undefined) updateData.widget_sizes = widget_sizes;
      if (widget_content_overrides !== undefined)
        updateData.widget_content_overrides = widget_content_overrides;
      if (is_shared !== undefined) updateData.is_shared = is_shared;

      const { data, error } = await supabaseAdmin
        .from("Couples_layout_templates")
        .update(updateData)
        .eq("id", templateId)
        .select()
        .single();

      if (error) throw error;

      res.json(data);
    } catch (error) {
      console.error("Error updating layout template:", error);
      res.status(500).json({ error: "Failed to update layout template" });
    }
  },
);

// DELETE - Delete a layout template
layoutTemplatesRouter.delete(
  "/:templateId",
  async (req: Request, res: Response) => {
    try {
      const { templateId } = req.params;

      const { error } = await supabaseAdmin
        .from("Couples_layout_templates")
        .delete()
        .eq("id", templateId);

      if (error) throw error;

      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting layout template:", error);
      res.status(500).json({ error: "Failed to delete layout template" });
    }
  },
);

// POST - Apply template to a couple (increments usage count)
layoutTemplatesRouter.post(
  "/:templateId/apply/:coupleId",
  async (req: Request, res: Response) => {
    try {
      const { templateId, coupleId } = req.params;
      const { therapist_id } = req.body;

      // Get the template
      const { data: template, error: fetchError } = await supabaseAdmin
        .from("Couples_layout_templates")
        .select("*")
        .eq("id", templateId)
        .single();

      if (fetchError) throw fetchError;

      // Apply template to couple's dashboard customization
      const { error: upsertError } = await supabaseAdmin
        .from("Couples_dashboard_customization")
        .upsert({
          couple_id: coupleId,
          therapist_id: therapist_id,
          widget_order: template.widget_order,
          enabled_widgets: template.enabled_widgets,
          widget_sizes: template.widget_sizes,
          widget_content_overrides: template.widget_content_overrides || {},
          updated_at: new Date().toISOString(),
        });

      if (upsertError) throw upsertError;

      // Increment usage count
      await supabaseAdmin
        .from("Couples_layout_templates")
        .update({
          usage_count: (template.usage_count || 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("id", templateId);

      res.json({ success: true, message: "Template applied successfully" });
    } catch (error) {
      console.error("Error applying layout template:", error);
      res.status(500).json({ error: "Failed to apply layout template" });
    }
  },
);

// POST - Copy layout from one couple to another
layoutTemplatesRouter.post(
  "/copy/:sourceCoupleId/to/:targetCoupleId",
  async (req: Request, res: Response) => {
    try {
      const { sourceCoupleId, targetCoupleId } = req.params;
      const { therapist_id } = req.body;

      // Get the source couple's customization
      const { data: source, error: fetchError } = await supabaseAdmin
        .from("Couples_dashboard_customization")
        .select("*")
        .eq("couple_id", sourceCoupleId)
        .single();

      if (fetchError) throw fetchError;

      // Apply to target couple
      const { error: upsertError } = await supabaseAdmin
        .from("Couples_dashboard_customization")
        .upsert({
          couple_id: targetCoupleId,
          therapist_id: therapist_id,
          widget_order: source.widget_order,
          enabled_widgets: source.enabled_widgets,
          widget_sizes: source.widget_sizes,
          widget_content_overrides: source.widget_content_overrides || {},
          updated_at: new Date().toISOString(),
        });

      if (upsertError) throw upsertError;

      res.json({ success: true, message: "Layout copied successfully" });
    } catch (error) {
      console.error("Error copying layout:", error);
      res.status(500).json({ error: "Failed to copy layout" });
    }
  },
);

export default layoutTemplatesRouter;

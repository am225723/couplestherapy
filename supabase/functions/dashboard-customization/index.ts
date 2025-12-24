import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { corsHeaders } from "../_shared/cors.ts";

const DEFAULT_WIDGET_ORDER = [
  "therapist-card",
  "daily-suggestion",
  "ai-suggestions",
  "date-night",
  "checkin-history",
  "love-results",
  "weekly-checkin",
  "love-languages",
  "gratitude",
  "shared-goals",
  "voice-memos",
  "calendar",
  "rituals",
  "conversations",
  "love-map",
];

const DEFAULT_ENABLED_WIDGETS: Record<string, boolean> = {
  "therapist-card": true,
  "daily-suggestion": true,
  "ai-suggestions": true,
  "date-night": true,
  "checkin-history": true,
  "love-results": true,
  "weekly-checkin": true,
  "love-languages": true,
  gratitude: true,
  "shared-goals": true,
  "voice-memos": true,
  calendar: true,
  rituals: true,
  conversations: true,
  "love-map": true,
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

    const url = new URL(req.url);
    const coupleId = url.searchParams.get("couple_id");

    if (!coupleId) {
      return new Response(JSON.stringify({ error: "couple_id is required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    if (req.method === "GET") {
      const { data, error } = await supabaseAdmin
        .from("Couples_dashboard_customization")
        .select(
          "couple_id, therapist_id, widget_order, enabled_widgets, widget_sizes",
        )
        .eq("couple_id", coupleId)
        .single();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      if (!data) {
        return new Response(
          JSON.stringify({
            couple_id: coupleId,
            widget_order: DEFAULT_WIDGET_ORDER,
            enabled_widgets: DEFAULT_ENABLED_WIDGETS,
            widget_sizes: {},
            widget_content_overrides: {},
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method === "POST") {
      const body = await req.json();
      const { therapist_id, widget_order, enabled_widgets, widget_sizes } =
        body;

      const { data, error } = await supabaseAdmin
        .from("Couples_dashboard_customization")
        .upsert({
          couple_id: coupleId,
          therapist_id,
          widget_order: widget_order || DEFAULT_WIDGET_ORDER,
          enabled_widgets: enabled_widgets || {},
          widget_sizes: widget_sizes || {},
          updated_at: new Date().toISOString(),
        })
        .select(
          "couple_id, therapist_id, widget_order, enabled_widgets, widget_sizes",
        )
        .single();

      if (error) throw error;

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method === "PATCH") {
      const body = await req.json();

      const { data: existingArray, error: fetchError } = await supabaseAdmin
        .from("Couples_dashboard_customization")
        .select(
          "couple_id, therapist_id, widget_order, enabled_widgets, widget_sizes",
        )
        .eq("couple_id", coupleId);

      const existing =
        Array.isArray(existingArray) && existingArray.length > 0
          ? existingArray[0]
          : null;

      const merged: Record<string, any> = {
        couple_id: coupleId,
        updated_at: new Date().toISOString(),
      };

      if (body.therapist_id !== undefined || existing?.therapist_id) {
        merged.therapist_id = body.therapist_id ?? existing?.therapist_id;
      }

      merged.widget_order =
        body.widget_order ?? existing?.widget_order ?? DEFAULT_WIDGET_ORDER;

      merged.enabled_widgets =
        body.enabled_widgets !== undefined
          ? { ...(existing?.enabled_widgets || {}), ...body.enabled_widgets }
          : existing?.enabled_widgets || {};

      merged.widget_sizes =
        body.widget_sizes !== undefined
          ? { ...(existing?.widget_sizes || {}), ...body.widget_sizes }
          : existing?.widget_sizes || {};

      const { data, error } = await supabaseAdmin
        .from("Couples_dashboard_customization")
        .upsert(merged, { onConflict: "couple_id" })
        .select(
          "couple_id, therapist_id, widget_order, enabled_widgets, widget_sizes",
        )
        .single();

      if (error) throw error;

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 405,
    });
  } catch (error: any) {
    console.error("Dashboard customization error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to process request" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      },
    );
  }
});

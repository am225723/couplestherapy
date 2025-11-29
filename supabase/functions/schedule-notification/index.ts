// ========================================
// Schedule Notification Handler
// ========================================

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

interface ScheduleRequest {
  couple_id: string;
  user_id?: string;
  title: string;
  body: string;
  scheduled_at: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const payload = token.split(".")[1];
    const decoded = JSON.parse(
      new TextDecoder().decode(Deno.core.decode(payload))
    );
    const userId = decoded.sub;

    const body: ScheduleRequest = await req.json();
    const { couple_id, user_id, title, body: messageBody, scheduled_at } =
      body;

    if (!couple_id || !title || !messageBody || !scheduled_at) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify couple exists
    const { data: coupleData, error: coupleError } = await supabase
      .from("Couples_couples")
      .select("id")
      .eq("id", couple_id)
      .single();

    if (coupleError || !coupleData) {
      return new Response(JSON.stringify({ error: "Couple not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Convert EST to UTC (EST is UTC-5, so add 5 hours)
    const estDate = new Date(scheduled_at);
    if (isNaN(estDate.getTime())) {
      return new Response(
        JSON.stringify({ error: "Invalid datetime format" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const utcDate = new Date(estDate.getTime() + 5 * 60 * 60 * 1000);
    const scheduledAtUtc = utcDate.toISOString();

    // Create scheduled notification
    const { data, error } = await supabase
      .from("Couples_scheduled_notifications")
      .insert({
        therapist_id: userId,
        couple_id,
        user_id: user_id || null,
        title,
        body: messageBody,
        scheduled_at: scheduledAtUtc,
        status: "pending",
      })
      .select();

    if (error) {
      console.error("Error creating notification:", error);
      return new Response(
        JSON.stringify({ error: "Failed to create notification" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(JSON.stringify(data[0]), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in schedule-notification:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

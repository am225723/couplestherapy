// ========================================
// Scheduled Push Notifications Handler
// ========================================

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

interface ScheduledNotification {
  id: string;
  therapist_id: string;
  couple_id: string;
  user_id?: string;
  title: string;
  body: string;
  scheduled_at: string;
}

interface Profile {
  id: string;
  expo_push_token?: string;
  fcm_token?: string;
}

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

// Send via Expo Push Service
async function sendExpoNotification(
  token: string,
  title: string,
  body: string,
): Promise<boolean> {
  const expoAccessToken = Deno.env.get("EXPO_ACCESS_TOKEN");
  if (!expoAccessToken) {
    console.error("EXPO_ACCESS_TOKEN not configured");
    return false;
  }

  try {
    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${expoAccessToken}`,
      },
      body: JSON.stringify({
        to: token,
        sound: "default",
        title,
        body,
      }),
    });

    if (!response.ok) {
      console.error("Expo push failed:", await response.text());
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error sending Expo notification:", error);
    return false;
  }
}

// Main handler - called by database webhook or scheduled task
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get all pending notifications that are ready to send
    const now = new Date().toISOString();
    const { data: notifications, error: fetchError } = await supabase
      .from("Couples_scheduled_notifications")
      .select("*")
      .eq("status", "pending")
      .lte("scheduled_at", now)
      .limit(100);

    if (fetchError) {
      console.error("Error fetching notifications:", fetchError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch notifications" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    let sentCount = 0;
    let failedCount = 0;

    for (const notification of notifications as ScheduledNotification[]) {
      try {
        // Get recipient(s) push tokens
        let recipients: Profile[] = [];

        if (notification.user_id) {
          // Send to specific user
          const { data, error } = await supabase
            .from("Couples_profiles")
            .select("id, expo_push_token, fcm_token")
            .eq("id", notification.user_id)
            .single();

          if (error) {
            console.error("Error fetching user:", error);
            failedCount++;
            continue;
          }
          recipients = [data];
        } else {
          // Send to entire couple
          const { data, error } = await supabase
            .from("Couples_couples")
            .select("partner1_id, partner2_id")
            .eq("id", notification.couple_id)
            .single();

          if (error || !data) {
            console.error("Error fetching couple:", error);
            failedCount++;
            continue;
          }

          // Fetch both partners' profiles
          const { data: partners, error: partnerError } = await supabase
            .from("Couples_profiles")
            .select("id, expo_push_token, fcm_token")
            .in("id", [data.partner1_id, data.partner2_id]);

          if (partnerError) {
            console.error("Error fetching partners:", partnerError);
            failedCount++;
            continue;
          }
          recipients = partners;
        }

        // Send notifications to all recipients
        for (const recipient of recipients) {
          if (recipient.expo_push_token) {
            await sendExpoNotification(
              recipient.expo_push_token,
              notification.title,
              notification.body,
            );
            sentCount++;
          }
          // FCM support can be added later
        }

        // Mark as sent
        const { error: updateError } = await supabase
          .from("Couples_scheduled_notifications")
          .update({ status: "sent", sent_at: now })
          .eq("id", notification.id);

        if (updateError) {
          console.error("Error marking notification as sent:", updateError);
          failedCount++;
        }
      } catch (error) {
        console.error("Error processing notification:", error);
        failedCount++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: notifications.length,
        sent: sentCount,
        failed: failedCount,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Error in send-scheduled-notifications:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

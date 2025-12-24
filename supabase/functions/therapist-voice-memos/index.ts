// Therapist Voice Memos Edge Function
// Provides voice memo metadata for therapist dashboards
// Uses cross-therapist access model: any authenticated therapist can view any couple's data
// This supports multi-therapist practices as specified in project requirements

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { corsHeaders } from "../_shared/cors.ts";
import { verifyTherapistAuth, verifyCoupleExists } from "../_shared/auth.ts";

interface VoiceMemoMetadata {
  id: string;
  sender_name: string;
  recipient_name: string;
  duration_secs: number | null;
  is_listened: boolean;
  created_at: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authResult = await verifyTherapistAuth(req);
    if (!authResult.success) {
      return new Response(JSON.stringify({ error: authResult.error }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: authResult.status,
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

    const url = new URL(req.url);

    if (req.method === "GET") {
      const coupleId = url.searchParams.get("couple_id");

      if (!coupleId) {
        return new Response(
          JSON.stringify({ error: "couple_id is required" }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          },
        );
      }

      const coupleExists = await verifyCoupleExists(coupleId);
      if (!coupleExists) {
        return new Response(JSON.stringify({ error: "Couple not found" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 404,
        });
      }

      const { data: memos, error: memosError } = await supabaseAdmin
        .from("Couples_voice_memos")
        .select(
          "id, sender_id, recipient_id, duration_secs, is_listened, created_at",
        )
        .eq("couple_id", coupleId)
        .order("created_at", { ascending: false });

      if (memosError) throw memosError;

      if (!memos || memos.length === 0) {
        return new Response(JSON.stringify([]), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get all unique user IDs from memos (includes both partners and potentially therapists)
      const userIds = Array.from(
        new Set([
          ...memos.map((m: any) => m.sender_id),
          ...memos.map((m: any) => m.recipient_id),
        ]),
      );

      const { data: profiles } = await supabaseAdmin
        .from("Couples_profiles")
        .select("id, full_name")
        .in("id", userIds);

      const profileMap = new Map(
        profiles?.map((p: any) => [p.id, p.full_name]) || [],
      );

      const metadata: VoiceMemoMetadata[] = memos.map((memo: any) => ({
        id: memo.id,
        sender_name: profileMap.get(memo.sender_id) || "Unknown",
        recipient_name: profileMap.get(memo.recipient_id) || "Unknown",
        duration_secs: memo.duration_secs,
        is_listened: memo.is_listened,
        created_at: memo.created_at,
      }));

      return new Response(JSON.stringify(metadata), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 405,
    });
  } catch (error: any) {
    console.error("Error in therapist-voice-memos function:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      },
    );
  }
});

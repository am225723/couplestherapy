import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { corsHeaders } from "../_shared/cors.ts";
import { verifyTherapistAuth, verifyCoupleExists } from "../_shared/auth.ts";

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

      const { data: messages, error: messagesError } = await supabaseAdmin
        .from("Couples_messages")
        .select("*")
        .eq("couple_id", coupleId)
        .order("created_at", { ascending: true });

      if (messagesError) throw messagesError;

      const senderIds = Array.from(
        new Set(messages?.map((m: any) => m.sender_id) || []),
      );

      const { data: senders } = await supabaseAdmin
        .from("Couples_profiles")
        .select("id, full_name, role")
        .in("id", senderIds);

      const senderMap = new Map(senders?.map((s: any) => [s.id, s]) || []);

      const messagesWithSenders = (messages || []).map((msg: any) => ({
        ...msg,
        sender: senderMap.get(msg.sender_id) || {
          id: msg.sender_id,
          full_name: "Unknown",
          role: "client",
        },
      }));

      return new Response(JSON.stringify(messagesWithSenders), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method === "POST") {
      const body = await req.json();
      const { couple_id, message_text } = body;

      if (!couple_id || !message_text || !message_text.trim()) {
        return new Response(
          JSON.stringify({ error: "couple_id and message_text are required" }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          },
        );
      }

      const coupleExists = await verifyCoupleExists(couple_id);
      if (!coupleExists) {
        return new Response(JSON.stringify({ error: "Couple not found" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 404,
        });
      }

      const { data: newMessage, error: insertError } = await supabaseAdmin
        .from("Couples_messages")
        .insert({
          couple_id,
          sender_id: authResult.therapistId,
          message_text: message_text.trim(),
        })
        .select()
        .single();

      if (insertError) throw insertError;

      const { data: sender } = await supabaseAdmin
        .from("Couples_profiles")
        .select("id, full_name, role")
        .eq("id", authResult.therapistId)
        .single();

      return new Response(
        JSON.stringify({
          ...newMessage,
          sender: sender || {
            id: authResult.therapistId,
            full_name: "Therapist",
            role: "therapist",
          },
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 201,
        },
      );
    }

    if (req.method === "PUT") {
      const body = await req.json();
      const { message_id } = body;

      if (!message_id) {
        return new Response(
          JSON.stringify({ error: "message_id is required" }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          },
        );
      }

      const { data: message, error: messageError } = await supabaseAdmin
        .from("Couples_messages")
        .select("couple_id")
        .eq("id", message_id)
        .single();

      if (messageError || !message) {
        return new Response(JSON.stringify({ error: "Message not found" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 404,
        });
      }

      const coupleExists = await verifyCoupleExists(message.couple_id);
      if (!coupleExists) {
        return new Response(JSON.stringify({ error: "Couple not found" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 404,
        });
      }

      const { error: updateError } = await supabaseAdmin
        .from("Couples_messages")
        .update({ is_read: true })
        .eq("id", message_id);

      if (updateError) throw updateError;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 405,
    });
  } catch (error: any) {
    console.error("Therapist messages error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to process request" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      },
    );
  }
});

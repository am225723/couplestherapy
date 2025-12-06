import { Router } from "express";
import { getAccessToken } from "../helpers.js";
import { supabaseAdmin } from "../supabase.js";

const router = Router();

router.get("/:couple_id", async (req, res) => {
  try {
    const accessToken = getAccessToken(req);
    if (!accessToken) {
      return res
        .status(401)
        .json({ error: "No session found. Please log in." });
    }

    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(accessToken);
    if (authError || !user) {
      return res
        .status(401)
        .json({ error: "Invalid or expired session. Please log in again." });
    }

    const coupleId = req.params.couple_id;

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("Couples_profiles")
      .select("role, couple_id")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return res.status(403).json({ error: "User profile not found." });
    }

    let hasAccess = false;
    if (profile.role === "therapist") {
      // Cross-therapist access: any therapist can view any couple's messages
      const { data: couple } = await supabaseAdmin
        .from("Couples_couples")
        .select("id")
        .eq("id", coupleId)
        .single();
      hasAccess = !!couple; // Access granted if couple exists
    } else {
      hasAccess = profile.couple_id === coupleId;
    }

    if (!hasAccess) {
      return res
        .status(403)
        .json({ error: "Access denied to this couple's messages." });
    }

    const { data: messages, error: messagesError } = await supabaseAdmin
      .from("Couples_messages")
      .select("*")
      .eq("couple_id", coupleId)
      .order("created_at", { ascending: true });

    if (messagesError) throw messagesError;

    const senderIds = Array.from(
      new Set(messages?.map((m) => m.sender_id) || []),
    );
    const { data: senders } = await supabaseAdmin
      .from("Couples_profiles")
      .select("id, full_name, role")
      .in("id", senderIds);

    const senderMap = new Map(senders?.map((s) => [s.id, s]) || []);

    const messagesWithSenders = (messages || []).map((msg) => ({
      ...msg,
      sender: senderMap.get(msg.sender_id) || {
        id: msg.sender_id,
        full_name: "Unknown",
        role: "client",
      },
    }));

    res.json(messagesWithSenders);
  } catch (error: any) {
    console.error("Get messages error:", error.message, error.stack);
    res.status(500).json({ error: error.message || "Failed to get messages" });
  }
});

router.post("/", async (req, res) => {
  try {
    const accessToken = getAccessToken(req);
    if (!accessToken) {
      return res
        .status(401)
        .json({ error: "No session found. Please log in." });
    }

    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(accessToken);
    if (authError || !user) {
      return res
        .status(401)
        .json({ error: "Invalid or expired session. Please log in again." });
    }

    const { couple_id, message_text } = req.body;
    if (!couple_id || !message_text || !message_text.trim()) {
      return res
        .status(400)
        .json({ error: "couple_id and message_text are required" });
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("Couples_profiles")
      .select("role, couple_id")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return res.status(403).json({ error: "User profile not found." });
    }

    let hasAccess = false;
    if (profile.role === "therapist") {
      // Cross-therapist access: any therapist can send messages to any couple
      const { data: couple } = await supabaseAdmin
        .from("Couples_couples")
        .select("id")
        .eq("id", couple_id)
        .single();
      hasAccess = !!couple; // Access granted if couple exists
    } else {
      hasAccess = profile.couple_id === couple_id;
    }

    if (!hasAccess) {
      return res
        .status(403)
        .json({ error: "Access denied to send messages to this couple." });
    }

    const { data: newMessage, error: insertError } = await supabaseAdmin
      .from("Couples_messages")
      .insert({
        couple_id,
        sender_id: user.id,
        message_text: message_text.trim(),
      })
      .select()
      .single();

    if (insertError) throw insertError;

    const { data: sender } = await supabaseAdmin
      .from("Couples_profiles")
      .select("id, full_name, role")
      .eq("id", user.id)
      .single();

    res.json({
      ...newMessage,
      sender: sender || { id: user.id, full_name: "Unknown", role: "client" },
    });
  } catch (error: any) {
    console.error("Send message error:", error.message, error.stack);
    res.status(500).json({ error: error.message || "Failed to send message" });
  }
});

router.put("/:message_id/read", async (req, res) => {
  try {
    const accessToken = getAccessToken(req);
    if (!accessToken) {
      return res
        .status(401)
        .json({ error: "No session found. Please log in." });
    }

    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(accessToken);
    if (authError || !user) {
      return res
        .status(401)
        .json({ error: "Invalid or expired session. Please log in again." });
    }

    const messageId = req.params.message_id;

    const { data: message, error: messageError } = await supabaseAdmin
      .from("Couples_messages")
      .select("couple_id")
      .eq("id", messageId)
      .single();

    if (messageError || !message) {
      return res.status(404).json({ error: "Message not found" });
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("Couples_profiles")
      .select("role, couple_id")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return res.status(403).json({ error: "User profile not found." });
    }

    let hasAccess = false;
    if (profile.role === "therapist") {
      // Cross-therapist access: any therapist can update message read status
      const { data: couple } = await supabaseAdmin
        .from("Couples_couples")
        .select("id")
        .eq("id", message.couple_id)
        .single();
      hasAccess = !!couple; // Access granted if couple exists
    } else {
      hasAccess = profile.couple_id === message.couple_id;
    }

    if (!hasAccess) {
      return res
        .status(403)
        .json({ error: "Access denied to update this message." });
    }

    const { error: updateError } = await supabaseAdmin
      .from("Couples_messages")
      .update({ is_read: true })
      .eq("id", messageId);

    if (updateError) throw updateError;

    res.json({ success: true, message: "Message marked as read" });
  } catch (error: any) {
    console.error("Mark message as read error:", error.message, error.stack);
    res
      .status(500)
      .json({ error: error.message || "Failed to mark message as read" });
  }
});

export default router;

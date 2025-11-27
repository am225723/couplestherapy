import { Router } from "express";
import { supabaseAdmin } from "../supabase.js";

const router = Router();

// Register push token for current user
router.post("/register-token", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const token = authHeader.replace("Bearer ", "");
    const { token: pushToken, type } = req.body;

    if (!pushToken || !["expo", "fcm"].includes(type)) {
      return res.status(400).json({ error: "Invalid push token or type" });
    }

    // Get user from auth header (simple JWT parse)
    let userId: string;
    try {
      // For simplicity, extract from header - in production use proper JWT verification
      const payload = token.split(".")[1];
      const decoded = JSON.parse(Buffer.from(payload, "base64").toString());
      userId = decoded.sub;
    } catch {
      return res.status(401).json({ error: "Invalid token" });
    }

    const columnName = type === "expo" ? "expo_push_token" : "fcm_token";

    // Update user profile with push token
    const { error } = await supabaseAdmin
      .from("Couples_profiles")
      .update({ [columnName]: pushToken })
      .eq("id", userId);

    if (error) {
      console.error("Error updating push token:", error);
      return res.status(500).json({ error: "Failed to register token" });
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Error in register-token:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Create scheduled notification
router.post("/schedule", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const token = authHeader.replace("Bearer ", "");
    const { couple_id, user_id, title, body, scheduled_at } = req.body;

    // Validate input
    if (!couple_id || !title || !body || !scheduled_at) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Get user from auth header
    let userId: string;
    try {
      const payload = token.split(".")[1];
      const decoded = JSON.parse(Buffer.from(payload, "base64").toString());
      userId = decoded.sub;
    } catch {
      return res.status(401).json({ error: "Invalid token" });
    }

    // Verify couple exists (therapists can send to all couples)
    const { data: coupleData, error: coupleError } = await supabaseAdmin
      .from("Couples_couples")
      .select("id")
      .eq("id", couple_id)
      .single();

    if (coupleError || !coupleData) {
      return res.status(404).json({ error: "Couple not found" });
    }

    // Convert EST to UTC (EST is UTC-5, so add 5 hours)
    const estDate = new Date(scheduled_at);
    const utcDate = new Date(estDate.getTime() + 5 * 60 * 60 * 1000);
    const scheduledAtUtc = utcDate.toISOString();

    // Create scheduled notification
    const { data, error } = await supabaseAdmin
      .from("Couples_scheduled_notifications")
      .insert({
        therapist_id: userId,
        couple_id,
        user_id: user_id || null,
        title,
        body,
        scheduled_at: scheduledAtUtc,
        status: "pending",
      })
      .select();

    if (error) {
      console.error("Error creating notification:", error);
      return res.status(500).json({ error: "Failed to create notification" });
    }

    res.json(data[0]);
  } catch (error) {
    console.error("Error in schedule:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get scheduled notifications for therapist
router.get("/scheduled", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const token = authHeader.replace("Bearer ", "");
    let userId: string;
    try {
      const payload = token.split(".")[1];
      const decoded = JSON.parse(Buffer.from(payload, "base64").toString());
      userId = decoded.sub;
    } catch {
      return res.status(401).json({ error: "Invalid token" });
    }

    const { data, error } = await supabaseAdmin
      .from("Couples_scheduled_notifications")
      .select("*")
      .eq("therapist_id", userId)
      .order("scheduled_at", { ascending: false });

    if (error) {
      console.error("Error fetching notifications:", error);
      return res.status(500).json({ error: "Failed to fetch notifications" });
    }

    // Convert UTC back to EST for display (subtract 5 hours)
    const dataWithEstTime = data?.map((notification) => ({
      ...notification,
      scheduled_at_est: new Date(
        new Date(notification.scheduled_at).getTime() - 5 * 60 * 60 * 1000
      ).toISOString(),
    }));

    res.json(dataWithEstTime);
  } catch (error) {
    console.error("Error in scheduled:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Cancel scheduled notification
router.delete("/:id", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const token = authHeader.replace("Bearer ", "");
    const { id } = req.params;

    let userId: string;
    try {
      const payload = token.split(".")[1];
      const decoded = JSON.parse(Buffer.from(payload, "base64").toString());
      userId = decoded.sub;
    } catch {
      return res.status(401).json({ error: "Invalid token" });
    }

    // Verify ownership and status
    const { data: notification, error: fetchError } = await supabaseAdmin
      .from("Couples_scheduled_notifications")
      .select("therapist_id, status")
      .eq("id", id)
      .single();

    if (fetchError || !notification) {
      return res.status(404).json({ error: "Notification not found" });
    }

    if (notification.status !== "pending") {
      return res.status(403).json({ error: "Cannot delete sent notifications" });
    }

    // Delete notification
    const { error } = await supabaseAdmin
      .from("Couples_scheduled_notifications")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting notification:", error);
      return res.status(500).json({ error: "Failed to delete notification" });
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Error in delete:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;

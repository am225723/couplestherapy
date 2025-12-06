import { Router } from "express";
import { supabaseAdmin } from "../supabase.js";
import { verifyTherapistSession, verifyUserSession } from "../helpers.js";

const router = Router();

// DELETE /user/:id - Delete a love language result (user's own result)
router.delete("/user/:id", async (req, res) => {
  try {
    const authResult = await verifyUserSession(req);
    if (!authResult.success) {
      return res.status(authResult.status).json({ error: authResult.error });
    }

    const { id } = req.params;

    // Get the love language result to verify ownership
    const { data: loveLanguage, error: fetchError } = await supabaseAdmin
      .from("Couples_love_languages")
      .select("user_id")
      .eq("id", id)
      .single();

    if (fetchError || !loveLanguage) {
      return res.status(404).json({ error: "Love language result not found" });
    }

    // Verify the user owns this result
    if (loveLanguage.user_id !== authResult.userId) {
      return res.status(403).json({
        error:
          "Access denied: You can only delete your own love language results",
      });
    }

    // Delete the love language result
    const { error: deleteError } = await supabaseAdmin
      .from("Couples_love_languages")
      .delete()
      .eq("id", id);

    if (deleteError) throw deleteError;

    res.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting love language:", error);
    res
      .status(500)
      .json({ error: error.message || "Failed to delete love language" });
  }
});

// DELETE /:id - Delete a love language result (therapist only)
router.delete("/:id", async (req, res) => {
  try {
    const therapistAuth = await verifyTherapistSession(req);
    if (!therapistAuth.success) {
      return res
        .status(therapistAuth.status)
        .json({ error: therapistAuth.error });
    }

    const { id } = req.params;

    // Get the love language result to verify ownership
    const { data: loveLanguage, error: fetchError } = await supabaseAdmin
      .from("Couples_love_languages")
      .select("user_id")
      .eq("id", id)
      .single();

    if (fetchError || !loveLanguage) {
      return res.status(404).json({ error: "Love language result not found" });
    }

    // Cross-therapist access: verify user belongs to a couple in the system
    const { data: couples, error: coupleError } = await supabaseAdmin
      .from("Couples_couples")
      .select("id")
      .or(
        `partner1_id.eq.${loveLanguage.user_id},partner2_id.eq.${loveLanguage.user_id}`,
      );

    if (coupleError || !couples || couples.length === 0) {
      return res
        .status(404)
        .json({ error: "Love language result not associated with any couple" });
    }

    // Delete the love language result
    const { error: deleteError } = await supabaseAdmin
      .from("Couples_love_languages")
      .delete()
      .eq("id", id);

    if (deleteError) throw deleteError;

    res.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting love language:", error);
    res
      .status(500)
      .json({ error: error.message || "Failed to delete love language" });
  }
});

export default router;

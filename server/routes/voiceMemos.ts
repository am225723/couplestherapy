import { Router } from "express";
import { verifyUserSession, verifyTherapistSession } from "../helpers.js";
import { supabaseAdmin } from "../supabase.js";
import {
  generateVoiceMemoUploadUrl,
  generateVoiceMemoDownloadUrl,
} from "../storage-helpers.js";

const router = Router();

router.post("/", async (req, res) => {
  try {
    const authResult = await verifyUserSession(req);
    if (!authResult.success) {
      return res.status(authResult.status).json({ error: authResult.error });
    }

    const { userId, coupleId, partnerId } = authResult;

    const { recipient_id } = req.body;

    if (!recipient_id) {
      return res.status(400).json({ error: "recipient_id is required" });
    }

    if (recipient_id !== partnerId) {
      return res
        .status(403)
        .json({ error: "Can only send voice memos to your partner" });
    }

    const { data: voiceMemo, error: insertError } = await supabaseAdmin
      .from("Couples_voice_memos")
      .insert({
        couple_id: coupleId,
        sender_id: userId,
        recipient_id: recipient_id,
        storage_path: null,
        duration_secs: null,
        transcript_text: null,
        is_listened: false,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Failed to create voice memo record:", insertError);
      return res
        .status(500)
        .json({ error: "Failed to create voice memo record" });
    }

    const {
      data: uploadData,
      error: uploadError,
      path,
    } = await generateVoiceMemoUploadUrl(coupleId, voiceMemo.id);

    if (uploadError || !uploadData) {
      console.error("Failed to generate upload URL:", uploadError);
      await supabaseAdmin
        .from("Couples_voice_memos")
        .delete()
        .eq("id", voiceMemo.id);
      return res.status(500).json({ error: "Failed to generate upload URL" });
    }

    res.json({
      memo_id: voiceMemo.id,
      upload_url: uploadData.signedUrl,
      token: uploadData.token,
      storage_path: path,
    });
  } catch (error: any) {
    console.error("Create voice memo error:", error.message, error.stack);
    res
      .status(500)
      .json({ error: error.message || "Failed to create voice memo" });
  }
});

router.post("/:id/complete", async (req, res) => {
  try {
    const authResult = await verifyUserSession(req);
    if (!authResult.success) {
      return res.status(authResult.status).json({ error: authResult.error });
    }

    const { userId } = authResult;
    const memoId = req.params.id;
    const { storage_path, duration_secs } = req.body;

    if (!storage_path) {
      return res.status(400).json({ error: "storage_path is required" });
    }

    const { data: memo, error: fetchError } = await supabaseAdmin
      .from("Couples_voice_memos")
      .select("sender_id")
      .eq("id", memoId)
      .single();

    if (fetchError || !memo) {
      return res.status(404).json({ error: "Voice memo not found" });
    }

    if (memo.sender_id !== userId) {
      return res
        .status(403)
        .json({
          error: "You don't have permission to complete this voice memo",
        });
    }

    const { error: updateError } = await supabaseAdmin
      .from("Couples_voice_memos")
      .update({
        storage_path,
        duration_secs: duration_secs || null,
      })
      .eq("id", memoId);

    if (updateError) {
      console.error("Failed to update voice memo:", updateError);
      return res.status(500).json({ error: "Failed to finalize voice memo" });
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error("Complete voice memo error:", error.message, error.stack);
    res
      .status(500)
      .json({ error: error.message || "Failed to complete voice memo" });
  }
});

router.patch("/:id/listened", async (req, res) => {
  try {
    const authResult = await verifyUserSession(req);
    if (!authResult.success) {
      return res.status(authResult.status).json({ error: authResult.error });
    }

    const { userId } = authResult;
    const memoId = req.params.id;

    const { data: memo, error: fetchError } = await supabaseAdmin
      .from("Couples_voice_memos")
      .select("recipient_id")
      .eq("id", memoId)
      .single();

    if (fetchError || !memo) {
      return res.status(404).json({ error: "Voice memo not found" });
    }

    if (memo.recipient_id !== userId) {
      return res
        .status(403)
        .json({
          error:
            "You don't have permission to mark this voice memo as listened",
        });
    }

    const { error: updateError } = await supabaseAdmin
      .from("Couples_voice_memos")
      .update({ is_listened: true })
      .eq("id", memoId);

    if (updateError) {
      console.error("Failed to mark voice memo as listened:", updateError);
      return res
        .status(500)
        .json({ error: "Failed to mark voice memo as listened" });
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error("Mark listened error:", error.message, error.stack);
    res
      .status(500)
      .json({
        error: error.message || "Failed to mark voice memo as listened",
      });
  }
});

router.get("/", async (req, res) => {
  try {
    const authResult = await verifyUserSession(req);
    if (!authResult.success) {
      return res.status(authResult.status).json({ error: authResult.error });
    }

    const { coupleId } = authResult;

    const { data: memos, error: memosError } = await supabaseAdmin
      .from("Couples_voice_memos")
      .select("*")
      .eq("couple_id", coupleId)
      .order("created_at", { ascending: false });

    if (memosError) {
      console.error("Failed to fetch voice memos:", memosError);
      return res.status(500).json({ error: "Failed to fetch voice memos" });
    }

    if (!memos || memos.length === 0) {
      return res.json([]);
    }

    const userIds = Array.from(
      new Set([
        ...memos.map((m) => m.sender_id),
        ...memos.map((m) => m.recipient_id),
      ]),
    );

    const { data: profiles } = await supabaseAdmin
      .from("Couples_profiles")
      .select("id, full_name")
      .in("id", userIds);

    const profileMap = new Map(profiles?.map((p) => [p.id, p.full_name]) || []);

    const memosWithUrls = await Promise.all(
      memos.map(async (memo) => {
        let downloadUrl = null;

        if (memo.storage_path) {
          const { data: urlData } = await generateVoiceMemoDownloadUrl(
            memo.storage_path,
          );
          downloadUrl = urlData?.signedUrl || null;
        }

        return {
          id: memo.id,
          couple_id: memo.couple_id,
          sender_id: memo.sender_id,
          sender_name: profileMap.get(memo.sender_id) || "Unknown",
          recipient_id: memo.recipient_id,
          recipient_name: profileMap.get(memo.recipient_id) || "Unknown",
          storage_path: memo.storage_path,
          download_url: downloadUrl,
          duration_secs: memo.duration_secs,
          transcript_text: memo.transcript_text,
          is_listened: memo.is_listened,
          created_at: memo.created_at,
        };
      }),
    );

    res.json(memosWithUrls);
  } catch (error: any) {
    console.error("Get voice memos error:", error.message, error.stack);
    res
      .status(500)
      .json({ error: error.message || "Failed to get voice memos" });
  }
});

router.get("/therapist/:coupleId", async (req, res) => {
  try {
    const authResult = await verifyTherapistSession(req);
    if (!authResult.success) {
      return res.status(authResult.status).json({ error: authResult.error });
    }

    const { therapistId } = authResult;
    const coupleId = req.params.coupleId;

    const { data: couple, error: coupleError } = await supabaseAdmin
      .from("Couples_couples")
      .select("partner1_id, partner2_id, therapist_id")
      .eq("id", coupleId)
      .single();

    if (coupleError || !couple) {
      return res.status(404).json({ error: "Couple not found" });
    }

    if (couple.therapist_id !== therapistId) {
      return res
        .status(403)
        .json({ error: "You don't have access to this couple's data" });
    }

    const { data: memos, error: memosError } = await supabaseAdmin
      .from("Couples_voice_memos")
      .select(
        "id, sender_id, recipient_id, duration_secs, is_listened, created_at",
      )
      .eq("couple_id", coupleId)
      .order("created_at", { ascending: false });

    if (memosError) {
      console.error("Failed to fetch voice memos:", memosError);
      return res.status(500).json({ error: "Failed to fetch voice memos" });
    }

    if (!memos || memos.length === 0) {
      return res.json([]);
    }

    const { data: profiles } = await supabaseAdmin
      .from("Couples_profiles")
      .select("id, full_name")
      .in("id", [couple.partner1_id, couple.partner2_id]);

    const profileMap = new Map(profiles?.map((p) => [p.id, p.full_name]) || []);

    const metadata = memos.map((memo) => ({
      id: memo.id,
      sender_name: profileMap.get(memo.sender_id) || "Unknown",
      recipient_name: profileMap.get(memo.recipient_id) || "Unknown",
      duration_secs: memo.duration_secs,
      is_listened: memo.is_listened,
      created_at: memo.created_at,
    }));

    res.json(metadata);
  } catch (error: any) {
    console.error(
      "Error fetching voice memo metadata:",
      error.message,
      error.stack,
    );
    res
      .status(500)
      .json({ error: error.message || "Failed to fetch voice memo metadata" });
  }
});

export default router;

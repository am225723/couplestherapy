import { Router } from "express";
import { supabaseAdmin } from "../supabase.js";
import { verifyTherapistSession, verifyUserSession } from "../helpers.js";

const router = Router();

// GET /prompts - Get journal writing prompts
router.get("/prompts", async (req, res) => {
  try {
    const authResult = await verifyUserSession(req);
    if (!authResult.success) {
      return res.status(authResult.status).json({ error: authResult.error });
    }

    const { category } = req.query;

    let query = supabaseAdmin
      .from("Couples_journal_prompts")
      .select("*")
      .eq("is_active", true);

    if (category) {
      query = query.eq("category", category);
    }

    const { data, error } = await query.order("id");

    if (error) throw error;

    res.json(data);
  } catch (error: any) {
    console.error("Error fetching journal prompts:", error);
    res.status(500).json({ error: error.message || "Failed to fetch prompts" });
  }
});

// POST /entries - Create a new journal entry
router.post("/entries", async (req, res) => {
  try {
    const authResult = await verifyUserSession(req);
    if (!authResult.success) {
      return res.status(authResult.status).json({ error: authResult.error });
    }

    const { entry_content, entry_mode, visibility, mood, is_favorite } =
      req.body;

    if (!entry_content || !entry_mode || !visibility) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Validate enum values
    if (!["individual", "joint"].includes(entry_mode)) {
      return res.status(400).json({ error: "Invalid entry_mode" });
    }

    if (
      !["private", "shared_with_partner", "shared_with_therapist"].includes(
        visibility,
      )
    ) {
      return res.status(400).json({ error: "Invalid visibility" });
    }

    // Get user's couple_id from their profile
    const { data: profile } = await supabaseAdmin
      .from("Couples_profiles")
      .select("couple_id")
      .eq("id", authResult.userId)
      .single();

    if (!profile?.couple_id) {
      return res.status(400).json({ error: "User is not part of a couple" });
    }

    const { data, error } = await supabaseAdmin
      .from("Couples_journal_entries")
      .insert({
        couple_id: profile.couple_id,
        author_id: authResult.userId,
        entry_content,
        entry_mode,
        visibility,
        mood: mood || null,
        is_favorite: is_favorite || false,
      })
      .select()
      .single();

    if (error) throw error;

    // If shared with therapist, create share record
    if (visibility === "shared_with_therapist") {
      const { data: couple } = await supabaseAdmin
        .from("Couples_couples")
        .select("therapist_id")
        .eq("id", profile.couple_id)
        .single();

      if (couple?.therapist_id) {
        await supabaseAdmin.from("Couples_journal_shares").insert({
          entry_id: data.id,
          therapist_id: couple.therapist_id,
          therapist_viewed: false,
        });
      }
    }

    res.json(data);
  } catch (error: any) {
    console.error("Error creating journal entry:", error);
    res.status(500).json({ error: error.message || "Failed to create entry" });
  }
});

// GET /entries - Get journal entries for the couple
router.get("/entries", async (req, res) => {
  try {
    const authResult = await verifyUserSession(req);
    if (!authResult.success) {
      return res.status(authResult.status).json({ error: authResult.error });
    }

    // Get user's couple_id
    const { data: profile } = await supabaseAdmin
      .from("Couples_profiles")
      .select("couple_id")
      .eq("id", authResult.userId)
      .single();

    if (!profile?.couple_id) {
      return res.status(400).json({ error: "User is not part of a couple" });
    }

    const { visibility, favorites_only } = req.query;

    // Build query with RLS-style filtering
    let query = supabaseAdmin
      .from("Couples_journal_entries")
      .select(
        `
        *,
        Couples_profiles!Couples_journal_entries_author_id_fkey (
          full_name
        )
      `,
      )
      .eq("couple_id", profile.couple_id);

    // Apply visibility filter: user can see their own entries + shared entries
    if (!visibility) {
      query = query.or(
        `author_id.eq.${authResult.userId},visibility.in.(shared_with_partner,shared_with_therapist)`,
      );
    } else if (visibility === "private") {
      query = query
        .eq("author_id", authResult.userId)
        .eq("visibility", "private");
    } else {
      query = query.eq("visibility", visibility);
    }

    if (favorites_only === "true") {
      query = query.eq("is_favorite", true);
    }

    const { data, error } = await query.order("created_at", {
      ascending: false,
    });

    if (error) throw error;

    res.json(data);
  } catch (error: any) {
    console.error("Error fetching journal entries:", error);
    res.status(500).json({ error: error.message || "Failed to fetch entries" });
  }
});

// GET /entries/:id - Get specific journal entry
router.get("/entries/:id", async (req, res) => {
  try {
    const authResult = await verifyUserSession(req);
    if (!authResult.success) {
      return res.status(authResult.status).json({ error: authResult.error });
    }

    const { id } = req.params;

    const { data, error } = await supabaseAdmin
      .from("Couples_journal_entries")
      .select(
        `
        *,
        Couples_profiles!Couples_journal_entries_author_id_fkey (
          full_name
        ),
        Couples_journal_attachments (
          *
        )
      `,
      )
      .eq("id", id)
      .single();

    if (error) throw error;

    // Verify access (RLS-style check)
    const { data: profile } = await supabaseAdmin
      .from("Couples_profiles")
      .select("couple_id")
      .eq("id", authResult.userId)
      .single();

    if (data.couple_id !== profile?.couple_id) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Check if user can view this entry
    const canView =
      data.author_id === authResult.userId ||
      data.visibility === "shared_with_partner" ||
      data.visibility === "shared_with_therapist";

    if (!canView) {
      return res.status(403).json({ error: "Access denied" });
    }

    res.json(data);
  } catch (error: any) {
    console.error("Error fetching journal entry:", error);
    res.status(500).json({ error: error.message || "Failed to fetch entry" });
  }
});

// PATCH /entries/:id - Update journal entry
router.patch("/entries/:id", async (req, res) => {
  try {
    const authResult = await verifyUserSession(req);
    if (!authResult.success) {
      return res.status(authResult.status).json({ error: authResult.error });
    }

    const { id } = req.params;
    const { entry_content, visibility, mood, is_favorite } = req.body;

    // Verify ownership
    const { data: entry } = await supabaseAdmin
      .from("Couples_journal_entries")
      .select("author_id, couple_id, visibility")
      .eq("id", id)
      .single();

    if (!entry || entry.author_id !== authResult.userId) {
      return res.status(403).json({ error: "Access denied" });
    }

    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (entry_content !== undefined) updateData.entry_content = entry_content;
    if (visibility !== undefined) updateData.visibility = visibility;
    if (mood !== undefined) updateData.mood = mood;
    if (is_favorite !== undefined) updateData.is_favorite = is_favorite;

    const { data, error } = await supabaseAdmin
      .from("Couples_journal_entries")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    // If visibility changed to shared_with_therapist, create share record
    if (
      visibility === "shared_with_therapist" &&
      entry.visibility !== "shared_with_therapist"
    ) {
      const { data: couple } = await supabaseAdmin
        .from("Couples_couples")
        .select("therapist_id")
        .eq("id", entry.couple_id)
        .single();

      if (couple?.therapist_id) {
        await supabaseAdmin.from("Couples_journal_shares").upsert(
          {
            entry_id: id,
            therapist_id: couple.therapist_id,
            therapist_viewed: false,
          },
          { onConflict: "entry_id,therapist_id", ignoreDuplicates: true },
        );
      }
    }

    res.json(data);
  } catch (error: any) {
    console.error("Error updating journal entry:", error);
    res.status(500).json({ error: error.message || "Failed to update entry" });
  }
});

// DELETE /entries/:id - Delete journal entry
router.delete("/entries/:id", async (req, res) => {
  try {
    const authResult = await verifyUserSession(req);
    if (!authResult.success) {
      return res.status(authResult.status).json({ error: authResult.error });
    }

    const { id } = req.params;

    // Verify ownership
    const { data: entry } = await supabaseAdmin
      .from("Couples_journal_entries")
      .select("author_id")
      .eq("id", id)
      .single();

    if (!entry || entry.author_id !== authResult.userId) {
      return res.status(403).json({ error: "Access denied" });
    }

    const { error } = await supabaseAdmin
      .from("Couples_journal_entries")
      .delete()
      .eq("id", id);

    if (error) throw error;

    res.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting journal entry:", error);
    res.status(500).json({ error: error.message || "Failed to delete entry" });
  }
});

// POST /milestones - Create a new milestone
router.post("/milestones", async (req, res) => {
  try {
    const authResult = await verifyUserSession(req);
    if (!authResult.success) {
      return res.status(authResult.status).json({ error: authResult.error });
    }

    const { milestone_date, milestone_title, milestone_description, entry_id } =
      req.body;

    if (!milestone_date || !milestone_title) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Get user's couple_id
    const { data: profile } = await supabaseAdmin
      .from("Couples_profiles")
      .select("couple_id")
      .eq("id", authResult.userId)
      .single();

    if (!profile?.couple_id) {
      return res.status(400).json({ error: "User is not part of a couple" });
    }

    const { data, error } = await supabaseAdmin
      .from("Couples_journal_milestones")
      .insert({
        couple_id: profile.couple_id,
        entry_id: entry_id || null,
        milestone_date,
        milestone_title,
        milestone_description: milestone_description || null,
      })
      .select()
      .single();

    if (error) throw error;

    res.json(data);
  } catch (error: any) {
    console.error("Error creating milestone:", error);
    res
      .status(500)
      .json({ error: error.message || "Failed to create milestone" });
  }
});

// GET /milestones - Get couple's milestones
router.get("/milestones", async (req, res) => {
  try {
    const authResult = await verifyUserSession(req);
    if (!authResult.success) {
      return res.status(authResult.status).json({ error: authResult.error });
    }

    // Get user's couple_id
    const { data: profile } = await supabaseAdmin
      .from("Couples_profiles")
      .select("couple_id")
      .eq("id", authResult.userId)
      .single();

    if (!profile?.couple_id) {
      return res.status(400).json({ error: "User is not part of a couple" });
    }

    const { data, error } = await supabaseAdmin
      .from("Couples_journal_milestones")
      .select("*")
      .eq("couple_id", profile.couple_id)
      .order("milestone_date", { ascending: false });

    if (error) throw error;

    res.json(data);
  } catch (error: any) {
    console.error("Error fetching milestones:", error);
    res
      .status(500)
      .json({ error: error.message || "Failed to fetch milestones" });
  }
});

export default router;

import { Router } from "express";
import { supabaseAdmin } from "../supabase.js";
import { verifyUserSession, verifyTherapistSession } from "../helpers.js";

const router = Router();

// POST /rating - Submit weekly intimacy rating
router.post("/rating", async (req, res) => {
  try {
    const userAuth = await verifyUserSession(req);
    if (!userAuth.success) {
      return res.status(userAuth.status).json({ error: userAuth.error });
    }

    const {
      week_number,
      year,
      physical,
      emotional,
      intellectual,
      experiential,
      spiritual,
      notes,
    } = req.body;

    if (!week_number || !year) {
      return res
        .status(400)
        .json({ error: "week_number and year are required" });
    }

    const { data, error } = await supabaseAdmin
      .from("Couples_intimacy_ratings")
      .upsert(
        {
          couple_id: userAuth.coupleId,
          user_id: userAuth.userId,
          week_number,
          year,
          physical,
          emotional,
          intellectual,
          experiential,
          spiritual,
          notes,
        },
        {
          onConflict: "couple_id,user_id,week_number,year",
        },
      )
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    console.error("Error saving intimacy rating:", error);
    res.status(500).json({ error: error.message || "Failed to save rating" });
  }
});

// GET /ratings/:couple_id - Get intimacy ratings for a couple
router.get("/ratings/:couple_id", async (req, res) => {
  try {
    const userAuth = await verifyUserSession(req);
    if (!userAuth.success) {
      return res.status(userAuth.status).json({ error: userAuth.error });
    }

    const { couple_id } = req.params;

    if (couple_id !== userAuth.coupleId) {
      return res
        .status(403)
        .json({ error: "Cannot view different couple ratings" });
    }

    const { data, error } = await supabaseAdmin
      .from("Couples_intimacy_ratings")
      .select("*")
      .eq("couple_id", couple_id)
      .order("year", { ascending: false })
      .order("week_number", { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    console.error("Error fetching intimacy ratings:", error);
    res.status(500).json({ error: error.message || "Failed to fetch ratings" });
  }
});

// POST /goal - Create an intimacy goal
router.post("/goal", async (req, res) => {
  try {
    const userAuth = await verifyUserSession(req);
    if (!userAuth.success) {
      return res.status(userAuth.status).json({ error: userAuth.error });
    }

    const { dimension, goal_text, target_rating } = req.body;

    if (!dimension || !goal_text) {
      return res
        .status(400)
        .json({ error: "dimension and goal_text are required" });
    }

    const { data, error } = await supabaseAdmin
      .from("Couples_intimacy_goals")
      .insert({
        couple_id: userAuth.coupleId,
        dimension,
        goal_text,
        target_rating,
      })
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    console.error("Error creating intimacy goal:", error);
    res.status(500).json({ error: error.message || "Failed to create goal" });
  }
});

// GET /goals/:couple_id - Get intimacy goals for a couple
router.get("/goals/:couple_id", async (req, res) => {
  try {
    const userAuth = await verifyUserSession(req);
    if (!userAuth.success) {
      return res.status(userAuth.status).json({ error: userAuth.error });
    }

    const { couple_id } = req.params;

    if (couple_id !== userAuth.coupleId) {
      return res
        .status(403)
        .json({ error: "Cannot view different couple goals" });
    }

    const { data, error } = await supabaseAdmin
      .from("Couples_intimacy_goals")
      .select("*")
      .eq("couple_id", couple_id)
      .order("created_at", { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    console.error("Error fetching intimacy goals:", error);
    res.status(500).json({ error: error.message || "Failed to fetch goals" });
  }
});

// PATCH /goal/:id/achieve - Mark goal as achieved
router.patch("/goal/:id/achieve", async (req, res) => {
  try {
    const userAuth = await verifyUserSession(req);
    if (!userAuth.success) {
      return res.status(userAuth.status).json({ error: userAuth.error });
    }

    const { id } = req.params;

    const { data, error } = await supabaseAdmin
      .from("Couples_intimacy_goals")
      .update({
        is_achieved: true,
        achieved_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("couple_id", userAuth.coupleId)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    console.error("Error marking goal achieved:", error);
    res.status(500).json({ error: error.message || "Failed to update goal" });
  }
});

// GET /couple/:couple_id - THERAPIST: Get all ratings and goals for a couple
router.get("/couple/:couple_id", async (req, res) => {
  try {
    const therapistAuth = await verifyTherapistSession(req);
    if (!therapistAuth.success) {
      return res
        .status(therapistAuth.status)
        .json({ error: therapistAuth.error });
    }

    const { couple_id } = req.params;

    // Verify couple is assigned to this therapist
    const { data: couple } = await supabaseAdmin
      .from("Couples_couples")
      .select("therapist_id")
      .eq("id", couple_id)
      .single();

    if (!couple || couple.therapist_id !== therapistAuth.therapistId) {
      return res
        .status(403)
        .json({ error: "Not authorized to view this couple" });
    }

    // Fetch ratings and goals in parallel
    const [
      { data: ratings, error: ratingsError },
      { data: goals, error: goalsError },
    ] = await Promise.all([
      supabaseAdmin
        .from("Couples_intimacy_ratings")
        .select("*")
        .eq("couple_id", couple_id)
        .order("created_at", { ascending: false }),
      supabaseAdmin
        .from("Couples_intimacy_goals")
        .select("*")
        .eq("couple_id", couple_id)
        .order("created_at", { ascending: false }),
    ]);

    if (ratingsError) throw ratingsError;
    if (goalsError) throw goalsError;

    res.json({
      ratings: ratings || [],
      goals: goals || [],
    });
  } catch (error: any) {
    console.error("Error fetching intimacy mapping data:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

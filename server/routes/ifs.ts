import { Router } from "express";
import { supabaseAdmin } from "../supabase.js";
import { verifyUserSession } from "../helpers.js";
import { z } from "zod";

const router = Router();

// Validation schemas
const insertIfsExerciseSchema = z.object({
  user_id: z.string().uuid(),
  couple_id: z.string().uuid(),
  status: z.enum(["in_progress", "completed"]).default("in_progress"),
});

const insertIfsPartSchema = z.object({
  exercise_id: z.string().uuid(),
  user_id: z.string().uuid(),
  part_name: z.string().min(1),
  when_appears: z.string().min(1),
  letter_content: z.string().min(1),
});

// POST /exercise - Create new IFS exercise
router.post("/exercise", async (req, res) => {
  try {
    const userAuth = await verifyUserSession(req);
    if (!userAuth.success) {
      return res.status(userAuth.status).json({ error: userAuth.error });
    }

    const validatedData = insertIfsExerciseSchema.parse(req.body);

    // Verify user_id matches authenticated user
    if (validatedData.user_id !== userAuth.userId) {
      return res
        .status(403)
        .json({ error: "Cannot create exercise for different user" });
    }

    // Verify couple_id matches user's couple
    if (validatedData.couple_id !== userAuth.coupleId) {
      return res
        .status(403)
        .json({ error: "Cannot create exercise for different couple" });
    }

    const { data, error } = await supabaseAdmin
      .from("Couples_ifs_exercises")
      .insert(validatedData)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    console.error("Error creating IFS exercise:", error.message, error.stack);
    res
      .status(500)
      .json({ error: error.message || "Failed to create exercise" });
  }
});

// POST /part - Add protective part
router.post("/part", async (req, res) => {
  try {
    const userAuth = await verifyUserSession(req);
    if (!userAuth.success) {
      return res.status(userAuth.status).json({ error: userAuth.error });
    }

    const validatedData = insertIfsPartSchema.parse(req.body);

    // Verify user_id matches authenticated user
    if (validatedData.user_id !== userAuth.userId) {
      return res
        .status(403)
        .json({ error: "Cannot create part for different user" });
    }

    // Verify exercise belongs to user
    const { data: exercise, error: exerciseError } = await supabaseAdmin
      .from("Couples_ifs_exercises")
      .select("user_id")
      .eq("id", validatedData.exercise_id)
      .single();

    if (exerciseError || !exercise) {
      return res.status(404).json({ error: "Exercise not found" });
    }

    if (exercise.user_id !== userAuth.userId) {
      return res
        .status(403)
        .json({ error: "Cannot add part to different user exercise" });
    }

    const { data, error } = await supabaseAdmin
      .from("Couples_ifs_parts")
      .insert(validatedData)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    console.error("Error creating IFS part:", error.message, error.stack);
    res.status(500).json({ error: error.message || "Failed to create part" });
  }
});

// PATCH /part/:id - Update part
router.patch("/part/:id", async (req, res) => {
  try {
    const userAuth = await verifyUserSession(req);
    if (!userAuth.success) {
      return res.status(userAuth.status).json({ error: userAuth.error });
    }

    const { id } = req.params;
    const updates = req.body;

    // Verify part belongs to user
    const { data: part, error: partError } = await supabaseAdmin
      .from("Couples_ifs_parts")
      .select("user_id")
      .eq("id", id)
      .single();

    if (partError || !part) {
      return res.status(404).json({ error: "Part not found" });
    }

    if (part.user_id !== userAuth.userId) {
      return res
        .status(403)
        .json({ error: "Cannot update different user part" });
    }

    const { data, error } = await supabaseAdmin
      .from("Couples_ifs_parts")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    console.error("Error updating IFS part:", error.message, error.stack);
    res.status(500).json({ error: error.message || "Failed to update part" });
  }
});

// DELETE /part/:id - Delete part
router.delete("/part/:id", async (req, res) => {
  try {
    const userAuth = await verifyUserSession(req);
    if (!userAuth.success) {
      return res.status(userAuth.status).json({ error: userAuth.error });
    }

    const { id } = req.params;

    // Verify part belongs to user
    const { data: part, error: partError } = await supabaseAdmin
      .from("Couples_ifs_parts")
      .select("user_id")
      .eq("id", id)
      .single();

    if (partError || !part) {
      return res.status(404).json({ error: "Part not found" });
    }

    if (part.user_id !== userAuth.userId) {
      return res
        .status(403)
        .json({ error: "Cannot delete different user part" });
    }

    const { error } = await supabaseAdmin
      .from("Couples_ifs_parts")
      .delete()
      .eq("id", id);

    if (error) throw error;
    res.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting IFS part:", error.message, error.stack);
    res.status(500).json({ error: error.message || "Failed to delete part" });
  }
});

// GET /exercises/:user_id - Get user's exercises
router.get("/exercises/:user_id", async (req, res) => {
  try {
    const userAuth = await verifyUserSession(req);
    if (!userAuth.success) {
      return res.status(userAuth.status).json({ error: userAuth.error });
    }

    const { user_id } = req.params;

    // Verify user_id matches authenticated user
    if (user_id !== userAuth.userId) {
      return res
        .status(403)
        .json({ error: "Cannot view different user exercises" });
    }

    const { data: exercises, error: exercisesError } = await supabaseAdmin
      .from("Couples_ifs_exercises")
      .select("*")
      .eq("user_id", user_id)
      .order("created_at", { ascending: false });

    if (exercisesError) throw exercisesError;

    // Get all parts for these exercises
    const exerciseIds = exercises?.map((e) => e.id) || [];
    const { data: parts, error: partsError } = await supabaseAdmin
      .from("Couples_ifs_parts")
      .select("*")
      .in("exercise_id", exerciseIds)
      .order("created_at", { ascending: true });

    if (partsError) throw partsError;

    // Combine exercises with their parts
    const exercisesWithParts = exercises?.map((exercise) => ({
      ...exercise,
      parts: parts?.filter((p) => p.exercise_id === exercise.id) || [],
    }));

    res.json(exercisesWithParts);
  } catch (error: any) {
    console.error("Error fetching IFS exercises:", error.message, error.stack);
    res
      .status(500)
      .json({ error: error.message || "Failed to fetch exercises" });
  }
});

export default router;

import { Router } from "express";
import type { Request, Response } from "express";
import { supabaseAdmin } from "../supabase.js";
import { verifyUserSession, verifyTherapistSession } from "../helpers.js";
import { z } from "zod";

const router = Router();

// Validation schemas
const createTodoSchema = z.object({
  couple_id: z.string().uuid(),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional().nullable(),
  assigned_to: z.string().uuid().optional().nullable(),
  due_date: z.string().optional().nullable(),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  category: z.string().optional().nullable(),
  therapist_notes: z.string().optional().nullable(),
});

const updateTodoSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  assigned_to: z.string().uuid().optional().nullable(),
  due_date: z.string().optional().nullable(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  category: z.string().optional().nullable(),
  therapist_notes: z.string().optional().nullable(),
});

// Helper function to check if user is a therapist
async function checkIfTherapist(userId: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from("Couples_profiles")
    .select("role")
    .eq("id", userId)
    .single();

  return data?.role === "therapist";
}

// Helper function to verify user belongs to the couple
async function verifyCoupleMembership(userId: string, coupleId: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from("Couples_profiles")
    .select("couple_id")
    .eq("id", userId)
    .single();

  return data?.couple_id === coupleId;
}

// Helper function to get the todo and verify ownership
async function getTodoWithOwnership(todoId: string, userId: string, isTherapist: boolean): Promise<{ todo: any; hasAccess: boolean }> {
  const { data: todo, error } = await supabaseAdmin
    .from("Couples_shared_todos")
    .select("*")
    .eq("id", todoId)
    .single();

  if (error || !todo) {
    return { todo: null, hasAccess: false };
  }

  // Therapists have access to all todos
  if (isTherapist) {
    return { todo, hasAccess: true };
  }

  // Regular users must belong to the couple
  const isMember = await verifyCoupleMembership(userId, todo.couple_id);
  return { todo, hasAccess: isMember };
}

// GET /api/shared-todos/couple/:coupleId - Get all todos for a couple
router.get("/couple/:coupleId", async (req: Request, res: Response) => {
  try {
    const authResult = await verifyUserSession(req);
    if (!authResult.success) {
      return res.status(authResult.status).json({ error: authResult.error });
    }

    const { coupleId } = req.params;
    const showCompleted = req.query.showCompleted === "true";

    // Verify user belongs to this couple or is a therapist
    const isTherapist = await checkIfTherapist(authResult.userId);
    if (!isTherapist) {
      const isMember = await verifyCoupleMembership(authResult.userId, coupleId);
      if (!isMember) {
        return res.status(403).json({ error: "You don't have access to this couple's todos" });
      }
    }

    let query = supabaseAdmin
      .from("Couples_shared_todos")
      .select("*")
      .eq("couple_id", coupleId)
      .order("is_completed", { ascending: true })
      .order("due_date", { ascending: true, nullsFirst: false })
      .order("priority", { ascending: false })
      .order("created_at", { ascending: false });

    if (!showCompleted) {
      query = query.eq("is_completed", false);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Hide therapist notes from non-therapist users
    const todos = (data || []).map((todo: any) => ({
      ...todo,
      therapist_notes: isTherapist ? todo.therapist_notes : undefined,
    }));

    res.json(todos);
  } catch (error: any) {
    console.error("Error fetching shared todos:", error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/shared-todos - Create a new todo
router.post("/", async (req: Request, res: Response) => {
  try {
    const authResult = await verifyUserSession(req);
    if (!authResult.success) {
      return res.status(authResult.status).json({ error: authResult.error });
    }

    // Validate request body
    const parseResult = createTodoSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: parseResult.error.errors[0].message });
    }

    const { couple_id, title, description, assigned_to, due_date, priority, category, therapist_notes } = parseResult.data;

    // Verify user belongs to this couple or is a therapist
    const isTherapist = await checkIfTherapist(authResult.userId);
    if (!isTherapist) {
      const isMember = await verifyCoupleMembership(authResult.userId, couple_id);
      if (!isMember) {
        return res.status(403).json({ error: "You don't have access to create todos for this couple" });
      }
    }

    const { data, error } = await supabaseAdmin
      .from("Couples_shared_todos")
      .insert({
        couple_id,
        title,
        description,
        assigned_to,
        assigned_by: authResult.userId,
        due_date,
        priority: priority || "medium",
        category,
        is_therapist_assigned: isTherapist,
        therapist_notes: isTherapist ? therapist_notes : null,
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (error: any) {
    console.error("Error creating shared todo:", error);
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/shared-todos/:id - Update a todo
router.patch("/:id", async (req: Request, res: Response) => {
  try {
    const authResult = await verifyUserSession(req);
    if (!authResult.success) {
      return res.status(authResult.status).json({ error: authResult.error });
    }

    const { id } = req.params;

    // Validate request body
    const parseResult = updateTodoSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: parseResult.error.errors[0].message });
    }

    const isTherapist = await checkIfTherapist(authResult.userId);
    
    // Verify access to this todo
    const { todo, hasAccess } = await getTodoWithOwnership(id, authResult.userId, isTherapist);
    if (!todo) {
      return res.status(404).json({ error: "Todo not found" });
    }
    if (!hasAccess) {
      return res.status(403).json({ error: "You don't have access to update this todo" });
    }

    const updates = { ...parseResult.data };

    // Only therapists can update therapist_notes and is_therapist_assigned
    if (!isTherapist) {
      delete updates.therapist_notes;
    }

    const { data, error } = await supabaseAdmin
      .from("Couples_shared_todos")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    console.error("Error updating shared todo:", error);
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/shared-todos/:id/complete - Toggle completion status
router.patch("/:id/complete", async (req: Request, res: Response) => {
  try {
    const authResult = await verifyUserSession(req);
    if (!authResult.success) {
      return res.status(authResult.status).json({ error: authResult.error });
    }

    const { id } = req.params;
    const { is_completed } = req.body;

    if (typeof is_completed !== "boolean") {
      return res.status(400).json({ error: "is_completed must be a boolean" });
    }

    const isTherapist = await checkIfTherapist(authResult.userId);

    // Verify access to this todo
    const { todo, hasAccess } = await getTodoWithOwnership(id, authResult.userId, isTherapist);
    if (!todo) {
      return res.status(404).json({ error: "Todo not found" });
    }
    if (!hasAccess) {
      return res.status(403).json({ error: "You don't have access to update this todo" });
    }

    const updateData: any = {
      is_completed,
    };

    if (is_completed) {
      updateData.completed_by = authResult.userId;
      updateData.completed_at = new Date().toISOString();
    } else {
      updateData.completed_by = null;
      updateData.completed_at = null;
    }

    const { data, error } = await supabaseAdmin
      .from("Couples_shared_todos")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    console.error("Error toggling todo completion:", error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/shared-todos/:id - Delete a todo
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const authResult = await verifyUserSession(req);
    if (!authResult.success) {
      return res.status(authResult.status).json({ error: authResult.error });
    }

    const { id } = req.params;
    const isTherapist = await checkIfTherapist(authResult.userId);

    // Verify access to this todo
    const { todo, hasAccess } = await getTodoWithOwnership(id, authResult.userId, isTherapist);
    if (!todo) {
      return res.status(404).json({ error: "Todo not found" });
    }
    if (!hasAccess) {
      return res.status(403).json({ error: "You don't have access to delete this todo" });
    }

    // Regular users can only delete todos they created, or that are assigned to them
    if (!isTherapist && todo.assigned_by !== authResult.userId && todo.assigned_to !== authResult.userId) {
      return res.status(403).json({ error: "You can only delete todos you created or that are assigned to you" });
    }

    const { error } = await supabaseAdmin
      .from("Couples_shared_todos")
      .delete()
      .eq("id", id);

    if (error) throw error;
    res.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting shared todo:", error);
    res.status(500).json({ error: error.message });
  }
});

// THERAPIST ROUTES

// GET /api/shared-todos/therapist/all - Get all todos across all couples (therapist only)
router.get("/therapist/all", async (req: Request, res: Response) => {
  try {
    const authResult = await verifyTherapistSession(req);
    if (!authResult.success) {
      return res.status(authResult.status).json({ error: authResult.error });
    }

    const showCompleted = req.query.showCompleted === "true";

    let query = supabaseAdmin
      .from("Couples_shared_todos")
      .select(`
        *,
        couple:couple_id (
          id,
          partner1_id,
          partner2_id
        )
      `)
      .order("is_completed", { ascending: true })
      .order("due_date", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false });

    if (!showCompleted) {
      query = query.eq("is_completed", false);
    }

    const { data, error } = await query;

    if (error) throw error;
    res.json(data || []);
  } catch (error: any) {
    console.error("Error fetching all todos for therapist:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

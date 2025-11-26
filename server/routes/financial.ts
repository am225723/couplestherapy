import { Router } from "express";
import { supabaseAdmin } from "../supabase.js";
import { verifyTherapistSession, verifyUserSession } from "../helpers.js";

const router = Router();

// POST /values - Create a new financial value statement
router.post("/values", async (req, res) => {
  try {
    const authResult = await verifyUserSession(req);
    if (!authResult.success) {
      return res.status(authResult.status).json({ error: authResult.error });
    }

    const { value_statement, priority_level } = req.body;

    if (!value_statement) {
      return res.status(400).json({ error: "Value statement is required" });
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
      .from("Couples_financial_values")
      .insert({
        couple_id: profile.couple_id,
        user_id: authResult.userId,
        value_statement,
        priority_level: priority_level || null,
      })
      .select()
      .single();

    if (error) throw error;

    res.json(data);
  } catch (error: any) {
    console.error("Error creating financial value:", error);
    res.status(500).json({ error: error.message || "Failed to create value" });
  }
});

// GET /values - Get couple's financial values
router.get("/values", async (req, res) => {
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
      .from("Couples_financial_values")
      .select(
        `
        *,
        Couples_profiles!Couples_financial_values_user_id_fkey (
          full_name
        )
      `,
      )
      .eq("couple_id", profile.couple_id)
      .order("priority_level", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });

    if (error) throw error;

    res.json(data);
  } catch (error: any) {
    console.error("Error fetching financial values:", error);
    res.status(500).json({ error: error.message || "Failed to fetch values" });
  }
});

// POST /budgets - Create or update budget category
router.post("/budgets", async (req, res) => {
  try {
    const authResult = await verifyUserSession(req);
    if (!authResult.success) {
      return res.status(authResult.status).json({ error: authResult.error });
    }

    const { category_name, budgeted_amount, spent_amount, month_year } =
      req.body;

    if (!category_name || budgeted_amount === undefined || !month_year) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Validate amounts
    if (
      budgeted_amount < 0 ||
      (spent_amount !== undefined && spent_amount < 0)
    ) {
      return res.status(400).json({ error: "Amounts cannot be negative" });
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
      .from("Couples_financial_budgets")
      .upsert(
        {
          couple_id: profile.couple_id,
          category_name,
          budgeted_amount,
          spent_amount: spent_amount || 0,
          month_year,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "couple_id,category_name,month_year" },
      )
      .select()
      .single();

    if (error) throw error;

    res.json(data);
  } catch (error: any) {
    console.error("Error saving budget:", error);
    res.status(500).json({ error: error.message || "Failed to save budget" });
  }
});

// GET /budgets - Get couple's budgets
router.get("/budgets", async (req, res) => {
  try {
    const authResult = await verifyUserSession(req);
    if (!authResult.success) {
      return res.status(authResult.status).json({ error: authResult.error });
    }

    const { month_year } = req.query;

    // Get user's couple_id
    const { data: profile } = await supabaseAdmin
      .from("Couples_profiles")
      .select("couple_id")
      .eq("id", authResult.userId)
      .single();

    if (!profile?.couple_id) {
      return res.status(400).json({ error: "User is not part of a couple" });
    }

    let query = supabaseAdmin
      .from("Couples_financial_budgets")
      .select("*")
      .eq("couple_id", profile.couple_id);

    if (month_year) {
      query = query.eq("month_year", month_year);
    }

    const { data, error } = await query.order("category_name");

    if (error) throw error;

    res.json(data);
  } catch (error: any) {
    console.error("Error fetching budgets:", error);
    res.status(500).json({ error: error.message || "Failed to fetch budgets" });
  }
});

// POST /goals - Create a new financial goal
router.post("/goals", async (req, res) => {
  try {
    const authResult = await verifyUserSession(req);
    if (!authResult.success) {
      return res.status(authResult.status).json({ error: authResult.error });
    }

    const { goal_title, target_amount, current_amount, target_date } = req.body;

    if (!goal_title || target_amount === undefined) {
      return res
        .status(400)
        .json({ error: "Goal title and target amount are required" });
    }

    if (
      target_amount < 0 ||
      (current_amount !== undefined && current_amount < 0)
    ) {
      return res.status(400).json({ error: "Amounts cannot be negative" });
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
      .from("Couples_financial_goals")
      .insert({
        couple_id: profile.couple_id,
        goal_title,
        target_amount,
        current_amount: current_amount || 0,
        target_date: target_date || null,
        is_achieved: false,
      })
      .select()
      .single();

    if (error) throw error;

    res.json(data);
  } catch (error: any) {
    console.error("Error creating financial goal:", error);
    res.status(500).json({ error: error.message || "Failed to create goal" });
  }
});

// GET /goals - Get couple's financial goals
router.get("/goals", async (req, res) => {
  try {
    const authResult = await verifyUserSession(req);
    if (!authResult.success) {
      return res.status(authResult.status).json({ error: authResult.error });
    }

    const { active_only } = req.query;

    // Get user's couple_id
    const { data: profile } = await supabaseAdmin
      .from("Couples_profiles")
      .select("couple_id")
      .eq("id", authResult.userId)
      .single();

    if (!profile?.couple_id) {
      return res.status(400).json({ error: "User is not part of a couple" });
    }

    let query = supabaseAdmin
      .from("Couples_financial_goals")
      .select("*")
      .eq("couple_id", profile.couple_id);

    if (active_only === "true") {
      query = query.eq("is_achieved", false);
    }

    const { data, error } = await query.order("created_at", {
      ascending: false,
    });

    if (error) throw error;

    res.json(data);
  } catch (error: any) {
    console.error("Error fetching financial goals:", error);
    res.status(500).json({ error: error.message || "Failed to fetch goals" });
  }
});

// PATCH /goals/:id - Update financial goal progress
router.patch("/goals/:id", async (req, res) => {
  try {
    const authResult = await verifyUserSession(req);
    if (!authResult.success) {
      return res.status(authResult.status).json({ error: authResult.error });
    }

    const { id } = req.params;
    const { current_amount, is_achieved } = req.body;

    // Get user's couple_id
    const { data: profile } = await supabaseAdmin
      .from("Couples_profiles")
      .select("couple_id")
      .eq("id", authResult.userId)
      .single();

    if (!profile?.couple_id) {
      return res.status(400).json({ error: "User is not part of a couple" });
    }

    // Verify goal belongs to couple
    const { data: goal } = await supabaseAdmin
      .from("Couples_financial_goals")
      .select("couple_id")
      .eq("id", id)
      .single();

    if (!goal || goal.couple_id !== profile.couple_id) {
      return res.status(403).json({ error: "Access denied" });
    }

    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (current_amount !== undefined) {
      if (current_amount < 0) {
        return res.status(400).json({ error: "Amount cannot be negative" });
      }
      updateData.current_amount = current_amount;
    }

    if (is_achieved !== undefined) {
      updateData.is_achieved = is_achieved;
    }

    const { data, error } = await supabaseAdmin
      .from("Couples_financial_goals")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    res.json(data);
  } catch (error: any) {
    console.error("Error updating financial goal:", error);
    res.status(500).json({ error: error.message || "Failed to update goal" });
  }
});

// POST /discussions - Log a financial discussion
router.post("/discussions", async (req, res) => {
  try {
    const authResult = await verifyUserSession(req);
    if (!authResult.success) {
      return res.status(authResult.status).json({ error: authResult.error });
    }

    const { discussion_topic, decisions_made, follow_up_needed } = req.body;

    if (!discussion_topic) {
      return res.status(400).json({ error: "Discussion topic is required" });
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
      .from("Couples_financial_discussions")
      .insert({
        couple_id: profile.couple_id,
        discussion_topic,
        decisions_made: decisions_made || null,
        follow_up_needed: follow_up_needed || false,
      })
      .select()
      .single();

    if (error) throw error;

    res.json(data);
  } catch (error: any) {
    console.error("Error creating discussion log:", error);
    res
      .status(500)
      .json({ error: error.message || "Failed to create discussion" });
  }
});

// GET /discussions - Get couple's financial discussions
router.get("/discussions", async (req, res) => {
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
      .from("Couples_financial_discussions")
      .select("*")
      .eq("couple_id", profile.couple_id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    res.json(data);
  } catch (error: any) {
    console.error("Error fetching discussions:", error);
    res
      .status(500)
      .json({ error: error.message || "Failed to fetch discussions" });
  }
});

export default router;

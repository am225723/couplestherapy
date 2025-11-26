import { Router } from "express";
import type { Request, Response } from "express";
import { supabaseAdmin } from "../supabase.js";
import { z } from "zod";
import crypto from "crypto";
import { verifyTherapistSession } from "../helpers.js";
import { generateCoupleReport } from "../csv-export.js";

const therapistRouter = Router();

// ==============================================
// VALIDATION SCHEMAS
// ==============================================

const createCoupleSchema = z.object({
  partner1_email: z.string().email(),
  partner1_password: z.string().min(6),
  partner1_name: z.string().min(1),
  partner2_email: z.string().email(),
  partner2_password: z.string().min(6),
  partner2_name: z.string().min(1),
});

const createTherapistSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  full_name: z.string().min(1),
});

// ==============================================
// THERAPIST ENDPOINTS
// ==============================================

// GET /export-couple-report - Export couple data as CSV
therapistRouter.get(
  "/export-couple-report",
  async (req: Request, res: Response) => {
    try {
      // Verify therapist session and get therapist ID from authenticated session
      const authResult = await verifyTherapistSession(req);
      if (!authResult.success) {
        return res.status(authResult.status).json({ error: authResult.error });
      }

      const therapistId = authResult.therapistId;
      const coupleId = req.query.couple_id as string;
      const format = req.query.format as string;

      // Validate required parameters
      if (!coupleId) {
        return res.status(400).json({
          error: "couple_id is required",
        });
      }

      if (format && format !== "csv") {
        return res.status(400).json({
          error: "Only CSV format is currently supported",
        });
      }

      // 1. Validate therapist has access to this couple
      const { data: couple, error: coupleError } = await supabaseAdmin
        .from("Couples_couples")
        .select("*")
        .eq("id", coupleId)
        .single();

      if (coupleError || !couple) {
        return res.status(404).json({ error: "Couple not found" });
      }

      if (couple.therapist_id !== therapistId) {
        return res.status(403).json({
          error: "Unauthorized: You don't have access to this couple's data",
        });
      }

      // 2. Fetch all necessary data in parallel
      const [
        { data: profiles },
        { data: therapistProfile },
        { data: checkins },
        { data: gratitudeLogs },
        { data: sharedGoals },
        { data: conversations },
        { data: rituals },
      ] = await Promise.all([
        supabaseAdmin
          .from("Couples_profiles")
          .select("*")
          .in("id", [couple.partner1_id, couple.partner2_id]),
        supabaseAdmin
          .from("Couples_profiles")
          .select("full_name")
          .eq("id", therapistId)
          .single(),
        supabaseAdmin
          .from("Couples_weekly_checkins")
          .select("*")
          .eq("couple_id", coupleId)
          .order("year", { ascending: true })
          .order("week_number", { ascending: true }),
        supabaseAdmin
          .from("Couples_gratitude_logs")
          .select("*")
          .eq("couple_id", coupleId)
          .order("created_at", { ascending: true }),
        supabaseAdmin
          .from("Couples_shared_goals")
          .select("*")
          .eq("couple_id", coupleId)
          .order("created_at", { ascending: true }),
        supabaseAdmin
          .from("Couples_conversations")
          .select("*")
          .eq("couple_id", coupleId)
          .order("created_at", { ascending: true }),
        supabaseAdmin
          .from("Couples_rituals")
          .select("*")
          .eq("couple_id", coupleId),
      ]);

      // 3. Organize profiles
      const partner1 = profiles?.find((p) => p.id === couple.partner1_id);
      const partner2 = profiles?.find((p) => p.id === couple.partner2_id);

      if (!partner1 || !partner2) {
        return res.status(500).json({
          error: "Failed to retrieve partner profiles",
        });
      }

      // 4. Transform data for CSV generation
      const reportData = {
        couple: {
          id: coupleId,
          partner1_name: partner1.full_name || "Partner 1",
          partner2_name: partner2.full_name || "Partner 2",
          therapist_name: therapistProfile?.full_name || "Therapist",
        },
        weeklyCheckins: (checkins || []).map((checkin) => ({
          week_number: checkin.week_number,
          year: checkin.year,
          created_at: checkin.created_at,
          partner: (checkin.user_id === couple.partner1_id ? 1 : 2) as 1 | 2,
          q_connectedness: checkin.q_connectedness,
          q_conflict: checkin.q_conflict,
          q_appreciation: checkin.q_appreciation,
          q_regrettable_incident: checkin.q_regrettable_incident,
          q_my_need: checkin.q_my_need,
        })),
        gratitudeLogs: (gratitudeLogs || []).map((log) => ({
          created_at: log.created_at,
          partner: (log.user_id === couple.partner1_id ? 1 : 2) as 1 | 2,
          text_content: log.text_content,
          image_url: log.image_url,
        })),
        sharedGoals: (sharedGoals || []).map((goal) => ({
          title: goal.title,
          status: goal.status,
          created_at: goal.created_at,
          completed_at: goal.completed_at || null,
        })),
        conversations: (conversations || []).map((conv) => ({
          conversation_type: conv.conversation_type || "Hold Me Tight",
          created_at: conv.created_at,
          notes_summary: [
            conv.initiator_statement_feel,
            conv.initiator_statement_need,
            conv.partner_reflection,
            conv.partner_response,
          ]
            .filter(Boolean)
            .join(" | "),
        })),
        rituals: (rituals || []).map((ritual) => ({
          category: ritual.category,
          description: ritual.description,
          created_at: ritual.created_at,
        })),
      };

      // 5. Generate CSV
      const csvContent = generateCoupleReport(reportData);

      // 6. Set headers for file download
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="couple-report-${coupleId}-${Date.now()}.csv"`,
      );

      // 7. Send CSV
      res.send(csvContent);
    } catch (error: any) {
      console.error("CSV Export error:", error);
      res.status(500).json({
        error: error.message || "Failed to generate CSV export",
      });
    }
  },
);

// POST /create-couple - Create a new couple with both partners
therapistRouter.post("/create-couple", async (req: Request, res: Response) => {
  try {
    // Verify session and therapist authorization
    const authResult = await verifyTherapistSession(req);
    if (!authResult.success) {
      return res.status(authResult.status).json({ error: authResult.error });
    }

    const therapistId = authResult.therapistId;

    // Validate request body (therapist_id no longer accepted from client)
    const validatedData = createCoupleSchema.parse(req.body);

    // Create auth user for Partner 1
    const { data: partner1Auth, error: partner1AuthError } =
      await supabaseAdmin.auth.admin.createUser({
        email: validatedData.partner1_email,
        password: validatedData.partner1_password,
        email_confirm: true,
      });

    if (partner1AuthError) {
      return res
        .status(400)
        .json({
          error: `Failed to create Partner 1: ${partner1AuthError.message}`,
        });
    }

    // Create auth user for Partner 2
    const { data: partner2Auth, error: partner2AuthError } =
      await supabaseAdmin.auth.admin.createUser({
        email: validatedData.partner2_email,
        password: validatedData.partner2_password,
        email_confirm: true,
      });

    if (partner2AuthError) {
      // Rollback: delete partner1 if partner2 creation fails
      await supabaseAdmin.auth.admin.deleteUser(partner1Auth.user.id);
      return res
        .status(400)
        .json({
          error: `Failed to create Partner 2: ${partner2AuthError.message}`,
        });
    }

    // Create couple record using authenticated therapist's ID
    const { data: couple, error: coupleError } = await supabaseAdmin
      .from("Couples_couples")
      .insert({
        partner1_id: partner1Auth.user.id,
        partner2_id: partner2Auth.user.id,
        therapist_id: therapistId,
      })
      .select()
      .single();

    if (coupleError) {
      // Rollback: delete both users
      await supabaseAdmin.auth.admin.deleteUser(partner1Auth.user.id);
      await supabaseAdmin.auth.admin.deleteUser(partner2Auth.user.id);
      return res
        .status(500)
        .json({ error: `Failed to create couple: ${coupleError.message}` });
    }

    // Generate join code from couple ID
    const joinCode = couple.id.substring(0, 8).toUpperCase();

    // Update couple with join_code
    const { error: joinCodeError } = await supabaseAdmin
      .from("Couples_couples")
      .update({ join_code: joinCode })
      .eq("id", couple.id);

    if (joinCodeError) {
      console.error("Failed to update join_code:", joinCodeError);
    }

    // Create profile for Partner 1
    const { error: profile1Error } = await supabaseAdmin
      .from("Couples_profiles")
      .insert({
        id: partner1Auth.user.id,
        full_name: validatedData.partner1_name,
        role: "client",
        couple_id: couple.id,
      });

    if (profile1Error) {
      console.error("Failed to create Partner 1 profile:", profile1Error);
    }

    // Create profile for Partner 2
    const { error: profile2Error } = await supabaseAdmin
      .from("Couples_profiles")
      .insert({
        id: partner2Auth.user.id,
        full_name: validatedData.partner2_name,
        role: "client",
        couple_id: couple.id,
      });

    if (profile2Error) {
      console.error("Failed to create Partner 2 profile:", profile2Error);
    }

    res.json({
      success: true,
      couple: {
        id: couple.id,
        join_code: joinCode,
        partner1_id: partner1Auth.user.id,
        partner1_email: validatedData.partner1_email,
        partner1_name: validatedData.partner1_name,
        partner2_id: partner2Auth.user.id,
        partner2_email: validatedData.partner2_email,
        partner2_name: validatedData.partner2_name,
      },
    });
  } catch (error: any) {
    console.error("Create couple error:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    res.status(500).json({ error: error.message || "Failed to create couple" });
  }
});

// POST /create-therapist - Create a new therapist account
therapistRouter.post(
  "/create-therapist",
  async (req: Request, res: Response) => {
    try {
      // Verify session and therapist authorization
      const authResult = await verifyTherapistSession(req);
      if (!authResult.success) {
        return res.status(authResult.status).json({ error: authResult.error });
      }

      // Validate request body
      const validatedData = createTherapistSchema.parse(req.body);

      // Create auth user for the new therapist
      const { data: therapistAuth, error: therapistAuthError } =
        await supabaseAdmin.auth.admin.createUser({
          email: validatedData.email,
          password: validatedData.password,
          email_confirm: true,
        });

      if (therapistAuthError) {
        return res
          .status(400)
          .json({
            error: `Failed to create therapist auth: ${therapistAuthError.message}`,
          });
      }

      // Create profile with role='therapist'
      const { error: profileError } = await supabaseAdmin
        .from("Couples_profiles")
        .insert({
          id: therapistAuth.user.id,
          full_name: validatedData.full_name,
          role: "therapist",
          couple_id: null,
        });

      if (profileError) {
        // Rollback: delete auth user
        await supabaseAdmin.auth.admin.deleteUser(therapistAuth.user.id);
        return res
          .status(500)
          .json({
            error: `Failed to create therapist profile: ${profileError.message}`,
          });
      }

      res.json({
        success: true,
        therapist: {
          id: therapistAuth.user.id,
          email: validatedData.email,
          full_name: validatedData.full_name,
          role: "therapist",
        },
      });
    } catch (error: any) {
      console.error("Create therapist error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors[0].message });
      }
      res
        .status(500)
        .json({ error: error.message || "Failed to create therapist" });
    }
  },
);

// GET /my-couples - Get all couples assigned to current therapist
therapistRouter.get("/my-couples", async (req: Request, res: Response) => {
  try {
    // Verify session and therapist authorization
    const authResult = await verifyTherapistSession(req);
    if (!authResult.success) {
      return res.status(authResult.status).json({ error: authResult.error });
    }

    const { therapistId } = authResult;

    // Get all couples for this therapist
    const { data: couples, error: couplesError } = await supabaseAdmin
      .from("Couples_couples")
      .select("id, partner1_id, partner2_id, join_code")
      .eq("therapist_id", therapistId);

    if (couplesError) {
      console.error("Error fetching couples:", couplesError);
      return res.status(500).json({ error: "Failed to fetch couples" });
    }

    if (!couples || couples.length === 0) {
      return res.json({ couples: [] });
    }

    // Get all partner profiles
    const partnerIds = couples
      .flatMap((c) => [c.partner1_id, c.partner2_id])
      .filter(Boolean);

    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from("Couples_profiles")
      .select("id, full_name")
      .in("id", partnerIds);

    if (profilesError) {
      console.error("Error fetching profiles:", profilesError);
      return res
        .status(500)
        .json({ error: "Failed to fetch partner profiles" });
    }

    // Map couples with partner names
    const couplesWithNames = couples.map((couple) => {
      const partner1 = profiles?.find((p) => p.id === couple.partner1_id);
      const partner2 = profiles?.find((p) => p.id === couple.partner2_id);

      return {
        couple_id: couple.id,
        partner1_name: partner1?.full_name || "Partner 1",
        partner2_name: partner2?.full_name || "Partner 2",
        join_code: couple.join_code || "",
      };
    });

    res.json({ couples: couplesWithNames });
  } catch (error: any) {
    console.error("Get my couples error:", error);
    res.status(500).json({ error: error.message || "Failed to fetch couples" });
  }
});

// POST /regenerate-join-code - Regenerate join code for a couple
therapistRouter.post(
  "/regenerate-join-code",
  async (req: Request, res: Response) => {
    try {
      // Verify session and therapist authorization
      const authResult = await verifyTherapistSession(req);
      if (!authResult.success) {
        return res.status(authResult.status).json({ error: authResult.error });
      }

      const { therapistId } = authResult;
      const { couple_id } = req.body;

      if (!couple_id) {
        return res.status(400).json({ error: "couple_id is required" });
      }

      // Verify this couple belongs to the therapist
      const { data: couple, error: coupleError } = await supabaseAdmin
        .from("Couples_couples")
        .select("therapist_id")
        .eq("id", couple_id)
        .single();

      if (coupleError || !couple) {
        return res.status(404).json({ error: "Couple not found" });
      }

      if (couple.therapist_id !== therapistId) {
        return res
          .status(403)
          .json({
            error: "You can only regenerate join codes for your own couples",
          });
      }

      // Generate new 8-character join code (first 8 chars of UUID)
      const newJoinCode = crypto
        .randomUUID()
        .replace(/-/g, "")
        .slice(0, 8)
        .toUpperCase();

      // Update the join code
      const { error: updateError } = await supabaseAdmin
        .from("Couples_couples")
        .update({ join_code: newJoinCode })
        .eq("id", couple_id);

      if (updateError) {
        console.error("Error updating join code:", updateError);
        return res
          .status(500)
          .json({ error: "Failed to regenerate join code" });
      }

      res.json({ join_code: newJoinCode });
    } catch (error: any) {
      console.error("Regenerate join code error:", error);
      res
        .status(500)
        .json({ error: error.message || "Failed to regenerate join code" });
    }
  },
);

// GET /unassigned-couples - Get couples without a therapist
therapistRouter.get(
  "/unassigned-couples",
  async (req: Request, res: Response) => {
    try {
      // Verify session and therapist authorization
      const authResult = await verifyTherapistSession(req);
      if (!authResult.success) {
        return res.status(authResult.status).json({ error: authResult.error });
      }

      // Get all couples without a therapist
      const { data: couples, error: couplesError } = await supabaseAdmin
        .from("Couples_couples")
        .select("id, partner1_id, partner2_id, join_code")
        .is("therapist_id", null);

      if (couplesError) {
        console.error("Error fetching unassigned couples:", couplesError);
        return res
          .status(500)
          .json({ error: "Failed to fetch unassigned couples" });
      }

      if (!couples || couples.length === 0) {
        return res.json({ couples: [] });
      }

      // Get all partner profiles
      const partnerIds = couples
        .flatMap((c) => [c.partner1_id, c.partner2_id])
        .filter(Boolean);

      const { data: profiles, error: profilesError } = await supabaseAdmin
        .from("Couples_profiles")
        .select("id, full_name")
        .in("id", partnerIds);

      if (profilesError) {
        console.error("Error fetching profiles:", profilesError);
        return res
          .status(500)
          .json({ error: "Failed to fetch partner profiles" });
      }

      // Map couples with partner names
      const couplesWithNames = couples.map((couple) => {
        const partner1 = profiles?.find((p) => p.id === couple.partner1_id);
        const partner2 = profiles?.find((p) => p.id === couple.partner2_id);

        return {
          couple_id: couple.id,
          partner1_name: partner1?.full_name || "Partner 1",
          partner2_name: partner2?.full_name || "Partner 2",
          join_code: couple.join_code || "",
        };
      });

      res.json({ couples: couplesWithNames });
    } catch (error: any) {
      console.error("Get unassigned couples error:", error);
      res
        .status(500)
        .json({ error: error.message || "Failed to fetch unassigned couples" });
    }
  },
);

// POST /link-couple - Link a couple to the current therapist (also called assign-therapist)
therapistRouter.post("/link-couple", async (req: Request, res: Response) => {
  try {
    // Verify session and therapist authorization
    const authResult = await verifyTherapistSession(req);
    if (!authResult.success) {
      return res.status(authResult.status).json({ error: authResult.error });
    }

    const { therapistId } = authResult;
    const { couple_id } = req.body;

    if (!couple_id) {
      return res.status(400).json({ error: "couple_id is required" });
    }

    // Verify couple exists and is unassigned
    const { data: couple, error: coupleError } = await supabaseAdmin
      .from("Couples_couples")
      .select("therapist_id")
      .eq("id", couple_id)
      .single();

    if (coupleError || !couple) {
      return res.status(404).json({ error: "Couple not found" });
    }

    if (couple.therapist_id) {
      return res
        .status(400)
        .json({ error: "This couple is already assigned to a therapist" });
    }

    // Link the couple to this therapist
    const { error: updateError } = await supabaseAdmin
      .from("Couples_couples")
      .update({ therapist_id: therapistId })
      .eq("id", couple_id);

    if (updateError) {
      console.error("Error linking couple:", updateError);
      return res.status(500).json({ error: "Failed to link couple" });
    }

    res.json({
      success: true,
      message: "Couple successfully linked to your account",
    });
  } catch (error: any) {
    console.error("Link couple error:", error);
    res.status(500).json({ error: error.message || "Failed to link couple" });
  }
});

export default therapistRouter;

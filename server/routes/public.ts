import { Router } from "express";
import { supabaseAdmin } from "../supabase.js";
import { z } from "zod";

const router = Router();

const coupleWithInvitationSchema = z
  .object({
    invitation_code: z.string().min(1),
    partner1_email: z.string().email(),
    partner1_password: z.string().min(8),
    partner1_name: z.string().min(1),
    partner2_email: z.string().email(),
    partner2_password: z.string().min(8),
    partner2_name: z.string().min(1),
  })
  .refine((data) => data.partner1_email !== data.partner2_email, {
    message: "Partners must have different email addresses",
  });

// POST /register-couple - Secure couple registration with invitation code
router.post("/register-couple", async (req, res) => {
  try {
    // Validate request body
    const validatedData = coupleWithInvitationSchema.parse(req.body);

    // Step 1: Validate invitation code (using service role for security)
    const { data: invitation, error: codeError } = await supabaseAdmin
      .from("Couples_invitation_codes")
      .select("id, therapist_id, is_active, used_at, expires_at")
      .eq("code", validatedData.invitation_code.trim().toUpperCase())
      .single();

    if (codeError || !invitation) {
      return res.status(400).json({ error: "Invalid invitation code" });
    }

    if (!invitation.is_active || invitation.used_at) {
      return res
        .status(400)
        .json({ error: "This invitation code has already been used" });
    }

    // Check expiration
    if (invitation.expires_at && new Date(invitation.expires_at) < new Date()) {
      return res
        .status(400)
        .json({ error: "This invitation code has expired" });
    }

    // Step 2: Create Partner 1 account
    const { data: partner1Auth, error: partner1Error } =
      await supabaseAdmin.auth.admin.createUser({
        email: validatedData.partner1_email,
        password: validatedData.partner1_password,
        email_confirm: true,
      });

    if (partner1Error) {
      return res.status(400).json({
        error: `Failed to create Partner 1: ${partner1Error.message}`,
      });
    }

    // Step 3: Create Partner 2 account
    const { data: partner2Auth, error: partner2Error } =
      await supabaseAdmin.auth.admin.createUser({
        email: validatedData.partner2_email,
        password: validatedData.partner2_password,
        email_confirm: true,
      });

    if (partner2Error) {
      // Rollback: delete partner1
      await supabaseAdmin.auth.admin.deleteUser(partner1Auth.user.id);
      return res.status(400).json({
        error: `Failed to create Partner 2: ${partner2Error.message}`,
      });
    }

    // Step 4: Create couple record
    const { data: couple, error: coupleError } = await supabaseAdmin
      .from("Couples_couples")
      .insert({
        partner1_id: partner1Auth.user.id,
        partner2_id: partner2Auth.user.id,
        therapist_id: invitation.therapist_id,
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

    // Step 5: Create profiles for both partners
    const { error: profile1Error } = await supabaseAdmin
      .from("Couples_profiles")
      .insert({
        id: partner1Auth.user.id,
        full_name: validatedData.partner1_name,
        role: "client",
        couple_id: couple.id,
      });

    if (profile1Error) {
      // Rollback: delete couple and both users
      await supabaseAdmin.from("Couples_couples").delete().eq("id", couple.id);
      await supabaseAdmin.auth.admin.deleteUser(partner1Auth.user.id);
      await supabaseAdmin.auth.admin.deleteUser(partner2Auth.user.id);
      return res.status(500).json({
        error: `Failed to create Partner 1 profile: ${profile1Error.message}`,
      });
    }

    const { error: profile2Error } = await supabaseAdmin
      .from("Couples_profiles")
      .insert({
        id: partner2Auth.user.id,
        full_name: validatedData.partner2_name,
        role: "client",
        couple_id: couple.id,
      });

    if (profile2Error) {
      // Rollback: delete couple, profile1, and both users
      await supabaseAdmin
        .from("Couples_profiles")
        .delete()
        .eq("id", partner1Auth.user.id);
      await supabaseAdmin.from("Couples_couples").delete().eq("id", couple.id);
      await supabaseAdmin.auth.admin.deleteUser(partner1Auth.user.id);
      await supabaseAdmin.auth.admin.deleteUser(partner2Auth.user.id);
      return res.status(500).json({
        error: `Failed to create Partner 2 profile: ${profile2Error.message}`,
      });
    }

    // Step 6: Mark invitation code as used
    const { error: updateCodeError } = await supabaseAdmin
      .from("Couples_invitation_codes")
      .update({
        used_at: new Date().toISOString(),
        used_by_couple_id: couple.id,
        is_active: false,
      })
      .eq("id", invitation.id);

    if (updateCodeError) {
      console.error("Failed to mark invitation code as used:", updateCodeError);
      // Don't rollback - couple is created successfully, just log the error
    }

    res.json({
      success: true,
      message: "Couple registered successfully",
      couple: {
        id: couple.id,
        partner1_name: validatedData.partner1_name,
        partner2_name: validatedData.partner2_name,
      },
    });
  } catch (error: any) {
    console.error("Couple registration error:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    res
      .status(500)
      .json({ error: error.message || "Failed to register couple" });
  }
});

export default router;

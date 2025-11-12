import { Router } from "express";
import { verifyUserSession } from "../helpers.js";
import { supabaseAdmin } from "../supabase.js";

const router = Router();

router.get("/partner", async (req, res) => {
  try {
    const authResult = await verifyUserSession(req);
    if (!authResult.success) {
      return res.status(authResult.status).json({ error: authResult.error });
    }

    const { partnerId } = authResult;

    const { data: partnerProfile, error } = await supabaseAdmin
      .from('Couples_profiles')
      .select('*')
      .eq('id', partnerId)
      .single();

    if (error) {
      throw error;
    }

    if (!partnerProfile) {
      return res.status(404).json({ error: 'Partner profile not found' });
    }

    res.json(partnerProfile);
  } catch (error: any) {
    console.error('Error fetching partner profile:', error.message, error.stack);
    res.status(500).json({ error: error.message || 'Failed to fetch partner profile' });
  }
});

export default router;

import { Router } from "express";
import { supabaseAdmin } from "../supabase.js";
import { verifyUserSession, verifyTherapistSession } from "../helpers.js";

const router = Router();

// POST / - Create a new horsemen incident
router.post("/incident", async (req, res) => {
  try {
    const userAuth = await verifyUserSession(req);
    if (!userAuth.success) {
      return res.status(userAuth.status).json({ error: userAuth.error });
    }

    const { horseman_type, situation, notes } = req.body;

    if (!horseman_type || !['criticism', 'contempt', 'defensiveness', 'stonewalling'].includes(horseman_type)) {
      return res.status(400).json({ error: 'Valid horseman_type is required' });
    }

    const { data, error } = await supabaseAdmin
      .from('Couples_horsemen_incidents')
      .insert({
        couple_id: userAuth.coupleId,
        reporter_id: userAuth.userId,
        horseman_type,
        situation,
        notes,
      })
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    console.error('Error creating horsemen incident:', error);
    res.status(500).json({ error: error.message || 'Failed to create incident' });
  }
});

// GET /:couple_id - Get all horsemen incidents for a couple
router.get("/:couple_id", async (req, res) => {
  try {
    const userAuth = await verifyUserSession(req);
    if (!userAuth.success) {
      return res.status(userAuth.status).json({ error: userAuth.error });
    }

    const { couple_id } = req.params;

    if (couple_id !== userAuth.coupleId) {
      return res.status(403).json({ error: 'Cannot view different couple incidents' });
    }

    const { data, error } = await supabaseAdmin
      .from('Couples_horsemen_incidents')
      .select('*')
      .eq('couple_id', couple_id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    console.error('Error fetching horsemen incidents:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch incidents' });
  }
});

// PATCH /:id/validate - Partner validates an incident
router.patch("/:id/validate", async (req, res) => {
  try {
    const userAuth = await verifyUserSession(req);
    if (!userAuth.success) {
      return res.status(userAuth.status).json({ error: userAuth.error });
    }

    const { id } = req.params;
    const { partner_validated } = req.body;

    const { data, error } = await supabaseAdmin
      .from('Couples_horsemen_incidents')
      .update({ partner_validated })
      .eq('id', id)
      .eq('couple_id', userAuth.coupleId)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    console.error('Error validating incident:', error);
    res.status(500).json({ error: error.message || 'Failed to validate incident' });
  }
});

// PATCH /:id/antidote - Mark antidote as practiced
router.patch("/:id/antidote", async (req, res) => {
  try {
    const userAuth = await verifyUserSession(req);
    if (!userAuth.success) {
      return res.status(userAuth.status).json({ error: userAuth.error });
    }

    const { id } = req.params;
    const { antidote_practiced } = req.body;

    const { data, error } = await supabaseAdmin
      .from('Couples_horsemen_incidents')
      .update({ antidote_practiced })
      .eq('id', id)
      .eq('couple_id', userAuth.coupleId)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    console.error('Error updating antidote:', error);
    res.status(500).json({ error: error.message || 'Failed to update antidote' });
  }
});

// GET /couple/:couple_id - THERAPIST: Get all incidents for a couple
router.get("/couple/:couple_id", async (req, res) => {
  try {
    const therapistAuth = await verifyTherapistSession(req);
    if (!therapistAuth.success) {
      return res.status(therapistAuth.status).json({ error: therapistAuth.error });
    }

    const { couple_id } = req.params;

    // Verify couple is assigned to this therapist
    const { data: couple } = await supabaseAdmin
      .from('Couples_couples')
      .select('therapist_id')
      .eq('id', couple_id)
      .single();

    if (!couple || couple.therapist_id !== therapistAuth.therapistId) {
      return res.status(403).json({ error: 'Not authorized to view this couple' });
    }

    // Fetch all Four Horsemen incidents
    const { data, error } = await supabaseAdmin
      .from('Couples_four_horsemen')
      .select('*')
      .eq('couple_id', couple_id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    console.error('Error fetching Four Horsemen data:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

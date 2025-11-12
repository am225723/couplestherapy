import { Router } from "express";
import { supabaseAdmin } from "../supabase.js";
import { verifyUserSession, verifyTherapistSession } from "../helpers.js";

const router = Router();

// POST /style - Create/update parenting style
router.post("/style", async (req, res) => {
  try {
    const userAuth = await verifyUserSession(req);
    if (!userAuth.success) {
      return res.status(userAuth.status).json({ error: userAuth.error });
    }

    const { style_type, discipline_approach, values_text, stress_areas } = req.body;

    const { data, error } = await supabaseAdmin
      .from('Couples_parenting_styles')
      .upsert({
        couple_id: userAuth.coupleId,
        user_id: userAuth.userId,
        style_type,
        discipline_approach,
        values_text,
        stress_areas,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    console.error('Error saving parenting style:', error);
    res.status(500).json({ error: error.message || 'Failed to save style' });
  }
});

// GET /styles/:couple_id - Get parenting styles
router.get("/styles/:couple_id", async (req, res) => {
  try {
    const userAuth = await verifyUserSession(req);
    if (!userAuth.success) {
      return res.status(userAuth.status).json({ error: userAuth.error });
    }

    const { couple_id } = req.params;

    if (couple_id !== userAuth.coupleId) {
      return res.status(403).json({ error: 'Cannot view different couple parenting styles' });
    }

    const { data, error } = await supabaseAdmin
      .from('Couples_parenting_styles')
      .select('*')
      .eq('couple_id', couple_id);

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    console.error('Error fetching parenting styles:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch styles' });
  }
});

// POST /agreement - Create discipline agreement
router.post("/agreement", async (req, res) => {
  try {
    const userAuth = await verifyUserSession(req);
    if (!userAuth.success) {
      return res.status(userAuth.status).json({ error: userAuth.error });
    }

    const { scenario, agreed_approach } = req.body;

    if (!scenario || !agreed_approach) {
      return res.status(400).json({ error: 'scenario and agreed_approach are required' });
    }

    const { data, error } = await supabaseAdmin
      .from('Couples_discipline_agreements')
      .insert({
        couple_id: userAuth.coupleId,
        scenario,
        agreed_approach,
      })
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    console.error('Error creating discipline agreement:', error);
    res.status(500).json({ error: error.message || 'Failed to create agreement' });
  }
});

// GET /agreements/:couple_id - Get discipline agreements
router.get("/agreements/:couple_id", async (req, res) => {
  try {
    const userAuth = await verifyUserSession(req);
    if (!userAuth.success) {
      return res.status(userAuth.status).json({ error: userAuth.error });
    }

    const { couple_id } = req.params;

    if (couple_id !== userAuth.coupleId) {
      return res.status(403).json({ error: 'Cannot view different couple agreements' });
    }

    const { data, error } = await supabaseAdmin
      .from('Couples_discipline_agreements')
      .select('*')
      .eq('couple_id', couple_id)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    console.error('Error fetching discipline agreements:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch agreements' });
  }
});

// POST /couple-time - Schedule couple time
router.post("/couple-time", async (req, res) => {
  try {
    const userAuth = await verifyUserSession(req);
    if (!userAuth.success) {
      return res.status(userAuth.status).json({ error: userAuth.error });
    }

    const { scheduled_date, duration_minutes, activity } = req.body;

    if (!scheduled_date) {
      return res.status(400).json({ error: 'scheduled_date is required' });
    }

    const { data, error } = await supabaseAdmin
      .from('Couples_couple_time_blocks')
      .insert({
        couple_id: userAuth.coupleId,
        scheduled_date,
        duration_minutes: duration_minutes || 60,
        activity,
      })
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    console.error('Error scheduling couple time:', error);
    res.status(500).json({ error: error.message || 'Failed to schedule time' });
  }
});

// GET /couple-time/:couple_id - Get couple time blocks
router.get("/couple-time/:couple_id", async (req, res) => {
  try {
    const userAuth = await verifyUserSession(req);
    if (!userAuth.success) {
      return res.status(userAuth.status).json({ error: userAuth.error });
    }

    const { couple_id } = req.params;

    if (couple_id !== userAuth.coupleId) {
      return res.status(403).json({ error: 'Cannot view different couple time blocks' });
    }

    const { data, error } = await supabaseAdmin
      .from('Couples_couple_time_blocks')
      .select('*')
      .eq('couple_id', couple_id)
      .order('scheduled_date', { ascending: true });

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    console.error('Error fetching couple time:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch couple time' });
  }
});

// POST /stress-checkin - Submit parenting stress check-in
router.post("/stress-checkin", async (req, res) => {
  try {
    const userAuth = await verifyUserSession(req);
    if (!userAuth.success) {
      return res.status(userAuth.status).json({ error: userAuth.error });
    }

    const { stress_level, stressor_text, support_needed } = req.body;

    if (!stress_level || stress_level < 1 || stress_level > 10) {
      return res.status(400).json({ error: 'Valid stress_level (1-10) is required' });
    }

    const { data, error } = await supabaseAdmin
      .from('Couples_parenting_stress_checkins')
      .insert({
        couple_id: userAuth.coupleId,
        user_id: userAuth.userId,
        stress_level,
        stressor_text,
        support_needed,
      })
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    console.error('Error submitting stress check-in:', error);
    res.status(500).json({ error: error.message || 'Failed to submit check-in' });
  }
});

// GET /stress-checkins/:couple_id - Get parenting stress check-ins
router.get("/stress-checkins/:couple_id", async (req, res) => {
  try {
    const userAuth = await verifyUserSession(req);
    if (!userAuth.success) {
      return res.status(userAuth.status).json({ error: userAuth.error });
    }

    const { couple_id } = req.params;

    if (couple_id !== userAuth.coupleId) {
      return res.status(403).json({ error: 'Cannot view different couple stress check-ins' });
    }

    const { data, error } = await supabaseAdmin
      .from('Couples_parenting_stress_checkins')
      .select('*')
      .eq('couple_id', couple_id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    console.error('Error fetching stress check-ins:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch check-ins' });
  }
});

// GET /couple/:couple_id - THERAPIST ENDPOINT - Get agreements and stress check-ins for a couple
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

    // Fetch agreements and stress check-ins in parallel
    const [
      { data: agreements, error: agreementsError },
      { data: stressCheckins, error: checkinsError }
    ] = await Promise.all([
      supabaseAdmin
        .from('Couples_parenting_agreements')
        .select('*')
        .eq('couple_id', couple_id)
        .order('created_at', { ascending: false }),
      supabaseAdmin
        .from('Couples_parenting_stress_checkins')
        .select('*')
        .eq('couple_id', couple_id)
        .order('created_at', { ascending: false })
    ]);

    if (agreementsError) throw agreementsError;
    if (checkinsError) throw checkinsError;

    res.json({
      agreements: agreements || [],
      stressCheckins: stressCheckins || []
    });
  } catch (error: any) {
    console.error('Error fetching Parenting as Partners data:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

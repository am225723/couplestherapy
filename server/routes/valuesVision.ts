import { Router } from "express";
import { supabaseAdmin } from "../supabase.js";
import { verifyUserSession, verifyTherapistSession } from "../helpers.js";

const router = Router();

// POST /dreams - Create a shared dream
router.post("/dreams", async (req, res) => {
  try {
    const userAuth = await verifyUserSession(req);
    if (!userAuth.success) {
      return res.status(userAuth.status).json({ error: userAuth.error });
    }

    const { dream_text, category, time_horizon } = req.body;

    if (!dream_text) {
      return res.status(400).json({ error: 'dream_text is required' });
    }

    const { data, error } = await supabaseAdmin
      .from('Couples_shared_dreams')
      .insert({
        couple_id: userAuth.coupleId,
        author_id: userAuth.userId,
        dream_text,
        category,
        time_horizon,
      })
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    console.error('Error creating dream:', error);
    res.status(500).json({ error: error.message || 'Failed to create dream' });
  }
});

// GET /dreams/:couple_id - Get all dreams for a couple
router.get("/dreams/:couple_id", async (req, res) => {
  try {
    const userAuth = await verifyUserSession(req);
    if (!userAuth.success) {
      return res.status(userAuth.status).json({ error: userAuth.error });
    }

    const { couple_id } = req.params;

    if (couple_id !== userAuth.coupleId) {
      return res.status(403).json({ error: 'Cannot view different couple dreams' });
    }

    const { data, error } = await supabaseAdmin
      .from('Couples_shared_dreams')
      .select('*')
      .eq('couple_id', couple_id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    console.error('Error fetching dreams:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch dreams' });
  }
});

// PATCH /dreams/:id/honor - Partner honors a dream
router.patch("/dreams/:id/honor", async (req, res) => {
  try {
    const userAuth = await verifyUserSession(req);
    if (!userAuth.success) {
      return res.status(userAuth.status).json({ error: userAuth.error });
    }

    const { id } = req.params;

    const { data, error } = await supabaseAdmin
      .from('Couples_shared_dreams')
      .update({ partner_honored: true })
      .eq('id', id)
      .eq('couple_id', userAuth.coupleId)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    console.error('Error honoring dream:', error);
    res.status(500).json({ error: error.message || 'Failed to honor dream' });
  }
});

// POST /vision-board - Create a vision board item
router.post("/vision-board", async (req, res) => {
  try {
    const userAuth = await verifyUserSession(req);
    if (!userAuth.success) {
      return res.status(userAuth.status).json({ error: userAuth.error });
    }

    const { title, description, image_url, category, time_horizon } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'title is required' });
    }

    const { data, error } = await supabaseAdmin
      .from('Couples_vision_board_items')
      .insert({
        couple_id: userAuth.coupleId,
        title,
        description,
        image_url,
        category,
        time_horizon,
      })
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    console.error('Error creating vision board item:', error);
    res.status(500).json({ error: error.message || 'Failed to create item' });
  }
});

// GET /vision-board/:couple_id - Get vision board items
router.get("/vision-board/:couple_id", async (req, res) => {
  try {
    const userAuth = await verifyUserSession(req);
    if (!userAuth.success) {
      return res.status(userAuth.status).json({ error: userAuth.error });
    }

    const { couple_id } = req.params;

    if (couple_id !== userAuth.coupleId) {
      return res.status(403).json({ error: 'Cannot view different couple vision board' });
    }

    const { data, error } = await supabaseAdmin
      .from('Couples_vision_board_items')
      .select('*')
      .eq('couple_id', couple_id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    console.error('Error fetching vision board:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch vision board' });
  }
});

// POST /core-values - Create a core value
router.post("/core-values", async (req, res) => {
  try {
    const userAuth = await verifyUserSession(req);
    if (!userAuth.success) {
      return res.status(userAuth.status).json({ error: userAuth.error });
    }

    const { value_name, definition } = req.body;

    if (!value_name) {
      return res.status(400).json({ error: 'value_name is required' });
    }

    const { data, error } = await supabaseAdmin
      .from('Couples_core_values')
      .insert({
        couple_id: userAuth.coupleId,
        value_name,
        definition,
      })
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    console.error('Error creating core value:', error);
    res.status(500).json({ error: error.message || 'Failed to create value' });
  }
});

// GET /core-values/:couple_id - Get core values
router.get("/core-values/:couple_id", async (req, res) => {
  try {
    const userAuth = await verifyUserSession(req);
    if (!userAuth.success) {
      return res.status(userAuth.status).json({ error: userAuth.error });
    }

    const { couple_id } = req.params;

    if (couple_id !== userAuth.coupleId) {
      return res.status(403).json({ error: 'Cannot view different couple values' });
    }

    const { data, error } = await supabaseAdmin
      .from('Couples_core_values')
      .select('*')
      .eq('couple_id', couple_id)
      .order('created_at', { ascending: false});

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    console.error('Error fetching core values:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch values' });
  }
});

// GET /couple/:couple_id - THERAPIST ENDPOINT - Get dreams, values, and vision board items for a couple
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

    // Fetch dreams, values, and vision board items in parallel
    const [
      { data: dreams, error: dreamsError },
      { data: values, error: valuesError },
      { data: visionItems, error: visionError }
    ] = await Promise.all([
      supabaseAdmin
        .from('Couples_shared_dreams')
        .select('*')
        .eq('couple_id', couple_id)
        .order('created_at', { ascending: false }),
      supabaseAdmin
        .from('Couples_core_values')
        .select('*')
        .eq('couple_id', couple_id)
        .order('created_at', { ascending: false }),
      supabaseAdmin
        .from('Couples_vision_board')
        .select('*')
        .eq('couple_id', couple_id)
        .order('created_at', { ascending: false })
    ]);

    if (dreamsError) throw dreamsError;
    if (valuesError) throw valuesError;
    if (visionError) throw visionError;

    res.json({
      dreams: dreams || [],
      values: values || [],
      visionItems: visionItems || []
    });
  } catch (error: any) {
    console.error('Error fetching Values & Vision data:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

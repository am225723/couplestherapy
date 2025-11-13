import { Router } from "express";
import { supabaseAdmin } from "../supabase.js";
import { verifyTherapistSession, verifyUserSession } from "../helpers.js";

const router = Router();

// GET /questions - Get all enneagram questions
router.get("/questions", async (req, res) => {
  try {
    const authResult = await verifyUserSession(req);
    if (!authResult.success) {
      return res.status(authResult.status).json({ error: authResult.error });
    }

    const { data, error } = await supabaseAdmin
      .from('Couples_enneagram_questions')
      .select('*')
      .order('id');

    if (error) throw error;

    res.json(data);
  } catch (error: any) {
    console.error('Error fetching enneagram questions:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch questions' });
  }
});

// POST /sessions - Create a new assessment session
router.post("/sessions", async (req, res) => {
  try {
    const authResult = await verifyUserSession(req);
    if (!authResult.success) {
      return res.status(authResult.status).json({ error: authResult.error });
    }

    // Get user's couple_id from their profile
    const { data: profile } = await supabaseAdmin
      .from('Couples_profiles')
      .select('couple_id')
      .eq('id', authResult.userId)
      .single();

    if (!profile?.couple_id) {
      return res.status(400).json({ error: 'User is not part of a couple' });
    }

    const { data, error } = await supabaseAdmin
      .from('Couples_enneagram_sessions')
      .insert({
        user_id: authResult.userId,
        couple_id: profile.couple_id,
        is_completed: false
      })
      .select()
      .single();

    if (error) throw error;

    res.json(data);
  } catch (error: any) {
    console.error('Error creating enneagram session:', error);
    res.status(500).json({ error: error.message || 'Failed to create session' });
  }
});

// GET /sessions/my - Get user's sessions
router.get("/sessions/my", async (req, res) => {
  try {
    const authResult = await verifyUserSession(req);
    if (!authResult.success) {
      return res.status(authResult.status).json({ error: authResult.error });
    }

    const { data, error } = await supabaseAdmin
      .from('Couples_enneagram_sessions')
      .select('*')
      .eq('user_id', authResult.userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json(data);
  } catch (error: any) {
    console.error('Error fetching enneagram sessions:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch sessions' });
  }
});

// POST /responses - Save response to a question
router.post("/responses", async (req, res) => {
  try {
    const authResult = await verifyUserSession(req);
    if (!authResult.success) {
      return res.status(authResult.status).json({ error: authResult.error });
    }

    const { session_id, question_id, response_value } = req.body;

    // Verify the session belongs to the user
    const { data: session } = await supabaseAdmin
      .from('Couples_enneagram_sessions')
      .select('user_id')
      .eq('id', session_id)
      .single();

    if (!session || session.user_id !== authResult.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Validate response value
    if (!response_value || response_value < 1 || response_value > 5) {
      return res.status(400).json({ error: 'Response value must be between 1 and 5' });
    }

    const { data, error } = await supabaseAdmin
      .from('Couples_enneagram_responses')
      .upsert({
        session_id,
        question_id,
        response_value
      }, { onConflict: 'session_id,question_id' })
      .select()
      .single();

    if (error) throw error;

    res.json(data);
  } catch (error: any) {
    console.error('Error saving enneagram response:', error);
    res.status(500).json({ error: error.message || 'Failed to save response' });
  }
});

// POST /sessions/:id/complete - Complete session and calculate results
router.post("/sessions/:id/complete", async (req, res) => {
  try {
    const authResult = await verifyUserSession(req);
    if (!authResult.success) {
      return res.status(authResult.status).json({ error: authResult.error });
    }

    const { id } = req.params;

    // Verify the session belongs to the user
    const { data: session } = await supabaseAdmin
      .from('Couples_enneagram_sessions')
      .select('user_id, couple_id')
      .eq('id', id)
      .single();

    if (!session || session.user_id !== authResult.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get all responses for this session with question details
    const { data: responses } = await supabaseAdmin
      .from('Couples_enneagram_responses')
      .select(`
        response_value,
        Couples_enneagram_questions!inner (
          enneagram_type
        )
      `)
      .eq('session_id', id);

    if (!responses || responses.length < 30) {
      return res.status(400).json({ error: 'Not enough responses to calculate results' });
    }

    // Calculate scores for each type (1-9)
    const typeScores: { [key: number]: number } = {};
    const typeCounts: { [key: number]: number } = {};

    for (let i = 1; i <= 9; i++) {
      typeScores[i] = 0;
      typeCounts[i] = 0;
    }

    for (const response of responses) {
      const question = response.Couples_enneagram_questions as any;
      const type = question.enneagram_type;
      if (type) {
        typeScores[type] += response.response_value;
        typeCounts[type]++;
      }
    }

    // Normalize scores (average per type, scaled to 100)
    const normalizedScores: { [key: string]: number } = {};
    for (let i = 1; i <= 9; i++) {
      normalizedScores[i.toString()] = typeCounts[i] > 0 
        ? Math.round((typeScores[i] / typeCounts[i]) * 20) 
        : 0;
    }

    // Determine dominant and secondary types
    const sortedTypes = Object.entries(normalizedScores)
      .sort(([, a], [, b]) => (b as number) - (a as number));

    const dominantType = parseInt(sortedTypes[0][0]);
    const secondaryType = parseInt(sortedTypes[1][0]);

    // Mark session as completed
    await supabaseAdmin
      .from('Couples_enneagram_sessions')
      .update({ 
        is_completed: true,
        completed_at: new Date().toISOString()
      })
      .eq('id', id);

    // Save results
    const { data: result, error } = await supabaseAdmin
      .from('Couples_enneagram_results')
      .insert({
        session_id: id,
        user_id: authResult.userId,
        couple_id: session.couple_id,
        dominant_type: dominantType,
        secondary_type: secondaryType,
        enneagram_scores: normalizedScores
      })
      .select()
      .single();

    if (error) throw error;

    res.json(result);
  } catch (error: any) {
    console.error('Error completing enneagram session:', error);
    res.status(500).json({ error: error.message || 'Failed to complete session' });
  }
});

// GET /results/my - Get user's results
router.get("/results/my", async (req, res) => {
  try {
    const authResult = await verifyUserSession(req);
    if (!authResult.success) {
      return res.status(authResult.status).json({ error: authResult.error });
    }

    const { data, error } = await supabaseAdmin
      .from('Couples_enneagram_results')
      .select('*')
      .eq('user_id', authResult.userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json(data);
  } catch (error: any) {
    console.error('Error fetching enneagram results:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch results' });
  }
});

// GET /results/couple - Get couple's results (both partners)
router.get("/results/couple", async (req, res) => {
  try {
    const authResult = await verifyUserSession(req);
    if (!authResult.success) {
      return res.status(authResult.status).json({ error: authResult.error });
    }

    // Get user's couple_id
    const { data: profile } = await supabaseAdmin
      .from('Couples_profiles')
      .select('couple_id')
      .eq('id', authResult.userId)
      .single();

    if (!profile?.couple_id) {
      return res.status(400).json({ error: 'User is not part of a couple' });
    }

    const { data, error } = await supabaseAdmin
      .from('Couples_enneagram_results')
      .select(`
        *,
        Couples_profiles!Couples_enneagram_results_user_id_fkey (
          full_name
        )
      `)
      .eq('couple_id', profile.couple_id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json(data);
  } catch (error: any) {
    console.error('Error fetching couple enneagram results:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch couple results' });
  }
});

export default router;

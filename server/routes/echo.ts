import { Router } from "express";
import { z } from "zod";
import { supabaseAdmin } from "../supabase.js";
import { verifyUserSession } from "../helpers.js";

const router = Router();

// Validation schemas
const insertEchoSessionSchema = z.object({
  couple_id: z.string().uuid(),
  speaker_id: z.string().uuid(),
  listener_id: z.string().uuid(),
  current_step: z.number().min(1).max(3).default(1),
  status: z.enum(["in_progress", "completed"]).default("in_progress"),
});

const insertEchoTurnSchema = z.object({
  session_id: z.string().uuid(),
  step: z.number().min(1).max(3),
  author_id: z.string().uuid(),
  content: z.string().min(1),
});

// POST /session - Start new Echo & Empathy session
router.post("/session", async (req, res) => {
  try {
    const userAuth = await verifyUserSession(req);
    if (!userAuth.success) {
      return res.status(userAuth.status).json({ error: userAuth.error });
    }

    const validatedData = insertEchoSessionSchema.parse(req.body);

    // Verify session belongs to user's couple
    if (validatedData.couple_id !== userAuth.coupleId) {
      return res.status(403).json({ error: 'Cannot create session for different couple' });
    }

    const { data, error } = await supabaseAdmin
      .from('Couples_echo_sessions')
      .insert(validatedData)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    console.error('Error creating echo session:', error);
    res.status(500).json({ error: error.message || 'Failed to create session' });
  }
});

// POST /turn - Submit turn content
router.post("/turn", async (req, res) => {
  try {
    const userAuth = await verifyUserSession(req);
    if (!userAuth.success) {
      return res.status(userAuth.status).json({ error: userAuth.error });
    }

    const validatedData = insertEchoTurnSchema.parse(req.body);

    // Verify turn belongs to user's couple's session
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('Couples_echo_sessions')
      .select('couple_id, current_step')
      .eq('id', validatedData.session_id)
      .single();

    if (sessionError || !session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (session.couple_id !== userAuth.coupleId) {
      return res.status(403).json({ error: 'Cannot add turn to different couple session' });
    }

    // Validate step sequence
    if (validatedData.step !== session.current_step) {
      return res.status(400).json({ error: `Invalid step. Current step is ${session.current_step}` });
    }

    // Insert turn
    const { data: turn, error: turnError } = await supabaseAdmin
      .from('Couples_echo_turns')
      .insert(validatedData)
      .select()
      .single();

    if (turnError) throw turnError;

    // Update session's current_step if not on last step
    if (validatedData.step < 3) {
      const { error: updateError } = await supabaseAdmin
        .from('Couples_echo_sessions')
        .update({ current_step: validatedData.step + 1 })
        .eq('id', validatedData.session_id);

      if (updateError) throw updateError;
    }

    res.json(turn);
  } catch (error: any) {
    console.error('Error creating echo turn:', error);
    res.status(500).json({ error: error.message || 'Failed to create turn' });
  }
});

// PATCH /session/:id/complete - Mark session complete
router.patch("/session/:id/complete", async (req, res) => {
  try {
    const userAuth = await verifyUserSession(req);
    if (!userAuth.success) {
      return res.status(userAuth.status).json({ error: userAuth.error });
    }

    const { id } = req.params;

    // Verify session belongs to user's couple
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('Couples_echo_sessions')
      .select('couple_id')
      .eq('id', id)
      .single();

    if (sessionError || !session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (session.couple_id !== userAuth.coupleId) {
      return res.status(403).json({ error: 'Cannot complete different couple session' });
    }

    const { data, error } = await supabaseAdmin
      .from('Couples_echo_sessions')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    console.error('Error completing echo session:', error);
    res.status(500).json({ error: error.message || 'Failed to complete session' });
  }
});

// GET /sessions/:couple_id - Get session history
router.get("/sessions/:couple_id", async (req, res) => {
  try {
    const userAuth = await verifyUserSession(req);
    if (!userAuth.success) {
      return res.status(userAuth.status).json({ error: userAuth.error });
    }

    const { couple_id } = req.params;

    // Verify couple_id matches user's couple
    if (couple_id !== userAuth.coupleId) {
      return res.status(403).json({ error: 'Cannot view different couple sessions' });
    }

    const { data: sessions, error: sessionsError } = await supabaseAdmin
      .from('Couples_echo_sessions')
      .select('*')
      .eq('couple_id', couple_id)
      .order('created_at', { ascending: false });

    if (sessionsError) throw sessionsError;

    // Get all turns for these sessions
    const sessionIds = sessions?.map(s => s.id) || [];
    const { data: turns, error: turnsError } = await supabaseAdmin
      .from('Couples_echo_turns')
      .select('*')
      .in('session_id', sessionIds)
      .order('created_at', { ascending: true });

    if (turnsError) throw turnsError;

    // Combine sessions with their turns
    const sessionsWithTurns = sessions?.map(session => ({
      ...session,
      turns: turns?.filter(t => t.session_id === session.id) || [],
    }));

    res.json(sessionsWithTurns);
  } catch (error: any) {
    console.error('Error fetching echo sessions:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch sessions' });
  }
});

export default router;

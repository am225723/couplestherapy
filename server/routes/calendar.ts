import { Router } from "express";
import { getAccessToken, verifyUserSession } from "../helpers.js";
import { supabaseAdmin } from "../supabase.js";
import { insertCalendarEventSchema } from "../../shared/schema.js";

const router = Router();

router.get("/:couple_id", async (req, res) => {
  try {
    const { couple_id } = req.params;
    const accessToken = getAccessToken(req);

    if (!accessToken) {
      return res.status(401).json({ error: 'No session found. Please log in.' });
    }

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(accessToken);

    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid or expired session. Please log in again.' });
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('Couples_profiles')
      .select('role, couple_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return res.status(403).json({ error: 'User profile not found.' });
    }

    let hasAccess = false;
    if (profile.role === 'therapist') {
      const { data: couple } = await supabaseAdmin
        .from('Couples_couples')
        .select('therapist_id')
        .eq('id', couple_id)
        .single();
      hasAccess = couple?.therapist_id === user.id;
    } else {
      hasAccess = profile.couple_id === couple_id;
    }

    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied to view this calendar.' });
    }

    const { data: events, error: eventsError } = await supabaseAdmin
      .from('Couples_calendar_events')
      .select('*')
      .eq('couple_id', couple_id)
      .order('start_at', { ascending: true });

    if (eventsError) throw eventsError;

    res.json(events || []);
  } catch (error: any) {
    console.error('Fetch calendar events error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch calendar events' });
  }
});

router.post("/", async (req, res) => {
  try {
    const authResult = await verifyUserSession(req);
    if (!authResult.success) {
      return res.status(authResult.status).json({ error: authResult.error });
    }

    const { userId, coupleId } = authResult;

    const eventData = {
      ...req.body,
      start_at: req.body.start_at ? new Date(req.body.start_at) : undefined,
      end_at: req.body.end_at ? new Date(req.body.end_at) : undefined,
    };

    const validationResult = insertCalendarEventSchema.safeParse(eventData);
    if (!validationResult.success) {
      return res.status(400).json({ 
        error: "Invalid event data", 
        details: validationResult.error.format() 
      });
    }

    const { data: newEvent, error: insertError } = await supabaseAdmin
      .from('Couples_calendar_events')
      .insert({
        ...validationResult.data,
        couple_id: coupleId,
        created_by: userId,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    res.status(201).json(newEvent);
  } catch (error: any) {
    console.error('Create calendar event error:', error);
    res.status(500).json({ error: error.message || 'Failed to create calendar event' });
  }
});

router.patch("/:event_id", async (req, res) => {
  try {
    const { event_id } = req.params;
    const authResult = await verifyUserSession(req);
    if (!authResult.success) {
      return res.status(authResult.status).json({ error: authResult.error });
    }

    const { coupleId } = authResult;

    const { data: existingEvent, error: fetchError } = await supabaseAdmin
      .from('Couples_calendar_events')
      .select('couple_id')
      .eq('id', event_id)
      .single();

    if (fetchError || !existingEvent) {
      return res.status(404).json({ error: 'Event not found' });
    }

    if (existingEvent.couple_id !== coupleId) {
      return res.status(403).json({ error: 'Access denied to update this event' });
    }

    const updateData = {
      ...req.body,
      start_at: req.body.start_at ? new Date(req.body.start_at) : undefined,
      end_at: req.body.end_at ? new Date(req.body.end_at) : undefined,
    };

    delete updateData.id;
    delete updateData.couple_id;
    delete updateData.created_by;
    delete updateData.created_at;
    delete updateData.updated_at;

    const { data: updatedEvent, error: updateError } = await supabaseAdmin
      .from('Couples_calendar_events')
      .update(updateData)
      .eq('id', event_id)
      .select()
      .single();

    if (updateError) throw updateError;

    res.json(updatedEvent);
  } catch (error: any) {
    console.error('Update calendar event error:', error);
    res.status(500).json({ error: error.message || 'Failed to update calendar event' });
  }
});

router.delete("/:event_id", async (req, res) => {
  try {
    const { event_id } = req.params;
    const authResult = await verifyUserSession(req);
    if (!authResult.success) {
      return res.status(authResult.status).json({ error: authResult.error });
    }

    const { coupleId } = authResult;

    const { data: existingEvent, error: fetchError } = await supabaseAdmin
      .from('Couples_calendar_events')
      .select('couple_id')
      .eq('id', event_id)
      .single();

    if (fetchError || !existingEvent) {
      return res.status(404).json({ error: 'Event not found' });
    }

    if (existingEvent.couple_id !== coupleId) {
      return res.status(403).json({ error: 'Access denied to delete this event' });
    }

    const { error: deleteError } = await supabaseAdmin
      .from('Couples_calendar_events')
      .delete()
      .eq('id', event_id);

    if (deleteError) throw deleteError;

    res.json({ success: true, message: 'Event deleted successfully' });
  } catch (error: any) {
    console.error('Delete calendar event error:', error);
    res.status(500).json({ error: error.message || 'Failed to delete calendar event' });
  }
});

export default router;

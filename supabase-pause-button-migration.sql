-- Shared Pause Button Feature: Real-time De-escalation Tool
-- This feature allows either partner to activate a 20-minute cooling-off period
-- Uses Supabase Realtime for instant synchronization between partners

-- 1. CREATE PAUSE EVENTS TABLE FIRST
-- (Must exist before referencing it in foreign key)
CREATE TABLE IF NOT EXISTS public."Couples_pause_events" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID NOT NULL REFERENCES public."Couples_couples"(id) ON DELETE CASCADE,
  initiated_by UUID NOT NULL REFERENCES public."Couples_profiles"(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  duration_minutes INTEGER,
  reflection TEXT
);

-- 2. ADD COLUMN TO COUPLES TABLE
-- Tracks the currently active pause (if any) for each couple
ALTER TABLE public."Couples_couples"
ADD COLUMN IF NOT EXISTS active_pause_id UUID REFERENCES public."Couples_pause_events"(id) ON DELETE SET NULL;

-- 3. INDEXES for performance
CREATE INDEX IF NOT EXISTS idx_pause_events_couple_id ON public."Couples_pause_events"(couple_id);
CREATE INDEX IF NOT EXISTS idx_pause_events_started_at ON public."Couples_pause_events"(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_couples_active_pause_id ON public."Couples_couples"(active_pause_id);

-- 4. ROW LEVEL SECURITY (RLS)
ALTER TABLE public."Couples_pause_events" ENABLE ROW LEVEL SECURITY;

-- RLS POLICIES for Couples_pause_events

-- Partners can view their couple's pause events
CREATE POLICY "Partners can view their couple's pause events"
  ON public."Couples_pause_events"
  FOR SELECT
  USING (
    couple_id IN (
      SELECT couple_id FROM public."Couples_profiles"
      WHERE id = auth.uid() AND couple_id IS NOT NULL
    )
  );

-- Partners can create pause events for their couple
CREATE POLICY "Partners can create pause events"
  ON public."Couples_pause_events"
  FOR INSERT
  WITH CHECK (
    couple_id IN (
      SELECT couple_id FROM public."Couples_profiles"
      WHERE id = auth.uid() AND couple_id IS NOT NULL
    )
  );

-- Partners can update their couple's pause events (to end them)
CREATE POLICY "Partners can update their couple's pause events"
  ON public."Couples_pause_events"
  FOR UPDATE
  USING (
    couple_id IN (
      SELECT couple_id FROM public."Couples_profiles"
      WHERE id = auth.uid() AND couple_id IS NOT NULL
    )
  );

-- Partners can delete their couple's pause events
CREATE POLICY "Partners can delete their couple's pause events"
  ON public."Couples_pause_events"
  FOR DELETE
  USING (
    couple_id IN (
      SELECT couple_id FROM public."Couples_profiles"
      WHERE id = auth.uid() AND couple_id IS NOT NULL
    )
  );

-- Therapists can view pause events for their assigned couples
CREATE POLICY "Therapists can view assigned couples' pause events"
  ON public."Couples_pause_events"
  FOR SELECT
  USING (
    couple_id IN (
      SELECT id FROM public."Couples_couples"
      WHERE therapist_id = auth.uid()
    )
  );

-- 5. FUNCTION TO CALCULATE DURATION ON PAUSE END
CREATE OR REPLACE FUNCTION calculate_pause_duration()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.ended_at IS NOT NULL AND OLD.ended_at IS NULL THEN
    NEW.duration_minutes := EXTRACT(EPOCH FROM (NEW.ended_at - NEW.started_at)) / 60;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. TRIGGER TO AUTO-CALCULATE DURATION
CREATE TRIGGER trigger_calculate_pause_duration
  BEFORE UPDATE ON public."Couples_pause_events"
  FOR EACH ROW
  EXECUTE FUNCTION calculate_pause_duration();

-- 7. ENABLE REALTIME for instant synchronization
ALTER PUBLICATION supabase_realtime ADD TABLE public."Couples_pause_events";
ALTER PUBLICATION supabase_realtime ADD TABLE public."Couples_couples";

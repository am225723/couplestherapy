-- EFT Demon Dialogues Recognition Migration
-- This feature helps couples identify negative interaction cycles:
-- Find the Bad Guy, Protest Polka, and Freeze & Flee

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================
-- DEMON DIALOGUES TABLE
-- ==============================================

CREATE TABLE IF NOT EXISTS public."Couples_demon_dialogues" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  couple_id UUID NOT NULL REFERENCES public."Couples_couples"(id) ON DELETE CASCADE,
  dialogue_type TEXT NOT NULL CHECK (dialogue_type IN ('find_bad_guy', 'protest_polka', 'freeze_flee')),
  recognized_by UUID NOT NULL REFERENCES public."Couples_profiles"(id) ON DELETE CASCADE,
  interrupted BOOLEAN DEFAULT FALSE,
  notes TEXT,
  pause_event_id UUID REFERENCES public."Couples_pause_events"(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_demon_dialogues_couple_id ON public."Couples_demon_dialogues"(couple_id);
CREATE INDEX IF NOT EXISTS idx_demon_dialogues_created_at ON public."Couples_demon_dialogues"(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_demon_dialogues_type ON public."Couples_demon_dialogues"(dialogue_type);

-- ==============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================

ALTER TABLE public."Couples_demon_dialogues" ENABLE ROW LEVEL SECURITY;

-- Partners can view their couple's demon dialogues
CREATE POLICY "Partners can view their couple's demon dialogues"
  ON public."Couples_demon_dialogues"
  FOR SELECT
  USING (
    couple_id IN (
      SELECT couple_id FROM public."Couples_profiles"
      WHERE id = auth.uid() AND couple_id IS NOT NULL
    )
  );

-- Partners can create demon dialogue records
CREATE POLICY "Partners can create demon dialogue records"
  ON public."Couples_demon_dialogues"
  FOR INSERT
  WITH CHECK (
    couple_id IN (
      SELECT couple_id FROM public."Couples_profiles"
      WHERE id = auth.uid() AND couple_id IS NOT NULL
    )
  );

-- Partners can update demon dialogue records
CREATE POLICY "Partners can update demon dialogue records"
  ON public."Couples_demon_dialogues"
  FOR UPDATE
  USING (
    couple_id IN (
      SELECT couple_id FROM public."Couples_profiles"
      WHERE id = auth.uid() AND couple_id IS NOT NULL
    )
  );

-- Therapists can view their clients' demon dialogues
CREATE POLICY "Therapists can view client demon dialogues"
  ON public."Couples_demon_dialogues"
  FOR SELECT
  USING (
    couple_id IN (
      SELECT id FROM public."Couples_couples"
      WHERE therapist_id = auth.uid()
    )
  );

-- ==============================================
-- ENABLE REALTIME (for live updates)
-- ==============================================

ALTER PUBLICATION supabase_realtime ADD TABLE public."Couples_demon_dialogues";

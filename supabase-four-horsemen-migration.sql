-- Gottman Four Horsemen Tracker Migration
-- This feature helps couples identify and track the "Four Horsemen of the Apocalypse": 
-- Criticism, Contempt, Defensiveness, and Stonewalling

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================
-- FOUR HORSEMEN INCIDENTS TABLE
-- ==============================================

CREATE TABLE IF NOT EXISTS public."Couples_horsemen_incidents" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  couple_id UUID NOT NULL REFERENCES public."Couples_couples"(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES public."Couples_profiles"(id) ON DELETE CASCADE,
  horseman_type TEXT NOT NULL CHECK (horseman_type IN ('criticism', 'contempt', 'defensiveness', 'stonewalling')),
  situation TEXT,
  notes TEXT,
  partner_validated BOOLEAN DEFAULT NULL,
  antidote_practiced BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_horsemen_incidents_couple_id ON public."Couples_horsemen_incidents"(couple_id);
CREATE INDEX IF NOT EXISTS idx_horsemen_incidents_created_at ON public."Couples_horsemen_incidents"(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_horsemen_incidents_type ON public."Couples_horsemen_incidents"(horseman_type);

-- ==============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================

ALTER TABLE public."Couples_horsemen_incidents" ENABLE ROW LEVEL SECURITY;

-- Partners can view their couple's incidents
CREATE POLICY "Partners can view their couple's horsemen incidents"
  ON public."Couples_horsemen_incidents"
  FOR SELECT
  USING (
    couple_id IN (
      SELECT couple_id FROM public."Couples_profiles"
      WHERE id = auth.uid() AND couple_id IS NOT NULL
    )
  );

-- Partners can create incidents for their couple
CREATE POLICY "Partners can create horsemen incidents"
  ON public."Couples_horsemen_incidents"
  FOR INSERT
  WITH CHECK (
    couple_id IN (
      SELECT couple_id FROM public."Couples_profiles"
      WHERE id = auth.uid() AND couple_id IS NOT NULL
    )
  );

-- Partners can update incidents (for validation and antidote tracking)
CREATE POLICY "Partners can update horsemen incidents"
  ON public."Couples_horsemen_incidents"
  FOR UPDATE
  USING (
    couple_id IN (
      SELECT couple_id FROM public."Couples_profiles"
      WHERE id = auth.uid() AND couple_id IS NOT NULL
    )
  );

-- Therapists can view their clients' incidents (read-only)
CREATE POLICY "Therapists can view client horsemen incidents"
  ON public."Couples_horsemen_incidents"
  FOR SELECT
  USING (
    couple_id IN (
      SELECT id FROM public."Couples_couples"
      WHERE therapist_id = auth.uid()
    )
  );

-- ==============================================
-- ENABLE REALTIME (for live updates between partners)
-- ==============================================

ALTER PUBLICATION supabase_realtime ADD TABLE public."Couples_horsemen_incidents";

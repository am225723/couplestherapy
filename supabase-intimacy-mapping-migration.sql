-- Intimacy Mapping Migration
-- This feature tracks 5 dimensions of intimacy: Physical, Emotional, Intellectual, Experiential, Spiritual

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================
-- INTIMACY RATINGS TABLE
-- ==============================================

CREATE TABLE IF NOT EXISTS public."Couples_intimacy_ratings" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  couple_id UUID NOT NULL REFERENCES public."Couples_couples"(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public."Couples_profiles"(id) ON DELETE CASCADE,
  week_number INTEGER NOT NULL,
  year INTEGER NOT NULL,
  physical INTEGER CHECK (physical >= 1 AND physical <= 10),
  emotional INTEGER CHECK (emotional >= 1 AND emotional <= 10),
  intellectual INTEGER CHECK (intellectual >= 1 AND intellectual <= 10),
  experiential INTEGER CHECK (experiential >= 1 AND experiential <= 10),
  spiritual INTEGER CHECK (spiritual >= 1 AND spiritual <= 10),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(couple_id, user_id, week_number, year)
);

-- ==============================================
-- INTIMACY GOALS TABLE
-- ==============================================

CREATE TABLE IF NOT EXISTS public."Couples_intimacy_goals" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  couple_id UUID NOT NULL REFERENCES public."Couples_couples"(id) ON DELETE CASCADE,
  dimension TEXT NOT NULL CHECK (dimension IN ('physical', 'emotional', 'intellectual', 'experiential', 'spiritual')),
  goal_text TEXT NOT NULL,
  target_rating INTEGER CHECK (target_rating >= 1 AND target_rating <= 10),
  is_achieved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now(),
  achieved_at TIMESTAMPTZ
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_intimacy_ratings_couple_id ON public."Couples_intimacy_ratings"(couple_id);
CREATE INDEX IF NOT EXISTS idx_intimacy_ratings_user_id ON public."Couples_intimacy_ratings"(user_id);
CREATE INDEX IF NOT EXISTS idx_intimacy_ratings_week ON public."Couples_intimacy_ratings"(year, week_number);
CREATE INDEX IF NOT EXISTS idx_intimacy_goals_couple_id ON public."Couples_intimacy_goals"(couple_id);

-- ==============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================

ALTER TABLE public."Couples_intimacy_ratings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Couples_intimacy_goals" ENABLE ROW LEVEL SECURITY;

-- Partners can view their couple's intimacy ratings
CREATE POLICY "Partners can view their couple's intimacy ratings"
  ON public."Couples_intimacy_ratings"
  FOR SELECT
  USING (
    couple_id IN (
      SELECT couple_id FROM public."Couples_profiles"
      WHERE id = auth.uid() AND couple_id IS NOT NULL
    )
  );

-- Users can create their own intimacy ratings
CREATE POLICY "Users can create intimacy ratings"
  ON public."Couples_intimacy_ratings"
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can update their own intimacy ratings
CREATE POLICY "Users can update their intimacy ratings"
  ON public."Couples_intimacy_ratings"
  FOR UPDATE
  USING (user_id = auth.uid());

-- Partners can view their couple's intimacy goals
CREATE POLICY "Partners can view their couple's intimacy goals"
  ON public."Couples_intimacy_goals"
  FOR SELECT
  USING (
    couple_id IN (
      SELECT couple_id FROM public."Couples_profiles"
      WHERE id = auth.uid() AND couple_id IS NOT NULL
    )
  );

-- Partners can create intimacy goals
CREATE POLICY "Partners can create intimacy goals"
  ON public."Couples_intimacy_goals"
  FOR INSERT
  WITH CHECK (
    couple_id IN (
      SELECT couple_id FROM public."Couples_profiles"
      WHERE id = auth.uid() AND couple_id IS NOT NULL
    )
  );

-- Partners can update intimacy goals
CREATE POLICY "Partners can update intimacy goals"
  ON public."Couples_intimacy_goals"
  FOR UPDATE
  USING (
    couple_id IN (
      SELECT couple_id FROM public."Couples_profiles"
      WHERE id = auth.uid() AND couple_id IS NOT NULL
    )
  );

-- Therapists can view their clients' intimacy data
CREATE POLICY "Therapists can view client intimacy ratings"
  ON public."Couples_intimacy_ratings"
  FOR SELECT
  USING (
    couple_id IN (
      SELECT id FROM public."Couples_couples"
      WHERE therapist_id = auth.uid()
    )
  );

CREATE POLICY "Therapists can view client intimacy goals"
  ON public."Couples_intimacy_goals"
  FOR SELECT
  USING (
    couple_id IN (
      SELECT id FROM public."Couples_couples"
      WHERE therapist_id = auth.uid()
    )
  );

-- ==============================================
-- ENABLE REALTIME (for live goal updates)
-- ==============================================

ALTER PUBLICATION supabase_realtime ADD TABLE public."Couples_intimacy_ratings";
ALTER PUBLICATION supabase_realtime ADD TABLE public."Couples_intimacy_goals";

-- Couples Meditation Library Migration
-- This feature provides guided meditations for connection, loving-kindness, and breathwork

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================
-- MEDITATIONS TABLE (Library of guided meditations)
-- ==============================================

CREATE TABLE IF NOT EXISTS public."Couples_meditations" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  duration_mins INTEGER,
  category TEXT CHECK (category IN ('connection', 'loving_kindness', 'body_scan', 'breathwork', 'mindfulness')),
  audio_url TEXT,
  transcript TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ==============================================
-- MEDITATION SESSIONS TABLE (Tracking individual use)
-- ==============================================

CREATE TABLE IF NOT EXISTS public."Couples_meditation_sessions" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  couple_id UUID NOT NULL REFERENCES public."Couples_couples"(id) ON DELETE CASCADE,
  meditation_id UUID NOT NULL REFERENCES public."Couples_meditations"(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public."Couples_profiles"(id) ON DELETE CASCADE,
  completed BOOLEAN DEFAULT FALSE,
  feedback TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_meditation_sessions_couple_id ON public."Couples_meditation_sessions"(couple_id);
CREATE INDEX IF NOT EXISTS idx_meditation_sessions_user_id ON public."Couples_meditation_sessions"(user_id);
CREATE INDEX IF NOT EXISTS idx_meditation_sessions_meditation_id ON public."Couples_meditation_sessions"(meditation_id);
CREATE INDEX IF NOT EXISTS idx_meditation_sessions_created_at ON public."Couples_meditation_sessions"(created_at DESC);

-- ==============================================
-- SEED DEFAULT MEDITATIONS
-- ==============================================

INSERT INTO public."Couples_meditations" (title, description, duration_mins, category, is_active) VALUES
  ('Loving-Kindness for Your Partner', 'A guided meditation to cultivate compassion and kindness toward your partner', 10, 'loving_kindness', true),
  ('Couples Breathwork', 'Synchronized breathing exercise to create harmony and connection', 5, 'breathwork', true),
  ('Body Scan for Two', 'Parallel body scan meditation to practice presence together', 15, 'body_scan', true),
  ('Heart-Centered Connection', 'Meditation focused on opening the heart and feeling connected', 12, 'connection', true),
  ('Conflict De-escalation Breathing', 'Quick breathing exercise to calm during moments of tension', 3, 'breathwork', true),
  ('Gratitude for Each Other', 'Guided reflection on appreciation and gratitude for your partner', 8, 'mindfulness', true),
  ('Safe Haven Visualization', 'Visualizing your relationship as a safe, secure space', 10, 'connection', true)
ON CONFLICT DO NOTHING;

-- ==============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================

ALTER TABLE public."Couples_meditations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Couples_meditation_sessions" ENABLE ROW LEVEL SECURITY;

-- Anyone can view active meditations
CREATE POLICY "Anyone can view active meditations"
  ON public."Couples_meditations"
  FOR SELECT
  USING (is_active = true);

-- Partners can view their couple's meditation sessions
CREATE POLICY "Partners can view their meditation sessions"
  ON public."Couples_meditation_sessions"
  FOR SELECT
  USING (
    couple_id IN (
      SELECT couple_id FROM public."Couples_profiles"
      WHERE id = auth.uid() AND couple_id IS NOT NULL
    )
  );

-- Users can create meditation sessions
CREATE POLICY "Users can create meditation sessions"
  ON public."Couples_meditation_sessions"
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
  );

-- Users can update their own meditation sessions
CREATE POLICY "Users can update their meditation sessions"
  ON public."Couples_meditation_sessions"
  FOR UPDATE
  USING (user_id = auth.uid());

-- Therapists can view their clients' meditation sessions
CREATE POLICY "Therapists can view client meditation sessions"
  ON public."Couples_meditation_sessions"
  FOR SELECT
  USING (
    couple_id IN (
      SELECT id FROM public."Couples_couples"
      WHERE therapist_id = auth.uid()
    )
  );

-- Echo & Empathy Feature: Active Listening Communication Skill Builder
-- This feature enables partners to practice structured active listening through 3-step turns

-- 1. ECHO SESSIONS TABLE
CREATE TABLE IF NOT EXISTS public."Couples_echo_sessions" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID NOT NULL REFERENCES public."Couples_couples"(id) ON DELETE CASCADE,
  speaker_id UUID NOT NULL REFERENCES public."Couples_profiles"(id) ON DELETE CASCADE,
  listener_id UUID NOT NULL REFERENCES public."Couples_profiles"(id) ON DELETE CASCADE,
  current_step INTEGER NOT NULL DEFAULT 1 CHECK (current_step >= 1 AND current_step <= 3),
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- 2. ECHO TURNS TABLE
CREATE TABLE IF NOT EXISTS public."Couples_echo_turns" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public."Couples_echo_sessions"(id) ON DELETE CASCADE,
  step INTEGER NOT NULL CHECK (step >= 1 AND step <= 3),
  author_id UUID NOT NULL REFERENCES public."Couples_profiles"(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. INDEXES for performance
CREATE INDEX IF NOT EXISTS idx_echo_sessions_couple_id ON public."Couples_echo_sessions"(couple_id);
CREATE INDEX IF NOT EXISTS idx_echo_sessions_created_at ON public."Couples_echo_sessions"(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_echo_turns_session_id ON public."Couples_echo_turns"(session_id);

-- 4. ROW LEVEL SECURITY (RLS)
ALTER TABLE public."Couples_echo_sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Couples_echo_turns" ENABLE ROW LEVEL SECURITY;

-- RLS POLICIES for Couples_echo_sessions

-- Partners can view their couple's sessions
CREATE POLICY "Partners can view their couple's echo sessions"
  ON public."Couples_echo_sessions"
  FOR SELECT
  USING (
    couple_id IN (
      SELECT couple_id FROM public."Couples_profiles"
      WHERE id = auth.uid() AND couple_id IS NOT NULL
    )
  );

-- Partners can create sessions for their couple
CREATE POLICY "Partners can create echo sessions"
  ON public."Couples_echo_sessions"
  FOR INSERT
  WITH CHECK (
    couple_id IN (
      SELECT couple_id FROM public."Couples_profiles"
      WHERE id = auth.uid() AND couple_id IS NOT NULL
    )
  );

-- Partners can update their couple's sessions
CREATE POLICY "Partners can update their couple's echo sessions"
  ON public."Couples_echo_sessions"
  FOR UPDATE
  USING (
    couple_id IN (
      SELECT couple_id FROM public."Couples_profiles"
      WHERE id = auth.uid() AND couple_id IS NOT NULL
    )
  );

-- Partners can delete their couple's sessions
CREATE POLICY "Partners can delete their couple's echo sessions"
  ON public."Couples_echo_sessions"
  FOR DELETE
  USING (
    couple_id IN (
      SELECT couple_id FROM public."Couples_profiles"
      WHERE id = auth.uid() AND couple_id IS NOT NULL
    )
  );

-- Therapists can view sessions for their assigned couples
CREATE POLICY "Therapists can view assigned couples' echo sessions"
  ON public."Couples_echo_sessions"
  FOR SELECT
  USING (
    couple_id IN (
      SELECT id FROM public."Couples_couples"
      WHERE therapist_id = auth.uid()
    )
  );

-- RLS POLICIES for Couples_echo_turns

-- Partners can view turns for their couple's sessions
CREATE POLICY "Partners can view their couple's echo turns"
  ON public."Couples_echo_turns"
  FOR SELECT
  USING (
    session_id IN (
      SELECT id FROM public."Couples_echo_sessions"
      WHERE couple_id IN (
        SELECT couple_id FROM public."Couples_profiles"
        WHERE id = auth.uid() AND couple_id IS NOT NULL
      )
    )
  );

-- Partners can create turns for their couple's sessions
CREATE POLICY "Partners can create echo turns"
  ON public."Couples_echo_turns"
  FOR INSERT
  WITH CHECK (
    session_id IN (
      SELECT id FROM public."Couples_echo_sessions"
      WHERE couple_id IN (
        SELECT couple_id FROM public."Couples_profiles"
        WHERE id = auth.uid() AND couple_id IS NOT NULL
      )
    )
  );

-- Partners can update turns for their couple's sessions
CREATE POLICY "Partners can update their couple's echo turns"
  ON public."Couples_echo_turns"
  FOR UPDATE
  USING (
    session_id IN (
      SELECT id FROM public."Couples_echo_sessions"
      WHERE couple_id IN (
        SELECT couple_id FROM public."Couples_profiles"
        WHERE id = auth.uid() AND couple_id IS NOT NULL
      )
    )
  );

-- Partners can delete turns for their couple's sessions
CREATE POLICY "Partners can delete their couple's echo turns"
  ON public."Couples_echo_turns"
  FOR DELETE
  USING (
    session_id IN (
      SELECT id FROM public."Couples_echo_sessions"
      WHERE couple_id IN (
        SELECT couple_id FROM public."Couples_profiles"
        WHERE id = auth.uid() AND couple_id IS NOT NULL
      )
    )
  );

-- Therapists can view turns for their assigned couples' sessions
CREATE POLICY "Therapists can view assigned couples' echo turns"
  ON public."Couples_echo_turns"
  FOR SELECT
  USING (
    session_id IN (
      SELECT id FROM public."Couples_echo_sessions"
      WHERE couple_id IN (
        SELECT id FROM public."Couples_couples"
        WHERE therapist_id = auth.uid()
      )
    )
  );

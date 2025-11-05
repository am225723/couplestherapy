-- TADI Platform - Love Map Quiz Feature Migration
-- Run this in your Supabase SQL Editor to create Love Map Quiz tables with RLS policies
-- Based on Dr. Gottman's Love Map methodology

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================
-- LOVE MAP QUIZ TABLES
-- ==============================================

-- 1. LOVE MAP QUESTIONS - Question bank
CREATE TABLE IF NOT EXISTS public."Couples_love_map_questions" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question_text TEXT NOT NULL,
  category TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. LOVE MAP SESSIONS - Quiz sessions per couple
CREATE TABLE IF NOT EXISTS public."Couples_love_map_sessions" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  couple_id UUID NOT NULL REFERENCES public."Couples_couples"(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  partner1_truths_completed BOOLEAN DEFAULT false,
  partner2_truths_completed BOOLEAN DEFAULT false,
  partner1_guesses_completed BOOLEAN DEFAULT false,
  partner2_guesses_completed BOOLEAN DEFAULT false,
  partner1_score NUMERIC(5, 2),
  partner2_score NUMERIC(5, 2)
);

-- 3. LOVE MAP TRUTHS - Self-answers (the "truth")
CREATE TABLE IF NOT EXISTS public."Couples_love_map_truths" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES public."Couples_love_map_sessions"(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public."Couples_love_map_questions"(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public."Couples_profiles"(id) ON DELETE CASCADE,
  answer_text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(session_id, question_id, author_id)
);

-- 4. LOVE MAP GUESSES - Partner guesses
CREATE TABLE IF NOT EXISTS public."Couples_love_map_guesses" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES public."Couples_love_map_sessions"(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public."Couples_love_map_questions"(id) ON DELETE CASCADE,
  guesser_id UUID NOT NULL REFERENCES public."Couples_profiles"(id) ON DELETE CASCADE,
  truth_id UUID NOT NULL REFERENCES public."Couples_love_map_truths"(id) ON DELETE CASCADE,
  guess_text TEXT NOT NULL,
  is_correct BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(session_id, question_id, guesser_id)
);

-- ==============================================
-- INDEXES FOR PERFORMANCE
-- ==============================================

CREATE INDEX IF NOT EXISTS idx_love_map_sessions_couple_id 
ON public."Couples_love_map_sessions"(couple_id);

CREATE INDEX IF NOT EXISTS idx_love_map_truths_session_id 
ON public."Couples_love_map_truths"(session_id);

CREATE INDEX IF NOT EXISTS idx_love_map_truths_author_id 
ON public."Couples_love_map_truths"(author_id);

CREATE INDEX IF NOT EXISTS idx_love_map_guesses_session_id 
ON public."Couples_love_map_guesses"(session_id);

CREATE INDEX IF NOT EXISTS idx_love_map_guesses_guesser_id 
ON public."Couples_love_map_guesses"(guesser_id);

-- ==============================================
-- ROW LEVEL SECURITY POLICIES
-- ==============================================

-- 1. LOVE MAP QUESTIONS - All authenticated users can read active questions
ALTER TABLE public."Couples_love_map_questions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Couples_love_map_questions" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read active questions" ON public."Couples_love_map_questions";
CREATE POLICY "Authenticated users can read active questions"
ON public."Couples_love_map_questions" FOR SELECT
USING ( auth.uid() IS NOT NULL AND is_active = true );

-- 2. LOVE MAP SESSIONS - Partners can CRUD their couple's sessions, therapists can read
ALTER TABLE public."Couples_love_map_sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Couples_love_map_sessions" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Partners can read their couple's sessions" ON public."Couples_love_map_sessions";
CREATE POLICY "Partners can read their couple's sessions"
ON public."Couples_love_map_sessions" FOR SELECT
USING (
  couple_id IN (
    SELECT couple_id FROM public."Couples_profiles" WHERE id = auth.uid()
  )
  OR
  (
    EXISTS (
      SELECT 1 FROM public."Couples_profiles"
      WHERE id = auth.uid() AND role = 'therapist'
    )
    AND couple_id IN (
      SELECT id FROM public."Couples_couples" WHERE therapist_id = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS "Partners can create sessions for their couple" ON public."Couples_love_map_sessions";
CREATE POLICY "Partners can create sessions for their couple"
ON public."Couples_love_map_sessions" FOR INSERT
WITH CHECK (
  couple_id IN (
    SELECT couple_id FROM public."Couples_profiles" WHERE id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Partners can update their couple's sessions" ON public."Couples_love_map_sessions";
CREATE POLICY "Partners can update their couple's sessions"
ON public."Couples_love_map_sessions" FOR UPDATE
USING (
  couple_id IN (
    SELECT couple_id FROM public."Couples_profiles" WHERE id = auth.uid()
  )
)
WITH CHECK (
  couple_id IN (
    SELECT couple_id FROM public."Couples_profiles" WHERE id = auth.uid()
  )
);

-- 3. LOVE MAP TRUTHS - Partners can read/write their couple's truths, therapists can read
ALTER TABLE public."Couples_love_map_truths" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Couples_love_map_truths" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Partners can read their couple's truths" ON public."Couples_love_map_truths";
CREATE POLICY "Partners can read their couple's truths"
ON public."Couples_love_map_truths" FOR SELECT
USING (
  session_id IN (
    SELECT id FROM public."Couples_love_map_sessions"
    WHERE couple_id IN (
      SELECT couple_id FROM public."Couples_profiles" WHERE id = auth.uid()
    )
  )
  OR
  (
    EXISTS (
      SELECT 1 FROM public."Couples_profiles"
      WHERE id = auth.uid() AND role = 'therapist'
    )
    AND session_id IN (
      SELECT s.id FROM public."Couples_love_map_sessions" s
      JOIN public."Couples_couples" c ON s.couple_id = c.id
      WHERE c.therapist_id = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS "Partners can insert their own truths" ON public."Couples_love_map_truths";
CREATE POLICY "Partners can insert their own truths"
ON public."Couples_love_map_truths" FOR INSERT
WITH CHECK (
  author_id = auth.uid()
  AND session_id IN (
    SELECT id FROM public."Couples_love_map_sessions"
    WHERE couple_id IN (
      SELECT couple_id FROM public."Couples_profiles" WHERE id = auth.uid()
    )
  )
);

-- 4. LOVE MAP GUESSES - Partners can read/write their couple's guesses, therapists can read
ALTER TABLE public."Couples_love_map_guesses" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Couples_love_map_guesses" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Partners can read their couple's guesses" ON public."Couples_love_map_guesses";
CREATE POLICY "Partners can read their couple's guesses"
ON public."Couples_love_map_guesses" FOR SELECT
USING (
  session_id IN (
    SELECT id FROM public."Couples_love_map_sessions"
    WHERE couple_id IN (
      SELECT couple_id FROM public."Couples_profiles" WHERE id = auth.uid()
    )
  )
  OR
  (
    EXISTS (
      SELECT 1 FROM public."Couples_profiles"
      WHERE id = auth.uid() AND role = 'therapist'
    )
    AND session_id IN (
      SELECT s.id FROM public."Couples_love_map_sessions" s
      JOIN public."Couples_couples" c ON s.couple_id = c.id
      WHERE c.therapist_id = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS "Partners can insert their own guesses" ON public."Couples_love_map_guesses";
CREATE POLICY "Partners can insert their own guesses"
ON public."Couples_love_map_guesses" FOR INSERT
WITH CHECK (
  guesser_id = auth.uid()
  AND session_id IN (
    SELECT id FROM public."Couples_love_map_sessions"
    WHERE couple_id IN (
      SELECT couple_id FROM public."Couples_profiles" WHERE id = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS "Partners can update their own guesses" ON public."Couples_love_map_guesses";
CREATE POLICY "Partners can update their own guesses"
ON public."Couples_love_map_guesses" FOR UPDATE
USING ( guesser_id = auth.uid() )
WITH CHECK ( guesser_id = auth.uid() );

-- ==============================================
-- SEED DEFAULT QUESTIONS (20 questions covering various aspects)
-- ==============================================

INSERT INTO public."Couples_love_map_questions" (question_text, category, is_active) VALUES
  ('What is your favorite way to spend a weekend?', 'Preferences', true),
  ('What is your biggest dream or aspiration?', 'Dreams', true),
  ('What is your greatest fear or worry?', 'Fears', true),
  ('What makes you feel most loved and appreciated?', 'Love & Connection', true),
  ('What is your favorite childhood memory?', 'Memories', true),
  ('What is one thing you''d like to learn or try?', 'Dreams', true),
  ('What is your ideal vacation destination?', 'Preferences', true),
  ('What is your favorite meal or cuisine?', 'Preferences', true),
  ('Who is your role model or hero?', 'Values', true),
  ('What is your favorite book or movie?', 'Preferences', true),
  ('What is one thing that always makes you laugh?', 'Joy', true),
  ('What is your biggest accomplishment?', 'Pride', true),
  ('What is something you''re working to improve about yourself?', 'Growth', true),
  ('What is your favorite way to relax or unwind?', 'Self-Care', true),
  ('What is one thing you''re grateful for today?', 'Gratitude', true),
  ('What is your love language?', 'Love & Connection', true),
  ('What is your favorite time of day and why?', 'Preferences', true),
  ('What is one thing that stresses you out?', 'Stressors', true),
  ('What is your favorite music or artist?', 'Preferences', true),
  ('What is one thing you want to be remembered for?', 'Legacy', true)
ON CONFLICT DO NOTHING;

-- ==============================================
-- COMMENTS FOR DOCUMENTATION
-- ==============================================

COMMENT ON TABLE public."Couples_love_map_questions" IS 'Question bank for Love Map Quiz based on Dr. Gottman methodology';
COMMENT ON TABLE public."Couples_love_map_sessions" IS 'Quiz sessions tracking completion status and scores for each partner';
COMMENT ON TABLE public."Couples_love_map_truths" IS 'Self-answers where each partner answers questions about themselves';
COMMENT ON TABLE public."Couples_love_map_guesses" IS 'Partner guesses where each partner guesses their partner''s answers';

-- ==============================================
-- COMPLETION
-- ==============================================

-- Verify tables were created
DO $$
DECLARE
  tables_created INTEGER;
BEGIN
  SELECT COUNT(*) INTO tables_created
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name IN (
      'Couples_love_map_questions',
      'Couples_love_map_sessions',
      'Couples_love_map_truths',
      'Couples_love_map_guesses'
    );
  
  RAISE NOTICE 'Love Map Quiz migration complete! % tables created/verified.', tables_created;
END $$;

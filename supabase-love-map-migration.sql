-- Love Map Quiz Migration
-- Run this in your Supabase SQL Editor to create Love Map Quiz tables with RLS policies

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================
-- LOVE MAP QUIZ TABLES
-- ==============================================

-- 1. LOVE MAP QUESTIONS TABLE
CREATE TABLE IF NOT EXISTS public."Couples_love_map_questions" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question_text TEXT NOT NULL,
  category TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. LOVE MAP SESSIONS TABLE
CREATE TABLE IF NOT EXISTS public."Couples_love_map_sessions" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  couple_id UUID NOT NULL REFERENCES public."Couples_couples"(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  partner1_truths_completed BOOLEAN DEFAULT false,
  partner2_truths_completed BOOLEAN DEFAULT false,
  partner1_guesses_completed BOOLEAN DEFAULT false,
  partner2_guesses_completed BOOLEAN DEFAULT false,
  partner1_score NUMERIC(5,2),
  partner2_score NUMERIC(5,2)
);

-- 3. LOVE MAP TRUTHS TABLE (Self-answers)
CREATE TABLE IF NOT EXISTS public."Couples_love_map_truths" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES public."Couples_love_map_sessions"(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public."Couples_love_map_questions"(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public."Couples_profiles"(id) ON DELETE CASCADE,
  answer_text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(session_id, question_id, author_id)
);

-- 4. LOVE MAP GUESSES TABLE (Partner guesses)
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
-- SEED DEFAULT QUESTIONS (Gottman Love Maps)
-- ==============================================

INSERT INTO public."Couples_love_map_questions" (question_text, category, is_active) VALUES
  ('What is your partner''s favorite movie or TV show?', 'Interests', true),
  ('What is your partner''s biggest fear or worry?', 'Emotions', true),
  ('What makes your partner feel most loved and appreciated?', 'Love & Connection', true),
  ('What is your partner''s dream vacation destination?', 'Dreams', true),
  ('What was a significant event from your partner''s childhood?', 'History', true),
  ('What is your partner''s favorite way to relax after a stressful day?', 'Self-Care', true),
  ('What are your partner''s top life goals or aspirations?', 'Dreams', true),
  ('What is your partner''s favorite food or restaurant?', 'Interests', true),
  ('Who is your partner''s best friend (outside the relationship)?', 'Relationships', true),
  ('What is something your partner is proud of accomplishing?', 'Achievements', true),
  ('What stresses your partner out the most?', 'Emotions', true),
  ('What is your partner''s love language?', 'Love & Connection', true),
  ('What is your partner''s favorite hobby or pastime?', 'Interests', true),
  ('What is a core value or belief your partner holds dear?', 'Values', true),
  ('What was the happiest moment in your partner''s life?', 'History', true),
  ('What does your partner need when they''re feeling down?', 'Emotions', true),
  ('What is your partner''s biggest pet peeve?', 'Preferences', true),
  ('What is your partner''s favorite memory of the two of you together?', 'Love & Connection', true),
  ('What are your partner''s career or professional aspirations?', 'Dreams', true),
  ('What makes your partner feel most secure in your relationship?', 'Love & Connection', true)
ON CONFLICT DO NOTHING;

-- ==============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================

-- Enable RLS on all Love Map tables
ALTER TABLE public."Couples_love_map_questions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Couples_love_map_sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Couples_love_map_truths" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Couples_love_map_guesses" ENABLE ROW LEVEL SECURITY;

-- ==============================================
-- LOVE MAP QUESTIONS POLICIES
-- ==============================================

-- Everyone can read active questions
CREATE POLICY "Anyone can view active questions"
  ON public."Couples_love_map_questions"
  FOR SELECT
  USING (is_active = true);

-- Only admins can insert/update/delete questions (not implemented yet, so no policies)

-- ==============================================
-- LOVE MAP SESSIONS POLICIES
-- ==============================================

-- Partners can view their own couple's sessions
CREATE POLICY "Partners can view their sessions"
  ON public."Couples_love_map_sessions"
  FOR SELECT
  USING (
    couple_id IN (
      SELECT couple_id FROM public."Couples_profiles" WHERE id = auth.uid()
    )
  );

-- Partners can create sessions for their couple
CREATE POLICY "Partners can create sessions"
  ON public."Couples_love_map_sessions"
  FOR INSERT
  WITH CHECK (
    couple_id IN (
      SELECT couple_id FROM public."Couples_profiles" WHERE id = auth.uid()
    )
  );

-- Partners can update their own couple's sessions
CREATE POLICY "Partners can update sessions"
  ON public."Couples_love_map_sessions"
  FOR UPDATE
  USING (
    couple_id IN (
      SELECT couple_id FROM public."Couples_profiles" WHERE id = auth.uid()
    )
  );

-- Therapists can view sessions for their assigned couples
CREATE POLICY "Therapists can view assigned couple sessions"
  ON public."Couples_love_map_sessions"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public."Couples_couples" c
      INNER JOIN public."Couples_profiles" p ON p.id = auth.uid()
      WHERE c.id = couple_id
        AND c.therapist_id = p.id
        AND p.role = 'therapist'
    )
  );

-- ==============================================
-- LOVE MAP TRUTHS POLICIES
-- ==============================================

-- Partners can view truths from their couple's sessions
CREATE POLICY "Partners can view session truths"
  ON public."Couples_love_map_truths"
  FOR SELECT
  USING (
    session_id IN (
      SELECT s.id FROM public."Couples_love_map_sessions" s
      INNER JOIN public."Couples_profiles" p ON p.id = auth.uid()
      WHERE s.couple_id = p.couple_id
    )
  );

-- Partners can insert their own truths
CREATE POLICY "Partners can insert their truths"
  ON public."Couples_love_map_truths"
  FOR INSERT
  WITH CHECK (
    author_id = auth.uid()
    AND session_id IN (
      SELECT s.id FROM public."Couples_love_map_sessions" s
      INNER JOIN public."Couples_profiles" p ON p.id = auth.uid()
      WHERE s.couple_id = p.couple_id
    )
  );

-- Partners can update their own truths
CREATE POLICY "Partners can update their truths"
  ON public."Couples_love_map_truths"
  FOR UPDATE
  USING (author_id = auth.uid());

-- Therapists can view truths for assigned couples
CREATE POLICY "Therapists can view assigned couple truths"
  ON public."Couples_love_map_truths"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public."Couples_love_map_sessions" s
      INNER JOIN public."Couples_couples" c ON c.id = s.couple_id
      INNER JOIN public."Couples_profiles" p ON p.id = auth.uid()
      WHERE s.id = session_id
        AND c.therapist_id = p.id
        AND p.role = 'therapist'
    )
  );

-- ==============================================
-- LOVE MAP GUESSES POLICIES
-- ==============================================

-- Partners can view guesses from their couple's sessions
CREATE POLICY "Partners can view session guesses"
  ON public."Couples_love_map_guesses"
  FOR SELECT
  USING (
    session_id IN (
      SELECT s.id FROM public."Couples_love_map_sessions" s
      INNER JOIN public."Couples_profiles" p ON p.id = auth.uid()
      WHERE s.couple_id = p.couple_id
    )
  );

-- Partners can insert their own guesses
CREATE POLICY "Partners can insert their guesses"
  ON public."Couples_love_map_guesses"
  FOR INSERT
  WITH CHECK (
    guesser_id = auth.uid()
    AND session_id IN (
      SELECT s.id FROM public."Couples_love_map_sessions" s
      INNER JOIN public."Couples_profiles" p ON p.id = auth.uid()
      WHERE s.couple_id = p.couple_id
    )
  );

-- Partners can update their own guesses
CREATE POLICY "Partners can update their guesses"
  ON public."Couples_love_map_guesses"
  FOR UPDATE
  USING (guesser_id = auth.uid());

-- Therapists can view guesses for assigned couples
CREATE POLICY "Therapists can view assigned couple guesses"
  ON public."Couples_love_map_guesses"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public."Couples_love_map_sessions" s
      INNER JOIN public."Couples_couples" c ON c.id = s.couple_id
      INNER JOIN public."Couples_profiles" p ON p.id = auth.uid()
      WHERE s.id = session_id
        AND c.therapist_id = p.id
        AND p.role = 'therapist'
    )
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

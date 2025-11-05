-- IFS Introduction Feature: Inner Family Systems Exercise
-- This feature helps individuals identify and communicate with their protective parts
-- PRIVACY: Letters are private - visible only to author and therapist, NOT to partner

-- 1. IFS EXERCISES TABLE
CREATE TABLE IF NOT EXISTS public."Couples_ifs_exercises" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public."Couples_profiles"(id) ON DELETE CASCADE,
  couple_id UUID NOT NULL REFERENCES public."Couples_couples"(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- 2. IFS PARTS TABLE (Protective Parts Identification)
CREATE TABLE IF NOT EXISTS public."Couples_ifs_parts" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id UUID NOT NULL REFERENCES public."Couples_ifs_exercises"(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public."Couples_profiles"(id) ON DELETE CASCADE,
  part_name TEXT NOT NULL,
  when_appears TEXT NOT NULL,
  letter_content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. INDEXES for performance
CREATE INDEX IF NOT EXISTS idx_ifs_exercises_user_id ON public."Couples_ifs_exercises"(user_id);
CREATE INDEX IF NOT EXISTS idx_ifs_exercises_couple_id ON public."Couples_ifs_exercises"(couple_id);
CREATE INDEX IF NOT EXISTS idx_ifs_parts_exercise_id ON public."Couples_ifs_parts"(exercise_id);
CREATE INDEX IF NOT EXISTS idx_ifs_parts_user_id ON public."Couples_ifs_parts"(user_id);

-- 4. ROW LEVEL SECURITY (RLS)
ALTER TABLE public."Couples_ifs_exercises" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Couples_ifs_parts" ENABLE ROW LEVEL SECURITY;

-- RLS POLICIES for Couples_ifs_exercises

-- Users can view their own exercises
CREATE POLICY "Users can view their own IFS exercises"
  ON public."Couples_ifs_exercises"
  FOR SELECT
  USING (user_id = auth.uid());

-- Users can create their own exercises
CREATE POLICY "Users can create IFS exercises"
  ON public."Couples_ifs_exercises"
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can update their own exercises
CREATE POLICY "Users can update their own IFS exercises"
  ON public."Couples_ifs_exercises"
  FOR UPDATE
  USING (user_id = auth.uid());

-- Users can delete their own exercises
CREATE POLICY "Users can delete their own IFS exercises"
  ON public."Couples_ifs_exercises"
  FOR DELETE
  USING (user_id = auth.uid());

-- Therapists can view exercises for their assigned couples
CREATE POLICY "Therapists can view assigned couples' IFS exercises"
  ON public."Couples_ifs_exercises"
  FOR SELECT
  USING (
    couple_id IN (
      SELECT id FROM public."Couples_couples"
      WHERE therapist_id = auth.uid()
    )
  );

-- RLS POLICIES for Couples_ifs_parts
-- CRITICAL PRIVACY: Partners CANNOT see each other's parts/letters

-- Users can view their own parts only
CREATE POLICY "Users can view their own IFS parts"
  ON public."Couples_ifs_parts"
  FOR SELECT
  USING (user_id = auth.uid());

-- Users can create their own parts
CREATE POLICY "Users can create IFS parts"
  ON public."Couples_ifs_parts"
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can update their own parts
CREATE POLICY "Users can update their own IFS parts"
  ON public."Couples_ifs_parts"
  FOR UPDATE
  USING (user_id = auth.uid());

-- Users can delete their own parts
CREATE POLICY "Users can delete their own IFS parts"
  ON public."Couples_ifs_parts"
  FOR DELETE
  USING (user_id = auth.uid());

-- Therapists can view parts for their assigned couples
CREATE POLICY "Therapists can view assigned couples' IFS parts"
  ON public."Couples_ifs_parts"
  FOR SELECT
  USING (
    exercise_id IN (
      SELECT id FROM public."Couples_ifs_exercises"
      WHERE couple_id IN (
        SELECT id FROM public."Couples_couples"
        WHERE therapist_id = auth.uid()
      )
    )
  );

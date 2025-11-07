-- TADI Platform - Complete Supabase Setup Script
-- Run this in your Supabase SQL Editor to create all tables with RLS policies

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================
-- TABLES
-- ==============================================

-- 1. PROFILES TABLE
CREATE TABLE IF NOT EXISTS public."Couples_profiles" (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  role TEXT NOT NULL CHECK (role IN ('therapist', 'client')),
  couple_id UUID
);

-- 2. COUPLES TABLE
CREATE TABLE IF NOT EXISTS public."Couples_couples" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  partner1_id UUID REFERENCES public."Couples_profiles"(id),
  partner2_id UUID REFERENCES public."Couples_profiles"(id),
  therapist_id UUID REFERENCES public."Couples_profiles"(id)
);

-- Add foreign key constraint for couple_id in profiles
ALTER TABLE public."Couples_profiles"
  DROP CONSTRAINT IF EXISTS "Couples_profiles_couple_id_fkey";
ALTER TABLE public."Couples_profiles"
  ADD CONSTRAINT "Couples_profiles_couple_id_fkey"
  FOREIGN KEY (couple_id) REFERENCES public."Couples_couples"(id) ON DELETE SET NULL;

-- 3. LOVE LANGUAGES TABLE
CREATE TABLE IF NOT EXISTS public."Couples_love_languages" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public."Couples_profiles"(id) ON DELETE CASCADE,
  primary_language TEXT,
  secondary_language TEXT,
  scores JSONB
);

-- 4. GRATITUDE LOGS
CREATE TABLE IF NOT EXISTS public."Couples_gratitude_logs" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  couple_id UUID NOT NULL REFERENCES public."Couples_couples"(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public."Couples_profiles"(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  text_content TEXT,
  image_url TEXT
);

-- 5. WEEKLY CHECK-INS (Most private)
CREATE TABLE IF NOT EXISTS public."Couples_weekly_checkins" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  couple_id UUID NOT NULL REFERENCES public."Couples_couples"(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public."Couples_profiles"(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  week_number INT,
  q_connectedness INT CHECK (q_connectedness >= 1 AND q_connectedness <= 10),
  q_conflict INT CHECK (q_conflict >= 1 AND q_conflict <= 10),
  q_appreciation TEXT,
  q_regrettable_incident TEXT,
  q_my_need TEXT
);

-- 6. SHARED GOALS
CREATE TABLE IF NOT EXISTS public."Couples_shared_goals" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  couple_id UUID NOT NULL REFERENCES public."Couples_couples"(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES public."Couples_profiles"(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  title TEXT NOT NULL,
  status TEXT DEFAULT 'backlog' CHECK (status IN ('backlog', 'doing', 'done')),
  assigned_to UUID REFERENCES public."Couples_profiles"(id)
);

-- 7. THERAPIST COMMENTS
CREATE TABLE IF NOT EXISTS public."Couples_therapist_comments" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  couple_id UUID NOT NULL REFERENCES public."Couples_couples"(id) ON DELETE CASCADE,
  therapist_id UUID NOT NULL REFERENCES public."Couples_profiles"(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  comment_text TEXT NOT NULL,
  is_private_note BOOLEAN DEFAULT false,
  related_activity_type TEXT,
  related_activity_id UUID
);

-- 8. CONVERSATIONS (Hold Me Tight)
CREATE TABLE IF NOT EXISTS public."Couples_conversations" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  couple_id UUID NOT NULL REFERENCES public."Couples_couples"(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  initiator_id UUID REFERENCES public."Couples_profiles"(id),
  initiator_statement_feel TEXT,
  initiator_statement_need TEXT,
  partner_reflection TEXT,
  partner_response TEXT
);

-- 9. RITUALS OF CONNECTION
CREATE TABLE IF NOT EXISTS public."Couples_rituals" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  couple_id UUID NOT NULL REFERENCES public."Couples_couples"(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('Mornings', 'Reuniting', 'Mealtimes', 'Going to Sleep')),
  description TEXT NOT NULL,
  created_by UUID REFERENCES public."Couples_profiles"(id)
);

-- ==============================================
-- HELPER FUNCTIONS FOR RLS
-- ==============================================

-- Get current user's role
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public."Couples_profiles" WHERE id = auth.uid();
$$;

-- Get current user's couple_id
CREATE OR REPLACE FUNCTION get_my_couple_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT couple_id FROM public."Couples_profiles" WHERE id = auth.uid();
$$;

-- ==============================================
-- ROW LEVEL SECURITY POLICIES
-- ==============================================

-- 1. PROFILES
ALTER TABLE public."Couples_profiles" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can see own profile" ON public."Couples_profiles";
CREATE POLICY "Users can see own profile"
ON public."Couples_profiles" FOR SELECT
USING ( auth.uid() = id );

DROP POLICY IF EXISTS "Partners can see each other's profile" ON public."Couples_profiles";
CREATE POLICY "Partners can see each other's profile"
ON public."Couples_profiles" FOR SELECT
USING ( couple_id = get_my_couple_id() AND couple_id IS NOT NULL );

DROP POLICY IF EXISTS "Therapist can see their clients' profiles" ON public."Couples_profiles";
CREATE POLICY "Therapist can see their clients' profiles"
ON public."Couples_profiles" FOR SELECT
USING (
  get_my_role() = 'therapist'
  AND id IN (
    SELECT partner1_id FROM public."Couples_couples" WHERE therapist_id = auth.uid()
    UNION
    SELECT partner2_id FROM public."Couples_couples" WHERE therapist_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can update own profile" ON public."Couples_profiles";
CREATE POLICY "Users can update own profile"
ON public."Couples_profiles" FOR UPDATE
USING ( auth.uid() = id ) WITH CHECK ( auth.uid() = id );

DROP POLICY IF EXISTS "Users can insert own profile" ON public."Couples_profiles";
CREATE POLICY "Users can insert own profile"
ON public."Couples_profiles" FOR INSERT
WITH CHECK ( auth.uid() = id );

-- 2. COUPLES
ALTER TABLE public."Couples_couples" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can see their couple" ON public."Couples_couples";
CREATE POLICY "Users can see their couple"
ON public."Couples_couples" FOR SELECT
USING (
  id = get_my_couple_id()
  OR therapist_id = auth.uid()
);

-- 3. LOVE LANGUAGES
ALTER TABLE public."Couples_love_languages" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Couples_love_languages" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can see love languages in their couple" ON public."Couples_love_languages";
CREATE POLICY "Users can see love languages in their couple"
ON public."Couples_love_languages" FOR SELECT
USING (
  user_id IN (
    SELECT partner1_id FROM public."Couples_couples" WHERE id = get_my_couple_id()
    UNION
    SELECT partner2_id FROM public."Couples_couples" WHERE id = get_my_couple_id()
  )
  OR
  (
    get_my_role() = 'therapist'
    AND EXISTS (
      SELECT 1 FROM public."Couples_profiles" p
      WHERE p.id = user_id AND p.couple_id IN (
        SELECT id FROM public."Couples_couples" WHERE therapist_id = auth.uid()
      )
    )
  )
);

DROP POLICY IF EXISTS "Users can insert own love language" ON public."Couples_love_languages";
CREATE POLICY "Users can insert own love language"
ON public."Couples_love_languages" FOR INSERT
WITH CHECK ( auth.uid() = user_id );

-- 4. WEEKLY CHECK-INS (Most private - only author and therapist can see)
ALTER TABLE public."Couples_weekly_checkins" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Couples_weekly_checkins" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can see own check-ins or therapist can see all" ON public."Couples_weekly_checkins";
CREATE POLICY "Users can see own check-ins or therapist can see all"
ON public."Couples_weekly_checkins" FOR SELECT
USING (
  auth.uid() = user_id
  OR
  (
    get_my_role() = 'therapist'
    AND EXISTS (
      SELECT 1 FROM public."Couples_couples"
      WHERE id = couple_id AND therapist_id = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS "Users can insert own check-ins" ON public."Couples_weekly_checkins";
CREATE POLICY "Users can insert own check-ins"
ON public."Couples_weekly_checkins" FOR INSERT
WITH CHECK ( auth.uid() = user_id AND couple_id = get_my_couple_id() );

-- 5. GRATITUDE LOGS (Shared data)
ALTER TABLE public."Couples_gratitude_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Couples_gratitude_logs" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Couple and therapist can see gratitude logs" ON public."Couples_gratitude_logs";
CREATE POLICY "Couple and therapist can see gratitude logs"
ON public."Couples_gratitude_logs" FOR SELECT
USING (
  couple_id = get_my_couple_id()
  OR
  (
    get_my_role() = 'therapist'
    AND EXISTS (
      SELECT 1 FROM public."Couples_couples"
      WHERE id = couple_id AND therapist_id = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS "Users can insert gratitude logs" ON public."Couples_gratitude_logs";
CREATE POLICY "Users can insert gratitude logs"
ON public."Couples_gratitude_logs" FOR INSERT
WITH CHECK ( auth.uid() = user_id AND couple_id = get_my_couple_id() );

-- 6. SHARED GOALS
ALTER TABLE public."Couples_shared_goals" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Couples_shared_goals" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Couple and therapist can see goals" ON public."Couples_shared_goals";
CREATE POLICY "Couple and therapist can see goals"
ON public."Couples_shared_goals" FOR SELECT
USING (
  couple_id = get_my_couple_id()
  OR
  (
    get_my_role() = 'therapist'
    AND EXISTS (
      SELECT 1 FROM public."Couples_couples"
      WHERE id = couple_id AND therapist_id = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS "Users can insert goals" ON public."Couples_shared_goals";
CREATE POLICY "Users can insert goals"
ON public."Couples_shared_goals" FOR INSERT
WITH CHECK ( auth.uid() = created_by AND couple_id = get_my_couple_id() );

DROP POLICY IF EXISTS "Users can update goals" ON public."Couples_shared_goals";
CREATE POLICY "Users can update goals"
ON public."Couples_shared_goals" FOR UPDATE
USING ( couple_id = get_my_couple_id() )
WITH CHECK ( couple_id = get_my_couple_id() );

-- 7. THERAPIST COMMENTS
ALTER TABLE public."Couples_therapist_comments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Couples_therapist_comments" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Therapist can see all their comments" ON public."Couples_therapist_comments";
CREATE POLICY "Therapist can see all their comments"
ON public."Couples_therapist_comments" FOR SELECT
USING ( therapist_id = auth.uid() );

DROP POLICY IF EXISTS "Couples can see non-private comments" ON public."Couples_therapist_comments";
CREATE POLICY "Couples can see non-private comments"
ON public."Couples_therapist_comments" FOR SELECT
USING (
  couple_id = get_my_couple_id()
  AND is_private_note = false
);

DROP POLICY IF EXISTS "Therapist can insert comments" ON public."Couples_therapist_comments";
CREATE POLICY "Therapist can insert comments"
ON public."Couples_therapist_comments" FOR INSERT
WITH CHECK ( therapist_id = auth.uid() AND get_my_role() = 'therapist' );

-- 8. CONVERSATIONS
ALTER TABLE public."Couples_conversations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Couples_conversations" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Couple and therapist can see conversations" ON public."Couples_conversations";
CREATE POLICY "Couple and therapist can see conversations"
ON public."Couples_conversations" FOR SELECT
USING (
  couple_id = get_my_couple_id()
  OR
  (
    get_my_role() = 'therapist'
    AND EXISTS (
      SELECT 1 FROM public."Couples_couples"
      WHERE id = couple_id AND therapist_id = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS "Users can insert conversations" ON public."Couples_conversations";
CREATE POLICY "Users can insert conversations"
ON public."Couples_conversations" FOR INSERT
WITH CHECK ( couple_id = get_my_couple_id() );

DROP POLICY IF EXISTS "Users can update conversations" ON public."Couples_conversations";
CREATE POLICY "Users can update conversations"
ON public."Couples_conversations" FOR UPDATE
USING ( couple_id = get_my_couple_id() )
WITH CHECK ( couple_id = get_my_couple_id() );

-- 9. RITUALS
ALTER TABLE public."Couples_rituals" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Couples_rituals" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Couple and therapist can see rituals" ON public."Couples_rituals";
CREATE POLICY "Couple and therapist can see rituals"
ON public."Couples_rituals" FOR SELECT
USING (
  couple_id = get_my_couple_id()
  OR
  (
    get_my_role() = 'therapist'
    AND EXISTS (
      SELECT 1 FROM public."Couples_couples"
      WHERE id = couple_id AND therapist_id = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS "Users can insert rituals" ON public."Couples_rituals";
CREATE POLICY "Users can insert rituals"
ON public."Couples_rituals" FOR INSERT
WITH CHECK ( couple_id = get_my_couple_id() );

-- ==============================================
-- INDEXES FOR PERFORMANCE
-- ==============================================

CREATE INDEX IF NOT EXISTS idx_profiles_couple_id ON public."Couples_profiles"(couple_id);
CREATE INDEX IF NOT EXISTS idx_gratitude_couple_id ON public."Couples_gratitude_logs"(couple_id);
CREATE INDEX IF NOT EXISTS idx_checkins_couple_id ON public."Couples_weekly_checkins"(couple_id);
CREATE INDEX IF NOT EXISTS idx_goals_couple_id ON public."Couples_shared_goals"(couple_id);
CREATE INDEX IF NOT EXISTS idx_comments_couple_id ON public."Couples_therapist_comments"(couple_id);
CREATE INDEX IF NOT EXISTS idx_conversations_couple_id ON public."Couples_conversations"(couple_id);
CREATE INDEX IF NOT EXISTS idx_rituals_couple_id ON public."Couples_rituals"(couple_id);

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'TADI Platform database setup completed successfully!';
  RAISE NOTICE 'All tables created with Couples_ prefix';
  RAISE NOTICE 'Row Level Security (RLS) policies enabled and configured';
END $$;

-- ============================================
-- ALEIC NEW FEATURES MIGRATION
-- ============================================
-- This migration adds 4 new features:
-- 1. Attachment Style Assessment
-- 2. Enneagram Couple Dynamics
-- 3. Shared Couple Journal
-- 4. Financial Communication Toolkit
--
-- Run this in Supabase SQL Editor after main setup
-- ============================================

-- ============================================
-- ATTACHMENT STYLE ASSESSMENT TABLES
-- ============================================

-- 23. ATTACHMENT QUESTIONS (Question Bank)
CREATE TABLE IF NOT EXISTS public."Couples_attachment_questions" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_text TEXT NOT NULL,
  attachment_category TEXT NOT NULL CHECK (attachment_category IN ('secure', 'anxious', 'avoidant', 'disorganized')),
  reverse_scored BOOLEAN NOT NULL DEFAULT FALSE
);

-- 24. ATTACHMENT SESSIONS (Assessment instances)
CREATE TABLE IF NOT EXISTS public."Couples_attachment_sessions" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  couple_id UUID NOT NULL REFERENCES public."Couples_couples"(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  is_completed BOOLEAN NOT NULL DEFAULT FALSE
);

-- 25. ATTACHMENT RESPONSES (User answers to questions)
CREATE TABLE IF NOT EXISTS public."Couples_attachment_responses" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public."Couples_attachment_sessions"(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public."Couples_attachment_questions"(id) ON DELETE CASCADE,
  response_value INTEGER NOT NULL CHECK (response_value BETWEEN 1 AND 5),
  UNIQUE (session_id, question_id)
);

-- 26. ATTACHMENT RESULTS (Calculated attachment style scores)
CREATE TABLE IF NOT EXISTS public."Couples_attachment_results" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL UNIQUE REFERENCES public."Couples_attachment_sessions"(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  couple_id UUID NOT NULL REFERENCES public."Couples_couples"(id) ON DELETE CASCADE,
  primary_attachment_style TEXT NOT NULL CHECK (primary_attachment_style IN ('secure', 'anxious', 'avoidant', 'disorganized')),
  attachment_scores JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 27. ATTACHMENT DYNAMICS (Couple-level attachment patterns)
CREATE TABLE IF NOT EXISTS public."Couples_attachment_dynamics" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID NOT NULL UNIQUE REFERENCES public."Couples_couples"(id) ON DELETE CASCADE,
  partner1_style TEXT,
  partner2_style TEXT,
  dynamic_pattern TEXT,
  therapist_notes TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 28. ATTACHMENT TRIGGERS (Moments tracker)
CREATE TABLE IF NOT EXISTS public."Couples_attachment_triggers" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  couple_id UUID NOT NULL REFERENCES public."Couples_couples"(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  trigger_description TEXT NOT NULL,
  emotional_response TEXT,
  coping_strategy TEXT
);

-- 29. ATTACHMENT REPAIR SCRIPTS (Pre-written responses for attachment styles)
CREATE TABLE IF NOT EXISTS public."Couples_attachment_repair_scripts" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attachment_style TEXT NOT NULL CHECK (attachment_style IN ('secure', 'anxious', 'avoidant', 'disorganized')),
  situation_category TEXT NOT NULL,
  script_text TEXT NOT NULL,
  therapist_tip TEXT
);

-- ============================================
-- ENNEAGRAM COUPLE DYNAMICS TABLES
-- ============================================

-- 30. ENNEAGRAM QUESTIONS (Question Bank)
CREATE TABLE IF NOT EXISTS public."Couples_enneagram_questions" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_text TEXT NOT NULL,
  enneagram_type INTEGER CHECK (enneagram_type BETWEEN 1 AND 9 OR enneagram_type IS NULL)
);

-- 31. ENNEAGRAM SESSIONS (Assessment instances)
CREATE TABLE IF NOT EXISTS public."Couples_enneagram_sessions" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  couple_id UUID NOT NULL REFERENCES public."Couples_couples"(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  is_completed BOOLEAN NOT NULL DEFAULT FALSE
);

-- 32. ENNEAGRAM RESPONSES (User answers to questions)
CREATE TABLE IF NOT EXISTS public."Couples_enneagram_responses" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public."Couples_enneagram_sessions"(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public."Couples_enneagram_questions"(id) ON DELETE CASCADE,
  response_value INTEGER NOT NULL CHECK (response_value BETWEEN 1 AND 5),
  UNIQUE (session_id, question_id)
);

-- 33. ENNEAGRAM RESULTS (Calculated enneagram type scores)
CREATE TABLE IF NOT EXISTS public."Couples_enneagram_results" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL UNIQUE REFERENCES public."Couples_enneagram_sessions"(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  couple_id UUID NOT NULL REFERENCES public."Couples_couples"(id) ON DELETE CASCADE,
  dominant_type INTEGER NOT NULL CHECK (dominant_type BETWEEN 1 AND 9),
  secondary_type INTEGER CHECK (secondary_type BETWEEN 1 AND 9),
  enneagram_scores JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 34. ENNEAGRAM COUPLE REPORTS (Couple compatibility insights)
CREATE TABLE IF NOT EXISTS public."Couples_enneagram_couple_reports" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID NOT NULL UNIQUE REFERENCES public."Couples_couples"(id) ON DELETE CASCADE,
  partner1_type INTEGER CHECK (partner1_type BETWEEN 1 AND 9),
  partner2_type INTEGER CHECK (partner2_type BETWEEN 1 AND 9),
  compatibility_notes TEXT,
  growth_opportunities TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- SHARED COUPLE JOURNAL TABLES
-- ============================================

-- 35. JOURNAL ENTRIES
CREATE TABLE IF NOT EXISTS public."Couples_journal_entries" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID NOT NULL REFERENCES public."Couples_couples"(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  entry_mode TEXT NOT NULL CHECK (entry_mode IN ('individual', 'joint')),
  visibility TEXT NOT NULL CHECK (visibility IN ('private', 'shared_with_partner', 'shared_with_therapist')),
  entry_content TEXT NOT NULL,
  mood TEXT,
  is_favorite BOOLEAN NOT NULL DEFAULT FALSE
);

-- 36. JOURNAL MEDIA ATTACHMENTS
CREATE TABLE IF NOT EXISTS public."Couples_journal_attachments" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id UUID NOT NULL REFERENCES public."Couples_journal_entries"(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  caption TEXT
);

-- 37. JOURNAL MILESTONES
CREATE TABLE IF NOT EXISTS public."Couples_journal_milestones" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID NOT NULL REFERENCES public."Couples_couples"(id) ON DELETE CASCADE,
  entry_id UUID REFERENCES public."Couples_journal_entries"(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  milestone_date DATE NOT NULL,
  milestone_title TEXT NOT NULL,
  milestone_description TEXT
);

-- 38. JOURNAL PROMPTS (Writing prompts for couples)
CREATE TABLE IF NOT EXISTS public."Couples_journal_prompts" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_text TEXT NOT NULL,
  category TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- 39. JOURNAL THERAPIST SHARES (Track when entries are shared with therapist)
CREATE TABLE IF NOT EXISTS public."Couples_journal_shares" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id UUID NOT NULL REFERENCES public."Couples_journal_entries"(id) ON DELETE CASCADE,
  therapist_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shared_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  therapist_viewed BOOLEAN NOT NULL DEFAULT FALSE,
  therapist_notes TEXT
);

-- ============================================
-- FINANCIAL COMMUNICATION TOOLKIT TABLES
-- ============================================

-- 40. FINANCIAL VALUES
CREATE TABLE IF NOT EXISTS public."Couples_financial_values" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID NOT NULL REFERENCES public."Couples_couples"(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  value_statement TEXT NOT NULL,
  priority_level INTEGER CHECK (priority_level BETWEEN 1 AND 5)
);

-- 41. FINANCIAL BUDGET CATEGORIES
CREATE TABLE IF NOT EXISTS public."Couples_financial_budgets" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID NOT NULL REFERENCES public."Couples_couples"(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  category_name TEXT NOT NULL,
  budgeted_amount NUMERIC(12,2) NOT NULL CHECK (budgeted_amount >= 0),
  spent_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (spent_amount >= 0),
  month_year TEXT NOT NULL,
  UNIQUE (couple_id, category_name, month_year)
);

-- 42. FINANCIAL GOALS
CREATE TABLE IF NOT EXISTS public."Couples_financial_goals" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID NOT NULL REFERENCES public."Couples_couples"(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  goal_title TEXT NOT NULL,
  target_amount NUMERIC(12,2) NOT NULL CHECK (target_amount >= 0),
  current_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (current_amount >= 0),
  target_date DATE,
  is_achieved BOOLEAN NOT NULL DEFAULT FALSE
);

-- 43. FINANCIAL DISCUSSIONS (Log important money conversations)
CREATE TABLE IF NOT EXISTS public."Couples_financial_discussions" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID NOT NULL REFERENCES public."Couples_couples"(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  discussion_topic TEXT NOT NULL,
  decisions_made TEXT,
  follow_up_needed BOOLEAN NOT NULL DEFAULT FALSE
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

-- Attachment Assessment Indexes
CREATE INDEX IF NOT EXISTS idx_attachment_sessions_user ON public."Couples_attachment_sessions"(user_id);
CREATE INDEX IF NOT EXISTS idx_attachment_sessions_couple ON public."Couples_attachment_sessions"(couple_id);
CREATE INDEX IF NOT EXISTS idx_attachment_responses_session ON public."Couples_attachment_responses"(session_id);
CREATE INDEX IF NOT EXISTS idx_attachment_results_couple ON public."Couples_attachment_results"(couple_id);

-- Enneagram Indexes
CREATE INDEX IF NOT EXISTS idx_enneagram_sessions_user ON public."Couples_enneagram_sessions"(user_id);
CREATE INDEX IF NOT EXISTS idx_enneagram_sessions_couple ON public."Couples_enneagram_sessions"(couple_id);
CREATE INDEX IF NOT EXISTS idx_enneagram_responses_session ON public."Couples_enneagram_responses"(session_id);
CREATE INDEX IF NOT EXISTS idx_enneagram_results_couple ON public."Couples_enneagram_results"(couple_id);

-- Journal Indexes
CREATE INDEX IF NOT EXISTS idx_journal_entries_couple ON public."Couples_journal_entries"(couple_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_author ON public."Couples_journal_entries"(author_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_created ON public."Couples_journal_entries"(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_journal_attachments_entry ON public."Couples_journal_attachments"(entry_id);
CREATE INDEX IF NOT EXISTS idx_journal_milestones_couple ON public."Couples_journal_milestones"(couple_id);

-- Financial Indexes
CREATE INDEX IF NOT EXISTS idx_financial_budgets_couple ON public."Couples_financial_budgets"(couple_id);
CREATE INDEX IF NOT EXISTS idx_financial_goals_couple ON public."Couples_financial_goals"(couple_id);
CREATE INDEX IF NOT EXISTS idx_financial_values_couple ON public."Couples_financial_values"(couple_id);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to get user's couple_id from their profile
CREATE OR REPLACE FUNCTION get_my_couple_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  my_couple_id UUID;
BEGIN
  SELECT couple_id INTO my_couple_id
  FROM public."Couples_profiles"
  WHERE id = auth.uid();
  
  RETURN my_couple_id;
END;
$$;

-- Function to check if user is a therapist for a given couple
CREATE OR REPLACE FUNCTION is_therapist_for_couple(check_couple_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  is_therapist BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public."Couples_couples"
    WHERE id = check_couple_id
    AND therapist_id = auth.uid()
  ) INTO is_therapist;
  
  RETURN is_therapist;
END;
$$;

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all new tables
ALTER TABLE public."Couples_attachment_questions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Couples_attachment_sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Couples_attachment_responses" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Couples_attachment_results" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Couples_attachment_dynamics" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Couples_attachment_triggers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Couples_attachment_repair_scripts" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."Couples_enneagram_questions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Couples_enneagram_sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Couples_enneagram_responses" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Couples_enneagram_results" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Couples_enneagram_couple_reports" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."Couples_journal_entries" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Couples_journal_attachments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Couples_journal_milestones" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Couples_journal_prompts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Couples_journal_shares" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."Couples_financial_values" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Couples_financial_budgets" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Couples_financial_goals" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Couples_financial_discussions" ENABLE ROW LEVEL SECURITY;

-- ============================================
-- ATTACHMENT ASSESSMENT RLS POLICIES
-- ============================================

-- Questions are public (read-only)
CREATE POLICY "Everyone can view attachment questions"
ON public."Couples_attachment_questions" FOR SELECT
TO authenticated
USING (true);

-- Sessions: Users can only manage their own
CREATE POLICY "Users can view their own attachment sessions"
ON public."Couples_attachment_sessions" FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can create their own attachment sessions"
ON public."Couples_attachment_sessions" FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid() AND couple_id = get_my_couple_id());

CREATE POLICY "Users can update their own attachment sessions"
ON public."Couples_attachment_sessions" FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Therapists can view couple's sessions
CREATE POLICY "Therapists can view couple attachment sessions"
ON public."Couples_attachment_sessions" FOR SELECT
TO authenticated
USING (is_therapist_for_couple(couple_id));

-- Responses: Users manage their own session responses
CREATE POLICY "Users can manage their attachment responses"
ON public."Couples_attachment_responses" FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public."Couples_attachment_sessions" s
    WHERE s.id = session_id AND s.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public."Couples_attachment_sessions" s
    WHERE s.id = session_id AND s.user_id = auth.uid()
  )
);

-- Results: Users can view their own, therapists can view their couples' results
CREATE POLICY "Users can view their own attachment results"
ON public."Couples_attachment_results" FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can create their own attachment results"
ON public."Couples_attachment_results" FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid() AND couple_id = get_my_couple_id());

CREATE POLICY "Therapists can view couple attachment results"
ON public."Couples_attachment_results" FOR SELECT
TO authenticated
USING (is_therapist_for_couple(couple_id));

-- Dynamics: Couple members can view, therapists can manage
CREATE POLICY "Couples can view their attachment dynamics"
ON public."Couples_attachment_dynamics" FOR SELECT
TO authenticated
USING (couple_id = get_my_couple_id());

CREATE POLICY "Therapists can manage couple attachment dynamics"
ON public."Couples_attachment_dynamics" FOR ALL
TO authenticated
USING (is_therapist_for_couple(couple_id))
WITH CHECK (is_therapist_for_couple(couple_id));

-- Triggers: Users manage their own
CREATE POLICY "Users can manage their attachment triggers"
ON public."Couples_attachment_triggers" FOR ALL
TO authenticated
USING (user_id = auth.uid() AND couple_id = get_my_couple_id())
WITH CHECK (user_id = auth.uid() AND couple_id = get_my_couple_id());

-- Repair Scripts: Everyone can read
CREATE POLICY "Everyone can view attachment repair scripts"
ON public."Couples_attachment_repair_scripts" FOR SELECT
TO authenticated
USING (true);

-- ============================================
-- ENNEAGRAM ASSESSMENT RLS POLICIES
-- ============================================

-- Questions are public (read-only)
CREATE POLICY "Everyone can view enneagram questions"
ON public."Couples_enneagram_questions" FOR SELECT
TO authenticated
USING (true);

-- Sessions: Users can only manage their own
CREATE POLICY "Users can view their own enneagram sessions"
ON public."Couples_enneagram_sessions" FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can create their own enneagram sessions"
ON public."Couples_enneagram_sessions" FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid() AND couple_id = get_my_couple_id());

CREATE POLICY "Users can update their own enneagram sessions"
ON public."Couples_enneagram_sessions" FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Therapists can view couple's sessions
CREATE POLICY "Therapists can view couple enneagram sessions"
ON public."Couples_enneagram_sessions" FOR SELECT
TO authenticated
USING (is_therapist_for_couple(couple_id));

-- Responses: Users manage their own session responses
CREATE POLICY "Users can manage their enneagram responses"
ON public."Couples_enneagram_responses" FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public."Couples_enneagram_sessions" s
    WHERE s.id = session_id AND s.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public."Couples_enneagram_sessions" s
    WHERE s.id = session_id AND s.user_id = auth.uid()
  )
);

-- Results: Users can view their own, therapists can view their couples' results
CREATE POLICY "Users can view their own enneagram results"
ON public."Couples_enneagram_results" FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can create their own enneagram results"
ON public."Couples_enneagram_results" FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid() AND couple_id = get_my_couple_id());

CREATE POLICY "Therapists can view couple enneagram results"
ON public."Couples_enneagram_results" FOR SELECT
TO authenticated
USING (is_therapist_for_couple(couple_id));

-- Couple Reports: Couples and therapists can view
CREATE POLICY "Couples can view their enneagram reports"
ON public."Couples_enneagram_couple_reports" FOR SELECT
TO authenticated
USING (couple_id = get_my_couple_id());

CREATE POLICY "Therapists can manage couple enneagram reports"
ON public."Couples_enneagram_couple_reports" FOR ALL
TO authenticated
USING (is_therapist_for_couple(couple_id))
WITH CHECK (is_therapist_for_couple(couple_id));

-- ============================================
-- JOURNAL RLS POLICIES
-- ============================================

-- Journal Entries: Privacy-aware access control
CREATE POLICY "Users can view their own journal entries"
ON public."Couples_journal_entries" FOR SELECT
TO authenticated
USING (author_id = auth.uid());

CREATE POLICY "Users can view partner's shared journal entries"
ON public."Couples_journal_entries" FOR SELECT
TO authenticated
USING (
  couple_id = get_my_couple_id()
  AND visibility IN ('shared_with_partner', 'shared_with_therapist')
);

CREATE POLICY "Therapists can view therapist-shared journal entries"
ON public."Couples_journal_entries" FOR SELECT
TO authenticated
USING (
  visibility = 'shared_with_therapist'
  AND is_therapist_for_couple(couple_id)
);

CREATE POLICY "Users can create journal entries"
ON public."Couples_journal_entries" FOR INSERT
TO authenticated
WITH CHECK (author_id = auth.uid() AND couple_id = get_my_couple_id());

CREATE POLICY "Users can update their own journal entries"
ON public."Couples_journal_entries" FOR UPDATE
TO authenticated
USING (author_id = auth.uid())
WITH CHECK (author_id = auth.uid());

CREATE POLICY "Users can delete their own journal entries"
ON public."Couples_journal_entries" FOR DELETE
TO authenticated
USING (author_id = auth.uid());

-- Journal Attachments: Follow entry visibility
CREATE POLICY "Users can view journal attachments"
ON public."Couples_journal_attachments" FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public."Couples_journal_entries" e
    WHERE e.id = entry_id
    AND (
      e.author_id = auth.uid()
      OR (e.couple_id = get_my_couple_id() AND e.visibility IN ('shared_with_partner', 'shared_with_therapist'))
      OR (e.visibility = 'shared_with_therapist' AND is_therapist_for_couple(e.couple_id))
    )
  )
);

CREATE POLICY "Users can manage their own journal attachments"
ON public."Couples_journal_attachments" FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public."Couples_journal_entries" e
    WHERE e.id = entry_id AND e.author_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public."Couples_journal_entries" e
    WHERE e.id = entry_id AND e.author_id = auth.uid()
  )
);

-- Journal Milestones: Couple-shared
CREATE POLICY "Couples can manage their journal milestones"
ON public."Couples_journal_milestones" FOR ALL
TO authenticated
USING (couple_id = get_my_couple_id())
WITH CHECK (couple_id = get_my_couple_id());

CREATE POLICY "Therapists can view couple journal milestones"
ON public."Couples_journal_milestones" FOR SELECT
TO authenticated
USING (is_therapist_for_couple(couple_id));

-- Journal Prompts: Public read-only
CREATE POLICY "Everyone can view journal prompts"
ON public."Couples_journal_prompts" FOR SELECT
TO authenticated
USING (is_active = true);

-- Journal Shares: Track therapist access
CREATE POLICY "Therapists can view their journal shares"
ON public."Couples_journal_shares" FOR SELECT
TO authenticated
USING (therapist_id = auth.uid());

CREATE POLICY "System can create journal shares"
ON public."Couples_journal_shares" FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public."Couples_journal_entries" e
    WHERE e.id = entry_id
    AND (e.author_id = auth.uid() OR e.couple_id = get_my_couple_id())
  )
);

CREATE POLICY "Therapists can update their journal shares"
ON public."Couples_journal_shares" FOR UPDATE
TO authenticated
USING (therapist_id = auth.uid())
WITH CHECK (therapist_id = auth.uid());

-- ============================================
-- FINANCIAL TOOLKIT RLS POLICIES
-- ============================================

-- Financial Values: Couple-shared
CREATE POLICY "Couples can manage their financial values"
ON public."Couples_financial_values" FOR ALL
TO authenticated
USING (couple_id = get_my_couple_id())
WITH CHECK (couple_id = get_my_couple_id() AND user_id = auth.uid());

CREATE POLICY "Therapists can view couple financial values"
ON public."Couples_financial_values" FOR SELECT
TO authenticated
USING (is_therapist_for_couple(couple_id));

-- Financial Budgets: Couple-shared
CREATE POLICY "Couples can manage their financial budgets"
ON public."Couples_financial_budgets" FOR ALL
TO authenticated
USING (couple_id = get_my_couple_id())
WITH CHECK (couple_id = get_my_couple_id());

CREATE POLICY "Therapists can view couple financial budgets"
ON public."Couples_financial_budgets" FOR SELECT
TO authenticated
USING (is_therapist_for_couple(couple_id));

-- Financial Goals: Couple-shared
CREATE POLICY "Couples can manage their financial goals"
ON public."Couples_financial_goals" FOR ALL
TO authenticated
USING (couple_id = get_my_couple_id())
WITH CHECK (couple_id = get_my_couple_id());

CREATE POLICY "Therapists can view couple financial goals"
ON public."Couples_financial_goals" FOR SELECT
TO authenticated
USING (is_therapist_for_couple(couple_id));

-- Financial Discussions: Couple-shared
CREATE POLICY "Couples can manage their financial discussions"
ON public."Couples_financial_discussions" FOR ALL
TO authenticated
USING (couple_id = get_my_couple_id())
WITH CHECK (couple_id = get_my_couple_id());

CREATE POLICY "Therapists can view couple financial discussions"
ON public."Couples_financial_discussions" FOR SELECT
TO authenticated
USING (is_therapist_for_couple(couple_id));

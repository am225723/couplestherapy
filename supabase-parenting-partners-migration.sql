-- Parenting as Partners (Co-Parenting Alignment) Migration
-- This feature helps couples align on parenting approach and protect couple time

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================
-- PARENTING STYLE ASSESSMENT TABLE
-- ==============================================

CREATE TABLE IF NOT EXISTS public."Couples_parenting_styles" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  couple_id UUID NOT NULL REFERENCES public."Couples_couples"(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public."Couples_profiles"(id) ON DELETE CASCADE,
  style_type TEXT CHECK (style_type IN ('authoritative', 'authoritarian', 'permissive', 'uninvolved', 'mixed')),
  discipline_approach TEXT,
  values_text TEXT,
  stress_areas TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ==============================================
-- DISCIPLINE AGREEMENTS TABLE
-- ==============================================

CREATE TABLE IF NOT EXISTS public."Couples_discipline_agreements" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  couple_id UUID NOT NULL REFERENCES public."Couples_couples"(id) ON DELETE CASCADE,
  scenario TEXT NOT NULL,
  agreed_approach TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ==============================================
-- COUPLE TIME PROTECTION TABLE
-- ==============================================

CREATE TABLE IF NOT EXISTS public."Couples_couple_time_blocks" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  couple_id UUID NOT NULL REFERENCES public."Couples_couples"(id) ON DELETE CASCADE,
  scheduled_date TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER DEFAULT 60,
  activity TEXT,
  completed BOOLEAN DEFAULT FALSE,
  quality_rating INTEGER CHECK (quality_rating >= 1 AND quality_rating <= 10),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- ==============================================
-- PARENTING STRESS CHECK-INS TABLE
-- ==============================================

CREATE TABLE IF NOT EXISTS public."Couples_parenting_stress_checkins" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  couple_id UUID NOT NULL REFERENCES public."Couples_couples"(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public."Couples_profiles"(id) ON DELETE CASCADE,
  stress_level INTEGER NOT NULL CHECK (stress_level >= 1 AND stress_level <= 10),
  stressor_text TEXT,
  support_needed TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_parenting_styles_couple_id ON public."Couples_parenting_styles"(couple_id);
CREATE INDEX IF NOT EXISTS idx_discipline_agreements_couple_id ON public."Couples_discipline_agreements"(couple_id);
CREATE INDEX IF NOT EXISTS idx_couple_time_blocks_couple_id ON public."Couples_couple_time_blocks"(couple_id);
CREATE INDEX IF NOT EXISTS idx_couple_time_blocks_date ON public."Couples_couple_time_blocks"(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_parenting_stress_checkins_couple_id ON public."Couples_parenting_stress_checkins"(couple_id);
CREATE INDEX IF NOT EXISTS idx_parenting_stress_checkins_created_at ON public."Couples_parenting_stress_checkins"(created_at DESC);

-- ==============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================

ALTER TABLE public."Couples_parenting_styles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Couples_discipline_agreements" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Couples_couple_time_blocks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Couples_parenting_stress_checkins" ENABLE ROW LEVEL SECURITY;

-- Partners can view their couple's parenting styles
CREATE POLICY "Partners can view their couple's parenting styles"
  ON public."Couples_parenting_styles"
  FOR SELECT
  USING (
    couple_id IN (
      SELECT couple_id FROM public."Couples_profiles"
      WHERE id = auth.uid() AND couple_id IS NOT NULL
    )
  );

-- Users can create/update their own parenting style
CREATE POLICY "Users can create their parenting style"
  ON public."Couples_parenting_styles"
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their parenting style"
  ON public."Couples_parenting_styles"
  FOR UPDATE
  USING (user_id = auth.uid());

-- Partners can view their couple's discipline agreements
CREATE POLICY "Partners can view discipline agreements"
  ON public."Couples_discipline_agreements"
  FOR SELECT
  USING (
    couple_id IN (
      SELECT couple_id FROM public."Couples_profiles"
      WHERE id = auth.uid() AND couple_id IS NOT NULL
    )
  );

-- Partners can create discipline agreements
CREATE POLICY "Partners can create discipline agreements"
  ON public."Couples_discipline_agreements"
  FOR INSERT
  WITH CHECK (
    couple_id IN (
      SELECT couple_id FROM public."Couples_profiles"
      WHERE id = auth.uid() AND couple_id IS NOT NULL
    )
  );

-- Partners can update discipline agreements
CREATE POLICY "Partners can update discipline agreements"
  ON public."Couples_discipline_agreements"
  FOR UPDATE
  USING (
    couple_id IN (
      SELECT couple_id FROM public."Couples_profiles"
      WHERE id = auth.uid() AND couple_id IS NOT NULL
    )
  );

-- Partners can view their couple's time blocks
CREATE POLICY "Partners can view couple time blocks"
  ON public."Couples_couple_time_blocks"
  FOR SELECT
  USING (
    couple_id IN (
      SELECT couple_id FROM public."Couples_profiles"
      WHERE id = auth.uid() AND couple_id IS NOT NULL
    )
  );

-- Partners can create couple time blocks
CREATE POLICY "Partners can create couple time blocks"
  ON public."Couples_couple_time_blocks"
  FOR INSERT
  WITH CHECK (
    couple_id IN (
      SELECT couple_id FROM public."Couples_profiles"
      WHERE id = auth.uid() AND couple_id IS NOT NULL
    )
  );

-- Partners can update couple time blocks
CREATE POLICY "Partners can update couple time blocks"
  ON public."Couples_couple_time_blocks"
  FOR UPDATE
  USING (
    couple_id IN (
      SELECT couple_id FROM public."Couples_profiles"
      WHERE id = auth.uid() AND couple_id IS NOT NULL
    )
  );

-- Partners can view their couple's parenting stress check-ins
CREATE POLICY "Partners can view parenting stress check-ins"
  ON public."Couples_parenting_stress_checkins"
  FOR SELECT
  USING (
    couple_id IN (
      SELECT couple_id FROM public."Couples_profiles"
      WHERE id = auth.uid() AND couple_id IS NOT NULL
    )
  );

-- Users can create their own parenting stress check-ins
CREATE POLICY "Users can create parenting stress check-ins"
  ON public."Couples_parenting_stress_checkins"
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Therapists can view their clients' parenting data
CREATE POLICY "Therapists can view client parenting styles"
  ON public."Couples_parenting_styles"
  FOR SELECT
  USING (
    couple_id IN (
      SELECT id FROM public."Couples_couples"
      WHERE therapist_id = auth.uid()
    )
  );

CREATE POLICY "Therapists can view client discipline agreements"
  ON public."Couples_discipline_agreements"
  FOR SELECT
  USING (
    couple_id IN (
      SELECT id FROM public."Couples_couples"
      WHERE therapist_id = auth.uid()
    )
  );

CREATE POLICY "Therapists can view client couple time blocks"
  ON public."Couples_couple_time_blocks"
  FOR SELECT
  USING (
    couple_id IN (
      SELECT id FROM public."Couples_couples"
      WHERE therapist_id = auth.uid()
    )
  );

CREATE POLICY "Therapists can view client parenting stress"
  ON public."Couples_parenting_stress_checkins"
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

ALTER PUBLICATION supabase_realtime ADD TABLE public."Couples_couple_time_blocks";
ALTER PUBLICATION supabase_realtime ADD TABLE public."Couples_parenting_stress_checkins";

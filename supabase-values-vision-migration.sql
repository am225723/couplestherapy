-- Values & Vision (Shared Dreams & Goals) Migration
-- This feature helps couples identify, share, and honor each other's dreams and create a shared vision

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================
-- SHARED DREAMS TABLE
-- ==============================================

CREATE TABLE IF NOT EXISTS public."Couples_shared_dreams" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  couple_id UUID NOT NULL REFERENCES public."Couples_couples"(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public."Couples_profiles"(id) ON DELETE CASCADE,
  dream_text TEXT NOT NULL,
  category TEXT CHECK (category IN ('personal', 'shared', 'career', 'family', 'adventure', 'legacy', 'other')),
  time_horizon TEXT CHECK (time_horizon IN ('1_year', '5_year', '10_year', 'lifetime')),
  is_shared_with_partner BOOLEAN DEFAULT FALSE,
  partner_honored BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ==============================================
-- VISION BOARD ITEMS TABLE (Digital vision board)
-- ==============================================

CREATE TABLE IF NOT EXISTS public."Couples_vision_board_items" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  couple_id UUID NOT NULL REFERENCES public."Couples_couples"(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  category TEXT CHECK (category IN ('relationship', 'home', 'travel', 'family', 'career', 'health', 'spiritual', 'other')),
  time_horizon TEXT CHECK (time_horizon IN ('1_year', '5_year', '10_year', 'lifetime')),
  is_achieved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now(),
  achieved_at TIMESTAMPTZ
);

-- ==============================================
-- CORE VALUES TABLE
-- ==============================================

CREATE TABLE IF NOT EXISTS public."Couples_core_values" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  couple_id UUID NOT NULL REFERENCES public."Couples_couples"(id) ON DELETE CASCADE,
  value_name TEXT NOT NULL,
  definition TEXT,
  is_agreed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_shared_dreams_couple_id ON public."Couples_shared_dreams"(couple_id);
CREATE INDEX IF NOT EXISTS idx_shared_dreams_author_id ON public."Couples_shared_dreams"(author_id);
CREATE INDEX IF NOT EXISTS idx_vision_board_items_couple_id ON public."Couples_vision_board_items"(couple_id);
CREATE INDEX IF NOT EXISTS idx_core_values_couple_id ON public."Couples_core_values"(couple_id);

-- ==============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================

ALTER TABLE public."Couples_shared_dreams" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Couples_vision_board_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Couples_core_values" ENABLE ROW LEVEL SECURITY;

-- Partners can view their couple's shared dreams
CREATE POLICY "Partners can view their couple's shared dreams"
  ON public."Couples_shared_dreams"
  FOR SELECT
  USING (
    couple_id IN (
      SELECT couple_id FROM public."Couples_profiles"
      WHERE id = auth.uid() AND couple_id IS NOT NULL
    )
  );

-- Users can create their own dreams
CREATE POLICY "Users can create dreams"
  ON public."Couples_shared_dreams"
  FOR INSERT
  WITH CHECK (author_id = auth.uid());

-- Users can update their own dreams
CREATE POLICY "Users can update their dreams"
  ON public."Couples_shared_dreams"
  FOR UPDATE
  USING (author_id = auth.uid());

-- Partners can view their couple's vision board
CREATE POLICY "Partners can view their couple's vision board"
  ON public."Couples_vision_board_items"
  FOR SELECT
  USING (
    couple_id IN (
      SELECT couple_id FROM public."Couples_profiles"
      WHERE id = auth.uid() AND couple_id IS NOT NULL
    )
  );

-- Partners can create vision board items
CREATE POLICY "Partners can create vision board items"
  ON public."Couples_vision_board_items"
  FOR INSERT
  WITH CHECK (
    couple_id IN (
      SELECT couple_id FROM public."Couples_profiles"
      WHERE id = auth.uid() AND couple_id IS NOT NULL
    )
  );

-- Partners can update vision board items
CREATE POLICY "Partners can update vision board items"
  ON public."Couples_vision_board_items"
  FOR UPDATE
  USING (
    couple_id IN (
      SELECT couple_id FROM public."Couples_profiles"
      WHERE id = auth.uid() AND couple_id IS NOT NULL
    )
  );

-- Partners can view their couple's core values
CREATE POLICY "Partners can view their couple's core values"
  ON public."Couples_core_values"
  FOR SELECT
  USING (
    couple_id IN (
      SELECT couple_id FROM public."Couples_profiles"
      WHERE id = auth.uid() AND couple_id IS NOT NULL
    )
  );

-- Partners can create core values
CREATE POLICY "Partners can create core values"
  ON public."Couples_core_values"
  FOR INSERT
  WITH CHECK (
    couple_id IN (
      SELECT couple_id FROM public."Couples_profiles"
      WHERE id = auth.uid() AND couple_id IS NOT NULL
    )
  );

-- Partners can update core values
CREATE POLICY "Partners can update core values"
  ON public."Couples_core_values"
  FOR UPDATE
  USING (
    couple_id IN (
      SELECT couple_id FROM public."Couples_profiles"
      WHERE id = auth.uid() AND couple_id IS NOT NULL
    )
  );

-- Therapists can view their clients' values & vision data
CREATE POLICY "Therapists can view client shared dreams"
  ON public."Couples_shared_dreams"
  FOR SELECT
  USING (
    couple_id IN (
      SELECT id FROM public."Couples_couples"
      WHERE therapist_id = auth.uid()
    )
  );

CREATE POLICY "Therapists can view client vision board"
  ON public."Couples_vision_board_items"
  FOR SELECT
  USING (
    couple_id IN (
      SELECT id FROM public."Couples_couples"
      WHERE therapist_id = auth.uid()
    )
  );

CREATE POLICY "Therapists can view client core values"
  ON public."Couples_core_values"
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

ALTER PUBLICATION supabase_realtime ADD TABLE public."Couples_shared_dreams";
ALTER PUBLICATION supabase_realtime ADD TABLE public."Couples_vision_board_items";
ALTER PUBLICATION supabase_realtime ADD TABLE public."Couples_core_values";

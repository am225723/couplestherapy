-- =====================================================
-- RELATIONSHIP GROWTH PLANS TABLE
-- Stores AI-generated growth plans for couples
-- Run this SQL in your Supabase SQL Editor
-- =====================================================

-- Create growth plans table
CREATE TABLE IF NOT EXISTS "Couples_growth_plans" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID NOT NULL REFERENCES "Couples_couples"(id) ON DELETE CASCADE,
  created_by UUID NOT NULL,
  plan_summary TEXT NOT NULL,
  focus_areas TEXT[] DEFAULT '{}',
  exercises JSONB DEFAULT '[]',
  goals JSONB DEFAULT '[]',
  personalization_context JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create exercise progress tracking table
CREATE TABLE IF NOT EXISTS "Couples_growth_exercise_progress" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  growth_plan_id UUID NOT NULL REFERENCES "Couples_growth_plans"(id) ON DELETE CASCADE,
  exercise_id TEXT NOT NULL,
  user_id UUID NOT NULL,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create goal progress tracking table
CREATE TABLE IF NOT EXISTS "Couples_growth_goal_progress" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  growth_plan_id UUID NOT NULL REFERENCES "Couples_growth_plans"(id) ON DELETE CASCADE,
  goal_id TEXT NOT NULL,
  milestone_index INTEGER NOT NULL,
  completed_by UUID NOT NULL,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_growth_plans_couple_id ON "Couples_growth_plans"(couple_id);
CREATE INDEX IF NOT EXISTS idx_growth_plans_active ON "Couples_growth_plans"(is_active);
CREATE INDEX IF NOT EXISTS idx_exercise_progress_plan ON "Couples_growth_exercise_progress"(growth_plan_id);
CREATE INDEX IF NOT EXISTS idx_exercise_progress_user ON "Couples_growth_exercise_progress"(user_id);
CREATE INDEX IF NOT EXISTS idx_goal_progress_plan ON "Couples_growth_goal_progress"(growth_plan_id);

-- Enable RLS
ALTER TABLE "Couples_growth_plans" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Couples_growth_exercise_progress" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Couples_growth_goal_progress" ENABLE ROW LEVEL SECURITY;

-- RLS Policies for growth_plans

-- Couples can view their own growth plans
DROP POLICY IF EXISTS "Couples can view own growth plans" ON "Couples_growth_plans";
CREATE POLICY "Couples can view own growth plans"
  ON "Couples_growth_plans"
  FOR SELECT
  USING (
    couple_id IN (SELECT couple_id FROM "Couples_profiles" WHERE id = auth.uid())
  );

-- Couples can create growth plans for themselves
DROP POLICY IF EXISTS "Couples can create own growth plans" ON "Couples_growth_plans";
CREATE POLICY "Couples can create own growth plans"
  ON "Couples_growth_plans"
  FOR INSERT
  WITH CHECK (
    couple_id IN (SELECT couple_id FROM "Couples_profiles" WHERE id = auth.uid())
  );

-- Couples can update their own growth plans
DROP POLICY IF EXISTS "Couples can update own growth plans" ON "Couples_growth_plans";
CREATE POLICY "Couples can update own growth plans"
  ON "Couples_growth_plans"
  FOR UPDATE
  USING (
    couple_id IN (SELECT couple_id FROM "Couples_profiles" WHERE id = auth.uid())
  );

-- Therapists can view all growth plans
DROP POLICY IF EXISTS "Therapists can view all growth plans" ON "Couples_growth_plans";
CREATE POLICY "Therapists can view all growth plans"
  ON "Couples_growth_plans"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "Couples_profiles"
      WHERE id = auth.uid() AND role = 'therapist'
    )
  );

-- RLS Policies for exercise progress

-- Users can view exercise progress for their couple
DROP POLICY IF EXISTS "Users can view own exercise progress" ON "Couples_growth_exercise_progress";
CREATE POLICY "Users can view own exercise progress"
  ON "Couples_growth_exercise_progress"
  FOR SELECT
  USING (
    growth_plan_id IN (
      SELECT gp.id FROM "Couples_growth_plans" gp
      WHERE gp.couple_id IN (SELECT couple_id FROM "Couples_profiles" WHERE id = auth.uid())
    )
  );

-- Users can log their own exercise progress
DROP POLICY IF EXISTS "Users can log own exercise progress" ON "Couples_growth_exercise_progress";
CREATE POLICY "Users can log own exercise progress"
  ON "Couples_growth_exercise_progress"
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND
    growth_plan_id IN (
      SELECT gp.id FROM "Couples_growth_plans" gp
      WHERE gp.couple_id IN (SELECT couple_id FROM "Couples_profiles" WHERE id = auth.uid())
    )
  );

-- Therapists can view all exercise progress
DROP POLICY IF EXISTS "Therapists can view all exercise progress" ON "Couples_growth_exercise_progress";
CREATE POLICY "Therapists can view all exercise progress"
  ON "Couples_growth_exercise_progress"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "Couples_profiles"
      WHERE id = auth.uid() AND role = 'therapist'
    )
  );

-- RLS Policies for goal progress

-- Users can view goal progress for their couple
DROP POLICY IF EXISTS "Users can view own goal progress" ON "Couples_growth_goal_progress";
CREATE POLICY "Users can view own goal progress"
  ON "Couples_growth_goal_progress"
  FOR SELECT
  USING (
    growth_plan_id IN (
      SELECT gp.id FROM "Couples_growth_plans" gp
      WHERE gp.couple_id IN (SELECT couple_id FROM "Couples_profiles" WHERE id = auth.uid())
    )
  );

-- Users can log their own goal progress
DROP POLICY IF EXISTS "Users can log own goal progress" ON "Couples_growth_goal_progress";
CREATE POLICY "Users can log own goal progress"
  ON "Couples_growth_goal_progress"
  FOR INSERT
  WITH CHECK (
    completed_by = auth.uid() AND
    growth_plan_id IN (
      SELECT gp.id FROM "Couples_growth_plans" gp
      WHERE gp.couple_id IN (SELECT couple_id FROM "Couples_profiles" WHERE id = auth.uid())
    )
  );

-- Therapists can view all goal progress
DROP POLICY IF EXISTS "Therapists can view all goal progress" ON "Couples_growth_goal_progress";
CREATE POLICY "Therapists can view all goal progress"
  ON "Couples_growth_goal_progress"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "Couples_profiles"
      WHERE id = auth.uid() AND role = 'therapist'
    )
  );

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_growth_plans_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS growth_plans_updated ON "Couples_growth_plans";
CREATE TRIGGER growth_plans_updated
  BEFORE UPDATE ON "Couples_growth_plans"
  FOR EACH ROW
  EXECUTE FUNCTION update_growth_plans_timestamp();

-- =====================================================
-- Verify
-- =====================================================
SELECT 'Growth plans tables created successfully' as status;
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'Couples_growth%';

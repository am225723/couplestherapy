-- =====================================================
-- SHARED TO-DO LIST MODULE TABLES
-- Run this SQL in your Supabase SQL Editor
-- =====================================================

-- SHARED TO-DOS TABLE
-- Tasks shared between couples and therapists
CREATE TABLE IF NOT EXISTS "Couples_shared_todos" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID NOT NULL REFERENCES "Couples_couples"(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  assigned_to UUID, -- null = unassigned, user_id = assigned to specific person
  assigned_by UUID NOT NULL, -- who created/assigned the task
  due_date TIMESTAMPTZ,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  category TEXT, -- 'therapy', 'relationship', 'personal', 'household', etc.
  is_completed BOOLEAN DEFAULT FALSE,
  completed_by UUID,
  completed_at TIMESTAMPTZ,
  is_therapist_assigned BOOLEAN DEFAULT FALSE, -- true if assigned by therapist
  therapist_notes TEXT, -- private notes only visible to therapist
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_shared_todos_couple_id ON "Couples_shared_todos"(couple_id);
CREATE INDEX IF NOT EXISTS idx_shared_todos_assigned_to ON "Couples_shared_todos"(assigned_to);
CREATE INDEX IF NOT EXISTS idx_shared_todos_completed ON "Couples_shared_todos"(is_completed);
CREATE INDEX IF NOT EXISTS idx_shared_todos_due_date ON "Couples_shared_todos"(due_date);
CREATE INDEX IF NOT EXISTS idx_shared_todos_couple_completed ON "Couples_shared_todos"(couple_id, is_completed);

-- Enable RLS
ALTER TABLE "Couples_shared_todos" ENABLE ROW LEVEL SECURITY;

-- Users can view their own couple's todos
DROP POLICY IF EXISTS "Users can view own couple todos" ON "Couples_shared_todos";
CREATE POLICY "Users can view own couple todos"
  ON "Couples_shared_todos"
  FOR SELECT
  USING (
    couple_id IN (SELECT couple_id FROM "Couples_profiles" WHERE id = auth.uid())
  );

-- Users can create todos for their own couple
DROP POLICY IF EXISTS "Users can create own couple todos" ON "Couples_shared_todos";
CREATE POLICY "Users can create own couple todos"
  ON "Couples_shared_todos"
  FOR INSERT
  WITH CHECK (
    couple_id IN (SELECT couple_id FROM "Couples_profiles" WHERE id = auth.uid())
  );

-- Users can update their own couple's todos
DROP POLICY IF EXISTS "Users can update own couple todos" ON "Couples_shared_todos";
CREATE POLICY "Users can update own couple todos"
  ON "Couples_shared_todos"
  FOR UPDATE
  USING (
    couple_id IN (SELECT couple_id FROM "Couples_profiles" WHERE id = auth.uid())
  );

-- Users can delete their own couple's todos (only if they created it)
DROP POLICY IF EXISTS "Users can delete own todos" ON "Couples_shared_todos";
CREATE POLICY "Users can delete own todos"
  ON "Couples_shared_todos"
  FOR DELETE
  USING (
    assigned_by = auth.uid() OR 
    couple_id IN (SELECT couple_id FROM "Couples_profiles" WHERE id = auth.uid())
  );

-- Therapists can view all todos
DROP POLICY IF EXISTS "Therapists can view all todos" ON "Couples_shared_todos";
CREATE POLICY "Therapists can view all todos"
  ON "Couples_shared_todos"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "Couples_profiles"
      WHERE id = auth.uid() AND role = 'therapist'
    )
  );

-- Therapists can create todos for any couple
DROP POLICY IF EXISTS "Therapists can create todos" ON "Couples_shared_todos";
CREATE POLICY "Therapists can create todos"
  ON "Couples_shared_todos"
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "Couples_profiles"
      WHERE id = auth.uid() AND role = 'therapist'
    )
  );

-- Therapists can update any todos
DROP POLICY IF EXISTS "Therapists can update todos" ON "Couples_shared_todos";
CREATE POLICY "Therapists can update todos"
  ON "Couples_shared_todos"
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM "Couples_profiles"
      WHERE id = auth.uid() AND role = 'therapist'
    )
  );

-- Therapists can delete therapist-assigned todos
DROP POLICY IF EXISTS "Therapists can delete therapist todos" ON "Couples_shared_todos";
CREATE POLICY "Therapists can delete therapist todos"
  ON "Couples_shared_todos"
  FOR DELETE
  USING (
    is_therapist_assigned = TRUE AND
    EXISTS (
      SELECT 1 FROM "Couples_profiles"
      WHERE id = auth.uid() AND role = 'therapist'
    )
  );

-- Trigger to update updated_at on changes
CREATE OR REPLACE FUNCTION update_shared_todo_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS shared_todo_updated ON "Couples_shared_todos";
CREATE TRIGGER shared_todo_updated
  BEFORE UPDATE ON "Couples_shared_todos"
  FOR EACH ROW
  EXECUTE FUNCTION update_shared_todo_timestamp();

-- =====================================================
-- Verify table
-- =====================================================
SELECT 'Table created:' as status;
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'Couples_shared_todos';

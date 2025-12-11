-- =====================================================
-- SESSION NOTES INTEGRATION FOR SHARED TO-DOS
-- Links to-do items to therapist session notes
-- Run this SQL in your Supabase SQL Editor
-- =====================================================

-- Add session_note_id column to shared_todos table
ALTER TABLE "Couples_shared_todos" 
ADD COLUMN IF NOT EXISTS session_note_id UUID;

-- Create session notes reference table
CREATE TABLE IF NOT EXISTS "Couples_session_notes" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID NOT NULL REFERENCES "Couples_couples"(id) ON DELETE CASCADE,
  therapist_id UUID NOT NULL,
  session_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  title TEXT NOT NULL,
  summary TEXT,
  key_themes TEXT[],
  interventions_used TEXT[],
  homework_assigned TEXT,
  progress_notes TEXT,
  next_session_goals TEXT,
  is_private BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_session_notes_couple_id ON "Couples_session_notes"(couple_id);
CREATE INDEX IF NOT EXISTS idx_session_notes_therapist_id ON "Couples_session_notes"(therapist_id);
CREATE INDEX IF NOT EXISTS idx_session_notes_session_date ON "Couples_session_notes"(session_date DESC);

-- Enable RLS
ALTER TABLE "Couples_session_notes" ENABLE ROW LEVEL SECURITY;

-- Therapists can view and manage all session notes
DROP POLICY IF EXISTS "Therapists can view all session notes" ON "Couples_session_notes";
CREATE POLICY "Therapists can view all session notes"
  ON "Couples_session_notes"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "Couples_profiles"
      WHERE id = auth.uid() AND role = 'therapist'
    )
  );

DROP POLICY IF EXISTS "Therapists can create session notes" ON "Couples_session_notes";
CREATE POLICY "Therapists can create session notes"
  ON "Couples_session_notes"
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "Couples_profiles"
      WHERE id = auth.uid() AND role = 'therapist'
    )
  );

DROP POLICY IF EXISTS "Therapists can update session notes" ON "Couples_session_notes";
CREATE POLICY "Therapists can update session notes"
  ON "Couples_session_notes"
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM "Couples_profiles"
      WHERE id = auth.uid() AND role = 'therapist'
    )
  );

DROP POLICY IF EXISTS "Therapists can delete session notes" ON "Couples_session_notes";
CREATE POLICY "Therapists can delete session notes"
  ON "Couples_session_notes"
  FOR DELETE
  USING (
    therapist_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM "Couples_profiles"
      WHERE id = auth.uid() AND role = 'therapist'
    )
  );

-- Couples can view non-private session notes for their couple
DROP POLICY IF EXISTS "Couples can view non-private session notes" ON "Couples_session_notes";
CREATE POLICY "Couples can view non-private session notes"
  ON "Couples_session_notes"
  FOR SELECT
  USING (
    is_private = FALSE AND
    couple_id IN (SELECT couple_id FROM "Couples_profiles" WHERE id = auth.uid())
  );

-- Add foreign key constraint for session_note_id in shared_todos
-- (Note: This may fail if the table doesn't exist - that's ok, just run the full migration)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_shared_todos_session_note'
  ) THEN
    ALTER TABLE "Couples_shared_todos"
    ADD CONSTRAINT fk_shared_todos_session_note
    FOREIGN KEY (session_note_id) REFERENCES "Couples_session_notes"(id) ON DELETE SET NULL;
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- Ignore errors if constraint already exists or table doesn't exist
  NULL;
END $$;

-- Create index for the foreign key
CREATE INDEX IF NOT EXISTS idx_shared_todos_session_note ON "Couples_shared_todos"(session_note_id);

-- Trigger to update updated_at on changes
CREATE OR REPLACE FUNCTION update_session_notes_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS session_notes_updated ON "Couples_session_notes";
CREATE TRIGGER session_notes_updated
  BEFORE UPDATE ON "Couples_session_notes"
  FOR EACH ROW
  EXECUTE FUNCTION update_session_notes_timestamp();

-- =====================================================
-- Verify
-- =====================================================
SELECT 'Session notes integration complete' as status;
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'Couples_session_notes';

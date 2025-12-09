-- Conflict Resolution Module Tables
-- Creates tables for storing I-Statement sessions and AI interaction logs

-- 1. CONFLICT SESSIONS TABLE
-- Stores saved I-Statements with all components
CREATE TABLE IF NOT EXISTS "Couples_conflict_sessions" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  couple_id UUID NOT NULL,
  
  -- I-Statement components
  feeling TEXT NOT NULL,
  situation TEXT NOT NULL,
  because TEXT NOT NULL,
  request TEXT NOT NULL,
  
  -- Generated content
  firmness INTEGER NOT NULL DEFAULT 50 CHECK (firmness >= 0 AND firmness <= 100),
  enhanced_statement TEXT,
  impact_preview TEXT,
  ai_suggestions JSONB DEFAULT '[]'::jsonb,
  
  -- Metadata
  title TEXT,
  is_favorite BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. CONFLICT AI EVENTS TABLE
-- Audit log for AI interactions (for accountability and debugging)
CREATE TABLE IF NOT EXISTS "Couples_conflict_ai_events" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES "Couples_conflict_sessions"(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Request details
  request_type TEXT NOT NULL CHECK (request_type IN ('generate_statement', 'generate_suggestions')),
  prompt_payload JSONB NOT NULL,
  
  -- Response details
  response_text TEXT,
  response_parsed JSONB,
  error_message TEXT,
  
  -- Performance tracking
  duration_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_conflict_sessions_user ON "Couples_conflict_sessions"(user_id);
CREATE INDEX IF NOT EXISTS idx_conflict_sessions_couple ON "Couples_conflict_sessions"(couple_id);
CREATE INDEX IF NOT EXISTS idx_conflict_sessions_created ON "Couples_conflict_sessions"(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conflict_ai_events_user ON "Couples_conflict_ai_events"(user_id);
CREATE INDEX IF NOT EXISTS idx_conflict_ai_events_session ON "Couples_conflict_ai_events"(session_id);

-- Row Level Security
ALTER TABLE "Couples_conflict_sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Couples_conflict_ai_events" ENABLE ROW LEVEL SECURITY;

-- Policies for Couples_conflict_sessions
-- Users can see their own sessions
CREATE POLICY "Users can view own conflict sessions"
  ON "Couples_conflict_sessions"
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own sessions
CREATE POLICY "Users can create conflict sessions"
  ON "Couples_conflict_sessions"
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own sessions
CREATE POLICY "Users can update own conflict sessions"
  ON "Couples_conflict_sessions"
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own sessions
CREATE POLICY "Users can delete own conflict sessions"
  ON "Couples_conflict_sessions"
  FOR DELETE
  USING (auth.uid() = user_id);

-- Therapists can view all sessions (cross-therapist access)
CREATE POLICY "Therapists can view all conflict sessions"
  ON "Couples_conflict_sessions"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "Couples_profiles"
      WHERE id = auth.uid() AND role = 'therapist'
    )
  );

-- Policies for Couples_conflict_ai_events
-- Users can view their own AI events
CREATE POLICY "Users can view own ai events"
  ON "Couples_conflict_ai_events"
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own AI events
CREATE POLICY "Users can create ai events"
  ON "Couples_conflict_ai_events"
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Note: AI events contain sensitive prompt data - therapist access removed for privacy
-- Therapists should access session data (enhanced statements) not raw AI logs

-- Trigger to update updated_at on session changes
CREATE OR REPLACE FUNCTION update_conflict_session_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER conflict_session_updated
  BEFORE UPDATE ON "Couples_conflict_sessions"
  FOR EACH ROW
  EXECUTE FUNCTION update_conflict_session_timestamp();

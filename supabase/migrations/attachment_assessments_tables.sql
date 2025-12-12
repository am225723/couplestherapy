-- Attachment Assessments Tables
-- This migration creates the tables needed for attachment style assessments

CREATE TABLE IF NOT EXISTS "Couples_attachment_assessments" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID NOT NULL,
  user_id UUID NOT NULL,
  attachment_style VARCHAR(50) NOT NULL,
  score DECIMAL(5,2),
  dynamics_with_partner TEXT,
  triggers TEXT[],
  repair_strategies TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_attachment_assessments_couple_id ON "Couples_attachment_assessments"(couple_id);
CREATE INDEX IF NOT EXISTS idx_attachment_assessments_user_id ON "Couples_attachment_assessments"(user_id);

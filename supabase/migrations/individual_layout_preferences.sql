-- Individual Layout Preferences Table
-- Allows each user to have their own dashboard layout preferences that can override couple defaults

CREATE TABLE IF NOT EXISTS "Couples_individual_layout_preferences" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  couple_id UUID NOT NULL,
  use_personal_layout BOOLEAN DEFAULT FALSE,
  widget_order JSONB,
  enabled_widgets JSONB,
  widget_sizes JSONB,
  hidden_widgets JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_individual_layout_user 
  ON "Couples_individual_layout_preferences" (user_id);
CREATE INDEX IF NOT EXISTS idx_individual_layout_couple 
  ON "Couples_individual_layout_preferences" (couple_id);

-- Enable RLS
ALTER TABLE "Couples_individual_layout_preferences" ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users can view their own preferences
CREATE POLICY "Users can view own preferences"
  ON "Couples_individual_layout_preferences"
  FOR SELECT
  USING (user_id = auth.uid());

-- Users can create their own preferences
CREATE POLICY "Users can create own preferences"
  ON "Couples_individual_layout_preferences"
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can update their own preferences
CREATE POLICY "Users can update own preferences"
  ON "Couples_individual_layout_preferences"
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own preferences
CREATE POLICY "Users can delete own preferences"
  ON "Couples_individual_layout_preferences"
  FOR DELETE
  USING (user_id = auth.uid());

-- Therapists can view preferences for their clients
CREATE POLICY "Therapists can view client preferences"
  ON "Couples_individual_layout_preferences"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "Couples_profiles"
      WHERE id = auth.uid() AND role = 'therapist'
    )
  );

-- Grant access to authenticated users
GRANT ALL ON "Couples_individual_layout_preferences" TO authenticated;

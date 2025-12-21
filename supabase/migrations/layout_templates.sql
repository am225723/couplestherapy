-- Layout Templates Table
-- Allows therapists to save dashboard configurations as reusable templates

CREATE TABLE IF NOT EXISTS "Couples_layout_templates" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  widget_order JSONB NOT NULL,
  enabled_widgets JSONB NOT NULL,
  widget_sizes JSONB NOT NULL,
  widget_content_overrides JSONB DEFAULT '{}',
  is_shared BOOLEAN DEFAULT FALSE,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_layout_templates_therapist 
  ON "Couples_layout_templates" (therapist_id);
CREATE INDEX IF NOT EXISTS idx_layout_templates_shared 
  ON "Couples_layout_templates" (is_shared) WHERE is_shared = TRUE;

-- Enable RLS
ALTER TABLE "Couples_layout_templates" ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Therapists can view their own templates and shared templates
CREATE POLICY "Therapists can view own and shared templates"
  ON "Couples_layout_templates"
  FOR SELECT
  USING (
    therapist_id = auth.uid() 
    OR is_shared = TRUE
  );

-- Therapists can create their own templates
CREATE POLICY "Therapists can create templates"
  ON "Couples_layout_templates"
  FOR INSERT
  WITH CHECK (
    therapist_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM "Couples_profiles"
      WHERE id = auth.uid() AND role = 'therapist'
    )
  );

-- Therapists can update their own templates
CREATE POLICY "Therapists can update own templates"
  ON "Couples_layout_templates"
  FOR UPDATE
  USING (therapist_id = auth.uid())
  WITH CHECK (therapist_id = auth.uid());

-- Therapists can delete their own templates
CREATE POLICY "Therapists can delete own templates"
  ON "Couples_layout_templates"
  FOR DELETE
  USING (therapist_id = auth.uid());

-- Grant access to authenticated users
GRANT ALL ON "Couples_layout_templates" TO authenticated;

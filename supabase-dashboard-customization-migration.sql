-- Dashboard Customization Table Migration
-- Run this in your Supabase SQL Editor

-- Create the dashboard customization table
-- Note: therapist_id is nullable to preserve historical data when therapists are removed
CREATE TABLE IF NOT EXISTS "Couples_dashboard_customization" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID NOT NULL UNIQUE REFERENCES "Couples_couples"(id) ON DELETE CASCADE,
  therapist_id UUID REFERENCES "Couples_profiles"(id) ON DELETE SET NULL,
  widget_order JSONB NOT NULL DEFAULT '["weekly-checkin","love-languages","gratitude","shared-goals","conversations","love-map","voice-memos","calendar","rituals"]'::jsonb,
  enabled_widgets JSONB NOT NULL DEFAULT '{"weekly-checkin":true,"love-languages":true,"gratitude":true,"shared-goals":true,"conversations":true,"love-map":true,"voice-memos":true,"calendar":true,"rituals":true}'::jsonb,
  widget_sizes JSONB NOT NULL DEFAULT '{"weekly-checkin":"medium","love-languages":"medium","gratitude":"medium","shared-goals":"medium","conversations":"medium","love-map":"medium","voice-memos":"medium","calendar":"medium","rituals":"medium"}'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE "Couples_dashboard_customization" ENABLE ROW LEVEL SECURITY;

-- Therapists can view all dashboard customizations
CREATE POLICY "Therapists can view all dashboard customizations"
ON "Couples_dashboard_customization" FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM "Couples_profiles"
    WHERE id = auth.uid() AND role = 'therapist'
  )
);

-- Therapists can create dashboard customizations
CREATE POLICY "Therapists can create dashboard customizations"
ON "Couples_dashboard_customization" FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM "Couples_profiles"
    WHERE id = auth.uid() AND role = 'therapist'
  )
);

-- Therapists can update dashboard customizations
CREATE POLICY "Therapists can update dashboard customizations"
ON "Couples_dashboard_customization" FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM "Couples_profiles"
    WHERE id = auth.uid() AND role = 'therapist'
  )
);

-- Therapists can delete dashboard customizations
CREATE POLICY "Therapists can delete dashboard customizations"
ON "Couples_dashboard_customization" FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM "Couples_profiles"
    WHERE id = auth.uid() AND role = 'therapist'
  )
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_dashboard_customization_couple_id 
ON "Couples_dashboard_customization"(couple_id);

-- Comment for documentation
COMMENT ON TABLE "Couples_dashboard_customization" IS 'Stores therapist customizations for couple dashboards including widget order, enabled status, and sizes';

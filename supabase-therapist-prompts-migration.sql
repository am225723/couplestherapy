-- Migration: Create Couples_therapist_prompts table
-- This table stores custom prompts/suggestions that therapists can set for couples
-- Run this in your Supabase SQL Editor

-- Create the therapist prompts table
CREATE TABLE IF NOT EXISTS "Couples_therapist_prompts" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    couple_id UUID NOT NULL REFERENCES "Couples_couples"(id) ON DELETE CASCADE,
    therapist_id UUID NOT NULL REFERENCES "Couples_profiles"(id) ON DELETE CASCADE,
    tool_name TEXT NOT NULL, -- e.g., "weekly-checkin", "gratitude", "shared-goals"
    title TEXT NOT NULL, -- Display title
    description TEXT, -- Description of the activity
    suggested_action TEXT NOT NULL, -- The prompt/suggestion for the couple
    is_enabled BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_therapist_prompts_couple_id ON "Couples_therapist_prompts"(couple_id);
CREATE INDEX IF NOT EXISTS idx_therapist_prompts_therapist_id ON "Couples_therapist_prompts"(therapist_id);
CREATE INDEX IF NOT EXISTS idx_therapist_prompts_tool_name ON "Couples_therapist_prompts"(tool_name);

-- Enable Row Level Security
ALTER TABLE "Couples_therapist_prompts" ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Therapists can manage prompts for any couple
CREATE POLICY "Therapists can manage prompts" ON "Couples_therapist_prompts"
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM "Couples_profiles"
            WHERE id = auth.uid() AND role = 'therapist'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM "Couples_profiles"
            WHERE id = auth.uid() AND role = 'therapist'
        )
    );

-- RLS Policy: Clients can read prompts for their own couple
CREATE POLICY "Clients can view their prompts" ON "Couples_therapist_prompts"
    FOR SELECT
    USING (
        couple_id IN (
            SELECT couple_id FROM "Couples_profiles"
            WHERE id = auth.uid() AND role = 'client'
        )
    );

-- Grant access to authenticated users
GRANT ALL ON "Couples_therapist_prompts" TO authenticated;

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for auto-updating updated_at
DROP TRIGGER IF EXISTS update_therapist_prompts_updated_at ON "Couples_therapist_prompts";
CREATE TRIGGER update_therapist_prompts_updated_at
    BEFORE UPDATE ON "Couples_therapist_prompts"
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Couples_therapist_prompts table created successfully with RLS policies';
END $$;

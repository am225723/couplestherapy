-- =====================================================
-- PERSONALIZED DAILY TIPS CACHE TABLE
-- Run this SQL in your Supabase SQL Editor
-- =====================================================

-- Create Personalized Tips Cache Table
-- This stores cached daily tips per couple to reduce AI API calls
CREATE TABLE IF NOT EXISTS "Couples_personalized_tips_cache" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    couple_id UUID NOT NULL REFERENCES "Couples_couples"(id) ON DELETE CASCADE,
    tip_date TEXT NOT NULL,
    tip_data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT unique_couple_tip_date UNIQUE(couple_id, tip_date)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_personalized_tips_cache_couple_date 
ON "Couples_personalized_tips_cache"(couple_id, tip_date);

-- Enable RLS (service role bypasses RLS automatically, no policy needed for Edge Functions)
ALTER TABLE "Couples_personalized_tips_cache" ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own couple's cached tips
DROP POLICY IF EXISTS "Users can view own couple tips cache" ON "Couples_personalized_tips_cache";
CREATE POLICY "Users can view own couple tips cache" 
ON "Couples_personalized_tips_cache" 
FOR SELECT 
USING (
    couple_id IN (SELECT couple_id FROM "Couples_profiles" WHERE id = auth.uid())
);

-- =====================================================
-- ASSESSMENT TABLES (create only if they don't exist)
-- These may already exist in your database
-- =====================================================

-- Attachment Assessments Table
CREATE TABLE IF NOT EXISTS "Couples_attachment_assessments" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    couple_id UUID NOT NULL REFERENCES "Couples_couples"(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES "Couples_profiles"(id) ON DELETE CASCADE,
    attachment_style TEXT,
    score JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_attachment_assessments_couple_id 
ON "Couples_attachment_assessments"(couple_id);

ALTER TABLE "Couples_attachment_assessments" ENABLE ROW LEVEL SECURITY;

-- Enneagram Assessments Table  
CREATE TABLE IF NOT EXISTS "Couples_enneagram_assessments" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    couple_id UUID NOT NULL REFERENCES "Couples_couples"(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES "Couples_profiles"(id) ON DELETE CASCADE,
    primary_type INTEGER,
    secondary_type INTEGER,
    primary_score DECIMAL,
    scores JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_enneagram_assessments_couple_id 
ON "Couples_enneagram_assessments"(couple_id);

ALTER TABLE "Couples_enneagram_assessments" ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- Verify tables
-- =====================================================
SELECT 'Tables created/verified:' as status;
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
    'Couples_attachment_assessments', 
    'Couples_enneagram_assessments', 
    'Couples_personalized_tips_cache'
);

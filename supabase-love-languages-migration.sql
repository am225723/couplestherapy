-- Migration: Add couple_id column to Couples_love_languages table
-- Run this in the Supabase SQL Editor

-- Add the couple_id column
ALTER TABLE "Couples_love_languages" 
ADD COLUMN IF NOT EXISTS couple_id uuid;

-- Update existing rows to set couple_id from the user's profile
-- This assumes users have a couple_id in their profile
UPDATE "Couples_love_languages" ll
SET couple_id = p.couple_id
FROM "Couples_profiles" p
WHERE ll.user_id = p.id AND ll.couple_id IS NULL;

-- Make the column NOT NULL after populating existing data
-- Only run this if all rows have been updated
-- ALTER TABLE "Couples_love_languages" ALTER COLUMN couple_id SET NOT NULL;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_love_languages_couple_id 
ON "Couples_love_languages" (couple_id);

-- Update RLS policy to allow access by couple
DROP POLICY IF EXISTS "Users can view love languages for their couple" ON "Couples_love_languages";
CREATE POLICY "Users can view love languages for their couple" ON "Couples_love_languages"
FOR SELECT USING (
  couple_id IN (
    SELECT couple_id FROM "Couples_profiles" WHERE id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can insert their own love language results" ON "Couples_love_languages";
CREATE POLICY "Users can insert their own love language results" ON "Couples_love_languages"
FOR INSERT WITH CHECK (
  user_id = auth.uid()
);

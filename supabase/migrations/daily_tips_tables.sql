-- =====================================================
-- DAILY TIPS AND NOTIFICATION PREFERENCES TABLES
-- Run this SQL in your Supabase SQL Editor
-- =====================================================

-- 1. DAILY TIPS TABLE
-- Stores AI-generated daily relationship tips for couples
CREATE TABLE IF NOT EXISTS "Couples_daily_tips" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID NOT NULL REFERENCES "Couples_couples"(id) ON DELETE CASCADE,
  tip_text TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('communication', 'intimacy', 'conflict', 'gratitude', 'connection', 'growth')),
  source TEXT DEFAULT 'ai',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_daily_tips_couple_id ON "Couples_daily_tips"(couple_id);
CREATE INDEX IF NOT EXISTS idx_daily_tips_created_at ON "Couples_daily_tips"(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_daily_tips_couple_created ON "Couples_daily_tips"(couple_id, created_at DESC);

-- Enable RLS
ALTER TABLE "Couples_daily_tips" ENABLE ROW LEVEL SECURITY;

-- Users can view their own couple's tips
DROP POLICY IF EXISTS "Users can view own couple daily tips" ON "Couples_daily_tips";
CREATE POLICY "Users can view own couple daily tips"
  ON "Couples_daily_tips"
  FOR SELECT
  USING (
    couple_id IN (SELECT couple_id FROM "Couples_profiles" WHERE id = auth.uid())
  );

-- Users can insert tips for their own couple
DROP POLICY IF EXISTS "Users can create own couple daily tips" ON "Couples_daily_tips";
CREATE POLICY "Users can create own couple daily tips"
  ON "Couples_daily_tips"
  FOR INSERT
  WITH CHECK (
    couple_id IN (SELECT couple_id FROM "Couples_profiles" WHERE id = auth.uid())
  );

-- Therapists can view all tips
DROP POLICY IF EXISTS "Therapists can view all daily tips" ON "Couples_daily_tips";
CREATE POLICY "Therapists can view all daily tips"
  ON "Couples_daily_tips"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "Couples_profiles"
      WHERE id = auth.uid() AND role = 'therapist'
    )
  );

-- 2. NOTIFICATION PREFERENCES TABLE
-- Stores user preferences for receiving tips and notifications (per user in couple)
CREATE TABLE IF NOT EXISTS "Couples_notification_preferences" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID NOT NULL REFERENCES "Couples_couples"(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tips_enabled BOOLEAN DEFAULT TRUE,
  tips_frequency TEXT DEFAULT 'daily' CHECK (tips_frequency IN ('daily', 'weekly')),
  tips_time TIME DEFAULT '08:00:00',
  push_notifications_enabled BOOLEAN DEFAULT TRUE,
  email_notifications_enabled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_couple_user_notification_prefs UNIQUE(couple_id, user_id)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_notification_prefs_couple_id ON "Couples_notification_preferences"(couple_id);
CREATE INDEX IF NOT EXISTS idx_notification_prefs_user_id ON "Couples_notification_preferences"(user_id);

-- Enable RLS
ALTER TABLE "Couples_notification_preferences" ENABLE ROW LEVEL SECURITY;

-- Users can view their own preferences
DROP POLICY IF EXISTS "Users can view own notification prefs" ON "Couples_notification_preferences";
CREATE POLICY "Users can view own notification prefs"
  ON "Couples_notification_preferences"
  FOR SELECT
  USING (user_id = auth.uid());

-- Users can insert their own preferences
DROP POLICY IF EXISTS "Users can create own notification prefs" ON "Couples_notification_preferences";
CREATE POLICY "Users can create own notification prefs"
  ON "Couples_notification_preferences"
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can update their own preferences
DROP POLICY IF EXISTS "Users can update own notification prefs" ON "Couples_notification_preferences";
CREATE POLICY "Users can update own notification prefs"
  ON "Couples_notification_preferences"
  FOR UPDATE
  USING (user_id = auth.uid());

-- Trigger to update updated_at on changes
CREATE OR REPLACE FUNCTION update_notification_prefs_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS notification_prefs_updated ON "Couples_notification_preferences";
CREATE TRIGGER notification_prefs_updated
  BEFORE UPDATE ON "Couples_notification_preferences"
  FOR EACH ROW
  EXECUTE FUNCTION update_notification_prefs_timestamp();

-- =====================================================
-- Verify tables
-- =====================================================
SELECT 'Tables created:' as status;
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
    'Couples_daily_tips', 
    'Couples_notification_preferences'
);

-- Daily Tips Table
CREATE TABLE IF NOT EXISTS "Couples_daily_tips" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID NOT NULL REFERENCES "Couples_couples"(id) ON DELETE CASCADE,
  tip_text TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('communication', 'intimacy', 'conflict', 'gratitude', 'connection', 'growth')),
  source TEXT DEFAULT 'ai',
  created_at TIMESTAMPTZ DEFAULT now(),
  FOREIGN KEY (couple_id) REFERENCES "Couples_couples"(id) ON DELETE CASCADE
);

-- Notification Preferences Table
CREATE TABLE IF NOT EXISTS "Couples_notification_preferences" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID NOT NULL REFERENCES "Couples_couples"(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tips_enabled BOOLEAN DEFAULT true,
  tips_frequency TEXT DEFAULT 'daily' CHECK (tips_frequency IN ('daily', 'weekly', 'disabled')),
  tips_time TIME DEFAULT '08:00:00',
  push_notifications_enabled BOOLEAN DEFAULT true,
  email_notifications_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (couple_id, user_id),
  FOREIGN KEY (couple_id) REFERENCES "Couples_couples"(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Notification Sent History Table
CREATE TABLE IF NOT EXISTS "Couples_notification_history" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID NOT NULL REFERENCES "Couples_couples"(id) ON DELETE CASCADE,
  tip_id UUID REFERENCES "Couples_daily_tips"(id) ON DELETE CASCADE,
  sent_at TIMESTAMPTZ DEFAULT now(),
  notification_type TEXT DEFAULT 'push' CHECK (notification_type IN ('push', 'email', 'in_app')),
  FOREIGN KEY (couple_id) REFERENCES "Couples_couples"(id) ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_daily_tips_couple_id ON "Couples_daily_tips"(couple_id);
CREATE INDEX IF NOT EXISTS idx_daily_tips_created_at ON "Couples_daily_tips"(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_prefs_couple ON "Couples_notification_preferences"(couple_id);
CREATE INDEX IF NOT EXISTS idx_notification_history_couple ON "Couples_notification_history"(couple_id);

-- Enable RLS
ALTER TABLE "Couples_daily_tips" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Couples_notification_preferences" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Couples_notification_history" ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Daily Tips
CREATE POLICY "Users can view couple daily tips" ON "Couples_daily_tips"
  FOR SELECT USING (
    couple_id IN (
      SELECT id FROM "Couples_couples"
      WHERE partner1_id = auth.uid() OR partner2_id = auth.uid()
    )
  );

CREATE POLICY "Therapist can view couple daily tips" ON "Couples_daily_tips"
  FOR SELECT USING (
    couple_id IN (
      SELECT id FROM "Couples_couples"
      WHERE therapist_id = (SELECT id FROM "Couples_profiles" WHERE user_id = auth.uid() LIMIT 1)
    )
  );

-- RLS Policies for Notification Preferences
CREATE POLICY "Users can view own notification preferences" ON "Couples_notification_preferences"
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update own notification preferences" ON "Couples_notification_preferences"
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can insert own notification preferences" ON "Couples_notification_preferences"
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- RLS Policies for Notification History
CREATE POLICY "Users can view couple notification history" ON "Couples_notification_history"
  FOR SELECT USING (
    couple_id IN (
      SELECT id FROM "Couples_couples"
      WHERE partner1_id = auth.uid() OR partner2_id = auth.uid()
    )
  );

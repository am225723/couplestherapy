-- Mood Tracker Table
CREATE TABLE IF NOT EXISTS "Couples_mood_entries" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID NOT NULL REFERENCES "Couples_couples"(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mood_level INTEGER NOT NULL CHECK (mood_level >= 1 AND mood_level <= 10),
  emotion_primary TEXT NOT NULL,
  emotion_secondary TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  FOREIGN KEY (couple_id) REFERENCES "Couples_couples"(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_mood_couple_id ON "Couples_mood_entries"(couple_id);
CREATE INDEX IF NOT EXISTS idx_mood_user_id ON "Couples_mood_entries"(user_id);
CREATE INDEX IF NOT EXISTS idx_mood_created_at ON "Couples_mood_entries"(created_at DESC);

-- Enable RLS
ALTER TABLE "Couples_mood_entries" ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Couple members can see their own mood entries
CREATE POLICY "Users can view couple mood entries" ON "Couples_mood_entries"
  FOR SELECT USING (
    couple_id IN (
      SELECT id FROM "Couples_couples"
      WHERE partner1_id = auth.uid() OR partner2_id = auth.uid()
    )
  );

-- RLS Policy: Therapist can view couple mood entries
CREATE POLICY "Therapist can view couple mood entries" ON "Couples_mood_entries"
  FOR SELECT USING (
    couple_id IN (
      SELECT id FROM "Couples_couples"
      WHERE therapist_id = (SELECT id FROM "Couples_profiles" WHERE user_id = auth.uid() LIMIT 1)
    )
  );

-- RLS Policy: Users can insert their own mood entries
CREATE POLICY "Users can insert mood entries" ON "Couples_mood_entries"
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND
    couple_id IN (
      SELECT id FROM "Couples_couples"
      WHERE partner1_id = auth.uid() OR partner2_id = auth.uid()
    )
  );

-- RLS Policy: Users can update their own mood entries
CREATE POLICY "Users can update mood entries" ON "Couples_mood_entries"
  FOR UPDATE USING (user_id = auth.uid());

-- RLS Policy: Users can delete their own mood entries
CREATE POLICY "Users can delete mood entries" ON "Couples_mood_entries"
  FOR DELETE USING (user_id = auth.uid());

-- Seed some mood emotions data for reference
INSERT INTO "Couples_mood_entries" (couple_id, user_id, mood_level, emotion_primary, emotion_secondary, notes)
SELECT 
  c.id,
  c.partner1_id,
  FLOOR(RANDOM() * 10 + 1)::INTEGER,
  (ARRAY['Happy', 'Sad', 'Anxious', 'Excited', 'Calm', 'Frustrated', 'Grateful', 'Overwhelmed'])[FLOOR(RANDOM() * 8 + 1)],
  (ARRAY['Confident', 'Nervous', 'Content', 'Irritable', 'Hopeful', 'Discouraged', 'Connected', 'Distant'])[FLOOR(RANDOM() * 8 + 1)],
  'Initial mood tracking'
FROM "Couples_couples" c
LIMIT 1;

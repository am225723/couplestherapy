-- Create therapist thoughts table
CREATE TABLE IF NOT EXISTS "Couples_therapist_thoughts" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID NOT NULL,
  therapist_id UUID NOT NULL,
  individual_id UUID, -- Optional: target specific partner, null = both partners
  thought_type TEXT NOT NULL CHECK (thought_type IN ('todo', 'message', 'file_reference')),
  title TEXT,
  content TEXT NOT NULL,
  file_reference TEXT,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  is_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (couple_id) REFERENCES "Couples_couples"(id),
  FOREIGN KEY (therapist_id) REFERENCES "Couples_profiles"(id),
  FOREIGN KEY (individual_id) REFERENCES "Couples_profiles"(id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_therapist_thoughts_couple_id ON "Couples_therapist_thoughts"(couple_id);
CREATE INDEX IF NOT EXISTS idx_therapist_thoughts_therapist_id ON "Couples_therapist_thoughts"(therapist_id);
CREATE INDEX IF NOT EXISTS idx_therapist_thoughts_individual_id ON "Couples_therapist_thoughts"(individual_id);

-- Enable RLS
ALTER TABLE "Couples_therapist_thoughts" ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Therapists
CREATE POLICY "Therapist can view own couple thoughts" ON "Couples_therapist_thoughts"
  FOR SELECT USING (
    therapist_id = auth.uid() AND
    couple_id IN (
      SELECT id FROM "Couples_couples" 
      WHERE therapist_id = auth.uid()
    )
  );

CREATE POLICY "Therapist can insert own thoughts" ON "Couples_therapist_thoughts"
  FOR INSERT WITH CHECK (
    therapist_id = auth.uid() AND
    couple_id IN (
      SELECT id FROM "Couples_couples" 
      WHERE therapist_id = auth.uid()
    )
  );

CREATE POLICY "Therapist can update own thoughts" ON "Couples_therapist_thoughts"
  FOR UPDATE USING (
    therapist_id = auth.uid() AND
    couple_id IN (
      SELECT id FROM "Couples_couples" 
      WHERE therapist_id = auth.uid()
    )
  );

CREATE POLICY "Therapist can delete own thoughts" ON "Couples_therapist_thoughts"
  FOR DELETE USING (
    therapist_id = auth.uid() AND
    couple_id IN (
      SELECT id FROM "Couples_couples" 
      WHERE therapist_id = auth.uid()
    )
  );

-- RLS Policy for Clients to view messages addressed to them or to both partners
CREATE POLICY "Clients can view their messages" ON "Couples_therapist_thoughts"
  FOR SELECT USING (
    thought_type = 'message' AND
    couple_id IN (
      SELECT couple_id FROM "Couples_profiles" 
      WHERE id = auth.uid()
    ) AND
    (individual_id IS NULL OR individual_id = auth.uid())
  );

-- =====================================================
-- IF TABLE ALREADY EXISTS, RUN THESE ALTER STATEMENTS:
-- =====================================================
-- ALTER TABLE "Couples_therapist_thoughts" ADD COLUMN IF NOT EXISTS individual_id UUID REFERENCES "Couples_profiles"(id);
-- CREATE INDEX IF NOT EXISTS idx_therapist_thoughts_individual_id ON "Couples_therapist_thoughts"(individual_id);
-- 
-- -- Update client policy to handle individual targeting
-- DROP POLICY IF EXISTS "Clients can view their couple messages" ON "Couples_therapist_thoughts";
-- CREATE POLICY "Clients can view their messages" ON "Couples_therapist_thoughts"
--   FOR SELECT USING (
--     thought_type = 'message' AND
--     couple_id IN (
--       SELECT couple_id FROM "Couples_profiles" 
--       WHERE id = auth.uid()
--     ) AND
--     (individual_id IS NULL OR individual_id = auth.uid())
--   );

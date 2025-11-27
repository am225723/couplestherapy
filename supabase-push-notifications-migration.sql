-- Add push notification token columns to profiles
ALTER TABLE "Couples_profiles" ADD COLUMN IF NOT EXISTS "expo_push_token" TEXT;
ALTER TABLE "Couples_profiles" ADD COLUMN IF NOT EXISTS "fcm_token" TEXT;

-- Create scheduled notifications table
CREATE TABLE IF NOT EXISTS "Couples_scheduled_notifications" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id UUID NOT NULL REFERENCES "Couples_profiles"(id) ON DELETE CASCADE,
  couple_id UUID NOT NULL REFERENCES "Couples_couples"(id) ON DELETE CASCADE,
  user_id UUID REFERENCES "Couples_profiles"(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS "idx_scheduled_notifications_status_time" 
ON "Couples_scheduled_notifications"(status, scheduled_at);
CREATE INDEX IF NOT EXISTS "idx_scheduled_notifications_therapist" 
ON "Couples_scheduled_notifications"(therapist_id);

-- Enable RLS
ALTER TABLE "Couples_scheduled_notifications" ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Therapists can create notifications for their couples
CREATE POLICY "therapists_create_notifications" 
ON "Couples_scheduled_notifications" 
FOR INSERT 
WITH CHECK (
  therapist_id = (SELECT id FROM "Couples_profiles" WHERE id = auth.uid() AND role = 'therapist')
  AND couple_id IN (SELECT id FROM "Couples_couples" WHERE therapist_id = auth.uid())
);

-- RLS Policy: Therapists can view their own notifications
CREATE POLICY "therapists_view_notifications" 
ON "Couples_scheduled_notifications" 
FOR SELECT 
USING (
  therapist_id = (SELECT id FROM "Couples_profiles" WHERE id = auth.uid() AND role = 'therapist')
);

-- RLS Policy: Therapists can update their notifications (only if not sent)
CREATE POLICY "therapists_update_notifications" 
ON "Couples_scheduled_notifications" 
FOR UPDATE 
USING (
  therapist_id = (SELECT id FROM "Couples_profiles" WHERE id = auth.uid() AND role = 'therapist')
  AND status = 'pending'
)
WITH CHECK (
  therapist_id = (SELECT id FROM "Couples_profiles" WHERE id = auth.uid() AND role = 'therapist')
  AND status IN ('pending', 'sent')
);

-- RLS Policy: Therapists can delete their pending notifications
CREATE POLICY "therapists_delete_notifications" 
ON "Couples_scheduled_notifications" 
FOR DELETE 
USING (
  therapist_id = (SELECT id FROM "Couples_profiles" WHERE id = auth.uid() AND role = 'therapist')
  AND status = 'pending'
);

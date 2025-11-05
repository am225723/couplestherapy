-- Voice Memos Migration
-- This migration adds voice recording functionality for couples to send affirmations

-- Create voice_memos table
CREATE TABLE IF NOT EXISTS public."Couples_voice_memos" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  couple_id UUID NOT NULL REFERENCES public."Couples_couples"(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_path TEXT,
  duration_secs NUMERIC(10,2),
  transcript_text TEXT,
  is_listened BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE public."Couples_voice_memos" ENABLE ROW LEVEL SECURITY;

-- Couples can see their own voice memos
CREATE POLICY "Couples can view their voice memos"
  ON public."Couples_voice_memos"
  FOR SELECT
  USING (
    couple_id IN (
      SELECT couple_id FROM public."Couples_profiles"
      WHERE id = auth.uid()
    )
  );

-- Couples can insert voice memos
CREATE POLICY "Couples can create voice memos"
  ON public."Couples_voice_memos"
  FOR INSERT
  WITH CHECK (
    couple_id IN (
      SELECT couple_id FROM public."Couples_profiles"
      WHERE id = auth.uid()
    )
    AND sender_id = auth.uid()
  );

-- Couples can update listen status
CREATE POLICY "Couples can update listen status"
  ON public."Couples_voice_memos"
  FOR UPDATE
  USING (
    couple_id IN (
      SELECT couple_id FROM public."Couples_profiles"
      WHERE id = auth.uid()
    )
  );

-- Therapists can view metadata (for activity feed)
CREATE POLICY "Therapists can view their couples' voice memo metadata"
  ON public."Couples_voice_memos"
  FOR SELECT
  USING (
    couple_id IN (
      SELECT c.id FROM public."Couples_couples" c
      WHERE c.therapist_id = auth.uid()
    )
  );

-- Create indexes for faster queries
CREATE INDEX idx_voice_memos_couple ON public."Couples_voice_memos"(couple_id);
CREATE INDEX idx_voice_memos_sender ON public."Couples_voice_memos"(sender_id);
CREATE INDEX idx_voice_memos_recipient ON public."Couples_voice_memos"(recipient_id);

COMMENT ON TABLE public."Couples_voice_memos" IS 'Voice messages between partners for affirmation and connection';

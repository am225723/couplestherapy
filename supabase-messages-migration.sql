-- TADI Platform - Messages Feature Migration
-- Run this in your Supabase SQL Editor to create the messages table with RLS policies

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================
-- MESSAGES TABLE
-- ==============================================

-- Create messages table for therapist-couple communication
CREATE TABLE IF NOT EXISTS public."Couples_messages" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  couple_id UUID NOT NULL REFERENCES public."Couples_couples"(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public."Couples_profiles"(id) ON DELETE CASCADE,
  message_text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  is_read BOOLEAN DEFAULT false
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_couples_messages_couple_id ON public."Couples_messages"(couple_id);
CREATE INDEX IF NOT EXISTS idx_couples_messages_created_at ON public."Couples_messages"(created_at);

-- ==============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================

-- Enable RLS on messages table
ALTER TABLE public."Couples_messages" ENABLE ROW LEVEL SECURITY;

-- Policy 1: Users can read messages for their own couple or couples they manage as therapist
CREATE POLICY "Users can read their couple's messages or therapist can read assigned couples"
ON public."Couples_messages"
FOR SELECT
USING (
  -- User is in the couple
  couple_id IN (
    SELECT couple_id 
    FROM public."Couples_profiles" 
    WHERE id = auth.uid() AND couple_id IS NOT NULL
  )
  OR
  -- User is the therapist assigned to this couple
  couple_id IN (
    SELECT id 
    FROM public."Couples_couples" 
    WHERE therapist_id = auth.uid()
  )
);

-- Policy 2: Users can insert messages to their own couple or therapist can insert to assigned couples
CREATE POLICY "Users can send messages to their couple or therapist to assigned couples"
ON public."Couples_messages"
FOR INSERT
WITH CHECK (
  sender_id = auth.uid()
  AND (
    -- User is in the couple
    couple_id IN (
      SELECT couple_id 
      FROM public."Couples_profiles" 
      WHERE id = auth.uid() AND couple_id IS NOT NULL
    )
    OR
    -- User is the therapist assigned to this couple
    couple_id IN (
      SELECT id 
      FROM public."Couples_couples" 
      WHERE therapist_id = auth.uid()
    )
  )
);

-- Policy 3: REMOVED - No direct UPDATE access for security
-- Updates (like marking messages as read) must go through API endpoints using admin access
-- This prevents clients from tampering with therapist messages or vice versa

-- Add comment for documentation
COMMENT ON TABLE public."Couples_messages" IS 'Messages between therapists and their assigned couples for secure communication';

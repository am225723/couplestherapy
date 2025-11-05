-- TADI Platform - Calendar Events Feature Migration
-- Run this in your Supabase SQL Editor to create the calendar events table with RLS policies

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================
-- CALENDAR EVENTS TABLE
-- ==============================================

-- Create calendar events table for couples to plan events and dates
CREATE TABLE IF NOT EXISTS public."Couples_calendar_events" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  couple_id UUID NOT NULL REFERENCES public."Couples_couples"(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES public."Couples_profiles"(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  is_all_day BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_couples_calendar_events_couple_id ON public."Couples_calendar_events"(couple_id);
CREATE INDEX IF NOT EXISTS idx_couples_calendar_events_created_at ON public."Couples_calendar_events"(created_at);
CREATE INDEX IF NOT EXISTS idx_couples_calendar_events_start_at ON public."Couples_calendar_events"(start_at);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_calendar_event_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_calendar_event_updated_at_trigger
BEFORE UPDATE ON public."Couples_calendar_events"
FOR EACH ROW
EXECUTE FUNCTION update_calendar_event_updated_at();

-- ==============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================

-- Enable RLS on calendar events table
ALTER TABLE public."Couples_calendar_events" ENABLE ROW LEVEL SECURITY;

-- Policy 1: Partners can read their couple's events, therapists can read assigned couples' events
CREATE POLICY "Partners and therapists can read calendar events"
ON public."Couples_calendar_events"
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

-- Policy 2: Partners can create events for their couple
CREATE POLICY "Partners can create calendar events"
ON public."Couples_calendar_events"
FOR INSERT
WITH CHECK (
  created_by = auth.uid()
  AND couple_id IN (
    SELECT couple_id 
    FROM public."Couples_profiles" 
    WHERE id = auth.uid() AND couple_id IS NOT NULL
  )
);

-- Policy 3: Partners can update their couple's events
CREATE POLICY "Partners can update calendar events"
ON public."Couples_calendar_events"
FOR UPDATE
USING (
  couple_id IN (
    SELECT couple_id 
    FROM public."Couples_profiles" 
    WHERE id = auth.uid() AND couple_id IS NOT NULL
  )
)
WITH CHECK (
  couple_id IN (
    SELECT couple_id 
    FROM public."Couples_profiles" 
    WHERE id = auth.uid() AND couple_id IS NOT NULL
  )
);

-- Policy 4: Partners can delete their couple's events
CREATE POLICY "Partners can delete calendar events"
ON public."Couples_calendar_events"
FOR DELETE
USING (
  couple_id IN (
    SELECT couple_id 
    FROM public."Couples_profiles" 
    WHERE id = auth.uid() AND couple_id IS NOT NULL
  )
);

-- Add comment for documentation
COMMENT ON TABLE public."Couples_calendar_events" IS 'Calendar events for couples to plan dates and shared activities';

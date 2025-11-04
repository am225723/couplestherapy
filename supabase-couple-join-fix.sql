-- Migration to add join_code to Couples_couples table and update RLS policies
-- Run this AFTER the main supabase-setup.sql

-- Add join_code column
ALTER TABLE public."Couples_couples"
ADD COLUMN IF NOT EXISTS join_code TEXT UNIQUE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_couples_join_code ON public."Couples_couples"(join_code);

-- Update existing couples with a join code (first 8 chars of UUID)
UPDATE public."Couples_couples"
SET join_code = UPPER(SUBSTRING(id::text, 1, 8))
WHERE join_code IS NULL;

-- ==============================================
-- SECURE RPC FUNCTIONS
-- ==============================================

-- Function 1: Find available couples by join_code (for display only)
CREATE OR REPLACE FUNCTION public.find_couple_by_join_code(code TEXT)
RETURNS TABLE (
  id UUID,
  partner1_id UUID,
  partner2_id UUID
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, partner1_id, partner2_id
  FROM public."Couples_couples"
  WHERE join_code = UPPER(code)
  AND partner2_id IS NULL
  LIMIT 1;
$$;

-- Function 2: Securely join a couple as partner2
CREATE OR REPLACE FUNCTION public.join_couple_as_partner2(code TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_couple_id UUID;
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  -- Ensure user is authenticated
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Find the couple by join_code and ensure partner2 slot is empty
  SELECT id INTO v_couple_id
  FROM public."Couples_couples"
  WHERE join_code = UPPER(code)
  AND partner2_id IS NULL
  LIMIT 1;

  -- Check if couple was found
  IF v_couple_id IS NULL THEN
    RAISE EXCEPTION 'Couple not found or already full';
  END IF;

  -- Atomically set partner2_id to current user
  UPDATE public."Couples_couples"
  SET partner2_id = v_user_id
  WHERE id = v_couple_id
  AND partner2_id IS NULL;  -- Double-check to prevent race conditions

  -- Check if update succeeded
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Failed to join couple - it may have been filled by another user';
  END IF;

  -- Return the couple_id for the caller to update their profile
  RETURN v_couple_id;
END;
$$;

-- Function 3: Securely set join_code for a couple (called by partner1 when creating)
CREATE OR REPLACE FUNCTION public.set_couple_join_code(couple_uuid UUID, code TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  -- Ensure user is authenticated
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Update the join_code ONLY if the current user is partner1
  UPDATE public."Couples_couples"
  SET join_code = UPPER(code)
  WHERE id = couple_uuid
  AND partner1_id = v_user_id;

  -- Check if update succeeded
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Not authorized to update this couple or couple not found';
  END IF;

  RETURN TRUE;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.find_couple_by_join_code(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_couple_as_partner2(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_couple_join_code(UUID, TEXT) TO authenticated;

-- ==============================================
-- RLS POLICIES FOR COUPLES TABLE
-- ==============================================

-- Drop and recreate the SELECT policy (keep it restrictive)
DROP POLICY IF EXISTS "Users can see their couple" ON public."Couples_couples";
CREATE POLICY "Users can see their couple"
ON public."Couples_couples" FOR SELECT
USING (
  -- Users can see their own couple
  id = get_my_couple_id()
  -- Therapists can see assigned couples
  OR therapist_id = auth.uid()
);

-- Add INSERT policy (users can create couples)
DROP POLICY IF EXISTS "Users can create couples" ON public."Couples_couples";
CREATE POLICY "Users can create couples"
ON public."Couples_couples" FOR INSERT
WITH CHECK ( auth.uid() = partner1_id );

-- REMOVE UPDATE policy entirely - all updates must go through RPC functions
-- This prevents any privilege escalation or data corruption
DROP POLICY IF EXISTS "Users can update their couple" ON public."Couples_couples";

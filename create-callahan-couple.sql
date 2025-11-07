-- Create Matthew and Karli Callahan couple linked to support@drzelisko.com therapist

-- Step 1: Get the therapist's ID
DO $$
DECLARE
  v_therapist_id UUID;
  v_matthew_id UUID;
  v_karli_id UUID;
  v_couple_id UUID;
BEGIN
  -- Get therapist ID
  SELECT id INTO v_therapist_id 
  FROM auth.users 
  WHERE email = 'support@drzelisko.com';

  IF v_therapist_id IS NULL THEN
    RAISE EXCEPTION 'Therapist support@drzelisko.com not found';
  END IF;

  -- Create Matthew's auth user
  -- Note: In production, use Supabase Admin API to create users with passwords
  -- This script just shows the structure needed
  
  RAISE NOTICE 'Therapist ID: %', v_therapist_id;
  RAISE NOTICE 'To create this couple, use the /api/public/register-couple endpoint';
  RAISE NOTICE 'Or create an invitation code first and have them register at /auth/couple-signup';
END $$;

-- Instructions:
-- Since we can't create auth users directly in SQL (requires Admin API),
-- you need to either:
-- 1. Use the /api/public/register-couple endpoint with an invitation code
-- 2. Have the couple register at /auth/couple-signup with an invitation code
-- 3. Use the backend to create them programmatically

SELECT 'Run this to create an invitation code first:' as instruction;

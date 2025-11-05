-- Test Users Setup Script
-- Run this AFTER creating the three users in Supabase Dashboard
-- 
-- STEP 1: Create these users in Supabase Dashboard > Authentication > Users:
-- 1. therapist@example.com (password: password123) - Check "Auto Confirm User"
-- 2. mcally@example.com (password: password123) - Check "Auto Confirm User"  
-- 3. ccally@example.com (password: password123) - Check "Auto Confirm User"
--
-- STEP 2: Run this script in Supabase SQL Editor
--
-- This script will:
-- - Create profiles for all three users
-- - Set therapist role for therapist@example.com
-- - Create a couple for mcally and ccally
-- - Assign the therapist to the couple
-- - Generate a join code for testing

-- ==============================================
-- FIND USER IDs (for reference)
-- ==============================================
DO $$
DECLARE
  therapist_id UUID;
  mcally_id UUID;
  ccally_id UUID;
  couple_id UUID;
  test_join_code TEXT;
BEGIN
  -- Get user IDs from auth.users
  SELECT id INTO therapist_id FROM auth.users WHERE email = 'therapist@example.com';
  SELECT id INTO mcally_id FROM auth.users WHERE email = 'mcally@example.com';
  SELECT id INTO ccally_id FROM auth.users WHERE email = 'ccally@example.com';

  -- Check if all users exist
  IF therapist_id IS NULL THEN
    RAISE EXCEPTION 'User therapist@example.com not found. Please create this user in Supabase Dashboard first.';
  END IF;
  
  IF mcally_id IS NULL THEN
    RAISE EXCEPTION 'User mcally@example.com not found. Please create this user in Supabase Dashboard first.';
  END IF;
  
  IF ccally_id IS NULL THEN
    RAISE EXCEPTION 'User ccally@example.com not found. Please create this user in Supabase Dashboard first.';
  END IF;

  RAISE NOTICE 'Found all users:';
  RAISE NOTICE 'Therapist ID: %', therapist_id;
  RAISE NOTICE 'MCally ID: %', mcally_id;
  RAISE NOTICE 'CCally ID: %', ccally_id;

  -- ==============================================
  -- CREATE PROFILES
  -- ==============================================
  
  -- Therapist profile
  INSERT INTO public."Couples_profiles" (id, email, full_name, role)
  VALUES (therapist_id, 'therapist@example.com', 'Dr. Sarah Thompson', 'therapist')
  ON CONFLICT (id) DO UPDATE 
  SET role = 'therapist', full_name = 'Dr. Sarah Thompson';
  
  RAISE NOTICE 'Created therapist profile';

  -- MCally profile (Partner 1)
  INSERT INTO public."Couples_profiles" (id, email, full_name, role)
  VALUES (mcally_id, 'mcally@example.com', 'Morgan Cally', 'client')
  ON CONFLICT (id) DO UPDATE 
  SET full_name = 'Morgan Cally', role = 'client';
  
  RAISE NOTICE 'Created Morgan Cally profile';

  -- CCally profile (Partner 2)
  INSERT INTO public."Couples_profiles" (id, email, full_name, role)
  VALUES (ccally_id, 'ccally@example.com', 'Cameron Cally', 'client')
  ON CONFLICT (id) DO UPDATE 
  SET full_name = 'Cameron Cally', role = 'client';
  
  RAISE NOTICE 'Created Cameron Cally profile';

  -- ==============================================
  -- CREATE COUPLE
  -- ==============================================
  
  -- Generate a simple join code
  test_join_code := 'CALLY01';
  
  -- Create couple with both partners
  INSERT INTO public."Couples_couples" (partner1_id, partner2_id, therapist_id, join_code)
  VALUES (mcally_id, ccally_id, therapist_id, test_join_code)
  RETURNING id INTO couple_id;
  
  RAISE NOTICE 'Created couple with ID: %', couple_id;
  RAISE NOTICE 'Join Code: %', test_join_code;

  -- ==============================================
  -- UPDATE PROFILES WITH COUPLE_ID
  -- ==============================================
  
  UPDATE public."Couples_profiles"
  SET couple_id = couple_id
  WHERE id IN (mcally_id, ccally_id);
  
  RAISE NOTICE 'Linked profiles to couple';

  -- ==============================================
  -- CREATE SAMPLE DATA (Optional)
  -- ==============================================
  
  -- Add sample love language data
  INSERT INTO public."Couples_love_languages" (user_id, couple_id, words_of_affirmation, quality_time, receiving_gifts, acts_of_service, physical_touch, primary_language, secondary_language)
  VALUES 
    (mcally_id, couple_id, 8, 9, 5, 7, 6, 'quality_time', 'words_of_affirmation'),
    (ccally_id, couple_id, 7, 6, 4, 8, 9, 'physical_touch', 'acts_of_service')
  ON CONFLICT (user_id) DO NOTHING;
  
  RAISE NOTICE 'Added sample love language data';

  -- Add a sample gratitude log entry
  INSERT INTO public."Couples_gratitude_logs" (couple_id, author_id, content)
  VALUES (couple_id, mcally_id, 'Grateful for the wonderful dinner you cooked tonight! 🍝')
  ON CONFLICT DO NOTHING;
  
  RAISE NOTICE 'Added sample gratitude entry';

  -- Add a sample shared goal
  INSERT INTO public."Couples_shared_goals" (couple_id, title, description, status, assigned_to)
  VALUES (couple_id, 'Plan weekend getaway', 'Research and book a relaxing weekend trip', 'doing', mcally_id)
  ON CONFLICT DO NOTHING;
  
  RAISE NOTICE 'Added sample goal';

  RAISE NOTICE '==============================================';
  RAISE NOTICE 'TEST USERS SETUP COMPLETE!';
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'You can now log in with:';
  RAISE NOTICE '1. therapist@example.com / password123 (Therapist)';
  RAISE NOTICE '2. mcally@example.com / password123 (Partner 1)';
  RAISE NOTICE '3. ccally@example.com / password123 (Partner 2)';
  RAISE NOTICE '';
  RAISE NOTICE 'Couple Join Code: %', test_join_code;
  RAISE NOTICE '==============================================';
END $$;

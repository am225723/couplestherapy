-- Love Map Quiz Questions Seed Data
-- Run this in Supabase SQL Editor to populate the love map questions

-- Clear existing questions first (optional - remove if you want to keep existing)
-- DELETE FROM "Couples_love_map_questions";

-- Insert Love Map Questions (Gottman-inspired)
INSERT INTO "Couples_love_map_questions" (question_text, category, is_active)
VALUES
  -- Dreams & Aspirations (10 questions)
  ('What is one of my biggest life goals or dreams?', 'Dreams & Aspirations', true),
  ('What career accomplishment am I most proud of?', 'Dreams & Aspirations', true),
  ('What is something I''ve always wanted to learn or try?', 'Dreams & Aspirations', true),
  ('Where would I love to travel that I haven''t been yet?', 'Dreams & Aspirations', true),
  ('What kind of legacy do I want to leave behind?', 'Dreams & Aspirations', true),
  ('What is my dream retirement plan?', 'Dreams & Aspirations', true),
  ('If money were no object, what would I do with my time?', 'Dreams & Aspirations', true),
  ('What personal achievement am I currently working toward?', 'Dreams & Aspirations', true),
  ('What skill or hobby do I wish I had more time for?', 'Dreams & Aspirations', true),
  ('What does my ideal life look like in 10 years?', 'Dreams & Aspirations', true),

  -- Stressors & Worries (10 questions)
  ('What is my biggest source of stress right now?', 'Stressors & Worries', true),
  ('What do I worry about most regarding our relationship?', 'Stressors & Worries', true),
  ('What financial concern weighs on me most?', 'Stressors & Worries', true),
  ('What aspect of my health or wellness concerns me?', 'Stressors & Worries', true),
  ('What family issue am I currently dealing with?', 'Stressors & Worries', true),
  ('What work-related challenge is on my mind?', 'Stressors & Worries', true),
  ('What fear keeps me up at night?', 'Stressors & Worries', true),
  ('What decision am I struggling to make right now?', 'Stressors & Worries', true),
  ('What responsibility feels heaviest to me lately?', 'Stressors & Worries', true),
  ('What change in life am I finding difficult to adapt to?', 'Stressors & Worries', true),

  -- Joys & Pleasures (10 questions)
  ('What is my favorite way to spend a free Saturday?', 'Joys & Pleasures', true),
  ('What makes me laugh the hardest?', 'Joys & Pleasures', true),
  ('What is my favorite meal or type of cuisine?', 'Joys & Pleasures', true),
  ('What music or artist brings me joy?', 'Joys & Pleasures', true),
  ('What hobby or activity helps me relax and recharge?', 'Joys & Pleasures', true),
  ('What is my favorite season and why?', 'Joys & Pleasures', true),
  ('What small pleasure brings me happiness daily?', 'Joys & Pleasures', true),
  ('What memory from the past year makes me smile?', 'Joys & Pleasures', true),
  ('What activity makes me lose track of time?', 'Joys & Pleasures', true),
  ('What kind of environment makes me feel most peaceful?', 'Joys & Pleasures', true),

  -- History & Background (10 questions)
  ('What was my favorite subject in school?', 'History & Background', true),
  ('Who was my childhood best friend?', 'History & Background', true),
  ('What is my earliest happy memory?', 'History & Background', true),
  ('What was my first job?', 'History & Background', true),
  ('What family tradition did I cherish growing up?', 'History & Background', true),
  ('What was my proudest moment in high school or college?', 'History & Background', true),
  ('Who had the most influence on me as a child?', 'History & Background', true),
  ('What was my favorite childhood book or movie?', 'History & Background', true),
  ('What significant challenge did I overcome in my past?', 'History & Background', true),
  ('What was the most pivotal moment that shaped who I am today?', 'History & Background', true),

  -- Values & Beliefs (10 questions)
  ('What value do I hold most dear in life?', 'Values & Beliefs', true),
  ('What do I believe makes a relationship strong?', 'Values & Beliefs', true),
  ('What cause or issue do I care deeply about?', 'Values & Beliefs', true),
  ('How important is spirituality or faith in my life?', 'Values & Beliefs', true),
  ('What do I believe is my purpose in life?', 'Values & Beliefs', true),
  ('What trait do I admire most in other people?', 'Values & Beliefs', true),
  ('What boundary or principle do I never compromise on?', 'Values & Beliefs', true),
  ('What does success mean to me personally?', 'Values & Beliefs', true),
  ('What role does family play in my value system?', 'Values & Beliefs', true),
  ('What do I believe about work-life balance?', 'Values & Beliefs', true);

-- Verify insertion
SELECT category, COUNT(*) as question_count
FROM "Couples_love_map_questions"
WHERE is_active = true
GROUP BY category
ORDER BY category;

-- Total count
SELECT COUNT(*) as total_active_questions
FROM "Couples_love_map_questions"
WHERE is_active = true;

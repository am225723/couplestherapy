-- ============================================
-- SEED DATA FOR ASSESSMENT QUESTIONS
-- ============================================
-- Run this after the main migration to populate question banks
-- ============================================

-- ============================================
-- ATTACHMENT ASSESSMENT QUESTIONS (30 Total)
-- ============================================

INSERT INTO public."Couples_attachment_questions" (id, question_text, attachment_category, reverse_scored) VALUES
(gen_random_uuid(), 'I am comfortable depending on romantic partners.', 'secure', false),
(gen_random_uuid(), 'I worry that romantic partners won''t care about me as much as I care about them.', 'anxious', false),
(gen_random_uuid(), 'I am comfortable without close emotional relationships.', 'secure', true),
(gen_random_uuid(), 'I find that others are reluctant to get as close as I would like.', 'anxious', false),
(gen_random_uuid(), 'I am comfortable having others depend on me.', 'secure', false),
(gen_random_uuid(), 'I prefer not to depend on others or have others depend on me.', 'secure', true),
(gen_random_uuid(), 'I don''t worry about being alone or others not accepting me.', 'secure', false),
(gen_random_uuid(), 'I want to be completely emotionally intimate with others, but I often find that others are reluctant to get as close as I would like.', 'anxious', false),
(gen_random_uuid(), 'I am very comfortable being close to others.', 'secure', false),
(gen_random_uuid(), 'I prefer not to show others how I feel deep down.', 'secure', true),
(gen_random_uuid(), 'I often wish that my partner''s feelings for me were as strong as my feelings for them.', 'anxious', false),
(gen_random_uuid(), 'I get uncomfortable when people want to be very close emotionally.', 'secure', true),
(gen_random_uuid(), 'I rarely worry about my partner leaving me.', 'secure', false),
(gen_random_uuid(), 'I need a lot of reassurance that I am loved by my partner.', 'anxious', false),
(gen_random_uuid(), 'I sometimes feel that I force my partners to show more feeling, more commitment.', 'anxious', false),
(gen_random_uuid(), 'I want to be completely emotionally intimate but find others are reluctant.', 'anxious', false),
(gen_random_uuid(), 'I am nervous when anyone gets too close to me emotionally.', 'secure', true),
(gen_random_uuid(), 'I sometimes feel like I want closeness and also want to pull away at the same time.', 'disorganized', false),
(gen_random_uuid(), 'I can trust my partner to be there when I need them.', 'secure', false),
(gen_random_uuid(), 'My desire for closeness sometimes scares people away.', 'anxious', false),
(gen_random_uuid(), 'I try to avoid getting too close to my partner.', 'secure', true),
(gen_random_uuid(), 'I find myself getting hurt easily in relationships.', 'anxious', false),
(gen_random_uuid(), 'I feel comfortable sharing my private thoughts and feelings with my partner.', 'secure', false),
(gen_random_uuid(), 'When I show my feelings for romantic partners, I''m afraid they will not feel the same about me.', 'anxious', false),
(gen_random_uuid(), 'I find it difficult to allow myself to depend on others.', 'avoidant', false),
(gen_random_uuid(), 'My relationships seem to bring up conflicting feelings - I want to be close but also feel unsafe.', 'disorganized', false),
(gen_random_uuid(), 'I worry a lot about my relationships.', 'anxious', false),
(gen_random_uuid(), 'I prefer to keep my independence in relationships.', 'secure', true),
(gen_random_uuid(), 'I feel like I can count on my partner when I need support.', 'secure', false),
(gen_random_uuid(), 'I find it relatively easy to get close to my partner.', 'secure', false)
ON CONFLICT DO NOTHING;

-- ============================================
-- ENNEAGRAM ASSESSMENT QUESTIONS (36 Total - 4 per type)
-- ============================================

INSERT INTO public."Couples_enneagram_questions" (id, question_text, enneagram_type) VALUES
-- Type 1: The Reformer
(gen_random_uuid(), 'I have high standards and feel things should be done correctly.', 1),
(gen_random_uuid(), 'I often notice what could be improved in my surroundings.', 1),
(gen_random_uuid(), 'I feel responsible for doing the right thing.', 1),
(gen_random_uuid(), 'I can be critical of myself and others.', 1),

-- Type 2: The Helper
(gen_random_uuid(), 'I am sensitive to the needs and feelings of others.', 2),
(gen_random_uuid(), 'I find fulfillment in helping and supporting people I care about.', 2),
(gen_random_uuid(), 'I prioritize relationships and being there for others.', 2),
(gen_random_uuid(), 'Sometimes I give more than I receive in relationships.', 2),

-- Type 3: The Achiever
(gen_random_uuid(), 'I am goal-oriented and driven to succeed.', 3),
(gen_random_uuid(), 'I value efficiency and productivity.', 3),
(gen_random_uuid(), 'I enjoy being recognized for my accomplishments.', 3),
(gen_random_uuid(), 'I adapt well to different situations and audiences.', 3),

-- Type 4: The Individualist
(gen_random_uuid(), 'I am deeply in touch with my emotions and feelings.', 4),
(gen_random_uuid(), 'I value authenticity and being true to myself.', 4),
(gen_random_uuid(), 'I sometimes feel different from others.', 4),
(gen_random_uuid(), 'I appreciate beauty and meaning in life.', 4),

-- Type 5: The Investigator
(gen_random_uuid(), 'I enjoy learning and gathering knowledge.', 5),
(gen_random_uuid(), 'I prefer to observe before participating.', 5),
(gen_random_uuid(), 'I value my privacy and personal space.', 5),
(gen_random_uuid(), 'I think deeply and analytically.', 5),

-- Type 6: The Loyalist
(gen_random_uuid(), 'I value security and stability.', 6),
(gen_random_uuid(), 'I am a loyal and committed person.', 6),
(gen_random_uuid(), 'I tend to anticipate potential problems.', 6),
(gen_random_uuid(), 'I seek guidance and reassurance from trusted sources.', 6),

-- Type 7: The Enthusiast
(gen_random_uuid(), 'I am spontaneous and enjoy new experiences.', 7),
(gen_random_uuid(), 'I like to keep my options open.', 7),
(gen_random_uuid(), 'I focus on the positive and avoid dwelling on negative feelings.', 7),
(gen_random_uuid(), 'I am energetic and enthusiastic about life.', 7),

-- Type 8: The Challenger
(gen_random_uuid(), 'I am direct and assertive in my communication.', 8),
(gen_random_uuid(), 'I protect and advocate for people I care about.', 8),
(gen_random_uuid(), 'I value strength and self-reliance.', 8),
(gen_random_uuid(), 'I stand up for the underdog.', 8),

-- Type 9: The Peacemaker
(gen_random_uuid(), 'I seek harmony and avoid conflict.', 9),
(gen_random_uuid(), 'I am easygoing and accepting of others.', 9),
(gen_random_uuid(), 'I can see multiple perspectives in a situation.', 9),
(gen_random_uuid(), 'I dislike confrontation and prefer harmony.', 9)
ON CONFLICT DO NOTHING;

-- ============================================
-- JOURNAL PROMPTS (Sample prompts to inspire couples)
-- ============================================

INSERT INTO public."Couples_journal_prompts" (id, prompt_text, category, is_active) VALUES
(gen_random_uuid(), 'What made you smile today? Share a moment of joy with your partner.', 'gratitude', true),
(gen_random_uuid(), 'Describe a challenge you faced together and how you overcame it.', 'resilience', true),
(gen_random_uuid(), 'What is one thing you appreciate about your partner today?', 'appreciation', true),
(gen_random_uuid(), 'Share a dream or goal you have for your future together.', 'future', true),
(gen_random_uuid(), 'What was your favorite memory from this week?', 'reflection', true),
(gen_random_uuid(), 'How did you support each other today?', 'connection', true),
(gen_random_uuid(), 'What is something you learned about your partner recently?', 'discovery', true),
(gen_random_uuid(), 'Describe a moment when you felt deeply connected to your partner.', 'intimacy', true),
(gen_random_uuid(), 'What tradition or ritual would you like to create together?', 'rituals', true),
(gen_random_uuid(), 'How has your relationship grown in the past month?', 'growth', true)
ON CONFLICT DO NOTHING;

-- ============================================
-- ATTACHMENT REPAIR SCRIPTS (Sample scripts for different styles)
-- ============================================

INSERT INTO public."Couples_attachment_repair_scripts" (id, attachment_style, situation_category, script_text, therapist_tip) VALUES
-- Anxious Attachment Scripts
(gen_random_uuid(), 'anxious', 'reassurance_needed', 'I''m feeling a bit uncertain right now and could use some reassurance. Can we talk about how you''re feeling about us?', 'This script helps anxious individuals express vulnerability while asking for what they need.'),
(gen_random_uuid(), 'anxious', 'fear_of_abandonment', 'When you [specific behavior], I worry that you might be pulling away. Can you help me understand what''s going on?', 'Focuses on specific behaviors rather than making assumptions about the partner''s feelings.'),

-- Avoidant Attachment Scripts
(gen_random_uuid(), 'avoidant', 'need_for_space', 'I''m feeling a bit overwhelmed and need some time to process. Can we reconnect in [specific timeframe]?', 'Teaches avoidant individuals to communicate needs while maintaining connection.'),
(gen_random_uuid(), 'avoidant', 'fear_of_engulfment', 'I care about you, and I also need some independence. Can we find a balance that works for both of us?', 'Validates both connection and autonomy needs.'),

-- Secure Attachment Scripts
(gen_random_uuid(), 'secure', 'conflict_repair', 'I realize we had a disagreement. I value our relationship and want to work through this together.', 'Models healthy repair after conflict.'),
(gen_random_uuid(), 'secure', 'expressing_needs', 'I''ve been thinking about what I need in our relationship. Can we talk about [specific need]?', 'Encourages direct communication of needs.'),

-- Disorganized Attachment Scripts
(gen_random_uuid(), 'disorganized', 'conflicting_feelings', 'I''m experiencing mixed feelings right now - part of me wants closeness and part of me feels scared. Can we talk about this?', 'Normalizes conflicting emotions and creates space for vulnerability.'),
(gen_random_uuid(), 'disorganized', 'emotional_regulation', 'I notice I''m having a strong reaction. Can I take a moment to understand what I''m feeling before we continue?', 'Teaches pause and reflection before reactivity.')
ON CONFLICT DO NOTHING;

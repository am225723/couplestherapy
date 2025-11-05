-- =====================================================
-- Hold Me Tight Conversation Structure Update
-- Migration to EFT-Based 6-Prompt Format
-- =====================================================
-- 
-- Purpose: Enhance the Hold Me Tight conversation feature with a more
-- comprehensive EFT (Emotionally Focused Therapy) based structure.
--
-- Previous structure (2 prompts):
--   1. "I feel..." (initiator_statement_feel)
--   2. "What I need..." (initiator_statement_need)
--
-- New structure (6 prompts):
--   1. "When this happens..." - Situation/trigger (initiator_situation)
--   2. "I feel..." - Emotional response (initiator_statement_feel) [EXISTING]
--   3. "What am I scared of?" - Fear (initiator_scared_of)
--   4. "What am I embarrassed about?" - Shame/vulnerability (initiator_embarrassed_about)
--   5. "What are my expectations?" - Hopes/desires (initiator_expectations)
--   6. "What do I need?" - Request (initiator_statement_need) [EXISTING]
--
-- Date: 2025-11-05
-- =====================================================

-- Add new columns to Couples_conversations table
ALTER TABLE "Couples_conversations"
ADD COLUMN IF NOT EXISTS "initiator_situation" TEXT,
ADD COLUMN IF NOT EXISTS "initiator_scared_of" TEXT,
ADD COLUMN IF NOT EXISTS "initiator_embarrassed_about" TEXT,
ADD COLUMN IF NOT EXISTS "initiator_expectations" TEXT;

-- Add comments to document the purpose of each column
COMMENT ON COLUMN "Couples_conversations"."initiator_situation" IS 
'Step 1: When this happens... - Describes the triggering situation or event';

COMMENT ON COLUMN "Couples_conversations"."initiator_statement_feel" IS 
'Step 2: I feel... - Names the emotional response to the situation';

COMMENT ON COLUMN "Couples_conversations"."initiator_scared_of" IS 
'Step 3: What am I scared of? - Explores underlying fears and anxieties';

COMMENT ON COLUMN "Couples_conversations"."initiator_embarrassed_about" IS 
'Step 4: What am I embarrassed about? - Acknowledges shame and vulnerability';

COMMENT ON COLUMN "Couples_conversations"."initiator_expectations" IS 
'Step 5: What are my expectations? - Expresses hopes and desires';

COMMENT ON COLUMN "Couples_conversations"."initiator_statement_need" IS 
'Step 6: What do I need? - Makes a clear request of the partner';

COMMENT ON COLUMN "Couples_conversations"."partner_reflection" IS 
'Partner Step 1: Reflects back what they heard the initiator share';

COMMENT ON COLUMN "Couples_conversations"."partner_response" IS 
'Partner Step 2: Shares their own vulnerable experience in response';

-- Verify the table structure
-- Run this to check: SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'Couples_conversations';

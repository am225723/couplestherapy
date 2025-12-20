-- Add target_user_id column to therapist prompts for individual targeting
ALTER TABLE "Couples_therapist_prompts" 
ADD COLUMN IF NOT EXISTS target_user_id UUID REFERENCES "Couples_profiles"(id);

-- Create index for efficient filtering
CREATE INDEX IF NOT EXISTS idx_therapist_prompts_target_user 
ON "Couples_therapist_prompts"(target_user_id);

-- Create reflection responses table
CREATE TABLE IF NOT EXISTS "Couples_reflection_responses" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prompt_id UUID NOT NULL REFERENCES "Couples_therapist_prompts"(id) ON DELETE CASCADE,
    couple_id UUID NOT NULL REFERENCES "Couples_couples"(id) ON DELETE CASCADE,
    responder_id UUID NOT NULL REFERENCES "Couples_profiles"(id) ON DELETE CASCADE,
    response_text TEXT NOT NULL,
    is_shared_with_partner BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_reflection_responses_prompt 
ON "Couples_reflection_responses"(prompt_id);

CREATE INDEX IF NOT EXISTS idx_reflection_responses_couple 
ON "Couples_reflection_responses"(couple_id);

CREATE INDEX IF NOT EXISTS idx_reflection_responses_responder 
ON "Couples_reflection_responses"(responder_id);

-- Composite unique constraint to allow only one response per prompt per responder
CREATE UNIQUE INDEX IF NOT EXISTS idx_reflection_responses_unique_response 
ON "Couples_reflection_responses"(prompt_id, responder_id);

-- Enable Row Level Security
ALTER TABLE "Couples_reflection_responses" ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view their own responses
CREATE POLICY "Users can view own reflection responses" ON "Couples_reflection_responses"
    FOR SELECT USING (responder_id = auth.uid());

-- Users can view partner responses if shared
CREATE POLICY "Users can view shared partner responses" ON "Couples_reflection_responses"
    FOR SELECT USING (
        is_shared_with_partner = TRUE 
        AND couple_id IN (
            SELECT id FROM "Couples_couples" 
            WHERE partner1_id = auth.uid() OR partner2_id = auth.uid()
        )
    );

-- Users can insert their own responses
CREATE POLICY "Users can insert own reflection responses" ON "Couples_reflection_responses"
    FOR INSERT WITH CHECK (responder_id = auth.uid());

-- Users can update their own responses
CREATE POLICY "Users can update own reflection responses" ON "Couples_reflection_responses"
    FOR UPDATE USING (responder_id = auth.uid());

-- Therapists can view all responses for their couples
CREATE POLICY "Therapists can view couple responses" ON "Couples_reflection_responses"
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM "Couples_profiles" 
            WHERE id = auth.uid() AND role = 'therapist'
        )
    );

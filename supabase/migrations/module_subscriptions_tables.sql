-- =====================================================
-- MODULE SUBSCRIPTIONS TABLES
-- Run this SQL in your Supabase SQL Editor
-- =====================================================

-- 1. AVAILABLE MODULES TABLE
CREATE TABLE IF NOT EXISTS "Couples_modules" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    app_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE "Couples_modules" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view active modules" ON "Couples_modules";
CREATE POLICY "Users can view active modules" 
ON "Couples_modules" 
FOR SELECT 
USING (is_active = TRUE);

-- Insert initial modules
INSERT INTO "Couples_modules" (slug, name, description, icon, app_url, is_active) VALUES
    ('chores', 'Chores App', 'Track and manage household chores together. Assign tasks, set schedules, and celebrate when chores are done.', 'CheckSquare', NULL, TRUE),
    ('ifs', 'IFS App', 'Internal Family Systems exercises for deeper self-understanding and partner connection.', 'Brain', NULL, TRUE),
    ('conflict-resolution', 'Conflict Resolution', 'Guided tools and exercises for navigating disagreements constructively.', 'Shield', NULL, TRUE)
ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    icon = EXCLUDED.icon;

-- 2. USER MODULE SUBSCRIPTIONS TABLE
CREATE TABLE IF NOT EXISTS "Couples_module_subscriptions" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES "Couples_profiles"(id) ON DELETE CASCADE,
    module_id UUID NOT NULL REFERENCES "Couples_modules"(id) ON DELETE CASCADE,
    stripe_subscription_id TEXT,
    stripe_customer_id TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    current_period_start TIMESTAMP,
    current_period_end TIMESTAMP,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT unique_user_module UNIQUE(user_id, module_id)
);

CREATE INDEX IF NOT EXISTS idx_module_subscriptions_user_id 
ON "Couples_module_subscriptions"(user_id);

CREATE INDEX IF NOT EXISTS idx_module_subscriptions_stripe_sub 
ON "Couples_module_subscriptions"(stripe_subscription_id);

ALTER TABLE "Couples_module_subscriptions" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own subscriptions" ON "Couples_module_subscriptions";
CREATE POLICY "Users can view own subscriptions" 
ON "Couples_module_subscriptions" 
FOR SELECT 
USING (user_id = auth.uid());

-- 3. MODULE ACCESS TOKENS TABLE (for secure iframe embedding)
CREATE TABLE IF NOT EXISTS "Couples_module_access_tokens" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES "Couples_profiles"(id) ON DELETE CASCADE,
    module_id UUID NOT NULL REFERENCES "Couples_modules"(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_module_access_tokens_user_module 
ON "Couples_module_access_tokens"(user_id, module_id);

CREATE INDEX IF NOT EXISTS idx_module_access_tokens_expires 
ON "Couples_module_access_tokens"(expires_at);

ALTER TABLE "Couples_module_access_tokens" ENABLE ROW LEVEL SECURITY;

-- Cleanup function for expired tokens
CREATE OR REPLACE FUNCTION cleanup_expired_module_tokens() 
RETURNS void AS $$
BEGIN
    DELETE FROM "Couples_module_access_tokens" WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Verify tables
-- =====================================================
SELECT 'Module tables created:' as status;
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
    'Couples_modules', 
    'Couples_module_subscriptions', 
    'Couples_module_access_tokens'
);

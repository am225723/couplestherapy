-- Therapist User Management Migration
-- Adds missing tables and columns for comprehensive therapist management

-- Add join_code column to couples table if it doesn't exist
ALTER TABLE public."Couples_couples" 
ADD COLUMN IF NOT EXISTS join_code TEXT;

-- Create index on join_code for faster lookups
CREATE INDEX IF NOT EXISTS idx_couples_join_code ON public."Couples_couples"(join_code);

-- Voice Memos Table
CREATE TABLE IF NOT EXISTS public."Couples_voice_memos" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    couple_id UUID NOT NULL REFERENCES public."Couples_couples"(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public."Couples_profiles"(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES public."Couples_profiles"(id) ON DELETE CASCADE,
    storage_path TEXT,
    duration_secs INTEGER,
    transcript_text TEXT,
    is_listened BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Messages Table
CREATE TABLE IF NOT EXISTS public."Couples_messages" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    couple_id UUID NOT NULL REFERENCES public."Couples_couples"(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public."Couples_profiles"(id) ON DELETE CASCADE,
    message_text TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Calendar Events Table
CREATE TABLE IF NOT EXISTS public."Couples_calendar_events" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    couple_id UUID NOT NULL REFERENCES public."Couples_couples"(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES public."Couples_profiles"(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ,
    event_type TEXT DEFAULT 'session' CHECK (event_type IN ('session', 'date_night', 'check_in', 'other')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Love Map Questions Table
CREATE TABLE IF NOT EXISTS public."Couples_love_map_questions" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_text TEXT NOT NULL,
    category TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Love Map Sessions Table
CREATE TABLE IF NOT EXISTS public."Couples_love_map_sessions" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    couple_id UUID NOT NULL REFERENCES public."Couples_couples"(id) ON DELETE CASCADE,
    partner1_truths_completed BOOLEAN DEFAULT false,
    partner2_truths_completed BOOLEAN DEFAULT false,
    partner1_guesses_completed BOOLEAN DEFAULT false,
    partner2_guesses_completed BOOLEAN DEFAULT false,
    partner1_score INTEGER,
    partner2_score INTEGER,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Love Map Truths Table
CREATE TABLE IF NOT EXISTS public."Couples_love_map_truths" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES public."Couples_love_map_sessions"(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES public."Couples_love_map_questions"(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES public."Couples_profiles"(id) ON DELETE CASCADE,
    answer_text TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Love Map Guesses Table
CREATE TABLE IF NOT EXISTS public."Couples_love_map_guesses" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES public."Couples_love_map_sessions"(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES public."Couples_love_map_questions"(id) ON DELETE CASCADE,
    guesser_id UUID NOT NULL REFERENCES public."Couples_profiles"(id) ON DELETE CASCADE,
    truth_id UUID NOT NULL REFERENCES public."Couples_love_map_truths"(id) ON DELETE CASCADE,
    guess_text TEXT NOT NULL,
    is_correct BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ==============================================
-- RLS POLICIES FOR NEW TABLES
-- ==============================================

-- Voice Memos RLS
ALTER TABLE public."Couples_voice_memos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Couples_voice_memos" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Couple members can see their voice memos" ON public."Couples_voice_memos";
CREATE POLICY "Couple members can see their voice memos"
ON public."Couples_voice_memos" FOR SELECT
USING (
    couple_id = get_my_couple_id()
    OR
    (
        get_my_role() = 'therapist'
        AND EXISTS (
            SELECT 1 FROM public."Couples_couples"
            WHERE id = couple_id AND therapist_id = auth.uid()
        )
    )
);

DROP POLICY IF EXISTS "Users can insert voice memos" ON public."Couples_voice_memos";
CREATE POLICY "Users can insert voice memos"
ON public."Couples_voice_memos" FOR INSERT
WITH CHECK (
    auth.uid() = sender_id 
    AND couple_id = get_my_couple_id()
);

DROP POLICY IF EXISTS "Users can update their voice memos" ON public."Couples_voice_memos";
CREATE POLICY "Users can update their voice memos"
ON public."Couples_voice_memos" FOR UPDATE
USING (auth.uid() = sender_id)
WITH CHECK (auth.uid() = sender_id);

-- Messages RLS
ALTER TABLE public."Couples_messages" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Couples_messages" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Couple and therapist can see messages" ON public."Couples_messages";
CREATE POLICY "Couple and therapist can see messages"
ON public."Couples_messages" FOR SELECT
USING (
    couple_id = get_my_couple_id()
    OR
    (
        get_my_role() = 'therapist'
        AND EXISTS (
            SELECT 1 FROM public."Couples_couples"
            WHERE id = couple_id AND therapist_id = auth.uid()
        )
    )
);

DROP POLICY IF EXISTS "Users can insert messages" ON public."Couples_messages";
CREATE POLICY "Users can insert messages"
ON public."Couples_messages" FOR INSERT
WITH CHECK (
    auth.uid() = sender_id 
    AND (
        couple_id = get_my_couple_id()
        OR
        (
            get_my_role() = 'therapist'
            AND EXISTS (
                SELECT 1 FROM public."Couples_couples"
                WHERE id = couple_id AND therapist_id = auth.uid()
            )
        )
    )
);

DROP POLICY IF EXISTS "Users can update message read status" ON public."Couples_messages";
CREATE POLICY "Users can update message read status"
ON public."Couples_messages" FOR UPDATE
USING (
    couple_id = get_my_couple_id()
    OR
    (
        get_my_role() = 'therapist'
        AND EXISTS (
            SELECT 1 FROM public."Couples_couples"
            WHERE id = couple_id AND therapist_id = auth.uid()
        )
    )
);

-- Calendar Events RLS
ALTER TABLE public."Couples_calendar_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Couples_calendar_events" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Couple and therapist can see calendar events" ON public."Couples_calendar_events";
CREATE POLICY "Couple and therapist can see calendar events"
ON public."Couples_calendar_events" FOR SELECT
USING (
    couple_id = get_my_couple_id()
    OR
    (
        get_my_role() = 'therapist'
        AND EXISTS (
            SELECT 1 FROM public."Couples_couples"
            WHERE id = couple_id AND therapist_id = auth.uid()
        )
    )
);

DROP POLICY IF EXISTS "Users can insert calendar events" ON public."Couples_calendar_events";
CREATE POLICY "Users can insert calendar events"
ON public."Couples_calendar_events" FOR INSERT
WITH CHECK (
    auth.uid() = created_by 
    AND couple_id = get_my_couple_id()
);

DROP POLICY IF EXISTS "Users can update calendar events" ON public."Couples_calendar_events";
CREATE POLICY "Users can update calendar events"
ON public."Couples_calendar_events" FOR UPDATE
USING (couple_id = get_my_couple_id())
WITH CHECK (couple_id = get_my_couple_id());

DROP POLICY IF EXISTS "Users can delete calendar events" ON public."Couples_calendar_events";
CREATE POLICY "Users can delete calendar events"
ON public."Couples_calendar_events" FOR DELETE
USING (
    auth.uid() = created_by 
    AND couple_id = get_my_couple_id()
);

-- Love Map Questions RLS (Read-only for all authenticated users)
ALTER TABLE public."Couples_love_map_questions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Couples_love_map_questions" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can see active questions" ON public."Couples_love_map_questions";
CREATE POLICY "Authenticated users can see active questions"
ON public."Couples_love_map_questions" FOR SELECT
USING (is_active = true);

-- Love Map Sessions RLS
ALTER TABLE public."Couples_love_map_sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Couples_love_map_sessions" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Couple and therapist can see love map sessions" ON public."Couples_love_map_sessions";
CREATE POLICY "Couple and therapist can see love map sessions"
ON public."Couples_love_map_sessions" FOR SELECT
USING (
    couple_id = get_my_couple_id()
    OR
    (
        get_my_role() = 'therapist'
        AND EXISTS (
            SELECT 1 FROM public."Couples_couples"
            WHERE id = couple_id AND therapist_id = auth.uid()
        )
    )
);

DROP POLICY IF EXISTS "Users can insert love map sessions" ON public."Couples_love_map_sessions";
CREATE POLICY "Users can insert love map sessions"
ON public."Couples_love_map_sessions" FOR INSERT
WITH CHECK (couple_id = get_my_couple_id());

DROP POLICY IF EXISTS "Users can update love map sessions" ON public."Couples_love_map_sessions";
CREATE POLICY "Users can update love map sessions"
ON public."Couples_love_map_sessions" FOR UPDATE
USING (couple_id = get_my_couple_id())
WITH CHECK (couple_id = get_my_couple_id());

-- Love Map Truths RLS
ALTER TABLE public."Couples_love_map_truths" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Couples_love_map_truths" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Couple and therapist can see love map truths" ON public."Couples_love_map_truths";
CREATE POLICY "Couple and therapist can see love map truths"
ON public."Couples_love_map_truths" FOR SELECT
USING (
    couple_id = get_my_couple_id()
    OR
    (
        get_my_role() = 'therapist'
        AND EXISTS (
            SELECT 1 FROM public."Couples_love_map_sessions"
            WHERE id = session_id AND couple_id IN (
                SELECT id FROM public."Couples_couples" 
                WHERE therapist_id = auth.uid()
            )
        )
    )
);

DROP POLICY IF EXISTS "Users can insert love map truths" ON public."Couples_love_map_truths";
CREATE POLICY "Users can insert love map truths"
ON public."Couples_love_map_truths" FOR INSERT
WITH CHECK (
    auth.uid() = author_id
    AND EXISTS (
        SELECT 1 FROM public."Couples_love_map_sessions"
        WHERE id = session_id AND couple_id = get_my_couple_id()
    )
);

-- Love Map Guesses RLS
ALTER TABLE public."Couples_love_map_guesses" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Couples_love_map_guesses" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Couple and therapist can see love map guesses" ON public."Couples_love_map_guesses";
CREATE POLICY "Couple and therapist can see love map guesses"
ON public."Couples_love_map_guesses" FOR SELECT
USING (
    couple_id = get_my_couple_id()
    OR
    (
        get_my_role() = 'therapist'
        AND EXISTS (
            SELECT 1 FROM public."Couples_love_map_sessions"
            WHERE id = session_id AND couple_id IN (
                SELECT id FROM public."Couples_couples" 
                WHERE therapist_id = auth.uid()
            )
        )
    )
);

DROP POLICY IF EXISTS "Users can insert love map guesses" ON public."Couples_love_map_guesses";
CREATE POLICY "Users can insert love map guesses"
ON public."Couples_love_map_guesses" FOR INSERT
WITH CHECK (
    auth.uid() = guesser_id
    AND EXISTS (
        SELECT 1 FROM public."Couples_love_map_sessions"
        WHERE id = session_id AND couple_id = get_my_couple_id()
    )
);

-- ==============================================
-- INDEXES FOR PERFORMANCE
-- ==============================================

CREATE INDEX IF NOT EXISTS idx_voice_memos_couple_id ON public."Couples_voice_memos"(couple_id);
CREATE INDEX IF NOT EXISTS idx_voice_memos_sender_id ON public."Couples_voice_memos"(sender_id);
CREATE INDEX IF NOT EXISTS idx_voice_memos_recipient_id ON public."Couples_voice_memos"(recipient_id);

CREATE INDEX IF NOT EXISTS idx_messages_couple_id ON public."Couples_messages"(couple_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public."Couples_messages"(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public."Couples_messages"(created_at);

CREATE INDEX IF NOT EXISTS idx_calendar_events_couple_id ON public."Couples_calendar_events"(couple_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_start_at ON public."Couples_calendar_events"(start_at);
CREATE INDEX IF NOT EXISTS idx_calendar_events_created_by ON public."Couples_calendar_events"(created_by);

CREATE INDEX IF NOT EXISTS idx_love_map_sessions_couple_id ON public."Couples_love_map_sessions"(couple_id);
CREATE INDEX IF NOT EXISTS idx_love_map_truths_session_id ON public."Couples_love_map_truths"(session_id);
CREATE INDEX IF NOT EXISTS idx_love_map_truths_author_id ON public."Couples_love_map_truths"(author_id);
CREATE INDEX IF NOT EXISTS idx_love_map_guesses_session_id ON public."Couples_love_map_guesses"(session_id);
CREATE INDEX IF NOT EXISTS idx_love_map_guesses_guesser_id ON public."Couples_love_map_guesses"(guesser_id);

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Therapist User Management migration completed successfully!';
    RAISE NOTICE 'Added join_code column to couples table';
    RAISE NOTICE 'Created voice_memos, messages, calendar_events tables';
    RAISE NOTICE 'Created love map system tables';
    RAISE NOTICE 'All RLS policies configured for new tables';
END $$;
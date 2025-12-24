# ALEIC Setup Guide

This guide covers the SQL migrations and Edge Functions needed for ALEIC. Most core features should already be deployed - this focuses on recent additions and verification.

## Quick Checklist

### Recent Additions (November 2025)

These are the newest features that may need deployment:

| Item                                        | Type          | Status Check                                            |
| ------------------------------------------- | ------------- | ------------------------------------------------------- |
| `supabase-push-notifications-migration.sql` | SQL           | Check if `Couples_scheduled_notifications` table exists |
| `supabase-therapist-thoughts-migration.sql` | SQL           | Check if `Couples_therapist_thoughts` table exists      |
| `supabase-new-features-migration.sql`       | SQL           | Check if attachment/enneagram/journal tables exist      |
| `send-scheduled-notifications`              | Edge Function | Deploy for push notifications                           |
| `ai-exercise-recommendations`               | Edge Function | Redeploy (503 error fix)                                |

### Verify Existing Tables

Run this query in Supabase SQL Editor to check which tables exist:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name LIKE 'Couples_%'
ORDER BY table_name;
```

### Verify Edge Functions

In Supabase Dashboard > Edge Functions, you should see:

- ai-date-night
- ai-echo-coaching
- ai-empathy-prompt
- ai-exercise-recommendations
- ai-insights
- ai-session-prep
- ai-voice-memo-sentiment
- send-scheduled-notifications

---

## New Feature Setup

### 1. Push Notifications

**SQL Migration:**

```sql
-- Run in Supabase SQL Editor
-- File: supabase-push-notifications-migration.sql

-- Add token columns to profiles
ALTER TABLE "Couples_profiles"
ADD COLUMN IF NOT EXISTS expo_push_token TEXT,
ADD COLUMN IF NOT EXISTS fcm_token TEXT;

-- Create scheduled notifications table
CREATE TABLE IF NOT EXISTS "Couples_scheduled_notifications" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id UUID NOT NULL REFERENCES auth.users(id),
  couple_id UUID NOT NULL REFERENCES "Couples_couples"(id),
  user_id UUID REFERENCES auth.users(id),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS policies
ALTER TABLE "Couples_scheduled_notifications" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Therapists can manage notifications for their couples"
ON "Couples_scheduled_notifications"
FOR ALL
USING (
  therapist_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM "Couples_couples" c
    WHERE c.id = couple_id AND c.therapist_id = auth.uid()
  )
);
```

**Edge Function Deployment:**

```bash
supabase functions deploy send-scheduled-notifications
```

**Required Secret:**
Add `EXPO_ACCESS_TOKEN` in Supabase Dashboard > Project Settings > Edge Functions

---

### 2. AI Exercise Recommendations Fix

The Edge Function had a duplicate variable declaration causing 503 errors. Redeploy:

```bash
supabase functions deploy ai-exercise-recommendations
```

**Required Secret:**
Verify `PERPLEXITY_API_KEY` is set in Supabase Dashboard > Project Settings > Edge Functions

---

### 3. Therapist Thoughts

**SQL Migration:**

```sql
-- Run in Supabase SQL Editor if table doesn't exist
-- File: supabase-therapist-thoughts-migration.sql

CREATE TABLE IF NOT EXISTS "Couples_therapist_thoughts" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id UUID NOT NULL REFERENCES auth.users(id),
  couple_id UUID NOT NULL REFERENCES "Couples_couples"(id),
  type TEXT NOT NULL CHECK (type IN ('todo', 'message', 'file_reference')),
  content TEXT NOT NULL,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  is_completed BOOLEAN DEFAULT FALSE,
  file_url TEXT,
  file_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE "Couples_therapist_thoughts" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Therapists can manage their own thoughts"
ON "Couples_therapist_thoughts"
FOR ALL
USING (therapist_id = auth.uid());
```

---

## All SQL Migrations Reference

Run these in order if setting up from scratch:

### Core (Required)

1. `supabase-setup.sql` - Base tables, profiles, couples
2. `supabase-storage-setup.sql` - Storage buckets
3. `supabase-invitation-codes.sql` - Couple linking system

### Features

4. `supabase-love-map-migration.sql`
5. `supabase-love-map-questions-seed.sql`
6. `supabase-echo-empathy-migration.sql`
7. `supabase-ifs-migration.sql`
8. `supabase-calendar-migration.sql`
9. `supabase-messages-migration.sql`
10. `supabase-voice-memos.sql`
11. `supabase-pause-button-migration.sql`
12. `supabase-hold-me-tight-update.sql`
13. `supabase-new-features-migration.sql` (attachment, enneagram, journal, financial)
14. `supabase-seed-questions.sql`
15. `supabase-therapist-thoughts-migration.sql`
16. `supabase-push-notifications-migration.sql`
17. `supabase-journal-storage-setup.sql`

### Optional Features

- `supabase-mood-tracker-migration.sql`
- `supabase-daily-tips-migration.sql`
- `supabase-parenting-partners-migration.sql`
- `supabase-values-vision-migration.sql`
- `supabase-intimacy-mapping-migration.sql`
- `supabase-meditation-library-migration.sql`
- `supabase-demon-dialogues-migration.sql`
- `supabase-four-horsemen-migration.sql`

---

## Edge Functions Reference

All Edge Functions require `PERPLEXITY_API_KEY` except `send-scheduled-notifications` which requires `EXPO_ACCESS_TOKEN`.

| Function                       | Purpose                                         |
| ------------------------------ | ----------------------------------------------- |
| `ai-exercise-recommendations`  | Suggests therapy exercises based on couple data |
| `ai-insights`                  | Therapist analytics and pattern detection       |
| `ai-date-night`                | Personalized date night recommendations         |
| `ai-echo-coaching`             | Real-time coaching for Echo & Empathy sessions  |
| `ai-empathy-prompt`            | Generates empathy-building prompts              |
| `ai-session-prep`              | Prepares session summaries for therapists       |
| `ai-voice-memo-sentiment`      | Analyzes voice memo emotional content           |
| `send-scheduled-notifications` | Sends push notifications via Expo               |

**Deploy all at once:**

```bash
supabase functions deploy ai-exercise-recommendations
supabase functions deploy ai-insights
supabase functions deploy ai-date-night
supabase functions deploy ai-echo-coaching
supabase functions deploy ai-empathy-prompt
supabase functions deploy ai-session-prep
supabase functions deploy ai-voice-memo-sentiment
supabase functions deploy send-scheduled-notifications
```

---

## Secrets Checklist

In Supabase Dashboard > Project Settings > Edge Functions, ensure these secrets exist:

| Secret               | Required For       |
| -------------------- | ------------------ |
| `PERPLEXITY_API_KEY` | All AI features    |
| `EXPO_ACCESS_TOKEN`  | Push notifications |

---

## Troubleshooting

### 503 Error on AI Features

- Verify `PERPLEXITY_API_KEY` is set correctly
- Redeploy the affected Edge Function
- Check Edge Function logs in Supabase Dashboard

### Push Notifications Not Working

- Verify `EXPO_ACCESS_TOKEN` is set
- Check that `expo_push_token` column exists in `Couples_profiles`
- Verify the `Couples_scheduled_notifications` table exists

### Table Not Found Errors

- Run the corresponding SQL migration file
- Refresh your Supabase schema cache (sometimes needed after new tables)

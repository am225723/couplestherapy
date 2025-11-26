# Supabase Setup Instructions

## Step 1: Run the SQL Setup Scripts

### Part A: Main Setup

1. Go to your Supabase project dashboard: https://froxodstewdswllgokmu.supabase.co
2. Navigate to **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy the entire contents of `supabase-setup.sql`
5. Paste it into the SQL Editor
6. Click **Run** to execute the script

This will create all tables with the `Couples_` prefix and set up basic Row Level Security (RLS) policies.

### Part B: Couple Join Fix (Required for pairing)

1. In the same **SQL Editor**, click **New Query** again
2. Copy the entire contents of `supabase-couple-join-fix.sql`
3. Paste it into the SQL Editor
4. Click **Run** to execute the migration

This adds the `join_code` column and updates RLS policies so partners can find and join each other securely.

### Part C: Week Tracking Upgrade (Recommended)

1. In the same **SQL Editor**, click **New Query** again
2. Copy the entire contents of `supabase-week-tracking-upgrade.sql`
3. Paste it into the SQL Editor
4. Click **Run** to execute the upgrade

This adds automatic ISO week number tracking and enables the historical timeline view feature.

### Part D: Storage Setup for Image Uploads (Recommended)

1. In the same **SQL Editor**, click **New Query** again
2. Copy the entire contents of `supabase-storage-setup.sql`
3. Paste it into the SQL Editor
4. Click **Run** to execute the setup

This creates the storage bucket and RLS policies for gratitude log image uploads.

## Step 2: Verify Table and Storage Creation

### Tables

After running the script, you should see a success message. You can verify by:

1. Going to **Table Editor** in Supabase
2. You should see all these tables:
   - Couples_profiles
   - Couples_couples
   - Couples_love_languages
   - Couples_gratitude_logs
   - Couples_weekly_checkins
   - Couples_shared_goals
   - Couples_therapist_comments
   - Couples_conversations
   - Couples_rituals

### Storage Buckets

1. Go to **Storage** in Supabase
2. You should see a bucket named **gratitude-images**
3. The bucket should be marked as **Private** (NOT public for security)

## Step 3: Test Data (Optional)

If you want to test the application, you can create a test therapist and couple:

```sql
-- Create test therapist (replace with actual auth user ID after signup)
-- First, sign up as a therapist in the app, then run:
UPDATE public."Couples_profiles"
SET role  in= 'therapist'
WHERE id = '8b5c908c-b69a-4c28-8b6b-48925b419515';

-- Create a test couple
-- After two clients sign up, create a couple relationship:
INSERT INTO public."Couples_couples" (id, partner1_id, partner2_id, therapist_id)
VALUES (
  uuid_generate_v4(),
  '0dfc6875-7fcf-4522-ad9c-2b4d9bcd6d0e',
  'fd723567-2dd3-440b-be8b-2a3179a3411b',
  '8b5c908c-b69a-4c28-8b6b-48925b419515'
);

-- Update client profiles with couple_id
UPDATE public."Couples_profiles"
SET couple_id = (SELECT id FROM public."Couples_couples" WHERE partner1_id = '0dfc6875-7fcf-4522-ad9c-2b4d9bcd6d0e')
WHERE id IN ('0dfc6875-7fcf-4522-ad9c-2b4d9bcd6d0e', 'fd723567-2dd3-440b-be8b-2a3179a3411b');
```

## Environment Variables

**IMPORTANT**: Before running the application, you MUST set these environment variables:

1. Go to your Replit project
2. Click on "Secrets" (lock icon) in the left sidebar
3. Add these secrets:

```
VITE_SUPABASE_URL=https://froxodstewdswllgokmu.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZyb3hvZHN0ZXdkc3dsbGdva211Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEzNjgyODUsImV4cCI6MjA3Njk0NDI4NX0.PUr1-cq71PZUFsudz7lzSs3IWMzSxomNqBwlxkCG02s
```

Note: The SUPABASE_SERVICE_ROLE_KEY is already set.

## What's Next?

After setting up the database:

1. The application will be ready to use
2. Users can sign up and create profiles
3. Therapists can be assigned to couples
4. All features (weekly check-ins, gratitude log, goals, rituals, conversations) will work

## Privacy & Security

✅ All tables have Row Level Security (RLS) enabled
✅ Private weekly check-ins are only visible to the author and their therapist
✅ Shared data (gratitude, goals, rituals) is visible to the couple and therapist
✅ Therapist private notes are only visible to the therapist
✅ Partners cannot see each other's private weekly check-ins

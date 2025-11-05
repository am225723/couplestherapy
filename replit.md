# TADI - Therapist-Assisted Digital Intervention Platform

## Project Overview

A comprehensive, multi-tenant couples therapy platform with separate client and admin applications. Built with React, Vite, Supabase (PostgreSQL, Auth, Realtime), and Tailwind CSS + Shadcn UI.

## Architecture

### Frontend
- **Framework**: React 18 with Vite
- **Routing**: Wouter
- **Styling**: Tailwind CSS with custom therapeutic color palette (teal/green primary, based on logo)
- **UI Components**: Shadcn UI (Radix primitives)
- **State Management**: TanStack Query v5 for server state
- **Auth**: Supabase Auth with AuthContext provider
- **Theme**: Light/Dark mode support with ThemeProvider

### Backend
- **Database**: Supabase PostgreSQL with Row Level Security (RLS)
- **Auth**: Supabase Authentication
- **Realtime**: Supabase Realtime for therapist comments
- **Storage**: Supabase Storage (configured for gratitude log images and voice memos)

### Database Schema (All tables prefixed with `Couples_`)

1. **Couples_profiles** - User profiles linked to auth.users
   - role: 'client' or 'therapist'
   - couple_id: Links partners together

2. **Couples_couples** - The hub linking two partners and their therapist
   - partner1_id, partner2_id, therapist_id
   - join_code: 8-character code for partner pairing (first 8 chars of UUID)

3. **Couples_love_languages** - 30-question quiz results
   - primary_language, secondary_language, scores (JSONB)

4. **Couples_gratitude_logs** - Shared gratitude posts
   - text_content, image_url, created_at

5. **Couples_weekly_checkins** - Private weekly reflections
   - q_connectedness (1-10), q_conflict (1-10)
   - q_appreciation, q_regrettable_incident, q_my_need
   - **Privacy**: Partners CANNOT see each other's check-ins

6. **Couples_shared_goals** - Trello-style Kanban board
   - title, status ('backlog', 'doing', 'done'), assigned_to

7. **Couples_therapist_comments** - Contextual feedback
   - is_private_note: true = therapist only, false = visible to couple
   - related_activity_type, related_activity_id

8. **Couples_conversations** - Hold Me Tight (EFT) conversations (6-step structure)
   - initiator_situation (When this happens...)
   - initiator_statement_feel (I feel...)
   - initiator_scared_of (What am I scared of?)
   - initiator_embarrassed_about (What am I embarrassed about?)
   - initiator_expectations (What are my expectations?)
   - initiator_statement_need (What do I need?)
   - partner_reflection, partner_response

9. **Couples_rituals** - Daily connection rituals
   - category: 'Mornings', 'Reuniting', 'Mealtimes', 'Going to Sleep'
   - **Feature**: Research-based examples library from Gottman Institute

10. **Couples_voice_memos** - Voice messages for Words of Affirmation
   - sender_id, recipient_id, storage_path, duration_secs
   - transcript_text (nullable), is_listened
   - **Privacy**: Therapists see metadata only (no audio access)

11. **Couples_messages** - Secure messaging between therapists and couples
   - couple_id, sender_id, message_text, is_read
   - **Security**: SELECT and INSERT only via RLS; no UPDATE to prevent tampering
   - **Privacy**: Therapists can message their assigned couples; couples can message their therapist

12. **Couples_calendar_events** - Shared calendar for planning events and dates
   - couple_id, created_by, title, description, start_at, end_at, is_all_day
   - **Features**: Month/week/day views using react-big-calendar, real-time updates
   - **Privacy**: Partners have full CRUD access; therapists have read-only access

## Row Level Security (RLS)

**Critical Privacy Features:**
- Partners cannot see each other's weekly check-ins (only their own)
- Therapists can see ALL check-ins for their assigned couples
- Shared data (gratitude, goals, rituals, conversations) visible to couple + therapist
- Private therapist notes (is_private_note=true) only visible to therapist
- Public therapist comments (is_private_note=false) pushed via Realtime to client app
- Voice memos: Partners can listen to each other's recordings; therapists see metadata only
- Messages: No UPDATE access via RLS to prevent tampering; mark-as-read handled server-side only
- Calendar events: Partners can create/edit/delete their couple's events; therapists have read-only view

## Application Features

### Client App (for Couples)
1. **Authentication** - Sign up/Sign in with Supabase Auth
2. **Love Language Quiz** - 30-question forced-choice assessment
3. **Weekly Check-In** - Private 5-question reflection (sliders + text)
4. **Gratitude Log** - Instagram-style shared feed
5. **Shared Goals** - Drag-and-drop Kanban board (React Beautiful DnD)
6. **Rituals of Connection** - Gottman-based daily rituals builder with research-based examples library
7. **Hold Me Tight Conversation** - 6-step EFT wizard (situation, feelings, fears, shame, expectations, needs)
8. **Voice Memos** - Record and send voice messages to partner (Words of Affirmation)
9. **Connection Concierge** - AI-powered date night generator using Perplexity (asks preferences, generates 3 personalized date ideas with connection tips)
10. **Messages** - Chat-style secure messaging with therapist (real-time updates via Supabase Realtime)
11. **Calendar** - Shared calendar for planning events and dates with month/week/day views (integrates with Connection Concierge)
12. **Realtime Therapist Comments** - Contextual feedback appears under activities

### Admin App (for Therapists)
1. **Secure Login** - Only users with role='therapist' can access
2. **User Management** - Create new client couples and therapist accounts
3. **Client Roster** - List of all assigned couples
4. **Couple Dashboard**:
   - **Weekly Check-ins**: Side-by-side comparison of both partners
   - **Love Languages**: Side-by-side profile comparison (30-question quiz results)
   - **Activity Feed**: Chronological view of all couple activities including voice memo metadata
5. **Contextual Commenting** - Add comments to any activity with private/public toggle
6. **Messages** - Chat-style secure messaging with assigned couples (real-time updates)
7. **Calendar** - Read-only view of assigned couples' calendar events
8. **Analytics** - Perplexity AI-powered insights and progress tracking

## How to Run

### Database Setup
1. Go to Supabase SQL Editor
2. Run the following migration scripts in order:
   - `supabase-setup.sql` (main schema)
   - `supabase-hold-me-tight-update.sql` (6-step EFT conversation fields)
   - `supabase-voice-memos.sql` (voice memo feature)
   - `supabase-messages-migration.sql` (secure messaging feature)
   - `supabase-calendar-migration.sql` (calendar feature with RLS policies)
3. Verify all tables with `Couples_` prefix are created
4. Set up Supabase Storage:
   - Create bucket: `voice-memos` (private)
   - Follow instructions in `SUPABASE_STORAGE_SETUP.md`

### Development
```bash
npm run dev
```
Application runs on http://localhost:5000

### Creating Test Data

After signing up users in the app:

```sql
-- Make a user a therapist
UPDATE public."Couples_profiles"
SET role = 'therapist'
WHERE id = 'USER_ID_FROM_AUTH';

-- Create a couple relationship
INSERT INTO public."Couples_couples" (id, partner1_id, partner2_id, therapist_id)
VALUES (uuid_generate_v4(), 'PARTNER1_ID', 'PARTNER2_ID', 'THERAPIST_ID');

-- Link partners to couple
UPDATE public."Couples_profiles"
SET couple_id = (SELECT id FROM public."Couples_couples" WHERE partner1_id = 'PARTNER1_ID')
WHERE id IN ('PARTNER1_ID', 'PARTNER2_ID');
```

## Key User Flows

### Client Journey
1. Sign up → Create profile (role='client')
2. **Couple Setup**: Create couple OR join partner using 8-char code
3. Take Love Language Quiz (30 questions) → Results saved and visible to both partners
4. Dashboard shows activities
5. Complete Weekly Check-In → Private, partner can't see
6. Add Gratitude Log posts → Partner can see
7. Create/drag Shared Goals
8. Build Rituals for each category (with research-based example suggestions)
9. Start Hold Me Tight conversation (6-step EFT wizard) → Partner completes
10. Record and send Voice Memos to partner
11. Use Connection Concierge to plan AI-generated date nights with connection tips
12. Send and receive messages with therapist in real-time chat
13. Plan events and dates together using shared calendar
14. Receive therapist comments in real-time

### Therapist Journey
1. Sign up → Profile set to role='therapist'
2. Create new client couples and therapist accounts via User Management
3. View couple roster
4. Select couple → See side-by-side check-ins
5. Review love languages (30-question quiz results)
6. Browse activity feed (includes voice memo metadata)
7. Add contextual comments (private or public)
8. Public comments appear in client app via Realtime
9. Send and receive messages with couples in real-time chat
10. View assigned couples' calendar events (read-only)
11. Use Analytics dashboard for AI-powered insights

## Design System

**Colors (Teal/Green Theme based on Logo):**
- Primary: Teal (#00BFA5 - 175° 100% 37.5%)
- Secondary: Soft teal (#B8E6DD - 175° 40% 80%)
- Accent: Light teal (#E0F7F4 - 175° 50% 95%)
- Background: Off-white (#FCFCFC - 0° 0% 99%)

**Typography:**
- Font: Inter
- Scale: 2.5rem (H1), 2rem (H2), 1.5rem (H3), 1rem (body)

**Components:**
- Warm, compassionate feel
- Generous spacing (p-6, gap-6)
- Subtle shadows and elevations
- Rounded corners (rounded-md)
- Cards for grouping content

## Environment Variables

```
VITE_SUPABASE_URL=https://froxodstewdswllgokmu.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=[Stored in Replit Secrets]
```

## Recent Updates

**November 2025:**
- ✅ Updated Hold Me Tight conversation to 6-step EFT structure (situation, feelings, fears, shame, expectations, needs)
- ✅ Added ritual examples library with research-based suggestions from Gottman Institute
- ✅ Implemented voice recording feature for Words of Affirmation
- ✅ Added therapist user management (create couples and therapist accounts)
- ✅ Updated design system to teal/green color scheme based on logo
- ✅ Implemented Perplexity AI analytics dashboard for therapists
- ✅ Implemented Connection Concierge: AI-powered date night generator that asks preferences and creates personalized date ideas with connection tips
- ✅ Implemented secure messaging system: Chat-style UI with real-time updates, RLS policies for security (SELECT/INSERT only, no UPDATE to prevent tampering)
- ✅ Implemented calendar feature: react-big-calendar with month/week/day views, real-time updates, Connection Concierge integration to prefill events, therapist read-only view

## Future Enhancements

- Image upload for gratitude logs
- Email notifications for incomplete check-ins
- Week-over-week progress visualization for clients
- Milestone celebrations
- Progress tracking timeline for therapists
- Intervention suggestions and resource library

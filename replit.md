# TADI - Therapist-Assisted Digital Intervention Platform

## Project Overview

A comprehensive, multi-tenant couples therapy platform with separate client and admin applications. Built with React, Vite, Supabase (PostgreSQL, Auth, Realtime), and Tailwind CSS + Shadcn UI.

## Architecture

### Frontend
- **Framework**: React 18 with Vite
- **Routing**: Wouter
- **Styling**: Tailwind CSS with custom therapeutic color palette (coral pink primary, teal accents)
- **UI Components**: Shadcn UI (Radix primitives)
- **State Management**: TanStack Query v5 for server state
- **Auth**: Supabase Auth with AuthContext provider
- **Theme**: Light/Dark mode support with ThemeProvider

### Backend
- **Database**: Supabase PostgreSQL with Row Level Security (RLS)
- **Auth**: Supabase Authentication
- **Realtime**: Supabase Realtime for therapist comments
- **Storage**: Supabase Storage (configured for gratitude log images)

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

8. **Couples_conversations** - Hold Me Tight (EFT) conversations
   - initiator_statement_feel, initiator_statement_need
   - partner_reflection, partner_response

9. **Couples_rituals** - Daily connection rituals
   - category: 'Mornings', 'Reuniting', 'Mealtimes', 'Going to Sleep'

## Row Level Security (RLS)

**Critical Privacy Features:**
- Partners cannot see each other's weekly check-ins (only their own)
- Therapists can see ALL check-ins for their assigned couples
- Shared data (gratitude, goals, rituals, conversations) visible to couple + therapist
- Private therapist notes (is_private_note=true) only visible to therapist
- Public therapist comments (is_private_note=false) pushed via Realtime to client app

## Application Features

### Client App (for Couples)
1. **Authentication** - Sign up/Sign in with Supabase Auth
2. **Love Language Quiz** - 30-question forced-choice assessment
3. **Weekly Check-In** - Private 5-question reflection (sliders + text)
4. **Gratitude Log** - Instagram-style shared feed
5. **Shared Goals** - Drag-and-drop Kanban board (React Beautiful DnD)
6. **Rituals of Connection** - Gottman-based daily rituals builder
7. **Hold Me Tight Conversation** - Multi-step EFT wizard
8. **Realtime Therapist Comments** - Contextual feedback appears under activities

### Admin App (for Therapists)
1. **Secure Login** - Only users with role='therapist' can access
2. **Client Roster** - List of all assigned couples
3. **Couple Dashboard**:
   - **Weekly Check-ins**: Side-by-side comparison of both partners
   - **Love Languages**: Side-by-side profile comparison
   - **Activity Feed**: Chronological view of all couple activities
4. **Contextual Commenting** - Add comments to any activity with private/public toggle

## How to Run

### Database Setup
1. Go to Supabase SQL Editor
2. Run the entire `supabase-setup.sql` script
3. Verify all tables with `Couples_` prefix are created

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
3. Take Love Language Quiz → Results saved
4. Dashboard shows activities
5. Complete Weekly Check-In → Private, partner can't see
6. Add Gratitude Log posts → Partner can see
7. Create/drag Shared Goals
8. Build Rituals for each category
9. Start Hold Me Tight conversation → Partner completes
10. Receive therapist comments in real-time

### Therapist Journey
1. Sign up → Profile set to role='therapist'
2. Get assigned to couples (via SQL or future admin panel)
3. View couple roster
4. Select couple → See side-by-side check-ins
5. Review love languages
6. Browse activity feed
7. Add contextual comments (private or public)
8. Public comments appear in client app via Realtime

## Design System

**Colors:**
- Primary: Coral pink (#E07A6F - 345° 70% 55%)
- Secondary: Soft teal (#B8D8D8 - 180° 45% 92%)
- Accent: Teal (#A7C7C7 - 180° 60% 90%)
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

## Future Enhancements (Not in MVP)

- Perplexity AI integration for relationship insights
- Image upload for gratitude logs (Supabase Storage)
- Email notifications for incomplete check-ins
- Week number tracking and historical views
- Analytics dashboard for therapists
- Couple assignment UI for therapists

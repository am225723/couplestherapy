# New Features Implementation Guide

## Overview

This guide explains the production-ready backend infrastructure for 4 new therapy features that has been built and how to deploy it.

## Features Implemented

### 1. Attachment Style Assessment
- 30-question assessment measuring attachment styles (secure, anxious, avoidant, disorganized)
- Individual sessions with progress tracking
- Automated scoring with reverse-scored questions
- Couple-level dynamics analysis
- Attachment triggers tracking
- Repair scripts library for each attachment style

### 2. Enneagram Couple Dynamics
- 36-question assessment covering all 9 Enneagram types
- Individual sessions with progress tracking
- Automated scoring identifying dominant and secondary types
- Couple compatibility reports
- Growth opportunities identification

### 3. Shared Couple Journal
- Multi-mode entries (individual or joint authorship)
- Three visibility levels (private, shared with partner, shared with therapist)
- Media attachments support (photos, videos via Supabase Storage)
- Relationship milestones tracking
- Journal prompts library for inspiration
- Mood tracking and favorites
- Therapist share tracking

### 4. Financial Communication Toolkit
- Financial values alignment exercise
- Monthly budget tracking by category
- Shared financial goals with progress tracking
- Financial discussion logs
- Privacy-respecting money conversation framework

## Files Created

### Database & Storage
1. **supabase-new-features-migration.sql** (674 lines)
   - Creates 21 new database tables
   - Enables RLS on all tables
   - Implements 46 RLS policies for security
   - Creates helper functions (get_my_couple_id, is_therapist_for_couple)
   - Adds performance indexes

2. **supabase-seed-questions.sql** (241 lines)
   - 30 attachment assessment questions
   - 36 enneagram assessment questions
   - 10 journal writing prompts
   - 8 attachment repair scripts

3. **supabase-journal-storage-setup.sql** (66 lines)
   - Creates private storage bucket for journal media
   - Implements RLS policies for file access
   - Privacy-aware file sharing rules

### API Endpoints
1. **server/routes/attachment.ts** (352 lines)
   - GET /questions - Fetch all questions
   - POST /sessions - Create assessment session
   - GET /sessions/my - Get user's sessions
   - POST /responses - Save question response
   - POST /sessions/:id/complete - Calculate results
   - GET /results/my - Get user's results
   - GET /results/couple - Get couple's results
   - GET /repair-scripts - Get style-specific scripts

2. **server/routes/enneagram.ts** (274 lines)
   - GET /questions - Fetch all questions
   - POST /sessions - Create assessment session
   - GET /sessions/my - Get user's sessions
   - POST /responses - Save question response
   - POST /sessions/:id/complete - Calculate results
   - GET /results/my - Get user's results
   - GET /results/couple - Get couple's results

3. **server/routes/journal.ts** (356 lines)
   - GET /prompts - Get writing prompts
   - POST /entries - Create journal entry
   - GET /entries - Get couple's entries (with visibility filtering)
   - GET /entries/:id - Get specific entry with attachments
   - PATCH /entries/:id - Update entry
   - DELETE /entries/:id - Delete entry
   - POST /milestones - Create milestone
   - GET /milestones - Get couple's milestones

4. **server/routes/financial.ts** (390 lines)
   - POST /values - Create financial value statement
   - GET /values - Get couple's values
   - POST /budgets - Create/update budget category
   - GET /budgets - Get budgets (with month filter)
   - POST /goals - Create financial goal
   - GET /goals - Get goals (with active filter)
   - PATCH /goals/:id - Update goal progress
   - POST /discussions - Log financial discussion
   - GET /discussions - Get discussion history

### Infrastructure
- **server/routes.ts** - Updated to register all 4 new routers

## Database Schema

All tables use the `Couples_` prefix and include:

### Attachment Tables
- Couples_attachment_questions
- Couples_attachment_sessions
- Couples_attachment_responses
- Couples_attachment_results
- Couples_attachment_dynamics
- Couples_attachment_triggers
- Couples_attachment_repair_scripts

### Enneagram Tables
- Couples_enneagram_questions
- Couples_enneagram_sessions
- Couples_enneagram_responses
- Couples_enneagram_results
- Couples_enneagram_couple_reports

### Journal Tables
- Couples_journal_entries
- Couples_journal_attachments
- Couples_journal_milestones
- Couples_journal_prompts
- Couples_journal_shares

### Financial Tables
- Couples_financial_values
- Couples_financial_budgets
- Couples_financial_goals
- Couples_financial_discussions

## Deployment Steps

### Step 1: Run Database Migrations (Required)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor** in the left sidebar
3. Click **New Query**

**Migration 1: Main Tables & RLS**
- Copy the entire contents of `supabase-new-features-migration.sql`
- Paste into SQL Editor
- Click **Run**
- Expected result: "Success. No rows returned"

**Migration 2: Seed Questions**
- Click **New Query** again
- Copy the entire contents of `supabase-seed-questions.sql`
- Paste into SQL Editor
- Click **Run**
- Expected result: Success with 84+ rows inserted

**Migration 3: Journal Storage**
- Click **New Query** again
- Copy the entire contents of `supabase-journal-storage-setup.sql`
- Paste into SQL Editor
- Click **Run**
- Expected result: "Success. No rows returned"

### Step 2: Verify Deployment

After running the migrations, verify in Supabase:

1. **Table Editor** - You should see 21 new tables with `Couples_` prefix
2. **Authentication > Policies** - Each table should show RLS enabled with multiple policies
3. **Storage** - You should see a new `journal-attachments` bucket

### Step 3: Restart Application

The API endpoints are already registered and will be available after restart:
- `/api/attachment/*`
- `/api/enneagram/*`
- `/api/journal/*`
- `/api/financial/*`

## Security Implementation

### Row Level Security (RLS)
Every table has comprehensive RLS policies:

**Client Access:**
- Users can only access data for their own couple
- Partners can view each other's shared data
- Private data remains private

**Therapist Access:**
- Read-only access to assigned couples' data
- Can add comments and notes
- Cannot modify couple's data directly

**Journal Privacy Levels:**
- Private: Only author can view
- Shared with partner: Both partners can view
- Shared with therapist: Therapist gets read access

### API Security
All endpoints:
- Require authentication via `verifyUserSession`
- Verify couple membership before data access
- Validate user ownership before mutations
- Use couple_id from profile to prevent spoofing

## What's Next (Not Yet Implemented)

### Frontend Integration
The following pages need to be updated to use the new API endpoints instead of localStorage:

1. **client/src/pages/attachment-assessment.tsx**
   - Replace localStorage with API calls to `/api/attachment`
   - Add real-time score calculation
   - Implement results visualization

2. **client/src/pages/enneagram-assessment.tsx**
   - Replace localStorage with API calls to `/api/enneagram`
   - Add type descriptions and compatibility insights
   - Implement couple comparison view

3. **client/src/pages/couple-journal.tsx**
   - Replace localStorage with API calls to `/api/journal`
   - Add media upload to Supabase Storage
   - Implement Realtime for collaborative writing

4. **client/src/pages/financial-toolkit.tsx** (needs to be created)
   - Build from scratch using `/api/financial` endpoints
   - Implement budget tracking UI
   - Add financial goals visualization

### Therapist Admin Views
Create 4 new admin views in the therapist dashboard:

1. **Attachment Results View** (`/admin/couple/:id/attachment`)
   - Side-by-side attachment style comparison
   - Dynamic pattern identification
   - Trigger history timeline
   - Suggested repair scripts

2. **Enneagram Results View** (`/admin/couple/:id/enneagram`)
   - Type compatibility matrix
   - Growth opportunities
   - Type-specific communication tips

3. **Journal Entries View** (`/admin/couple/:id/journal`)
   - Shared entries only (respect privacy)
   - Milestones timeline
   - Mood trends visualization

4. **Financial Data View** (`/admin/couple/:id/financial`)
   - Aggregated values alignment
   - Budget health indicators
   - Goal progress tracking
   - Discussion log access

### Realtime Features
Add Supabase Realtime subscriptions for:
- Journal entries (collaborative writing)
- Milestones (shared celebration)
- Financial goals (progress updates)
- Therapist comments (instant feedback)

### Testing
- End-to-end playwright tests for all 4 features
- Assessment scoring accuracy validation
- RLS policy verification
- Storage upload/download testing

## API Endpoint Reference

### Attachment Assessment

```typescript
// Get all questions
GET /api/attachment/questions

// Create new session
POST /api/attachment/sessions

// Get my sessions
GET /api/attachment/sessions/my

// Save response
POST /api/attachment/responses
Body: { session_id, question_id, response_value }

// Complete session (calculates results)
POST /api/attachment/sessions/:id/complete

// Get my results
GET /api/attachment/results/my

// Get couple's results
GET /api/attachment/results/couple

// Get repair scripts
GET /api/attachment/repair-scripts?style=anxious
```

### Enneagram Assessment

```typescript
// Get all questions
GET /api/enneagram/questions

// Create new session
POST /api/enneagram/sessions

// Get my sessions
GET /api/enneagram/sessions/my

// Save response
POST /api/enneagram/responses
Body: { session_id, question_id, response_value }

// Complete session (calculates results)
POST /api/enneagram/sessions/:id/complete

// Get my results
GET /api/enneagram/results/my

// Get couple's results
GET /api/enneagram/results/couple
```

### Journal

```typescript
// Get prompts
GET /api/journal/prompts?category=gratitude

// Create entry
POST /api/journal/entries
Body: { entry_content, entry_mode, visibility, mood, is_favorite }

// Get entries
GET /api/journal/entries?visibility=shared_with_partner&favorites_only=true

// Get specific entry
GET /api/journal/entries/:id

// Update entry
PATCH /api/journal/entries/:id
Body: { entry_content?, visibility?, mood?, is_favorite? }

// Delete entry
DELETE /api/journal/entries/:id

// Create milestone
POST /api/journal/milestones
Body: { milestone_date, milestone_title, milestone_description?, entry_id? }

// Get milestones
GET /api/journal/milestones
```

### Financial Toolkit

```typescript
// Create value
POST /api/financial/values
Body: { value_statement, priority_level? }

// Get values
GET /api/financial/values

// Create/update budget
POST /api/financial/budgets
Body: { category_name, budgeted_amount, spent_amount?, month_year }

// Get budgets
GET /api/financial/budgets?month_year=2025-01

// Create goal
POST /api/financial/goals
Body: { goal_title, target_amount, current_amount?, target_date? }

// Get goals
GET /api/financial/goals?active_only=true

// Update goal
PATCH /api/financial/goals/:id
Body: { current_amount?, is_achieved? }

// Log discussion
POST /api/financial/discussions
Body: { discussion_topic, decisions_made?, follow_up_needed? }

// Get discussions
GET /api/financial/discussions
```

## Notes

- All API endpoints require authentication
- File uploads for journal use Supabase Storage with signed URLs
- Scoring algorithms use normalization to 0-100 scale
- All timestamps are in UTC
- Money amounts use NUMERIC(12,2) for precision
- All IDs are UUIDs

## Support

For questions or issues with deployment, refer to the main `SUPABASE_SETUP_INSTRUCTIONS.md` file for general guidance on running Supabase SQL migrations.

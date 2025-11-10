# ALEIC - Assisted Learning for Empathetic and Insightful Couples

## Overview

ALEIC is a multi-tenant platform designed for couples therapy, offering separate applications for clients and therapists. It aims to facilitate therapeutic interventions, improve couple communication, and track progress through various interactive exercises and tools. The platform leverages modern web technologies to provide a secure, real-time, and engaging experience. Key capabilities include assessments, shared activities, communication tools, and therapist oversight.

**Brand Name:** ALEIC (Assisted Learning for Empathetic and Insightful Couples)

## Recent Changes (January 2025)

**Complete Brand Refresh to ALEIC (January 10, 2025):**
- ✅ **Rebrand from TADI to ALEIC** - Complete visual and naming rebrand
  - Updated logo to minimalist couple line art symbolizing connection
  - New vibrant multi-color palette: Teal (primary), Coral (secondary), Purple (accent), Pink (tertiary)
  - Colorful gradient backgrounds throughout login page and hero sections
  - Updated all user-facing text: page titles, descriptions, navigation
- ✅ **Design System Overhaul** - design_guidelines.md updated with ALEIC aesthetic
  - Vibrant, energetic color scheme (vs previous calm teal-only palette)
  - Gradient applications for depth and visual interest
  - Minimalist line art visual identity
- ✅ **Login Page Redesign** - Modern, colorful auth experience
  - Large minimalist couple artwork
  - Colorful gradient backgrounds and trust badges
  - Multi-color ALEIC acronym breakdown
  - Hero section with vibrant teal-to-coral-to-purple gradient

**AI Features Implementation (January 8, 2025 - Night):**
- ✅ **5 Production-Ready AI Features** - All architect-approved and security-reviewed
  - `POST /api/ai/session-prep/:couple_id` - AI-powered therapist session preparation analyzing 13 therapy tools
  - `POST /api/ai/empathy-prompt` - Hold Me Tight empathy suggestions using EFT principles  
  - `GET /api/ai/exercise-recommendations` - Personalized therapy tool recommendations based on usage patterns
  - `POST /api/ai/echo-coaching` - Real-time active listening feedback with scoring (6-10)
  - `POST /api/ai/voice-memo-sentiment` - Voice memo tone analysis (loving, appreciative, etc.)
- **Security & Privacy:**
  - Removed sensitive logging from Perplexity API calls (no therapeutic content in logs)
  - Input size validation (2000-5000 char limits) prevents token overflow
  - Anonymized labels ("Partner 1/2") when sending data to AI - no real names
  - Proper authentication (therapist-only vs client endpoints)
- **Performance:**
  - Intelligent caching (5min to 24hr TTL depending on use case)
  - Parallel data fetching with Promise.all()
  - Structured JSON parsing of AI responses
- **Documentation:** See `AI_FEATURES_COMPLETE.md` for comprehensive guide

**Therapist Dashboard Enhancement (January 8, 2025 - Evening):**
- ✅ **6 New Therapy Tools Dashboard Views** - Added "Therapy Tools" tab in Admin Dashboard
  - Four Horsemen Tracker (incidents, antidote success rate, type breakdown)
  - Demon Dialogues (cycles, interruption rate, type breakdown)
  - Meditation Library (sessions, minutes, recent meditations)
  - Intimacy Mapping (ratings, goals, dimension averages)
  - Values & Vision (dreams, values, vision board items)
  - Parenting as Partners (agreements, stress check-ins, parenting styles)
- ✅ **6 Secure Therapist API Endpoints** - All use `verifyTherapistSession()` and verify couple assignment
  - `GET /api/four-horsemen/couple/:couple_id`
  - `GET /api/demon-dialogues/couple/:couple_id`
  - `GET /api/meditation/couple/:couple_id/sessions`
  - `GET /api/intimacy-mapping/couple/:couple_id`
  - `GET /api/values-vision/couple/:couple_id`
  - `GET /api/parenting/couple/:couple_id`

**Bug Fixes (January 8, 2025 - Evening):**
- ✅ Fixed Pause Button query key issue (corrected URL format to match backend)
- ✅ Fixed 26 TypeScript/LSP errors in admin-dashboard.tsx (imports, null safety, Date handling)
- ✅ Created Love Map Questions Seed SQL with 50 Gottman-inspired questions across 5 categories

**Documentation & Planning Deliverables (January 8, 2025 - Evening):**
- ✅ **SUPABASE_EDGE_FUNCTIONS_READY.md** - Production-ready Edge Functions
  - Complete code for `ai-date-night` and `ai-insights` Edge Functions
  - Uses environment variables for API keys (secure deployment)
  - Includes deployment instructions and secret management guidance
  - Privacy-focused: Allowlist logging, no user data exposure
- ✅ **ADDITIONAL_THERAPY_TOOLS.md** - Evidence-Based Feature Roadmap
  - 15 couples therapy tools organized into 4 priority phases
  - Complete database schemas for Phase 1-3 tools (Gottman Four Horsemen, Fair Fighting Rules, Intimacy Mapping, etc.)
  - API route specifications and frontend integration guidance
  - Effort estimates and implementation timeline
  - Leverages existing platform infrastructure (Realtime, Storage, AI integration)
- ✅ **BUG_FIX_GUIDE.md** - Diagnostic & Troubleshooting Guide
  - Detailed analysis of 9 reported feature issues
  - Root cause diagnosis with specific code references
  - SQL queries for database verification
  - Step-by-step debugging process
  - Testing recommendations for each feature
  - **Note:** Many reported "bugs" may be user flow issues rather than code bugs - requires testing to confirm

**Bug Fixes & Security Improvements (January 8, 2025 - Morning):**
- ✅ Fixed Voice Memo API contract mismatch: Backend was returning `{memo_id, upload_url, storage_path}` but frontend was expecting `{id, uploadUrl}`
  - Updated frontend to correctly destructure `memo_id`, `upload_url`, and `storage_path` from create endpoint response
  - Fixed complete endpoint to properly pass `storage_path` and `duration_secs` in request body
- ✅ Secured all therapist analytics endpoints with session-based authentication
  - `/api/ai/analytics` - Now derives therapist_id from authenticated session via `verifyTherapistSession()`
  - `/api/ai/insights` - Now derives therapist_id from authenticated session via `verifyTherapistSession()`
  - `/api/therapist/export-couple-report` - Now derives therapist_id from authenticated session via `verifyTherapistSession()`
  - Removed insecure `therapist_id` query parameters that allowed access-control bypass
  - Updated frontend to remove therapist_id from all API calls (server derives from session)
- **Impact:** Eliminated critical security vulnerability where malicious users could access other therapists' data by manipulating query parameters
- **React Query Note:** Query keys no longer include therapist_id, which may require cache invalidation after therapist logout/login

**Supabase Edge Functions Migration (COMPLETE):**
- ✅ Migrated all AI endpoints from Express routes to Supabase Edge Functions for better performance and scalability
- **Completed Functions:**
  - `ai-date-night` - Connection Concierge (generates personalized date night ideas with Perplexity AI)
  - `ai-insights` - Clinical Insights (analyzes weekly check-ins for therapist with privacy-focused anonymization)
- **Architecture:** All code inlined in single files (no shared imports for simpler deployment)
- **Privacy:** Allowlist logging approach, never logs user data, uses anonymized labels ("Partner 1/2") when sending to AI
- **Model:** Uses Perplexity 'sonar' model with proper output formatting
- **Frontend:** Updated to use `fetch()` for public access (works for all users, authenticated or not)
- **Benefits:** Global edge deployment, pay-per-invocation pricing, simplified Vercel deployment
- **Deployment:** See `SUPABASE_EDGE_FUNCTIONS_COMPLETE.md` for copy-paste ready code and instructions

## User Preferences

I prefer iterative development with clear communication on progress and potential changes. Please ask before implementing major architectural changes or introducing new dependencies. I value a clean, readable codebase with consistent styling and well-documented components. For explanations, please use clear, concise language, focusing on the "why" behind decisions as much as the "what."

## System Architecture

The platform consists of a React 18 frontend with Vite, utilizing Wouter for routing, Tailwind CSS (with a custom therapeutic teal/green palette) and Shadcn UI for styling and components. TanStack Query v5 manages server state, and Supabase handles authentication. The backend is powered by Supabase PostgreSQL with robust Row Level Security (RLS) for data privacy, Supabase Authentication, Realtime for live updates, and Storage for media.

**UI/UX Decisions:**
The design focuses on a warm, compassionate feel with the Inter font, generous spacing (p-6, gap-6), subtle shadows, rounded corners, and card-based content grouping. Light/Dark mode is supported.

**Technical Implementations:**
- **Authentication**: Supabase Auth with an AuthContext provider.
- **Database Schema**: All tables are prefixed with `Couples_` and include profiles, couples linking partners and therapists, love language results, gratitude logs, weekly check-ins, shared goals (Kanban), therapist comments, structured conversations (Hold Me Tight - EFT), daily rituals, voice memos, secure messages, shared calendar events, Love Map quiz components (questions, sessions, truths, guesses), Echo & Empathy sessions, IFS exercises, and a shared Pause Button.
- **Realtime**: Supabase Realtime is used for features like therapist comments, secure messaging, and calendar updates.
- **Privacy (RLS)**: Critical privacy features are enforced via RLS, ensuring partners' weekly check-ins are private, therapists have read-only access to certain data, and voice memo audio content is not accessible to therapists. Message tampering is prevented by restricting UPDATE access.

**Feature Specifications:**

*   **Client App (for Couples)**:
    *   **Assessments**: Love Language Quiz, Love Map Quiz (3-phase: self-answers, partner guesses, reveal), Weekly Check-Ins.
    *   **Shared Activities**: Gratitude Log, Shared Goals (Kanban), Rituals of Connection (Gottman-based), Hold Me Tight Conversation (6-step EFT wizard), Echo & Empathy (active listening).
    *   **Communication & Interaction**: Voice Memos (Words of Affirmation), Connection Concierge (AI date night generator), secure Messages with therapist, Shared Calendar, Shared Pause Button (real-time de-escalation), Realtime Therapist Comments.
    *   **Individual Exercises**: IFS Introduction (identifying protective parts).
*   **Admin App (for Therapists)**:
    *   **Management**: Secure Login, User Management (create clients/therapists), Client Roster.
    *   **Couple Dashboard**: Side-by-side comparison of Weekly Check-ins, Love Languages, Activity Feed (including voice memo metadata).
    *   **Intervention Tools**: Contextual Commenting (private/public toggle), secure Messages with couples, Read-only Calendar view, Love Map Quiz Results, Echo & Empathy History, IFS Exercises view, Pause History tracking, Analytics (Perplexity AI-powered insights).

## External Dependencies

*   **Database**: Supabase (PostgreSQL)
*   **Authentication**: Supabase Authentication
*   **Realtime**: Supabase Realtime
*   **Storage**: Supabase Storage (for voice memos, gratitude log images)
*   **AI**: Perplexity AI (for Connection Concierge and Therapist Analytics)
*   **UI Libraries**: Tailwind CSS, Shadcn UI (Radix primitives)
*   **Frontend Framework**: React 18, Vite
*   **Routing**: Wouter
*   **State Management**: TanStack Query v5
*   **Calendar Component**: react-big-calendar
*   **Drag-and-Drop**: React Beautiful DnD (for Shared Goals)
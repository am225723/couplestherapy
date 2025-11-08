# TADI - Therapist-Assisted Digital Intervention Platform

## Overview

TADI is a multi-tenant platform designed for couples therapy, offering separate applications for clients and therapists. It aims to facilitate therapeutic interventions, improve couple communication, and track progress through various interactive exercises and tools. The platform leverages modern web technologies to provide a secure, real-time, and engaging experience. Key capabilities include assessments, shared activities, communication tools, and therapist oversight.

## Recent Changes (January 2025)

**Bug Fixes & Security Improvements (January 8, 2025):**
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
# TADI - Therapist-Assisted Digital Intervention Platform

## Overview

TADI is a multi-tenant platform designed for couples therapy, offering separate applications for clients and therapists. It aims to facilitate therapeutic interventions, improve couple communication, and track progress through various interactive exercises and tools. The platform leverages modern web technologies to provide a secure, real-time, and engaging experience. Key capabilities include assessments, shared activities, communication tools, and therapist oversight.

## Recent Changes (January 2025)

**Supabase Edge Functions Migration:**
- Migrated AI endpoints from Express routes to Supabase Edge Functions for better performance and scalability
- **Completed:** `ai-date-night` edge function with input validation and privacy-focused logging
- **Frontend:** Updated date-night.tsx to use `supabase.functions.invoke()` instead of Express API
- **Benefits:** Global edge deployment, pay-per-invocation pricing, simplified Vercel deployment
- See `SUPABASE_EDGE_FUNCTIONS_GUIDE.md` for deployment instructions

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
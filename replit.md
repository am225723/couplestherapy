# ALEIC - Assisted Learning for Empathetic and Insightful Couples

## Overview

ALEIC is a multi-tenant platform for couples therapy, offering distinct applications for clients and therapists. It aims to enhance therapeutic interventions, improve couple communication, and track progress through interactive exercises and tools. The platform provides a secure, real-time, and engaging experience, featuring assessments, shared activities, communication tools, and therapist oversight. The brand, ALEIC, stands for "Assisted Learning for Empathetic and Insightful Couples."

## User Preferences

I prefer iterative development with clear communication on progress and potential changes. Please ask before implementing major architectural changes or introducing new dependencies. I value a clean, readable codebase with consistent styling and well-documented components. For explanations, please use clear, concise language, focusing on the "why" behind decisions as much as the "what."

## Recent Changes (November 2025)

**Navigation & UX Improvements:**
1. **Client Sidebar Reorganization**: Implemented config-driven sidebar architecture with 21+ tools organized into 6 collapsible categories (Dashboard, Assessments & Check-ins, Communication Tools, Personal Growth, Connection & Fun, Planning & Organization).
2. **Admin Sidebar Enhancement**: Added collapsible section groups to therapist dashboard (Core Insights, Communication Tools, Planning & Goals, Support Resources) with Love Map Quiz integration.
3. **Persistent Navigation State**: Both sidebars now save category open/closed state to localStorage with auto-expansion when navigating to routes within collapsed categories.

**Quality & Reliability Improvements:**
1. **AI Error Handling**: Added robust try/catch with schema validation for AI exercise recommendations endpoint to prevent crash loops from malformed responses.
2. **Love Language Deletion**: Implemented optimistic UI updates for deleting love language results with proper cache management.
3. **Love Map Pagination**: Implemented phase-scoped pagination system that properly filters questions per phase (truths/guesses/results), preventing UI glitches during phase transitions.
4. **Documentation Cleanup**: Removed emojis from FUTURE_FEATURES_ROADMAP.md per project style guidelines.

**Technical Details:**
- Client sidebar config defined in `client/src/config/clientMenuConfig.ts` with typed category/route definitions
- Admin sidebar sections use same collapsible pattern with separate localStorage key (`aleic-admin-sidebar-sections`)
- Both sidebars use Shadcn Collapsible + SidebarMenuSub primitives for consistent UX
- Auto-expansion logic detects active routes and expands containing categories on mount
- Love Map now uses `useMemo` for phase-specific question filtering, ensuring pagination bounds match filtered datasets
- Added automatic page clamping when datasets shrink to prevent out-of-bounds indices
- Submission validation now aligns with phase-specific question counts
- All UI counts and progress indicators derive from filtered phaseQuestions array

## System Architecture

The platform uses a React 18 frontend with Vite, Wouter for routing, and Tailwind CSS (with a custom therapeutic teal/green palette) and Shadcn UI for styling. TanStack Query v5 manages server state. The backend leverages Supabase PostgreSQL with Row Level Security (RLS), Supabase Authentication, Realtime for live updates, and Storage for media.

**UI/UX Decisions:**
The design emphasizes a warm, compassionate feel using the Inter font, generous spacing, subtle shadows, rounded corners, and card-based content grouping. It supports both light and dark modes. The login page features a modern split-screen design with a rotating carousel and dynamic form elements, optimized for various screen sizes. The brand refresh incorporated a new logo, a vibrant multi-color palette (Teal, Coral, Purple, Pink), and a minimalist line art visual identity.

**Technical Implementations:**
- **Authentication**: Handled by Supabase Auth with an AuthContext provider.
- **Database Schema**: All tables are prefixed with `Couples_` and include profiles, couple linkages, love language results, gratitude logs, weekly check-ins, shared goals (Kanban), therapist comments, structured conversations (Hold Me Tight - EFT), daily rituals, voice memos, secure messages, shared calendar events, Love Map quiz components, Echo & Empathy sessions, IFS exercises, and a shared Pause Button.
- **Realtime**: Supabase Realtime facilitates features like therapist comments, secure messaging, and calendar updates.
- **Privacy (RLS)**: Enforced via RLS to ensure data privacy, including private weekly check-ins for partners, read-only therapist access to specific data, and restricted access to voice memo audio content. Message tampering is prevented by restricting UPDATE access.
- **AI Integration**: Five production-ready AI features are implemented as Supabase Edge Functions for performance and scalability. These include `ai-exercise-recommendations`, `ai-empathy-prompt`, `ai-echo-coaching`, `ai-voice-memo-sentiment`, and `ai-session-prep`. All AI functions are secured with JWT authentication, role-based access control, resource ownership verification, input validation, and privacy-focused anonymization.

**Feature Specifications:**

*   **Client App (for Couples)**: Assessments (Love Language, Love Map, Weekly Check-Ins), Shared Activities (Gratitude Log, Shared Goals, Rituals of Connection, Hold Me Tight Conversation, Echo & Empathy), Communication & Interaction (Voice Memos, Connection Concierge, secure Messages, Shared Calendar, Shared Pause Button, Realtime Therapist Comments), Individual Exercises (IFS Introduction).
*   **Admin App (for Therapists)**: Management (Secure Login, User Management, Client Roster), Couple Dashboard (side-by-side comparison of Weekly Check-ins, Love Languages, Activity Feed), Intervention Tools (Contextual Commenting, secure Messages, Read-only Calendar, Love Map Quiz Results, Echo & Empathy History, IFS Exercises view, Pause History tracking, AI-powered Analytics).

## External Dependencies

*   **Database**: Supabase (PostgreSQL)
*   **Authentication**: Supabase Authentication
*   **Realtime**: Supabase Realtime
*   **Storage**: Supabase Storage
*   **AI**: Perplexity AI (for Connection Concierge and Therapist Analytics)
*   **UI Libraries**: Tailwind CSS, Shadcn UI (Radix primitives)
*   **Frontend Framework**: React 18, Vite
*   **Routing**: Wouter
*   **State Management**: TanStack Query v5
*   **Calendar Component**: react-big-calendar
*   **Drag-and-Drop**: React Beautiful DnD
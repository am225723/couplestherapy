# ALEIC - Assisted Learning for Empathetic and Insightful Couples

## Overview

ALEIC is a multi-tenant platform designed for couples therapy, providing distinct web and mobile applications for clients and therapists. Its primary purpose is to improve couple communication, enhance therapeutic interventions, and track progress through interactive tools and exercises. The platform offers a secure, real-time, and engaging experience with features including assessments, shared activities, communication tools, and therapist oversight. The vision is to empower therapists and couples with technology to foster empathy and insight, ultimately strengthening relationships.

## User Preferences

I prefer iterative development with clear communication on progress and potential changes. Please ask before implementing major architectural changes or introducing new dependencies. I value a clean, readable codebase with consistent styling and well-documented components. For explanations, please use clear, concise language, focusing on the "why" behind decisions as much as the "what."

## System Architecture

The ALEIC platform supports both web and mobile applications, sharing a common backend.

**Web Application:**

-   **Frontend:** React 18 with Vite, Wouter for routing.
-   **Styling:** Tailwind CSS with a custom therapeutic color palette, Shadcn UI for components.
-   **State Management:** TanStack Query v5.

**Mobile Application:**

-   **Framework:** React Native with Expo.
-   **Navigation:** React Navigation (Tab + Stack navigators).
-   **Styling:** Tailwind-inspired theme via React Native StyleSheet.
-   **State Management:** TanStack Query v5.

**Shared Backend:**

-   **Framework:** Express.js.
-   **Database:** Supabase (PostgreSQL) with Row Level Security (RLS) for data privacy.
-   **Authentication:** Supabase Authentication.
-   **Realtime:** Supabase Realtime for live updates.
-   **Storage:** Supabase Storage for media.
-   **AI Integration:** Seven AI features implemented as Supabase Edge Functions for performance and scalability, secured with JWT authentication and role-based access control. These include `ai-exercise-recommendations`, `ai-empathy-prompt`, `ai-echo-coaching`, `ai-voice-memo-sentiment`, `ai-session-prep`, `ai-insights`, and `ai-date-night`.
-   **Personalized Daily Tips:** AI-powered daily relationship tips personalized to each couple based on their completed assessments (attachment style, enneagram type, love language). Uses Perplexity AI with 24-hour caching per couple. Falls back to generic tips if no assessment data available. Displayed prominently above the regular daily suggestion on the Daily Suggestion page.
-   **Push Notifications:** System for therapists to schedule notifications to couples via Edge Functions and Expo Push Service.

**UI/UX Decisions:**
The design emphasizes a warm, compassionate feel using the Inter font, generous spacing, subtle shadows, rounded corners, and card-based content grouping. It supports both light and dark modes. The login page features a modern split-screen design. A brand refresh incorporated a new logo, a vibrant multi-color palette (Teal, Coral, Purple, Pink), and a minimalist line art visual identity.

**Technical Implementations:**

-   **Authentication:** Handled by Supabase Auth with an AuthContext provider.
-   **Database Schema:** All tables are prefixed with `Couples_` and cover profiles, couple linkages, assessments (Love Language, Love Map, Weekly Check-Ins, Attachment Style, Enneagram), shared activities (Gratitude Log, Shared Goals, Rituals of Connection, Hold Me Tight Conversation, Echo & Empathy, Couple Journal, Financial Toolkit), communication tools (Voice Memos, Secure Messages, Shared Calendar, Pause Button), therapist comments, and IFS exercises.
-   **Privacy (RLS):** Strictly enforced to ensure data privacy and prevent unauthorized access or tampering.
-   **Cross-Therapist Access Model:** Therapists can now view and interact with all couples in the system, supporting multi-therapist practices.
-   **Therapist Thoughts System:** A dedicated section for therapists to manage to-dos, messages, and file references for clients.
-   **Therapist Prompt Customization:** Therapists can create custom prompts and suggestions for each couple via the "Prompts" tab in the admin dashboard. These prompts appear in the "Suggested For You" section on the client dashboard, replacing AI-generated recommendations when available. Features include create/edit/delete, enable/disable toggles, and drag-to-reorder functionality.
-   **Therapist-Initiated Reflection Prompts:** Therapists can send guided reflection questions to couples or individual partners via the "Reflection Question" activity type. Prompts can target both partners (shared) or a specific individual (personalized). Couples see these in a dedicated section on their dashboard with a response form. Each partner can submit private responses, optionally sharing with their partner. Therapists can view all responses in the admin dashboard. Database tables: `Couples_therapist_prompts` (with `target_user_id` for individual targeting), `Couples_reflection_responses`. API routes at `/api/therapist-prompts/reflection-responses` with proper authentication and authorization.
-   **Widget Content Customization:** Therapists can personalize the "From Your Therapist" card for each couple via the "Card Content" tab in the dashboard customizer. This includes custom title, description, and section visibility toggles (Messages, To-Dos, Resources). Client dashboard applies these customizations with sensible fallbacks. Stored as `widget_content_overrides` jsonb in `Couples_dashboard_customization` table.
-   **Module Subscriptions:** Per-user subscription system for add-on modules (Chores App, IFS App, Conflict Resolution). Uses Stripe for payment processing with monthly ($5) and yearly ($50) pricing options. Database tables: `Couples_modules`, `Couples_module_subscriptions`, `Couples_module_access_tokens`. Stripe webhooks handle subscription lifecycle events (creation, updates, cancellation). Short-lived access tokens (15-minute expiry) provide secure authentication for launching external module apps via iframe/embed.
-   **Conflict Resolution Module:** Integrated I-Statement Builder module with AI-powered statement generation and suggestions. Uses Supabase Edge Functions (`conflict-generate-statement`, `conflict-generate-suggestions`) with Perplexity AI. Backend API routes (`/api/conflict`) handle session CRUD operations with proper authentication. Database tables: `Couples_conflict_sessions`, `Couples_conflict_ai_events`. AI event logs are sanitized for privacy - therapists cannot view raw client prompts/responses.
-   **Progress Timeline:** Visual timeline page showing couples their relationship journey including assessment completions, milestones (first check-in, month of check-ins, goals achieved, gratitude champion), and key dates. Features stats dashboard showing total events, assessments completed, milestones reached, and days together.
-   **Session Notes Integration:** Full CRUD system for therapists to document therapy sessions. Database table `Couples_session_notes` stores session_date, title, summary, key_themes[], interventions_used[], homework_assigned, progress_notes, next_session_goals, and is_private flag. API routes at `/api/session-notes` with proper therapist authentication and ownership verification (therapists can only access notes for couples assigned to them). UI integrated into therapist dashboard via "Notes" tab in the couple details view. Component at `client/src/components/session-notes-panel.tsx` provides full form with create/edit/delete dialogs.
-   **Auto-save Drafts:** Attachment and Enneagram assessments auto-save progress to localStorage every 30 seconds with recovery banner UI for restoring previous drafts. Uses custom `useAutoSave` hook with unique keys per assessment type.
-   **Mobile Optimization:** Swipe gesture navigation for compatibility tabs using custom `useSwipe` hook (50px threshold). Touch-optimized checkboxes with larger hit targets (p-2 -m-2 touch-manipulation).
-   **In-memory Caching:** Compatibility insights use Map-based cache with 5-minute TTL and max 100 entries with LRU eviction in `client/src/lib/cache.ts`.
-   **AI-Powered Relationship Growth Plan:** Personalized exercises and goals generated via Supabase Edge Function (`ai-growth-plan`) using Perplexity AI. Analyzes couple's assessments (attachment style, love language, enneagram) and recent activity to create tailored recommendations. Frontend page at `/growth-plan` displays exercises with frequency/duration and goals with milestone tracking. Database tables: `Couples_growth_plans`, `Couples_growth_exercise_progress`, `Couples_growth_goal_progress` (SQL migration ready at `supabase/migrations/growth_plans.sql`).
-   **Dashboard Customizer Enhancements:** Redesigned with Templates tab (5 preset templates for quick setup), Categories tab (widgets organized by 8 functional categories with accordion UI), and improved UX. Features include partial template match detection, bulk enable/disable per category with toast feedback, and size controls (S/M/L) inline with each widget.
-   **Layout Templates System:** Therapists can save their current dashboard configuration as a reusable template. Templates include name, description, widget order, enabled widgets, sizes, and content overrides. Templates can be applied to any couple with usage tracking. Database table `Couples_layout_templates` with RLS policies (SQL migration at `supabase/migrations/layout_templates.sql`). API routes at `/api/layout-templates` with CRUD operations and apply/copy endpoints.
-   **Individual Layout Preferences:** Each user can have their own dashboard layout preferences that override couple defaults. Users can toggle between personal layout and therapist-configured layout, hide specific widgets, and customize their view. Database table `Couples_individual_layout_preferences` with RLS policies (SQL migration at `supabase/migrations/individual_layout_preferences.sql`). API routes at `/api/individual-layout-preferences` for CRUD operations. Note: Backend auth pattern follows existing codebase convention using supabaseAdmin; future iteration should add per-request auth verification.

**Feature Specifications:**

-   **Client App (for Couples):** Assessments, Assessment Insights (Couple Compatibility Module), Shared Activities, Communication & Interaction tools, and Individual Exercises.
-   **Admin App (for Therapists):** User Management, Client Roster, Couple Dashboard (side-by-side comparisons), Intervention Tools (Therapist Thoughts, Contextual Commenting, AI-powered Analytics), and views of all client activities and assessments.

## External Dependencies

-   **Database**: Supabase (PostgreSQL)
-   **Authentication**: Supabase Authentication
-   **Realtime**: Supabase Realtime
-   **Storage**: Supabase Storage
-   **AI**: Perplexity AI
-   **UI Libraries**: Tailwind CSS, Shadcn UI (Radix primitives)
-   **Web Frontend**: React 18, Vite, Wouter
-   **Mobile Frontend**: React Native, Expo, React Navigation
-   **State Management**: TanStack Query v5
-   **Web Components**: react-big-calendar, React Beautiful DnD
-   **Mobile Components**: expo-image-picker, expo-av, expo-notifications, react-native-calendars
-   **Payments**: Stripe (for module subscriptions via stripe-replit-sync)
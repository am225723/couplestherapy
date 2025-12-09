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
-   **Widget Content Customization:** Therapists can personalize the "From Your Therapist" card for each couple via the "Card Content" tab in the dashboard customizer. This includes custom title, description, and section visibility toggles (Messages, To-Dos, Resources). Client dashboard applies these customizations with sensible fallbacks. Stored as `widget_content_overrides` jsonb in `Couples_dashboard_customization` table.
-   **Module Subscriptions:** Per-user subscription system for add-on modules (Chores App, IFS App, Conflict Resolution). Uses Stripe for payment processing with monthly ($5) and yearly ($50) pricing options. Database tables: `Couples_modules`, `Couples_module_subscriptions`, `Couples_module_access_tokens`. Stripe webhooks handle subscription lifecycle events (creation, updates, cancellation). Short-lived access tokens (15-minute expiry) provide secure authentication for launching external module apps via iframe/embed.

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
# ALEIC - Assisted Learning for Empathetic and Insightful Couples

## Overview

ALEIC is a multi-tenant platform for couples therapy, offering distinct web and mobile applications for clients and therapists. Its core purpose is to improve couple communication, enhance therapeutic interventions, and track progress through interactive tools. The platform provides a secure, real-time, and engaging experience with features such as assessments, shared activities, communication tools, and therapist oversight. The vision is to empower therapists and couples with technology to foster empathy and insight, ultimately strengthening relationships and offering a significant market potential in digital health and relationship wellness.

## User Preferences

I prefer iterative development with clear communication on progress and potential changes. Please ask before implementing major architectural changes or introducing new dependencies. I value a clean, readable codebase with consistent styling and well-documented components. For explanations, please use clear, concise language, focusing on the "why" behind decisions as much as the "what."

## System Architecture

The ALEIC platform features a shared Express.js backend supporting both React 18 (web) and React Native with Expo (mobile) applications.

**UI/UX Decisions:**
The design incorporates a warm, compassionate aesthetic using the Inter font, generous spacing, subtle shadows, rounded corners, and card-based content grouping, supporting both light and dark modes. A recent brand refresh introduced a new logo and a vibrant multi-color palette (Teal, Coral, Purple, Pink) with a minimalist line art visual identity. The login page uses a modern split-screen design.

**Technical Implementations:**

-   **Authentication & Database:** Supabase for authentication, PostgreSQL database with Row Level Security (RLS) for data privacy. All tables are prefixed with `Couples_`.
-   **Realtime & Storage:** Supabase Realtime for live updates and Supabase Storage for media.
-   **AI Integration:** Seven AI features are implemented as Supabase Edge Functions, secured with JWT and RLS, including `ai-exercise-recommendations`, `ai-empathy-prompt`, `ai-echo-coaching`, `ai-voice-memo-sentiment`, `ai-session-prep`, `ai-insights`, and `ai-date-night`.
-   **Personalized Daily Tips:** AI-powered daily relationship tips personalized to couples based on completed assessments (attachment style, enneagram type, love language), using Perplexity AI with 24-hour caching.
-   **Push Notifications:** Therapists can schedule notifications to couples via Edge Functions and Expo Push Service.
-   **Cross-Therapist Access:** Therapists can view and interact with all couples in the system, supporting multi-therapist practices.
-   **Therapist Tools:** Includes a "Therapist Thoughts" system for managing to-dos and notes, customizable prompts for clients, and the ability to send reflection prompts to couples or individuals. Therapists can also customize "From Your Therapist" card content for each couple.
-   **Module Subscriptions:** A per-user subscription system for add-on modules (Chores App, IFS App, Conflict Resolution) processed via Stripe.
-   **Conflict Resolution Module:** Integrates an AI-powered I-Statement Builder using Supabase Edge Functions and Perplexity AI.
-   **Progress Timeline:** A visual timeline showing couples their relationship journey, including assessment completions, milestones, and key dates.
-   **Session Notes:** A CRUD system for therapists to document therapy sessions, integrated into the therapist dashboard.
-   **Auto-save Drafts:** Assessments feature auto-save functionality to localStorage with recovery UI.
-   **Mobile Optimization:** Utilizes swipe gesture navigation and touch-optimized components.
-   **AI-Powered Relationship Growth Plan:** Generates personalized exercises and goals based on couple assessments and activity using Supabase Edge Functions and Perplexity AI.
-   **Dashboard Customizer:** Enhanced with templates, categorized widgets, and size controls for therapist customization of client dashboards.
-   **Layout Templates System:** Therapists can save and apply reusable dashboard configurations as templates to different couples.
-   **Individual Layout Preferences:** Users can customize their own dashboard layout, overriding therapist-configured defaults.
-   **Device Preview Mode:** Dashboard customizer includes a device preview feature to visualize client dashboards on different screen sizes (Mobile, Tablet, Desktop).

**Feature Specifications:**

-   **Client App (for Couples):** Assessments, Assessment Insights (Couple Compatibility Module), Shared Activities, Communication & Interaction tools, and Individual Exercises.
-   **Admin App (for Therapists):** User Management, Client Roster, Couple Dashboard (side-by-side comparisons), Intervention Tools (Therapist Thoughts, Contextual Commenting, AI-powered Analytics), and views of all client activities and assessments.

## External Dependencies

-   **Database**: Supabase (PostgreSQL)
-   **Authentication**: Supabase Authentication
-   **Realtime**: Supabase Realtime
-   **Storage**: Supabase Storage
-   **AI**: Perplexity AI
-   **Web Frontend**: React 18, Vite, Wouter
-   **Mobile Frontend**: React Native, Expo, React Navigation
-   **State Management**: TanStack Query v5
-   **UI Libraries**: Tailwind CSS, Shadcn UI (Radix primitives)
-   **Payments**: Stripe (for module subscriptions)
-   **Web Components**: react-big-calendar, React Beautiful DnD
-   **Mobile Components**: expo-image-picker, expo-av, expo-notifications, react-native-calendars
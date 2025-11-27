# ALEIC - Assisted Learning for Empathetic and Insightful Couples

## Overview

ALEIC is a multi-tenant platform for couples therapy, offering distinct applications for clients and therapists. It aims to enhance therapeutic interventions, improve couple communication, and track progress through interactive exercises and tools. The platform provides a secure, real-time, and engaging experience, featuring assessments, shared activities, communication tools, and therapist oversight. The brand, ALEIC, stands for "Assisted Learning for Empathetic and Insightful Couples."

## User Preferences

I prefer iterative development with clear communication on progress and potential changes. Please ask before implementing major architectural changes or introducing new dependencies. I value a clean, readable codebase with consistent styling and well-documented components. For explanations, please use clear, concise language, focusing on the "why" behind decisions as much as the "what."

## Recent Changes (November 2025)

**Major Feature Implementations - November 27, 2025:**

1. **Cross-Therapist Access Model**: Therapists can now view and interact with ALL couples in the system, not just assigned ones. Supports multi-therapist practices where any therapist may need to assist any couple.
   - New `GET /all-couples` endpoint returns all couples with therapist info
   - Updated 10+ route files to remove therapist ownership restrictions
   - Files modified: therapist.ts, ai.ts, pushNotifications.ts, voiceMemos.ts, parenting.ts, intimacy.ts, meditation.ts, demonDialogues.ts, horsemen.ts, valuesVision.ts
   - Authentication remains required (valid therapist session) - only authorization changed
2. **AI Edge Functions Updates**: Improved ai-exercise-recommendations function with robust JSON parsing, citation removal, and client-friendly language.
3. **Push Notification System**: Complete infrastructure with mobile integration, Edge Function for sending, and therapist scheduling dashboard.

**Major Feature Implementations - November 25, 2025:**

1. **Couple Compatibility Module**: New page (`/couple-compatibility`) showing both partners' assessment results (Love Language, Attachment Style, Enneagram) with compatibility analysis and personalized connection suggestions for each partner.
2. **Therapist Thoughts System**: New section replacing Messages with to-dos, messages to clients, and file references. Includes priority levels, completion tracking, and therapist-scoped access control. API: `GET/POST/PATCH/DELETE /api/therapist-thoughts/couple/:coupleId`
3. **Bug Fixes**: Fixed Love Language deletion error (apiRequest method signature). Changed from `apiRequest(url, { method: 'DELETE' })` to correct `apiRequest('DELETE', url)` format.
4. **Navigation Updates**: Added new routes, menu items, and improved role-based routing.
5. **Database Setup**: Created `Couples_therapist_thoughts` table with RLS policies in `supabase-therapist-thoughts-migration.sql`.

**Mobile App Added (November 2025):**

1. **Expo React Native Application**: Complete mobile app structure created in `mobile/` directory with iOS and Android support via Expo.
2. **Cross-Platform Architecture**: Mobile app shares the same backend (Express.js + Supabase) as the web app, ensuring data consistency.
3. **Full Navigation System**: Tab + Stack navigators for both client and therapist roles with 30+ screens.
4. **Authentication Integration**: Supabase Auth with SecureStore for token persistence on mobile devices.
5. **All Features Structured**: Placeholder screens created for all existing web features ready for implementation.
6. **Separate Dependencies**: Mobile app has its own package.json and can be developed/deployed independently.

**Mobile App Details:**

- Located in `mobile/` directory with complete Expo setup
- 30+ screen files (auth, client, therapist) with navigation
- Supabase integration with expo-secure-store
- API client configured to use existing backend
- TypeScript configuration and theme system matching web app
- See `MOBILE_APP_GUIDE.md` for complete setup instructions

**New Features - Backend Infrastructure Complete (November 2025):**

1. **Attachment Style Assessment**: 30-question assessment with automated scoring, couple dynamics analysis, triggers tracking, and repair scripts library. Full backend API and database schema ready for frontend integration.
2. **Enneagram Couple Dynamics**: 36-question assessment identifying dominant/secondary types with couple compatibility reports. Complete backend infrastructure with SQL tables and API endpoints.
3. **Shared Couple Journal**: Multi-mode entries with 3 privacy levels, media attachments via Supabase Storage, milestones tracking, and journal prompts. Full CRUD API with RLS policies implemented.
4. **Financial Communication Toolkit**: Values alignment, budget tracking, shared goals, and discussion logs. Complete backend with proper validation and security.
5. **Date Night Generator Enhancement**: Added interests selection step with 12 curated categories, zip code/city location input, and travel distance preferences (5-30+ miles) for geographically-personalized AI recommendations using Perplexity API.

**Backend Implementation Details:**

- Created 21 new database tables with comprehensive RLS policies (46 policies total)
- Implemented 4 new Express routers with full CRUD operations (1,372 lines of validated API code)
- Added attachment storage bucket for journal media with privacy-aware policies
- Seeded 30 attachment questions, 36 enneagram questions, and 10 journal prompts
- All endpoints secured with couple-id verification and role-based access control

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

The platform now supports **both web and mobile** applications:

**Web Application:**

- React 18 frontend with Vite
- Wouter for routing
- Tailwind CSS with custom therapeutic teal/green palette
- Shadcn UI for components
- TanStack Query v5 for server state management

**Mobile Application (NEW):**

- React Native with Expo framework
- React Navigation (Tab + Stack navigators)
- Same Tailwind-inspired theme via React Native StyleSheet
- Native components for iOS and Android
- TanStack Query v5 for data fetching
- Expo modules for camera, audio, notifications

**Shared Backend:**
Both platforms use the same Express.js backend with Supabase PostgreSQL, Row Level Security (RLS), Supabase Authentication, Realtime for live updates, and Storage for media.

**UI/UX Decisions:**
The design emphasizes a warm, compassionate feel using the Inter font, generous spacing, subtle shadows, rounded corners, and card-based content grouping. It supports both light and dark modes. The login page features a modern split-screen design with a rotating carousel and dynamic form elements, optimized for various screen sizes. The brand refresh incorporated a new logo, a vibrant multi-color palette (Teal, Coral, Purple, Pink), and a minimalist line art visual identity.

**Technical Implementations:**

- **Authentication**: Handled by Supabase Auth with an AuthContext provider.
- **Database Schema**: All tables are prefixed with `Couples_` and include profiles, couple linkages, love language results, gratitude logs, weekly check-ins, shared goals (Kanban), therapist comments, structured conversations (Hold Me Tight - EFT), daily rituals, voice memos, secure messages, shared calendar events, Love Map quiz components, Echo & Empathy sessions, IFS exercises, and a shared Pause Button.
- **Realtime**: Supabase Realtime facilitates features like therapist comments, secure messaging, and calendar updates.
- **Privacy (RLS)**: Enforced via RLS to ensure data privacy, including private weekly check-ins for partners, read-only therapist access to specific data, and restricted access to voice memo audio content. Message tampering is prevented by restricting UPDATE access.
- **AI Integration**: Seven AI features are implemented as Supabase Edge Functions for performance and scalability. These include `ai-exercise-recommendations`, `ai-empathy-prompt`, `ai-echo-coaching`, `ai-voice-memo-sentiment`, `ai-session-prep`, `ai-insights`, and `ai-date-night`. All AI functions are secured with JWT authentication, role-based access control, resource ownership verification, input validation, and privacy-focused anonymization.

**Supabase Edge Functions Setup (Required for AI Features):**
To enable AI features in production, add the `PERPLEXITY_API_KEY` to your Supabase project:

1. Go to your Supabase Dashboard > Project Settings > Edge Functions
2. Add secret: `PERPLEXITY_API_KEY` with your Perplexity API key
3. The Edge Functions will automatically use this key for AI recommendations, insights, and coaching features
4. Note: This is separate from Replit/Vercel environment variables - Edge Functions run on Supabase infrastructure

**Push Notifications System (November 2025):**
Therapists can schedule push notifications to couples via the admin dashboard. Full infrastructure includes:

- **Database**: `Couples_scheduled_notifications` table with `expo_push_token` and `fcm_token` columns in profiles
- **Backend API**: `/api/push-notifications/` endpoints for scheduling, viewing, and canceling notifications
- **Edge Function**: `send-scheduled-notifications` processes and sends queued notifications via Expo Push Service
- **Web Integration**: `usePushNotifications` hook in App.tsx registers FCM tokens automatically
- **Mobile Integration**: `usePushNotifications` hook in AppNavigator.tsx registers Expo push tokens

**Push Notifications Setup:**
1. Run `supabase-push-notifications-migration.sql` in Supabase SQL Editor
2. Add `EXPO_ACCESS_TOKEN` secret in Supabase Edge Functions settings
3. Deploy `send-scheduled-notifications` Edge Function
4. (Optional) Create database webhook to auto-trigger on notification insert
5. See `PUSH_NOTIFICATIONS_SETUP.md` for detailed instructions

**Feature Specifications:**

- **Client App (for Couples)**: Assessments (Love Language, Love Map, Weekly Check-Ins, Attachment Style, Enneagram), Assessment Insights (Couple Compatibility Module NEW), Shared Activities (Gratitude Log, Shared Goals, Rituals of Connection, Hold Me Tight Conversation, Echo & Empathy, Couple Journal, Financial Toolkit), Communication & Interaction (Voice Memos, Connection Concierge, secure Messages, Shared Calendar, Shared Pause Button, Realtime Therapist Comments), Individual Exercises (IFS Introduction).
- **Admin App (for Therapists)**: Management (Secure Login, User Management, Client Roster), Couple Dashboard (side-by-side comparison of Weekly Check-ins, Love Languages, Activity Feed), Intervention Tools (Therapist Thoughts NEW, Contextual Commenting, Read-only Calendar, Love Map Quiz Results, Echo & Empathy History, IFS Exercises view, Pause History tracking, AI-powered Analytics, Attachment Results, Enneagram Results, Journal View, Financial Overview).

## External Dependencies

- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Authentication
- **Realtime**: Supabase Realtime
- **Storage**: Supabase Storage
- **AI**: Perplexity AI (for Connection Concierge and Therapist Analytics)
- **UI Libraries**: Tailwind CSS, Shadcn UI (Radix primitives)
- **Web Frontend**: React 18, Vite, Wouter routing
- **Mobile Frontend**: React Native, Expo, React Navigation
- **State Management**: TanStack Query v5 (both platforms)
- **Web Components**: react-big-calendar, React Beautiful DnD
- **Mobile Components**: expo-image-picker, expo-av, expo-notifications, react-native-calendars

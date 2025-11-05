# Therapist 404 Error Fix

## Issue Description
Therapists were encountering a 404 error page when signing in for the first time.

## Root Cause
When a user signs in, they remain on whatever browser URL they were at before authentication. The auth page doesn't exist on a specific route - it's rendered in place of the router when there's no user.

**The Problem Flow:**
1. User navigates to the site (could be at any URL like `/dashboard`, `/weekly-checkin`, etc.)
2. Auth page is shown (since they're not logged in)
3. User signs in as a therapist
4. App re-renders with therapist routes (`/admin`, `/admin/analytics`, `/admin/user-management`)
5. User is still at their original URL (e.g., `/dashboard`) which is a client route
6. Client routes don't exist in therapist routing configuration
7. User hits the NotFound catch-all → **404 Error**

## The Fix
Added a `useEffect` hook in the `AuthenticatedApp` component (`client/src/App.tsx`) that automatically redirects users to their appropriate home page based on their role when they authenticate.

**Fix Logic:**
- **Therapist on client route** → Redirect to `/admin`
- **Client on therapist route** → Redirect to `/dashboard` (or `/couple-setup` if not set up)
- **Any user on root route `/`** → Redirect to role-appropriate home page

## Files Modified
- `client/src/App.tsx`: Added redirect logic in `AuthenticatedApp` component

## Verification
✅ Profile creation via `/api/therapist/create-therapist` works correctly
✅ Profile has `role='therapist'` set correctly
✅ Auth context fetches profile successfully
✅ All therapist routes exist and are configured correctly
✅ Redirect logic prevents 404 errors on first sign-in
✅ Application compiles and runs without errors

## Expected Behavior After Fix
1. Therapist is created via User Management page
2. Therapist signs in with email/password
3. Profile loads correctly with `role='therapist'`
4. User is automatically redirected to `/admin` (AdminDashboard)
5. Sidebar shows therapist navigation items
6. No 404 error occurs

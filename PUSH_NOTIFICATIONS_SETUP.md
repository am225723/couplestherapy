# Push Notifications Setup Guide for ALEIC

This guide walks through the complete setup for scheduled push notifications on both web PWA and mobile Expo apps.

## Architecture Overview

- **Backend**: Express.js API endpoints at `/api/push-notifications/`
- **Database**: `Couples_scheduled_notifications` table stores scheduled notifications
- **Edge Function**: `send-scheduled-notifications` processes and sends queued notifications
- **Mobile**: Expo Push Notification Service (handles iOS APNs and Android FCM automatically)
- **Web**: Service Worker + FCM (Firebase Cloud Messaging) for PWA

## Complete Setup Checklist

### Step 1: Database Migration (1-2 minutes)

The database migration has already been created in `supabase-push-notifications-migration.sql`. 

**Run it in Supabase:**

1. Go to your Supabase Dashboard
2. Click **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy and paste the entire contents of `supabase-push-notifications-migration.sql`
5. Click **Run**

This creates:
- `expo_push_token` and `fcm_token` columns in `Couples_profiles`
- `Couples_scheduled_notifications` table with automatic timestamps
- Row Level Security (RLS) policies that ensure therapists can only manage notifications for their own couples

---

### Step 2: Get Expo Access Token (3-5 minutes)

**For mobile push notifications via Expo:**

1. Go to https://expo.dev/accounts/_/settings/access-tokens
2. Click **Create token** 
3. Give it a name like "Push Notifications"
4. Toggle **Enhanced Security for Push Notifications** ON
5. Copy the token (it starts with `ey...`)
6. Save it somewhere safe - you'll need it in Step 3

---

### Step 3: Add Expo Token to Supabase (2 minutes)

**In your Supabase Project:**

1. Go to **Project Settings** (gear icon in the left sidebar)
2. Click **Edge Functions** in the left sidebar
3. Click **Add secret** (or the **+** button if you see it)
4. Fill in:
   - **Key**: `EXPO_ACCESS_TOKEN`
   - **Value**: Paste your Expo token from Step 2
5. Click **Add secret**

✅ Your Edge Function can now send push notifications to Expo-registered devices.

---

### Step 4: Deploy Edge Function (2 minutes)

**From your terminal:**

```bash
# Make sure you have Supabase CLI installed
npm install -g supabase

# Login to Supabase (you'll be prompted for credentials)
supabase login

# Link your project (use your project ref from project settings)
supabase link --project-ref YOUR_PROJECT_REF

# Deploy the function
supabase functions deploy send-scheduled-notifications
```

**Verify it deployed:**
- Go to Supabase Dashboard → Functions
- You should see `send-scheduled-notifications` listed

✅ Your Edge Function is now live and ready to send notifications.

---

### Step 5: Create Database Webhook (Optional but Recommended) (5 minutes)

A webhook automatically triggers the Edge Function whenever a new notification is scheduled. This ensures notifications are sent at their scheduled times.

**In Supabase Dashboard:**

1. Go to **Database** → **Webhooks** in the left sidebar
2. Click **Create a new webhook**
3. Fill in the form:

   **Name:** "Send Scheduled Notifications"
   
   **Table:** Select `Couples_scheduled_notifications`
   
   **Events:** Check only **INSERT** (uncheck UPDATE/DELETE)
   
   **HTTP Request:**
   - **Type:** POST
   - **URL:** `https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-scheduled-notifications`
   - **Headers:** Add these headers:
     ```
     Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (use your ANON_KEY from Project Settings)
     Content-Type: application/json
     ```

4. Scroll down and click **Save webhook**

**To find your ANON_KEY:**
- Go to Supabase Project Settings → API
- Look for "anon" key under "Project API keys"
- Copy it and paste in the Authorization header

✅ Now whenever a therapist schedules a notification, the webhook automatically triggers the Edge Function to process it.

**Alternative: Without Webhook (Manual Trigger)**

If you don't set up a webhook, you can manually trigger the function:
```bash
# From terminal, trigger the function
curl -X POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-scheduled-notifications \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json"
```

Or set up a cron job to call it every 5 minutes using a service like:
- AWS Lambda + CloudWatch
- Google Cloud Scheduler
- GitHub Actions scheduled workflow

---

### Step 6: Mobile Setup (Expo) (5 minutes)

The mobile app automatically registers push tokens when it launches.

**In `mobile/src/index.tsx` (or your root component), ensure `usePushNotifications` is called:**

```tsx
import { usePushNotifications } from "@/hooks/usePushNotifications";

export default function RootNavigator() {
  // Initialize push notifications
  usePushNotifications();
  
  return (
    // ... your navigation
  );
}
```

**Test on a physical device:**
- iOS: Need real iPhone (simulator doesn't support push)
- Android: Need physical device or Android emulator with Google Play Services

**What happens automatically:**
1. App asks user for notification permission
2. Gets device's Expo push token
3. Sends token to backend (`POST /api/push-notifications/register-token`)
4. Token is stored in user's profile
5. When notifications are scheduled, they're sent to this token

---

### Step 7: Web/PWA Setup (Optional) (5 minutes)

The web PWA automatically registers for notifications when users visit.

**In `client/src/App.tsx`, ensure `usePushNotifications` is called:**

```tsx
import { usePushNotifications } from "@/hooks/use-push-notifications";

function AppContent() {
  // ... other code
  
  // Initialize push notifications
  usePushNotifications();
  
  return (
    // ... your routes
  );
}
```

**For production web push (recommended):**

1. Set up Firebase Cloud Messaging project at https://console.firebase.google.com
2. Create `public/firebase-messaging-sw.js` with your Firebase config
3. Users can now receive web push notifications

**For development:** Basic browser notifications will work without Firebase.

---

## Using Push Notifications as a Therapist

### Scheduling a Notification

1. Go to Therapist Dashboard
2. Select a couple from your list
3. Click **Schedule Notification** button (bell icon) in the Overview tab
4. Fill in:
   - **Send to:** Both partners, or select one partner
   - **Notification Title:** e.g., "Weekly Check-in Reminder"
   - **Message:** Your notification text (max 2000 chars)
   - **Send at (UTC):** Date and time when to send
5. Click **Schedule**

### Managing Scheduled Notifications

The backend API provides these endpoints (therapist-only access):

```bash
# View all your scheduled notifications
GET /api/push-notifications/scheduled

# Cancel a pending notification
DELETE /api/push-notifications/:id

# The other endpoints are for clients registering tokens
```

---

## Testing Your Setup

### Test the Edge Function

```bash
# Get your ANON_KEY from Supabase Project Settings → API

curl -X POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-scheduled-notifications \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Expected response:**
```json
{
  "success": true,
  "processed": 0,
  "sent": 0,
  "failed": 0
}
```

### Test with Real Notification

1. **Register a push token** (done automatically on app launch)
2. **Schedule a notification** via therapist dashboard with a time 1-2 minutes from now
3. **Check logs** in Supabase Dashboard:
   - Go to Functions → send-scheduled-notifications → Invocations
   - Look for recent calls and check their status
4. **Watch for notification** on your device

---

## Troubleshooting

### Notifications not sending to mobile

- ✅ Ensure `EXPO_ACCESS_TOKEN` is set correctly in Supabase secrets
- ✅ Verify physical device is being used (not simulator/emulator)
- ✅ Check app has notification permissions enabled in device settings
- ✅ Confirm token was registered: check `Couples_profiles.expo_push_token` in database
- ✅ Check Edge Function logs for errors: Dashboard → Functions → Logs

### Notifications not sending to web

- ✅ Verify service worker registered: Open browser DevTools → Application → Service Workers
- ✅ Check notification permissions: DevTools → Console, run `Notification.permission`
- ✅ Firebase config correct in `public/firebase-messaging-sw.js`
- ✅ Token should be in `Couples_profiles.fcm_token`

### Edge Function not triggering

- ✅ Check webhook is enabled: Dashboard → Database → Webhooks
- ✅ Verify webhook Authorization header has valid ANON_KEY
- ✅ Try manual webhook test: click "Test" button on webhook in dashboard
- ✅ Check function logs: Dashboard → Functions → send-scheduled-notifications → Invocations

### Database webhook not working

- ✅ Verify webhook status is "Enabled" (toggle in dashboard)
- ✅ Check Authorization header has Bearer token with ANON_KEY
- ✅ Verify URL is correct: `https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-scheduled-notifications`
- ✅ Look at webhook's recent invocations to see if it was called

---

## Architecture Diagram

```
Therapist Dashboard
        ↓
  Schedule Notification
   (POST /api/push-notifications/schedule)
        ↓
Database INSERT
   Couples_scheduled_notifications
        ↓ (automatic webhook trigger)
Supabase Edge Function
(send-scheduled-notifications)
        ↓
Expo Push Service / FCM
        ↓
User Device (Mobile/Web)
        ↓
Device Shows Notification
```

---

## API Reference

### Register Push Token
```
POST /api/push-notifications/register-token
Authorization: Bearer <user-jwt>
Content-Type: application/json

{
  "token": "ExponentPushToken[...] or fcm-token",
  "type": "expo" or "fcm"
}

Response: { "success": true }
```

### Schedule Notification
```
POST /api/push-notifications/schedule
Authorization: Bearer <therapist-jwt>
Content-Type: application/json

{
  "couple_id": "uuid",
  "user_id": "uuid (optional - omit to send to both partners)",
  "title": "string (required)",
  "body": "string (required)",
  "scheduled_at": "ISO-8601 datetime (required)"
}

Response: { notification object with id, status, etc. }
```

### List Scheduled Notifications
```
GET /api/push-notifications/scheduled
Authorization: Bearer <therapist-jwt>

Response: [{ id, couple_id, user_id, title, body, scheduled_at, status, ... }]
```

### Cancel Notification
```
DELETE /api/push-notifications/:id
Authorization: Bearer <therapist-jwt>

Response: { "success": true }
```

---

## Production Checklist

Before going live:

- [ ] Expo Access Token set in Supabase secrets
- [ ] Edge Function deployed to production
- [ ] Database webhook created and tested
- [ ] RLS policies verified (therapists can only schedule for their couples)
- [ ] Mobile app tested on physical iOS and Android devices
- [ ] Web push tested on desktop browser
- [ ] Error logging set up (check Edge Function logs regularly)
- [ ] Rate limiting considered (prevent spam scheduling)
- [ ] Notification content moderation considered

---

## Support Resources

- **Supabase Webhooks:** https://supabase.com/docs/guides/database/webhooks
- **Supabase Edge Functions:** https://supabase.com/docs/guides/functions
- **Expo Push Notifications:** https://docs.expo.dev/push-notifications/
- **Firebase Cloud Messaging:** https://firebase.google.com/docs/cloud-messaging


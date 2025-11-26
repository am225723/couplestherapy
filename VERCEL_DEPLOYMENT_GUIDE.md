# Vercel Deployment Guide for TADI

This guide will help you deploy your full-stack TADI application to Vercel with serverless functions.

## ✅ Files Ready

The following files have been configured for Vercel deployment:

1. **`api/index.ts`** - Serverless function that exports the Express app
2. **`vercel.json`** - Deployment configuration with routing rules
3. **`.vercelignore`** - Files to ignore during deployment
4. **`.env.example`** - Environment variables documentation

## 📋 Manual Change Required

### Update package.json Build Script

**Current:**

```json
"scripts": {
  "build": "vite build && esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist"
}
```

**Change to:**

```json
"scripts": {
  "build": "vite build"
}
```

**Why:** Vercel automatically builds serverless functions from the `api/` directory. We only need to build the frontend with Vite.

## 🚀 Deployment Steps

### Step 1: Prepare Your Repository

1. Make the package.json change above
2. Commit all changes:

```bash
git add .
git commit -m "Configure for Vercel deployment"
git push
```

### Step 2: Create Vercel Project

1. Go to [vercel.com](https://vercel.com)
2. Click "Add New Project"
3. Import your Git repository
4. Vercel will auto-detect the framework as Vite

### Step 3: Configure Environment Variables

In the Vercel dashboard, go to **Project Settings > Environment Variables** and add:

| Variable Name               | Description                         | Where to Get It                                                |
| --------------------------- | ----------------------------------- | -------------------------------------------------------------- |
| `VITE_SUPABASE_URL`         | Your Supabase project URL           | Supabase Dashboard > Project Settings > API                    |
| `VITE_SUPABASE_ANON_KEY`    | Supabase anonymous/public key       | Supabase Dashboard > Project Settings > API                    |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (SECRET!) | Supabase Dashboard > Project Settings > API > service_role key |
| `SESSION_SECRET`            | Random string for sessions          | Generate with: `openssl rand -base64 32`                       |
| `PERPLEXITY_API_KEY`        | Perplexity AI API key               | https://www.perplexity.ai/settings/api                         |

**Important:**

- Add these to **all environments** (Production, Preview, Development)
- Mark `SUPABASE_SERVICE_ROLE_KEY`, `SESSION_SECRET`, and `PERPLEXITY_API_KEY` as **sensitive**

### Step 4: Deploy

Click **"Deploy"** in the Vercel dashboard. Vercel will:

1. Build the frontend with `npm run build` (Vite)
2. Build the serverless function from `api/index.ts`
3. Configure routing based on `vercel.json`

## 🔧 How It Works

### Architecture

```
┌─────────────────────────────────────┐
│         Vercel Edge Network          │
├─────────────────────────────────────┤
│  /api/* → api/index.ts (Serverless)  │
│  /*     → index.html (Static)        │
└─────────────────────────────────────┘
```

### Request Flow

1. **API Requests** (`/api/*`)

   - Routed to `api/index.ts` serverless function
   - Express handles the request
   - Connects to Supabase with service role key
   - Returns JSON response

2. **Frontend Requests** (`/*`)
   - Served from static files
   - All routes fall back to `index.html` for client-side routing
   - Wouter handles navigation on the client
   - React app uses Supabase anon key

### Client Routes (All handled by React Router)

**Client App:**

- `/dashboard` - Client Dashboard
- `/couple-setup` - Initial couple setup
- `/quiz` - Love Language Quiz
- `/love-map` - Love Map Quiz
- `/weekly-checkin` - Weekly Check-In
- `/checkin-history` - Check-In History
- `/gratitude` - Gratitude Log
- `/goals` - Shared Goals (Kanban)
- `/rituals` - Rituals of Connection
- `/conversation` - Hold Me Tight Conversation
- `/voice-memos` - Voice Memos
- `/date-night` - AI Date Night Generator
- `/messages` - Secure Messages
- `/calendar` - Shared Calendar
- `/echo-empathy` - Echo & Empathy
- `/ifs-intro` - IFS Introduction
- `/pause` - Shared Pause Button

**Admin App:**

- `/admin` - Therapist Dashboard
- `/admin/couple/:id` - Couple Details
- `/admin/analytics` - Analytics
- `/admin/user-management` - User Management

### API Routes (All handled by Express serverless)

All routes from `server/routes.ts` are available at `/api/*`:

**Couples:**

- `GET /api/couples` - List all couples
- `GET /api/couples/:id` - Get couple details
- `POST /api/couples` - Create couple
- `PATCH /api/couples/:id` - Update couple
- `DELETE /api/couples/:id` - Delete couple

**Weekly Check-ins:**

- `GET /api/couples/:id/weekly-checkins` - Get check-ins
- `POST /api/weekly-checkins` - Create check-in
- `GET /api/weekly-checkins/:id` - Get check-in by ID

**Gratitude Log:**

- `GET /api/couples/:id/gratitude` - Get gratitude entries
- `POST /api/gratitude` - Create entry
- `DELETE /api/gratitude/:id` - Delete entry

**Goals:**

- `GET /api/couples/:id/goals` - Get goals
- `POST /api/goals` - Create goal
- `PATCH /api/goals/:id` - Update goal
- `DELETE /api/goals/:id` - Delete goal

**Voice Memos:**

- `GET /api/couples/:id/voice-memos` - Get voice memos
- `POST /api/voice-memos/upload-url` - Get upload URL
- `POST /api/voice-memos` - Create memo
- `GET /api/voice-memos/:id/download-url` - Get download URL
- `DELETE /api/voice-memos/:id` - Delete memo

**Messages:**

- `GET /api/couples/:id/messages` - Get messages
- `POST /api/messages` - Create message

**Calendar:**

- `GET /api/couples/:id/calendar` - Get events
- `POST /api/calendar` - Create event
- `PATCH /api/calendar/:id` - Update event
- `DELETE /api/calendar/:id` - Delete event

**Echo & Empathy:**

- `POST /api/echo/session` - Create session
- `GET /api/echo/session/:id` - Get session
- `POST /api/echo/session/:id/complete` - Complete session

**IFS:**

- `POST /api/ifs/part` - Create part
- `GET /api/ifs/parts/:userId` - Get user's parts
- `PATCH /api/ifs/part/:id` - Update part

**Pause Button:**

- `POST /api/pause/activate` - Activate pause
- `POST /api/pause/deactivate` - Deactivate pause
- `GET /api/pause/status/:coupleId` - Get pause status
- `GET /api/pause/history/:coupleId` - Get pause history

**Therapist:**

- `GET /api/therapist/couples` - Get therapist's couples
- `POST /api/therapist/create-couple` - Create new couple
- `POST /api/therapist/create-therapist` - Create new therapist

**AI Endpoints:**

- `POST /api/ai/date-night` - Generate date night ideas (Perplexity)
- `GET /api/ai/analytics` - Get therapist analytics (Perplexity)
- `GET /api/ai/insights` - Get detailed couple insights (Perplexity)

## 🔍 Verification

After deployment, verify these work:

1. **Frontend Routes:**

   - Visit `https://your-app.vercel.app/dashboard`
   - Visit `https://your-app.vercel.app/echo-empathy`
   - Visit `https://your-app.vercel.app/pause`
   - All should load the React app (not 404)

2. **API Routes:**

   - Check browser console for API calls
   - All API requests should go to `/api/*`
   - No CORS errors

3. **Authentication:**
   - Sign in should work
   - User profile should load
   - Session should persist

## 🐛 Troubleshooting

### Issue: 404 on client routes

**Problem:** Visiting `/dashboard` returns 404

**Solution:** The `vercel.json` rewrites should handle this. Verify:

```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

### Issue: API routes return 404

**Problem:** `/api/couples` returns 404

**Solution:** Verify `api/index.ts` exists and exports the Express app:

```typescript
export default app;
```

### Issue: Environment variables not working

**Problem:** API can't connect to Supabase

**Solution:**

1. Go to Vercel Dashboard > Settings > Environment Variables
2. Verify all 5 variables are set
3. Redeploy after adding variables

### Issue: Build fails

**Problem:** Vercel build fails

**Solutions:**

1. Check package.json has `"build": "vite build"` (not the esbuild command)
2. Check all dependencies are in package.json
3. Check build logs for specific errors

## 📊 Monitoring

After deployment:

1. **Vercel Dashboard:**

   - View deployment logs
   - Monitor function execution
   - Check error rates

2. **Supabase Dashboard:**

   - Monitor database queries
   - Check API usage
   - Review logs

3. **Browser Console:**
   - Check for errors
   - Verify API calls
   - Test authentication flow

## 🎉 Success!

Your TADI application is now live on Vercel with:

- ✅ Global CDN for fast frontend delivery
- ✅ Serverless functions for scalable backend
- ✅ Automatic HTTPS
- ✅ Continuous deployment from Git
- ✅ Preview deployments for PRs

Share your app URL with therapists and couples to start using TADI!

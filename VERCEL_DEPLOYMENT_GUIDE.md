# Vercel Deployment Guide for TADI

This guide will help you deploy your full-stack Express + React application to Vercel.

## ✅ Files Created

The following files have been created for Vercel deployment:

1. **`api/index.ts`** - Serverless function that exports the Express app
2. **`vercel.json`** - Deployment configuration with routing rules
3. **`.vercelignore`** - Files to ignore during deployment
4. **`.env.example`** - Environment variables documentation (updated)

## 📋 Manual Changes Required

### 1. Update package.json Build Script

**Current:**
```json
"scripts": {
  "build": "vite build && esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist"
}
```

**Change to:**
```json
"scripts": {
  "build": "vite build",
  "vercel-build": "vite build"
}
```

**Why:** Vercel automatically builds serverless functions from the `api/` directory. We only need to build the frontend with Vite.

## 🚀 Deployment Steps

### Step 1: Prepare Your Repository

1. Commit all changes:
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

| Variable Name | Description | Where to Get It |
|--------------|-------------|-----------------|
| `VITE_SUPABASE_URL` | Your Supabase project URL | Supabase Dashboard > Project Settings > API |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous/public key | Supabase Dashboard > Project Settings > API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (SECRET!) | Supabase Dashboard > Project Settings > API > service_role key |
| `SESSION_SECRET` | Random string for sessions | Generate with: `openssl rand -base64 32` |
| `PERPLEXITY_API_KEY` | Perplexity AI API key | https://www.perplexity.ai/settings/api |

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
│  /*     → dist/public/ (Static)      │
└─────────────────────────────────────┘
```

### Request Flow

1. **API Requests** (`/api/*`)
   - Routed to `api/index.ts` serverless function
   - Express handles the request
   - Connects to Supabase with service role key
   - Returns JSON response

2. **Frontend Requests** (`/*`)
   - Served from `dist/public/` static files
   - All routes fall back to `index.html` for client-side routing
   - Wouter handles navigation on the client
   - React app uses Supabase anon key

### Routing Configuration

The `vercel.json` file configures:

```json
{
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "/api"
    },
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

This ensures:
- All `/api/*` requests go to the serverless function
- All other requests serve `index.html` (for client-side routing)
- Static assets are served from `dist/public/`

## ✅ Verification Checklist

After deployment, verify:

### Frontend Routes (Client-Side)
Test these routes work with client-side navigation:
- ✅ `/` - Home/Dashboard
- ✅ `/auth/signin` - Sign in page
- ✅ `/auth/signup` - Sign up page
- ✅ `/dashboard` - Client dashboard
- ✅ `/couple-setup` - Couple setup
- ✅ `/love-map` - Love map quiz
- ✅ `/weekly-checkin` - Weekly check-in
- ✅ `/gratitude` - Gratitude log
- ✅ `/goals` - Shared goals
- ✅ `/rituals` - Rituals page
- ✅ `/conversation` - Hold me tight
- ✅ `/voice-memos` - Voice memos
- ✅ `/messages` - Messages
- ✅ `/calendar` - Calendar
- ✅ `/echo-empathy` - Echo & empathy
- ✅ `/ifs-intro` - IFS introduction
- ✅ `/pause` - Pause button
- ✅ `/admin` - Admin dashboard (therapists)
- ✅ `/admin/analytics` - Analytics (therapists)
- ✅ `/admin/user-management` - User management (therapists)

### API Routes (Serverless)
Test API endpoints work:
- ✅ `GET /api/therapist/analytics` - Therapist analytics
- ✅ `GET /api/couples` - Get couples list
- ✅ `POST /api/weekly-checkins` - Create check-in
- ✅ `GET /api/gratitude` - Get gratitude entries
- ✅ `POST /api/goals` - Create goal
- ✅ And all other API routes in `server/routes.ts`

## 🐛 Troubleshooting

### Issue: API Routes Return 404

**Solution:** Check that `api/index.ts` is in the root `api/` directory and that `vercel.json` exists.

### Issue: Frontend Routes Return 404

**Solution:** Verify the `vercel.json` rewrite rules are configured correctly.

### Issue: Environment Variables Not Working

**Solution:** 
1. Check they're added to Vercel dashboard
2. Redeploy after adding environment variables
3. For frontend variables, ensure they start with `VITE_`

### Issue: Serverless Function Timeout

**Solution:** 
- Free tier has 10s timeout
- Pro tier has 60s timeout
- Optimize database queries
- Use connection pooling (already configured)

### Issue: Database Connection Errors

**Solution:**
- Verify `SUPABASE_SERVICE_ROLE_KEY` is set correctly
- Check Supabase project is not paused
- Verify connection pooling is configured (it is in `server/supabase.ts`)

## 📊 Monitoring

### Vercel Dashboard

Monitor your deployment in the Vercel dashboard:
- **Deployments** - View deployment history and logs
- **Functions** - Monitor serverless function performance
- **Analytics** - Track page views and performance
- **Logs** - View real-time logs from serverless functions

### Performance Tips

1. **Cold Starts** - First request to a serverless function may be slow (~1-2s)
2. **Connection Pooling** - Already configured for Supabase
3. **Static Assets** - Automatically cached on Vercel's CDN
4. **Function Size** - Keep serverless functions under 50MB

## 🔒 Security Notes

1. **Environment Variables** - Never commit `.env` files to Git
2. **Service Role Key** - Keep this secret and never expose to frontend
3. **CORS** - Configure if needed for external API access
4. **Rate Limiting** - Consider implementing for API routes

## 📝 Important Notes

### Stateless Functions
- Each serverless function invocation is independent
- No in-memory session storage (use Supabase for sessions)
- No WebSocket support in serverless functions

### Connection Pooling
Already configured in `server/supabase.ts`:
```typescript
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
```

### Build Output
- Frontend builds to: `dist/public/`
- Serverless functions build from: `api/`

## 🆘 Getting Help

If you encounter issues:
1. Check Vercel deployment logs
2. Review Vercel documentation: https://vercel.com/docs
3. Check Supabase status: https://status.supabase.com
4. Review this application's error logs in Vercel dashboard

## 🎉 Success!

Once deployed, your application will be available at:
```
https://your-project-name.vercel.app
```

All frontend routes will work with client-side navigation, and all API routes will be handled by serverless functions.

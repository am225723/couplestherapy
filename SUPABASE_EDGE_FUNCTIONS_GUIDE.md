# Supabase Edge Functions Migration Guide

## Overview

This guide explains how to migrate from Express API routes to Supabase Edge Functions. Edge Functions run on Deno at the edge, providing:

- **Faster response times** (deployed globally)
- **Better scalability** (serverless autoscaling)
- **Lower costs** (pay per invocation)
- **No backend server needed** (Vercel deployment simplified)

## Current Migration Status

### ✅ Completed Functions

1. **ai-date-night** - Generate AI-powered date night ideas
   - Location: `supabase/functions/ai-date-night/`
   - Frontend: Updated to use `supabase.functions.invoke()`
   - Status: Ready for deployment

### 🔄 In Progress

2. **ai-analytics** - Therapist analytics dashboard
3. **ai-insights** - Couple insights analysis

### 📋 Pending (41 total routes)

See `server/routes.ts` for all Express routes that could be migrated.

---

## Directory Structure

```
supabase/
├── config.toml                    # Supabase configuration
├── functions/
│   ├── deno.json                  # Deno configuration
│   ├── _shared/                   # Shared utilities
│   │   ├── cors.ts                # CORS headers
│   │   ├── perplexity.ts          # Perplexity API helper
│   │   └── supabase-client.ts     # Supabase client setup
│   ├── ai-date-night/
│   │   └── index.ts               # Date night generator
│   ├── ai-analytics/              # (To be created)
│   │   └── index.ts
│   └── ai-insights/               # (To be created)
│       └── index.ts
```

---

## Prerequisites

### 1. Install Supabase CLI

```bash
npm install -g supabase
```

### 2. Login to Supabase

```bash
supabase login
```

### 3. Link to Your Project

```bash
supabase link --project-ref <your-project-ref>
```

You can find your project ref in your Supabase dashboard URL:
`https://supabase.com/dashboard/project/<project-ref>`

---

## Environment Variables

Edge Functions need these environment variables set in Supabase:

### Required Secrets

```bash
# Perplexity AI API Key
supabase secrets set PERPLEXITY_API_KEY=pplx-xxxxxxxxxxxxxxxx

# These are automatically available from Supabase:
# - SUPABASE_URL
# - SUPABASE_ANON_KEY
# - SUPABASE_SERVICE_ROLE_KEY
```

### Verify Secrets

```bash
supabase secrets list
```

---

## Local Development

### 1. Start Supabase Locally

```bash
supabase start
```

This will start:
- PostgreSQL database
- Auth server
- Edge Functions runtime
- Studio (dashboard)

### 2. Serve Edge Functions Locally

```bash
# Serve all functions
supabase functions serve

# Serve specific function
supabase functions serve ai-date-night --env-file .env.local
```

### 3. Test Locally

```bash
curl -X POST \
  'http://localhost:54321/functions/v1/ai-date-night' \
  -H 'Authorization: Bearer YOUR_SUPABASE_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "time": "2-3 hours",
    "location": "At home",
    "price": "Free or low-cost",
    "participants": "Just us two",
    "energy": "Relaxed and low-key"
  }'
```

---

## Deployment

### Deploy All Functions

```bash
supabase functions deploy
```

### Deploy Specific Function

```bash
supabase functions deploy ai-date-night
```

### View Logs

```bash
# Real-time logs
supabase functions logs ai-date-night --follow

# Recent logs
supabase functions logs ai-date-night
```

---

## Frontend Integration

### Before (Express API)

```typescript
import { apiRequest } from '@/lib/queryClient';

const generateMutation = useMutation({
  mutationFn: async (prefs: DateNightPreferences) => {
    const response = await apiRequest('POST', '/api/ai/date-night', prefs);
    const data = await response.json();
    return data as DateNightResponse;
  },
});
```

### After (Supabase Edge Function)

```typescript
import { supabase } from '@/lib/supabase';

const generateMutation = useMutation({
  mutationFn: async (prefs: DateNightPreferences) => {
    const { data, error } = await supabase.functions.invoke('ai-date-night', {
      body: prefs,
    });
    
    if (error) throw error;
    return data as DateNightResponse;
  },
});
```

---

## Benefits Over Express

### 1. **No Backend Server Required**

**Before:**
- Express server running on Vercel
- API routes in `server/routes.ts`
- `api/index.ts` serverless wrapper
- Complex deployment configuration

**After:**
- Pure Supabase Edge Functions
- Simplified Vercel deployment (frontend only)
- No Express server needed
- Automatic global distribution

### 2. **Better Performance**

- **Express:** Single region deployment
- **Edge Functions:** Global edge network (reduced latency)

### 3. **Simplified Deployment**

**Before (Vercel):**
```json
{
  "build": "vite build && esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist",
  "routes": [
    { "src": "/api/(.*)", "dest": "/api/index.js" },
    { "handle": "filesystem" },
    { "src": "/(.*)", "dest": "/index.html" }
  ]
}
```

**After (Vercel):**
```json
{
  "build": "vite build",
  "routes": [
    { "src": "/(.*)", "dest": "/index.html" }
  ]
}
```

### 4. **Cost Efficiency**

- **Express:** Always-on server costs
- **Edge Functions:** Pay per invocation (free tier: 500K requests/month)

### 5. **Authentication Built-in**

Edge Functions automatically have access to the user's session via JWT:

```typescript
// In edge function
import { createClient } from '@supabase/supabase-js';

Deno.serve(async (req) => {
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    {
      global: { headers: { Authorization: req.headers.get('Authorization')! } },
    }
  );

  const { data: { user } } = await supabaseClient.auth.getUser();
  // User is automatically authenticated!
});
```

---

## Migration Checklist

For each Express route you want to migrate:

- [ ] Create new function directory: `supabase/functions/[function-name]/`
- [ ] Create `index.ts` with Deno.serve() handler
- [ ] Add CORS headers support
- [ ] Migrate business logic from Express route
- [ ] Update frontend to use `supabase.functions.invoke()`
- [ ] Test locally with `supabase functions serve`
- [ ] Deploy with `supabase functions deploy`
- [ ] Update documentation

---

## Example: Migrating a Route

### Express Route (Before)

```typescript
// server/routes.ts
app.post("/api/ai/date-night", async (req, res) => {
  try {
    const prefs = req.body as DateNightPreferences;
    const result = await generateDateNightIdeas(prefs);
    res.json({ content: result.content, citations: result.citations });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
```

### Edge Function (After)

```typescript
// supabase/functions/ai-date-night/index.ts
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const prefs = await req.json();
    const result = await generateDateNightIdeas(prefs);
    
    return new Response(
      JSON.stringify({ content: result.content, citations: result.citations }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
```

---

## Troubleshooting

### Function Not Found Error

```bash
# Make sure function is deployed
supabase functions list

# Redeploy if needed
supabase functions deploy ai-date-night
```

### CORS Errors

Make sure CORS headers are included in every response, including errors:

```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
```

### Environment Variable Not Set

```bash
# Check secrets
supabase secrets list

# Set missing secret
supabase secrets set PERPLEXITY_API_KEY=your-key-here
```

### Authentication Issues

Make sure the frontend is passing the Authorization header:

```typescript
const { data, error } = await supabase.functions.invoke('ai-date-night', {
  body: prefs,
  // Authorization header is automatically added by Supabase client
});
```

---

## Next Steps

### Phase 1: AI Functions (Current)
- ✅ ai-date-night
- ⏳ ai-analytics
- ⏳ ai-insights

### Phase 2: High-Traffic Routes
- Calendar endpoints
- Messages endpoints
- Voice memos endpoints

### Phase 3: Therapist Management
- User creation
- Couple management
- Analytics export

### Phase 4: Complete Migration
- All 41 routes migrated
- Express server removed
- Simplified Vercel deployment

---

## Resources

- [Supabase Edge Functions Docs](https://supabase.com/docs/guides/functions)
- [Deno Documentation](https://deno.land/manual)
- [Supabase CLI Reference](https://supabase.com/docs/reference/cli)

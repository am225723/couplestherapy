# Troubleshooting 401 Error with Supabase Edge Functions

## Issue: Getting 401 Unauthorized

A 401 error when calling your edge function means the Authorization header is missing or invalid.

---

## Solution 1: Testing with curl (Recommended)

Use your **Supabase Anon Key** (not the service role key) in the Authorization header:

```bash
curl -X POST 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/ai-date-night' \
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

### Finding Your Keys:

1. Go to your Supabase project dashboard
2. Click **Settings** → **API**
3. Copy your:
   - **Project URL** (e.g., `https://abcdefgh.supabase.co`)
   - **Anon/Public Key** (starts with `eyJ...`)

**Example:**
```bash
curl -X POST 'https://abcdefgh.supabase.co/functions/v1/ai-date-night' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' \
  -H 'Content-Type: application/json' \
  -d '{"time":"2-3 hours","location":"At home","price":"Free","participants":"Just us","energy":"Relaxed"}'
```

---

## Solution 2: Testing from Frontend

If you're getting a 401 from the frontend, it means:

### A. User is Not Logged In

The `supabase.functions.invoke()` method requires the user to be authenticated. If you want the function to work for **non-authenticated users**, you need to use `fetch()` instead:

```typescript
// Option 1: Use fetch for public access
const generateMutation = useMutation({
  mutationFn: async (prefs: DateNightPreferences) => {
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-date-night`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify(prefs),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to generate ideas');
    }

    return await response.json() as DateNightResponse;
  },
});
```

**OR**

### B. Ensure User is Logged In

If you want to keep using `supabase.functions.invoke()`, make sure the user is logged in first:

```typescript
// Check if user is authenticated
const { data: { user } } = await supabase.auth.getUser();

if (!user) {
  toast({
    title: 'Authentication Required',
    description: 'Please log in to generate date night ideas',
    variant: 'destructive',
  });
  return;
}

// Then invoke the function
const { data, error } = await supabase.functions.invoke('ai-date-night', {
  body: prefs,
});
```

---

## Solution 3: Make Function Truly Public

If you want **anyone** to be able to call the function (no login required), use `fetch()` instead of `supabase.functions.invoke()`:

### Update `client/src/pages/date-night.tsx`:

```typescript
const generateMutation = useMutation({
  mutationFn: async (prefs: DateNightPreferences) => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    const response = await fetch(
      `${supabaseUrl}/functions/v1/ai-date-night`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify(prefs),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to generate date night ideas');
    }

    return await response.json() as DateNightResponse;
  },
  onSuccess: (data) => {
    setGeneratedIdeas(data.content);
  },
  onError: (error: any) => {
    toast({
      title: 'Error',
      description: error.message || 'Failed to generate date night ideas',
      variant: 'destructive',
    });
  },
});
```

---

## Quick Debug Checklist

- [ ] **Check your Supabase URL** - Should be `https://YOUR_PROJECT.supabase.co`
- [ ] **Check your Anon Key** - Should start with `eyJ` and be very long
- [ ] **Verify function is deployed** - Run `supabase functions list`
- [ ] **Check function logs** - Run `supabase functions logs ai-date-night`
- [ ] **Test with curl first** - Isolate if it's a frontend or backend issue
- [ ] **Check environment variables** - Make sure `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set

---

## Testing Response Codes

- **200** ✅ Success - Date night ideas generated
- **400** ⚠️ Bad Request - Missing or invalid fields
- **401** 🔒 Unauthorized - Missing/invalid Authorization header
- **500** ❌ Server Error - Check function logs

---

## Environment Variables

Make sure these are set in your `.env` file:

```bash
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## Next Steps

1. **Test with curl** using the command above (replace with your actual keys)
2. If curl works, the issue is in your frontend code
3. If curl doesn't work, check:
   - Function is deployed: `supabase functions deploy ai-date-night`
   - Secrets are set: `supabase secrets list`
   - Check logs: `supabase functions logs ai-date-night`

Would you like me to help update your frontend code to work without authentication?

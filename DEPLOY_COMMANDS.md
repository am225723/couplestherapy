# Quick Deploy Commands for Supabase Edge Function

## Step 1: Set Your Perplexity API Key

Run this command to set your API key as a secret in Supabase:

```bash
supabase secrets set PERPLEXITY_API_KEY=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
```

## Step 2: Verify the Secret is Set

```bash
supabase secrets list
```

You should see `PERPLEXITY_API_KEY` in the list.

## Step 3: Deploy the Function

```bash
supabase functions deploy ai-date-night
```

## Step 4: Test It

```bash
# View logs
supabase functions logs ai-date-night --follow
```

## Step 5: Test with curl

Replace `YOUR_PROJECT_REF` and `YOUR_ANON_KEY` with your actual values from the Supabase dashboard:

```bash
curl -X POST 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/ai-date-night' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "time": "2-3 hours",
    "location": "At home",
    "price": "Free or low-cost",
    "participants": "Just us two",
    "energy": "Relaxed and low-key"
  }'
```

## Finding Your Supabase Credentials

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Click **Settings** → **API**
4. Copy:
   - **Project URL** (e.g., `https://abcdefgh.supabase.co`)
   - **anon public** key (the long key starting with `eyJ...`)

---

## Quick Reference

**Set secret:**
```bash
supabase secrets set PERPLEXITY_API_KEY=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
```

**Deploy:**
```bash
supabase functions deploy ai-date-night
```

**Check logs:**
```bash
supabase functions logs ai-date-night --follow
```

That's it! Your edge function will be live and globally available. 🎉

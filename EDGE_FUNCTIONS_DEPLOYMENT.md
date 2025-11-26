m# Deploying ALEIC Edge Functions to Supabase

This guide explains how to deploy all 8 Edge Functions to your Supabase project.

## Prerequisites

1. **Supabase CLI** installed:

   ```bash
   npm install -g supabase
   ```

2. **Supabase Project** set up at https://supabase.com

3. **Environment Variables** configured in your Supabase project:
   - `PERPLEXITY_API_KEY` - Your Perplexity AI API key
   - `SUPABASE_URL` - Auto-provided by Supabase
   - `SUPABASE_ANON_KEY` - Auto-provided by Supabase
   - `SUPABASE_SERVICE_ROLE_KEY` - Auto-provided by Supabase

## Edge Functions Overview

| Function Name                 | Purpose                                        | Authentication                |
| ----------------------------- | ---------------------------------------------- | ----------------------------- |
| `ai-date-night`               | Generate personalized date night ideas         | JWT required                  |
| `ai-analytics`                | Analyze couple activity analytics              | JWT required (therapist-only) |
| `ai-insights`                 | Generate clinical insights for therapists      | JWT required (therapist-only) |
| `ai-exercise-recommendations` | Recommend therapy tools based on usage         | JWT required (couple)         |
| `ai-empathy-prompt`           | Generate empathy suggestions for Hold Me Tight | JWT required (couple)         |
| `ai-echo-coaching`            | Provide active listening feedback              | JWT required (couple)         |
| `ai-voice-memo-sentiment`     | Analyze voice memo sentiment                   | JWT required (couple)         |
| `ai-session-prep`             | Generate therapist session preparation         | JWT required (therapist-only) |

## Step 1: Login to Supabase CLI

```bash
supabase login
```

This will open a browser window for authentication.

## Step 2: Link Your Project

```bash
supabase link --project-ref YOUR_PROJECT_REF
```

Replace `YOUR_PROJECT_REF` with your actual Supabase project reference ID (found in Project Settings > General).

## Step 3: Set Environment Variables

Navigate to your Supabase Dashboard:

1. Go to **Project Settings** > **Edge Functions**
2. Add the following secrets:

```bash
# Using CLI (recommended)
supabase secrets set PERPLEXITY_API_KEY=your_perplexity_api_key_here
```

Or via the dashboard UI.

## Step 4: Deploy All Functions

Deploy all 8 functions at once:

```bash
# From the project root directory
supabase functions deploy ai-date-night
supabase functions deploy ai-analytics
supabase functions deploy ai-insights
supabase functions deploy ai-exercise-recommendations
supabase functions deploy ai-empathy-prompt
supabase functions deploy ai-echo-coaching
supabase functions deploy ai-voice-memo-sentiment
supabase functions deploy ai-session-prep
```

Or deploy them one by one:

```bash
# Deploy individual function
supabase functions deploy ai-exercise-recommendations --no-verify-jwt
```

Note: The `--no-verify-jwt` flag is NOT recommended for production. Remove it to enforce JWT verification.

## Step 5: Verify Deployment

Check that all functions are deployed:

```bash
supabase functions list
```

You should see all 8 functions listed.

## Step 6: Test Functions

Test a function:

```bash
# Test ai-exercise-recommendations
supabase functions invoke ai-exercise-recommendations \
  --headers '{"Authorization":"Bearer YOUR_JWT_TOKEN"}' \
  --body '{}'
```

## Production Environment Variables

Make sure these are set in your Supabase project:

1. **Dashboard** → **Project Settings** → **Edge Functions** → **Secrets**:

   - `PERPLEXITY_API_KEY` - Your Perplexity AI key

2. Auto-provided by Supabase (no action needed):
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

## Frontend Integration

The frontend is already configured to call these functions via `client/src/lib/ai-functions.ts`:

```typescript
import { aiFunctions } from "@/lib/ai-functions";

// Example: Get exercise recommendations
const recommendations = await aiFunctions.getExerciseRecommendations();

// Example: Generate empathy prompt
const empathy = await aiFunctions.createEmpathyPrompt({
  conversation_id: "abc123",
  step_number: 4,
  user_response: "I feel disconnected lately...",
});
```

## Troubleshooting

### Function Invocation Errors

If you see "Function invocation error":

1. **Check JWT verification**: Ensure you're passing a valid auth token
2. **Check environment variables**: Verify `PERPLEXITY_API_KEY` is set
3. **Check logs**:
   ```bash
   supabase functions logs ai-exercise-recommendations
   ```

### CORS Errors

All functions include CORS headers. If you still see CORS errors:

1. Check that your request includes proper headers
2. Verify the function handles OPTIONS requests

### Authentication Errors

- **401 Unauthorized**: Missing or invalid JWT token
- **403 Forbidden**: User doesn't have required role (e.g., therapist-only functions)

## Cost Considerations

Edge Functions are billed based on:

- **Invocations**: Number of function calls
- **Execution time**: Duration of each call
- **Bandwidth**: Data transferred

**Perplexity AI costs** are separate and based on:

- Token usage (prompt + completion tokens)
- Model: `sonar` model pricing

## Security Best Practices

1. ✅ **JWT verification enabled** - All functions require authentication
2. ✅ **Role-based access** - Therapist functions check user role
3. ✅ **Input validation** - All functions validate input
4. ✅ **Privacy-focused logging** - No sensitive data logged
5. ✅ **Anonymized AI prompts** - User data anonymized before sending to AI

## Maintenance

### Updating Functions

To update a function:

1. Edit the function code in `supabase/functions/[function-name]/index.ts`
2. Re-deploy:
   ```bash
   supabase functions deploy [function-name]
   ```

### Monitoring

Monitor function performance:

1. **Dashboard** → **Edge Functions** → Select function
2. View:
   - Invocations per day
   - Execution time
   - Error rate
   - Logs

## Next Steps

1. ✅ Deploy all 8 functions
2. ✅ Set environment variables
3. ✅ Test each function
4. ✅ Monitor logs and errors
5. ✅ Optimize based on usage patterns

## Support

For issues:

- Check Supabase docs: https://supabase.com/docs/guides/functions
- Review function logs in dashboard
- Contact Supabase support for infrastructure issues

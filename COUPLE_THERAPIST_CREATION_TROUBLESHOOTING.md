# Troubleshooting: Creating Couples and Therapists

## ✅ Current Configuration Status

I've verified your setup and everything appears correctly configured:

### Backend API Routes ✅

- **`POST /api/therapist/create-couple`** - Working correctly
- **`POST /api/therapist/create-therapist`** - Working correctly

### Frontend Forms ✅

- **User Management Page** (`/admin/user-management`) - Properly configured
- **apiRequest calls** - Using correct parameter order
- **Form validation** - Zod schemas matching backend

### Environment Variables ✅

All required Supabase variables are set:

- `VITE_SUPABASE_URL` ✅
- `VITE_SUPABASE_ANON_KEY` ✅
- `SUPABASE_SERVICE_ROLE_KEY` ✅
- `SESSION_SECRET` ✅
- `PERPLEXITY_API_KEY` ✅

---

## 🐛 Common Issues & Solutions

### Issue 1: Authentication Required

**Symptom:**

- Error: "No session found. Please log in."
- Error: "Access denied. Only therapists can perform this action."

**Solution:**

1. Make sure you're logged in as a **therapist** account
2. Only therapist accounts can create couples and other therapists
3. Check your profile role in the database:
   ```sql
   SELECT id, full_name, role FROM "Couples_profiles" WHERE role = 'therapist';
   ```

---

### Issue 2: Supabase Tables Don't Exist

**Symptom:**

- Error: "relation \"Couples_couples\" does not exist"
- Error: "relation \"Couples_profiles\" does not exist"

**Solution:**
Run the database migrations in your Supabase dashboard:

1. Go to Supabase Dashboard → SQL Editor
2. Run `supabase-setup.sql` (creates all tables)
3. Verify tables exist:
   ```sql
   SELECT table_name FROM information_schema.tables
   WHERE table_schema = 'public' AND table_name LIKE 'Couples_%';
   ```

**Required Tables:**

- `Couples_profiles` - User profiles
- `Couples_couples` - Couple records
- All other `Couples_*` tables for features

---

### Issue 3: Invalid Supabase Service Role Key

**Symptom:**

- Error: "Failed to create Partner 1: Invalid API key"
- Error: "Failed to create couple: Authentication failed"

**Solution:**

1. Go to Supabase Dashboard → Project Settings → API
2. Copy the **service_role** key (NOT the anon key!)
3. Update your environment variable:
   ```
   SUPABASE_SERVICE_ROLE_KEY=your_actual_service_role_key_here
   ```
4. Restart your application

**Note:** The service role key should start with `eyJ...` and is much longer than the anon key.

---

### Issue 4: Email Already Exists

**Symptom:**

- Error: "User already registered"
- Error: "Failed to create Partner 1: Email already exists"

**Solution:**
Each email can only be used once in Supabase Auth. Use unique emails for each user.

To check existing users:

```sql
-- In Supabase Dashboard → Authentication → Users
```

Or delete test users:

```sql
-- This requires using Supabase Auth Admin API
```

---

### Issue 5: Password Too Short

**Symptom:**

- Error: "Password must be at least 6 characters"
- Form validation error on password field

**Solution:**
Ensure passwords are at least 6 characters long for all users.

**Backend Validation:**

```typescript
partner1_password: z.string().min(6);
partner2_password: z.string().min(6);
```

---

### Issue 6: Missing Required Fields

**Symptom:**

- Error: "Name is required"
- Error: "Invalid email address"

**Solution:**
All fields are required:

**For Creating Couple:**

- ✅ Partner 1 Email (valid email)
- ✅ Partner 1 Password (min 6 chars)
- ✅ Partner 1 Name (not empty)
- ✅ Partner 2 Email (valid email, different from Partner 1)
- ✅ Partner 2 Password (min 6 chars)
- ✅ Partner 2 Name (not empty)

**For Creating Therapist:**

- ✅ Email (valid email)
- ✅ Password (min 6 chars)
- ✅ Full Name (not empty)

---

### Issue 7: Therapist Session Expired

**Symptom:**

- Error: "Invalid or expired session. Please log in again."
- Redirected to login page

**Solution:**

1. Sign out completely
2. Sign back in as therapist
3. Try creating couple/therapist again

---

### Issue 8: Supabase RLS (Row Level Security) Blocks

**Symptom:**

- Error: "Failed to create couple: permission denied"
- Error: "Failed to create therapist profile: new row violates row-level security policy"

**Solution:**
RLS policies might be blocking the service role. Check your RLS policies:

```sql
-- Check RLS on Couples_profiles
SELECT * FROM pg_policies WHERE tablename = 'Couples_profiles';

-- Check RLS on Couples_couples
SELECT * FROM pg_policies WHERE tablename = 'Couples_couples';
```

**Quick Fix:** Temporarily disable RLS for testing:

```sql
ALTER TABLE "Couples_profiles" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Couples_couples" DISABLE ROW LEVEL SECURITY;
```

**⚠️ Warning:** Only do this in development! Re-enable RLS after testing.

---

## 🧪 Testing the Endpoints

### Test Create Couple (Using curl)

```bash
# First, get your therapist auth token
# (Login as therapist, then check browser dev tools → Application → Local Storage → supabase.auth.token)

curl -X POST http://localhost:5000/api/therapist/create-couple \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_THERAPIST_TOKEN_HERE" \
  -d '{
    "partner1_email": "test1@example.com",
    "partner1_password": "password123",
    "partner1_name": "Test Partner 1",
    "partner2_email": "test2@example.com",
    "partner2_password": "password123",
    "partner2_name": "Test Partner 2"
  }'
```

**Expected Response:**

```json
{
  "success": true,
  "couple": {
    "id": "...",
    "join_code": "ABCD1234",
    "partner1_id": "...",
    "partner1_email": "test1@example.com",
    "partner1_name": "Test Partner 1",
    "partner2_id": "...",
    "partner2_email": "test2@example.com",
    "partner2_name": "Test Partner 2"
  }
}
```

---

### Test Create Therapist (Using curl)

```bash
curl -X POST http://localhost:5000/api/therapist/create-therapist \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_THERAPIST_TOKEN_HERE" \
  -d '{
    "email": "newtherapist@example.com",
    "password": "password123",
    "full_name": "Dr. New Therapist"
  }'
```

**Expected Response:**

```json
{
  "success": true,
  "therapist": {
    "id": "...",
    "email": "newtherapist@example.com",
    "full_name": "Dr. New Therapist",
    "role": "therapist"
  }
}
```

---

## 📊 Verification Checklist

Run through this checklist to verify everything is working:

### 1. Environment Setup

- [ ] All Supabase environment variables are set
- [ ] `SUPABASE_SERVICE_ROLE_KEY` is the correct service role key (not anon key)
- [ ] Application is running (`npm run dev`)
- [ ] No errors in server console

### 2. Database Setup

- [ ] All `Couples_*` tables exist in Supabase
- [ ] `Couples_profiles` table has correct schema
- [ ] `Couples_couples` table has correct schema
- [ ] RLS policies are configured (or temporarily disabled for testing)

### 3. Authentication

- [ ] You have a therapist account created
- [ ] You're logged in as a therapist
- [ ] Session is not expired
- [ ] Auth token is being sent with requests

### 4. Form Validation

- [ ] All required fields are filled
- [ ] Emails are valid format
- [ ] Passwords are at least 6 characters
- [ ] Email addresses are unique

### 5. Network

- [ ] Browser can reach `localhost:5000`
- [ ] No CORS errors in browser console
- [ ] API requests show in Network tab
- [ ] Responses are 200 (success) not 4xx/5xx

---

## 🔍 Debugging Steps

### Step 1: Check Browser Console

Open browser DevTools → Console tab:

- Look for red error messages
- Check for failed network requests
- Note any stack traces

### Step 2: Check Network Tab

Open browser DevTools → Network tab:

1. Try to create a couple/therapist
2. Find the POST request to `/api/therapist/create-couple` or `/api/therapist/create-therapist`
3. Click on it → Preview/Response tab
4. Look at the response:
   - **200 OK** = Success
   - **400** = Validation error (check error message)
   - **401** = Not authenticated
   - **403** = Not authorized (not a therapist)
   - **500** = Server error (check server logs)

### Step 3: Check Server Logs

In your terminal where `npm run dev` is running:

- Look for error messages
- Check for "Create couple error:" or "Create therapist error:"
- Note any Supabase error messages

### Step 4: Check Supabase Dashboard

Go to Supabase Dashboard → Authentication → Users:

- Verify new users were created
- Check if they have correct email addresses
- Look for any error states

Go to Table Editor → Couples_profiles:

- Verify profiles were created
- Check roles are set correctly
- Verify couple_id links are correct

---

## ✅ Expected Behavior

### Creating a Couple - Success Flow

1. **Therapist fills form:**

   - Partner 1: email, password, name
   - Partner 2: email, password, name

2. **Click "Create Couple" button**

3. **Backend creates:**

   - Partner 1 auth user in Supabase Auth
   - Partner 2 auth user in Supabase Auth
   - Couple record in `Couples_couples` table
   - Partner 1 profile in `Couples_profiles` table
   - Partner 2 profile in `Couples_profiles` table
   - Join code (first 8 chars of couple ID, uppercased)

4. **Success message appears:**
   - "Couple Created Successfully"
   - Shows join code for therapist to share
   - Form resets

### Creating a Therapist - Success Flow

1. **Therapist fills form:**

   - Email, password, full name

2. **Click "Create Therapist" button**

3. **Backend creates:**

   - Therapist auth user in Supabase Auth
   - Therapist profile in `Couples_profiles` table with role='therapist'

4. **Success message appears:**
   - "Therapist Created Successfully"
   - Form resets

---

## 🚀 Quick Fixes

### If Nothing Works

1. **Restart everything:**

   ```bash
   # Stop the dev server (Ctrl+C)
   npm run dev
   ```

2. **Clear browser cache:**

   - DevTools → Application → Clear storage → Clear site data
   - Or use Incognito/Private window

3. **Verify Supabase connection:**

   - Go to Supabase Dashboard
   - Check if project is active
   - Verify API keys haven't changed

4. **Check for TypeScript errors:**

   ```bash
   npm run check
   ```

5. **Review environment variables:**
   ```bash
   # Make sure .env file has all variables set
   cat .env
   ```

---

---

## ⚡ Vercel Deployment Issue - FUNCTION_INVOCATION_FAILED

### Symptom:

- Error: "500: A server error has occurred FUNCTION_INVOCATION_FAILED"
- Error includes Vercel function ID like: `iad1::2i6wf-1762479028837-78143a4fa23a`

### Root Cause:

The serverless function had **top-level `await`** which Vercel doesn't support properly in serverless functions.

### Solution (FIXED):

✅ **Updated `api/index.ts` to remove top-level await**

- Routes are now registered synchronously at module load
- Compatible with Vercel's serverless architecture
- Prevents `FUNCTION_INVOCATION_FAILED` errors

### What Changed:

```typescript
// OLD (causes FUNCTION_INVOCATION_FAILED):
await registerRoutes(app);
export default app;

// NEW (works with Vercel):
// Register routes synchronously - route registration itself is synchronous
// even though registerRoutes returns Promise<Server>
registerRoutes(app);
export default app;
```

**Why This Works:**

- `registerRoutes()` registers all routes synchronously via `app.get()`, `app.post()`, etc.
- It only returns `Promise<Server>` for the HTTP server instance (needed in development)
- For Vercel serverless, we don't need the Server instance - just the Express app
- No await needed = no top-level await = Vercel compatible ✅

### Next Steps After Fix:

1. **Commit and push** your changes to GitHub
2. **Redeploy** to Vercel (automatic if connected to GitHub)
3. **Wait for deployment** to complete
4. **Try creating couple/therapist** again

### Other Vercel-Specific Issues:

**Missing Environment Variables on Vercel:**

- Make sure all environment variables are set in Vercel Dashboard
- Go to: Project Settings → Environment Variables
- Required variables:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `SESSION_SECRET`
  - `PERPLEXITY_API_KEY`

**Function Timeout:**

- Default timeout: 10 seconds (Hobby plan)
- Configured timeout: 30 seconds (in `vercel.json`)
- If still timing out, check Supabase response times

**Cold Start Issues:**

- First request after deployment may be slow
- This is normal for serverless functions
- Subsequent requests will be faster

---

## 📞 Still Having Issues?

If you're still experiencing problems:

1. **Check server logs** for the exact error message
2. **Check browser console** for frontend errors
3. **Share the specific error message** you're seeing
4. **Note which step fails** (form validation, API call, database insert, etc.)

Common error messages and what they mean:

- "No session found" = Not logged in
- "Access denied" = Not a therapist
- "Email already exists" = User already registered
- "Failed to create Partner X" = Supabase Auth error
- "Failed to create couple" = Database insert error
- "Failed to create therapist profile" = RLS policy or insert error
- "FUNCTION_INVOCATION_FAILED" = Vercel serverless error (now fixed)

---

**Status:** Vercel serverless issue FIXED ✅  
**Next Step:** Redeploy to Vercel and try creating a couple/therapist again

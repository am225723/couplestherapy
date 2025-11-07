# 🔧 FIX: RLS Policy Blocking Signups

## ❌ **The Problem:**

You're getting this error when signing up:
```
new row violates row-level security policy for table "Couples_profiles"
```

**Root Cause:** The database has `FORCE ROW LEVEL SECURITY` enabled, which blocks even the service role key from bypassing RLS policies.

---

## ✅ **The Fix (Run in Supabase SQL Editor):**

### **Step 1: Open Supabase SQL Editor**

1. Go to your Supabase Dashboard
2. Click "SQL Editor" in the left sidebar
3. Click "New Query"

### **Step 2: Run This SQL:**

```sql
-- Remove FORCE RLS from Couples_profiles
-- This allows service role to bypass RLS for user creation
ALTER TABLE public."Couples_profiles" NO FORCE ROW LEVEL SECURITY;

-- Remove FORCE RLS from Couples_couples
ALTER TABLE public."Couples_couples" NO FORCE ROW LEVEL SECURITY;
```

### **Step 3: Click "Run"**

---

## 🎯 **What This Does:**

- **Before:** Even the service role key (used by backend) was blocked by RLS
- **After:** Service role can create profiles/couples (for signup), but regular users are still protected by RLS

---

## ✅ **After Running This:**

1. **Therapist Signup** will work (`/auth/therapist-signup`)
2. **Couple Signup** will work (`/auth/couple-signup`)
3. All RLS security is still enforced for regular users

---

## 🔒 **Security:**

This is **safe** because:
- RLS is still enabled for all users
- Only the backend service role can bypass it (for creating new accounts)
- All existing security policies remain in place

---

## 📝 **Test After Running:**

1. Try creating a therapist account
2. Generate an invitation code
3. Try creating a couple account with that code

Everything should work now!

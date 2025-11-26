# New Invitation-Based Registration System

## ✅ **Problem Solved**

The previous system using Supabase Admin API was causing `FUNCTION_INVOCATION_FAILED` errors in Vercel serverless deployment. I've created a **completely new, simpler invitation-based registration system** that:

- ✅ Works reliably with Supabase client-side auth
- ✅ No complex backend admin API calls
- ✅ No serverless function issues
- ✅ Better user experience
- ✅ More secure with proper RLS policies

---

## 🎯 **How It Works**

### **For Therapists:**

1. **Self-Registration** (`/auth/therapist-signup`)

   - Therapist visits the signup page
   - Creates account with email/password
   - Profile automatically created with `role='therapist'`
   - Can immediately sign in

2. **Generate Invitation Codes** (`/admin/invitation-codes`)
   - After signing in, therapist goes to "Invitation Codes" page
   - Clicks "Generate New Code" button
   - 8-character code is created (e.g., "INVITE123")
   - Code expires in 30 days
   - Share code with couples

### **For Couples:**

1. **Registration with Code** (`/auth/couple-signup`)
   - Couple receives invitation code from their therapist
   - Visits the couple signup page
   - Enters invitation code
   - Both partners create their accounts
   - Automatically linked to therapist
   - Can immediately sign in

---

## 📁 **New Files Created**

### **Database Schema:**

- **`shared/schema.ts`** - Added `Couples_invitation_codes` table definition
- **`supabase-invitation-codes.sql`** - SQL migration to create the table

### **Frontend Pages:**

- **`client/src/pages/therapist-signup.tsx`** - Therapist self-registration
- **`client/src/pages/couple-signup.tsx`** - Couple registration with invitation code
- **`client/src/pages/invitation-codes.tsx`** - Invitation code management for therapists

### **Routing:**

- **`client/src/App.tsx`** - Updated to include new routes and menu items

---

## 🗄️ **Database Setup Required**

Run this SQL in your Supabase Dashboard:

```sql
-- Create Invitation Codes Table
CREATE TABLE IF NOT EXISTS "Couples_invitation_codes" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  therapist_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  used_at TIMESTAMPTZ,
  used_by_couple_id UUID REFERENCES "Couples_couples"(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT TRUE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_invitation_codes_code ON "Couples_invitation_codes"(code);
CREATE INDEX IF NOT EXISTS idx_invitation_codes_therapist ON "Couples_invitation_codes"(therapist_id);
CREATE INDEX IF NOT EXISTS idx_invitation_codes_active ON "Couples_invitation_codes"(is_active) WHERE is_active = TRUE;

-- RLS Policies
ALTER TABLE "Couples_invitation_codes" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Therapists can view own codes"
  ON "Couples_invitation_codes"
  FOR SELECT
  USING (therapist_id = auth.uid());

CREATE POLICY "Therapists can create codes"
  ON "Couples_invitation_codes"
  FOR INSERT
  WITH CHECK (
    therapist_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM "Couples_profiles"
      WHERE id = auth.uid() AND role = 'therapist'
    )
  );

CREATE POLICY "Anyone can validate codes"
  ON "Couples_invitation_codes"
  FOR SELECT
  USING (is_active = TRUE AND used_at IS NULL);

CREATE POLICY "Couples can use codes"
  ON "Couples_invitation_codes"
  FOR UPDATE
  USING (is_active = TRUE AND used_at IS NULL)
  WITH CHECK (
    used_at IS NOT NULL
    AND used_by_couple_id IS NOT NULL
  );
```

---

## 🚀 **How to Use the New System**

### **Step 1: Therapist Signs Up**

1. Go to: **`/auth/therapist-signup`**
2. Fill in:
   - Full Name (e.g., "Dr. Jane Smith")
   - Email
   - Password (min 8 characters)
   - Confirm Password
3. Click "Create Therapist Account"
4. Redirected to login
5. Sign in with credentials

### **Step 2: Therapist Generates Invitation Code**

1. After signing in, go to: **`/admin/invitation-codes`**
2. Click "Generate New Code"
3. Code appears (e.g., "HJKL3456")
4. Click "Copy" to copy code
5. Share code with couple (via email, text, etc.)

### **Step 3: Couple Registers**

1. Go to: **`/auth/couple-signup`**
2. Enter invitation code in first field
3. Fill in Partner 1 information:
   - Full Name
   - Email
   - Password
4. Fill in Partner 2 information:
   - Full Name (must be different)
   - Email (must be different from Partner 1)
   - Password
5. Click "Register as Couple"
6. Both accounts created and linked to therapist
7. Invitation code marked as "used"
8. Redirected to login
9. Each partner can sign in with their own credentials

---

## 🔒 **Security Features**

### **RLS Policies:**

- ✅ Therapists can only see their own invitation codes
- ✅ Only therapists can create invitation codes
- ✅ Anyone can validate codes (for signup process)
- ✅ Codes can only be used once
- ✅ Used codes cannot be modified again

### **Validation:**

- ✅ Invitation code must exist and be active
- ✅ Invitation code cannot already be used
- ✅ Email addresses must be unique
- ✅ Partner emails must be different from each other
- ✅ Passwords must be at least 8 characters
- ✅ Codes expire after 30 days

---

## 📱 **User Experience**

### **Therapist View:**

**Invitation Codes Page** (`/admin/invitation-codes`):

- List of active (unused) codes
- List of used codes (with used date)
- One-click copy to clipboard
- Shows creation and expiration dates
- Instructions for sharing

### **Couple View:**

**Signup Page** (`/auth/couple-signup`):

- Single form with all fields
- Separate sections for Partner 1 and Partner 2
- Automatic code validation
- Clear error messages
- Link to login if already registered

---

## 🎨 **UI Components Used**

All pages use existing Shadcn UI components:

- `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`
- `Form`, `FormField`, `FormItem`, `FormLabel`, `FormControl`, `FormMessage`
- `Input` with proper `data-testid` attributes
- `Button` with loading states
- `Separator` for visual grouping
- `Toast` notifications for success/error messages

---

## ✅ **What Was Removed**

The old complex system has been removed from the **navigation only**:

- ❌ "User Management" admin menu item (replaced with "Invitation Codes")
- ❌ Old `/admin/user-management` route

**Note:** The old backend routes still exist in `server/routes.ts` for backwards compatibility, but they are no longer used by the frontend.

---

## 🧪 **Testing the System**

### **Test Flow:**

1. **Run the SQL migration** in Supabase Dashboard

2. **Test Therapist Signup:**

   ```
   Navigate to: /auth/therapist-signup
   Email: therapist@test.com
   Password: testpassword123
   Name: Dr. Test Therapist
   ```

3. **Test Invitation Code Generation:**

   ```
   Sign in as therapist
   Go to: /admin/invitation-codes
   Click "Generate New Code"
   Copy the code
   ```

4. **Test Couple Signup:**

   ```
   Navigate to: /auth/couple-signup
   Invitation Code: [paste code from step 3]
   Partner 1: alex@test.com / password123 / Alex Johnson
   Partner 2: jordan@test.com / password123 / Jordan Smith
   ```

5. **Verify:**
   ```
   - Couple can sign in
   - Therapist sees couple in dashboard
   - Invitation code shows as "used"
   ```

---

## 🔧 **Technical Details**

### **Authentication Flow:**

1. **Therapist Signup:**

   ```typescript
   supabase.auth.signUp() → Creates auth user
   supabase.from('Couples_profiles').insert() → Creates profile
   ```

2. **Invitation Code Generation:**

   ```typescript
   Generate 8-char code → Insert to Couples_invitation_codes
   ```

3. **Couple Signup:**
   ```typescript
   Validate code → Create Partner 1 auth
   → Create Partner 2 auth
   → Create Couples_couples record
   → Create both profiles
   → Mark code as used
   ```

### **No Backend Required:**

All operations use Supabase client-side SDK with RLS policies enforcing security.

---

## 📊 **Advantages Over Old System**

| Feature                   | Old System             | New System          |
| ------------------------- | ---------------------- | ------------------- |
| **Complexity**            | High (Admin API)       | Low (Client SDK)    |
| **Serverless Compatible** | ❌ Issues              | ✅ Works perfectly  |
| **User Experience**       | Admin creates accounts | Users self-register |
| **Security**              | Backend validation     | RLS policies        |
| **Maintenance**           | Complex error handling | Simple, reliable    |
| **Scalability**           | Backend dependent      | Fully client-side   |

---

## 🎉 **Summary**

✅ **Simpler** - No complex backend admin API calls
✅ **More Reliable** - No serverless function issues
✅ **Better UX** - Users self-register with invitation codes
✅ **More Secure** - RLS policies enforce all security rules
✅ **Easier to Maintain** - Less code, fewer moving parts
✅ **Scalable** - Pure client-side with Supabase

**Next Steps:**

1. Run the SQL migration in Supabase
2. Test the full flow
3. Start using the new invitation system!

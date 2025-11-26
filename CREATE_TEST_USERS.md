# Create Test Users for TADI Platform

Follow these steps to set up three test users for testing the Therapist-Assisted Digital Intervention platform.

## Step 1: Create Auth Users in Supabase Dashboard

1. **Open your Supabase project:**

   - Go to: https://supabase.com/dashboard/project/froxodstewdswllgokmu

2. **Navigate to Authentication:**

   - Click **"Authentication"** in the left sidebar
   - Click **"Users"** tab

3. **Create User 1 - Therapist:**

   - Click **"Add user"** button (top right, green button with "Invite")
   - Select **"Create new user"**
   - Email: `therapist@example.com`
   - Password: `password123`
   - ✅ Check **"Auto Confirm User"** (important!)
   - Click **"Create user"**

4. **Create User 2 - Partner 1:**

   - Click **"Add user"** button again
   - Select **"Create new user"**
   - Email: `mcally@example.com`
   - Password: `password123`
   - ✅ Check **"Auto Confirm User"** (important!)
   - Click **"Create user"**

5. **Create User 3 - Partner 2:**
   - Click **"Add user"** button again
   - Select **"Create new user"**
   - Email: `ccally@example.com`
   - Password: `password123`
   - ✅ Check **"Auto Confirm User"** (important!)
   - Click **"Create user"**

## Step 2: Run Setup SQL Script

1. **Navigate to SQL Editor:**

   - Click **"SQL Editor"** in the left sidebar
   - Click **"New query"**

2. **Copy and paste the contents of `supabase-test-users-setup.sql`:**

   - Open the file `supabase-test-users-setup.sql` in this project
   - Copy the entire contents
   - Paste into the SQL Editor

3. **Run the script:**

   - Click **"Run"** button (or press Ctrl/Cmd + Enter)
   - Wait for completion - you should see success messages in the Results panel

4. **Verify success:**
   - You should see messages like:
     ```
     Found all users:
     Therapist ID: [uuid]
     MCally ID: [uuid]
     CCally ID: [uuid]
     Created therapist profile
     Created couple
     TEST USERS SETUP COMPLETE!
     ```

## Step 3: Test Login

Now you can log into your application with these credentials:

### Therapist Account (Admin App)

- **Email:** `therapist@example.com`
- **Password:** `password123`
- **Access:** Admin dashboard, can view all couples, add comments

### Partner 1 (Client App)

- **Email:** `mcally@example.com`
- **Password:** `password123`
- **Role:** Partner 1 of "The Cally Couple"

### Partner 2 (Client App)

- **Email:** `ccally@example.com`
- **Password:** `password123`
- **Role:** Partner 2 of "The Cally Couple"

## What Gets Set Up Automatically

The SQL script automatically creates:

✅ **User Profiles** - All three users with appropriate roles
✅ **Couple Record** - Morgan and Cameron paired together
✅ **Therapist Assignment** - Dr. Sarah Thompson assigned to the couple
✅ **Join Code** - `CALLY01` (for testing the join flow)
✅ **Sample Data:**

- Love language profiles for both partners
- One gratitude log entry
- One shared goal

## Troubleshooting

### "User not found" error when running SQL script

- Make sure you completed Step 1 and created all three users in the Supabase Dashboard
- Double-check the email addresses are exactly: `therapist@example.com`, `mcally@example.com`, `ccally@example.com`
- Make sure you clicked **"Auto Confirm User"** for each user

### Can't log in after setup

- Verify the password is exactly: `password123`
- Check that the users are confirmed (in Dashboard > Authentication > Users, the email_confirmed_at column should have a timestamp)

### Therapist can't see the couple

- Verify the therapist profile has `role = 'therapist'` in the Couples_profiles table
- Check that the couple record has the therapist_id set correctly

## Next Steps

After creating these test users, you can:

1. **Test the client app** - Log in as mcally or ccally to:

   - Complete the Love Language Quiz
   - Submit weekly check-ins (private to each partner)
   - Add gratitude log entries
   - Manage shared goals
   - Create rituals
   - Start Hold Me Tight conversations

2. **Test the admin app** - Log in as therapist to:

   - View the couple on your roster
   - Compare weekly check-ins side-by-side
   - Review shared activities
   - Add contextual comments

3. **Test the secure pairing flow** - Create a new user and have them join using the code `CALLY01`

---

**Ready to start testing!** 🚀

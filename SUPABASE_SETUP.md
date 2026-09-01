# 📘 Supabase Setup Guide for Mero Attendance

## Step 1: Create Supabase Account & Project

### 1.1 Sign Up for Supabase

1. Go to **https://supabase.com**
2. Click **"Start your project"** or **"Sign In"**
3. Sign up using:
   - GitHub account (recommended)
   - Google account
   - Email/password

### 1.2 Create New Project

1. Click **"New Project"** button
2. Fill in the details:
   - **Name**: `mero-attendance` (or any name you prefer)
   - **Database Password**: Create a strong password (SAVE THIS!)
   - **Region**: Choose closest to your location
   - **Pricing Plan**: Free tier is sufficient to start
3. Click **"Create new project"**
4. Wait 2-3 minutes for setup to complete

---

## Step 2: Get Your API Credentials

### 2.1 Navigate to API Settings

1. On your project dashboard, click the **⚙️ Settings** icon (bottom left)
2. Click **"API"** in the left sidebar

### 2.2 Copy Your Credentials

You'll see a page with these values:

```
Project URL:
https://xxxxxxxxxxxxxxxxx.supabase.co

API Keys:
anon public: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
service_role: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (keep secret!)
```

**Important:**

- Copy the **Project URL**
- Copy the **`anon` `public`** key (the first one)
- **DO NOT** copy the `service_role` key (it's too powerful for client-side)

---

## Step 3: Set Up Your Database Schema

### 3.1 Open SQL Editor

1. In your Supabase dashboard, click **"SQL Editor"** (database icon on left)
2. Click **"New Query"**

### 3.2 Run the Schema Script

1. Open the file `supabase/schema.sql` from your project
2. Copy **ALL** the contents
3. Paste into the SQL Editor
4. Click **"Run"** (or press Ctrl+Enter)
5. Wait for success message: "Success. No rows returned"

This will create all tables: users, companies, departments, attendance_records, etc.

### 3.3 (Optional) Seed Sample Data

1. Create another new query
2. Open `supabase/seed.sql`
3. Copy and paste contents
4. Click **"Run"**

This adds demo employees and sample data for testing.

---

## Step 4: Configure Your .env.local File

### 4.1 Create Environment File

1. In your project root, create a file named `.env.local`
2. Copy this template:

```env
# SUPABASE CONFIGURATION
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# EMAIL (Optional - for notifications)
RESEND_API_KEY=re_your_resend_api_key_here
```

### 4.2 Fill in Your Values

Replace:

- `https://your-project-ref.supabase.co` → Your **Project URL** from Step 2
- `your-anon-key-here` → Your **anon public** key from Step 2

**Example:**

```env
NEXT_PUBLIC_SUPABASE_URL=https://abcdefghijklmno.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ubyIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNjk1MTI0MTIwLCJleHAiOjIwMTA3MDAxMjB9.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

## Step 5: Verify Setup

### 5.1 Test Database Connection

1. Open your terminal in the project folder
2. Run:
   ```bash
   npm run dev
   ```
3. Open http://localhost:3000
4. Try to sign up / log in
5. If it works, you're connected! ✅

### 5.2 Check Database

Go back to Supabase dashboard:

1. Click **"Table Editor"** (table icon on left)
2. You should see your tables: `users`, `companies`, `attendance_records`, etc.
3. Click on `users` table to see registered users

---

## Step 6: (Optional) Set Up Email Notifications

### 6.1 Sign Up for Resend

1. Go to **https://resend.com**
2. Sign up for free account (100 emails/day free)
3. Verify your email

### 6.2 Get API Key

1. Go to **API Keys** section
2. Click **"Create API Key"**
3. Name it: `mero-attendance-prod`
4. Copy the key (starts with `re_`)

### 6.3 Add to .env.local

```env
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx
```

### 6.4 Verify Domain (For Production)

For production emails:

1. Go to **Domains** section in Resend
2. Add your domain (e.g., `mycompany.com`)
3. Add DNS records as shown
4. Wait for verification (5-30 minutes)

**For Development:**

- You can send to your own email without domain verification
- Update `from` address in `src/lib/services/email.ts`

---

## Common Issues & Solutions

### ❌ "Invalid API key" Error

- **Solution**: Double-check you copied the **anon** key, not service_role
- Make sure there are no extra spaces in `.env.local`

### ❌ "Could not connect to database"

- **Solution**: Check your Project URL is correct
- Make sure you're online
- Verify project is not paused (free tier pauses after inactivity)

### ❌ "Row Level Security (RLS) policy violation"

- **Solution**: Make sure you ran the ENTIRE `schema.sql` file
- RLS policies are at the bottom of the file

### ❌ Changes to .env.local not working

- **Solution**: Restart your dev server (Ctrl+C, then `npm run dev`)
- Next.js caches environment variables

---

## Security Checklist ✅

- [ ] `.env.local` is in your `.gitignore` (should be already)
- [ ] Never commit API keys to GitHub
- [ ] Only use `anon` key in client-side code
- [ ] Keep your database password safe
- [ ] Enable 2FA on your Supabase account

---

## Next Steps

Once Supabase is connected:

1. ✅ Replace localStorage with Supabase database calls
2. ✅ Implement real authentication
3. ✅ Test all features with persistent data
4. ✅ Deploy to Vercel (Vercel auto-detects environment variables)

---

## Need Help?

- **Supabase Docs**: https://supabase.com/docs
- **Support**: https://supabase.com/dashboard/support
- **Discord Community**: https://discord.supabase.com

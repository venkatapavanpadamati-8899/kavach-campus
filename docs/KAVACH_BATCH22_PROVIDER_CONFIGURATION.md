# KAVACH CAMPUS — BATCH 22 EXTERNAL PROVIDER CONFIGURATION MANUAL

**Project:** Kavach Campus — Safety in One Tap  
**Workspace:** `D:\Kavach Campus`  
**Execution Timestamp:** October 18, 2026  
**Status:** 🟡 **DEVELOPMENT COMPLETE — PRODUCTION VERIFICATION PENDING**

---

## 1. Overview

This manual provides exact, copy-pasteable configuration parameters for enabling external integrations in Kavach Campus:
1. **Google OAuth (Sign-in with Google)**
2. **Twilio SMS (Emergency Alerts & Escalations)**
3. **Firebase Cloud Messaging (Mobile & Web Push)**
4. **Google Gemini AI (Incident Classification & Severity Analysis)**

> 🔒 **Security Notice:** Never paste actual API keys, private keys, or passwords into chat or commit them to source control. Configure them exclusively in your hosting provider's dashboard (e.g., Vercel Project Settings > Environment Variables) or in local `.env.local`.

---

## 2. Google OAuth Configuration Guide

### Step 2.1: Google Cloud Console Setup
1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Select your Google Cloud Project (or create a new one: *Kavach Campus*).
3. Navigate to **APIs & Services > Credentials**.
4. Click **Create Credentials > OAuth Client ID**.
5. Application type: **Web application**.
6. Set **Authorized JavaScript origins**:
   - For local development: `http://localhost:3000`
   - For production: `https://your-custom-domain.com` (replace with your production URL)
7. Set **Authorized redirect URIs**:
   - **Crucial:** Enter the exact Supabase OAuth callback URL:
     ```text
     https://polbnvszmvblwenfnqll.supabase.co/auth/v1/callback
     ```
8. Click **Create**. Copy the **Client ID** and **Client Secret**.

### Step 2.2: Supabase Authentication Setup
1. Open your [Supabase Project Dashboard](https://supabase.com/dashboard/project/polbnvszmvblwenfnqll/auth/providers).
2. Go to **Authentication > Providers > Google**.
3. Toggle Google to **Enabled**.
4. Paste the **Client ID** and **Client Secret** obtained from Google Cloud Console.
5. In **Authentication > URL Configuration**:
   - **Site URL:** `http://localhost:3000` (or your production URL)
   - **Redirect URLs:** Add:
     - `http://localhost:3000/api/auth/callback`
     - `https://your-custom-domain.com/api/auth/callback`
6. Click **Save**.

---

## 3. Twilio SMS Configuration Guide (Emergency Alerts)

Kavach Campus utilizes Twilio for high-priority emergency SMS alerts when a student activates SOS or when an assigned security officer does not acknowledge an incident within the escalation window.

### Required Environment Variables:
```bash
# Emergency SMS Dispatch (Twilio)
TWILIO_ACCOUNT_SID=ACXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+1XXXXXXXXXX

# Enable Real External Dispatches (Set to true in production)
ENABLE_REAL_NOTIFICATIONS=true
```

### Verification in Local Sandbox:
- In development (`ENABLE_REAL_NOTIFICATIONS` omitted or set to `false`), the Twilio adapter logs:
  `[NotificationDispatch] provider=TWILIO status=DISABLED recipient=+91 *** 3210`
- To test with an actual phone number, enter an authorized test recipient phone in your Twilio Verified Caller IDs list and set `ENABLE_REAL_NOTIFICATIONS=true`.

---

## 4. Firebase Cloud Messaging (FCM) Configuration Guide

Kavach Campus uses FCM for real-time mobile and browser push alerts to campus security teams.

### Required Environment Variables:
```bash
# Firebase Cloud Messaging
FIREBASE_PROJECT_ID=kavach-campus-fcm
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@kavach-campus-fcm.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQD...\n-----END PRIVATE KEY-----\n"
```

### Steps to Generate:
1. Open [Firebase Console](https://console.firebase.google.com/).
2. Select your project > **Project Settings > Service accounts**.
3. Click **Generate new private key**.
4. Copy the values of `project_id`, `client_email`, and `private_key` into your environment variables.

---

## 5. Google Gemini AI Configuration Guide

Kavach Campus integrates Gemini 2.5 Pro / Flash for automatic severity classification and routing of student complaint narratives.

### Required Environment Variable:
```bash
# Gemini AI
GEMINI_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

### Safety & Fallback Architecture:
- If `GEMINI_API_KEY` is absent or times out, the system automatically falls back to the deterministic local rules engine in `src/lib/ai/fallback-classifier.ts`.
- **SOS incidents never depend on AI:** Emergency SOS requests persist immediately to PostgreSQL with `severity: 'CRITICAL'` without waiting for external API calls.

---

## 6. Complete Production `.env` Template

```bash
# =================================================================
# KAVACH CAMPUS — PRODUCTION ENVIRONMENT CONFIGURATION
# =================================================================

# Supabase Public & Service Role
NEXT_PUBLIC_SUPABASE_URL=https://polbnvszmvblwenfnqll.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...

# Next.js Site URL
NEXT_PUBLIC_SITE_URL=https://your-custom-domain.com

# Institutional AI Integration
GEMINI_API_KEY=AIzaSy...

# Emergency SMS Gateway (Twilio)
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1...
ENABLE_REAL_NOTIFICATIONS=true

# Mobile & Web Push (Firebase)
FIREBASE_PROJECT_ID=...
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY="..."

# Campus Safety Hotlines & Authorities
SUPER_ADMIN_EMAILS="security-chief@campus.edu,dean-student-affairs@campus.edu"
CAMPUS_HELPLINE_NUMBERS="112,108,+91-XXX-XXXXXXX"
```

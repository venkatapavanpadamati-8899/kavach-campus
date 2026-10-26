# KAVACH CAMPUS — PRODUCTION ENVIRONMENT VARIABLE TEMPLATE

> **SECURITY NOTICE:**  
> This file contains variable names, descriptions, and placeholder formats ONLY.  
> NEVER commit actual production keys, tokens, or passwords to Git.  
> In production environments (e.g., Vercel, AWS, or local .env.local), supply real values securely.

---

## 1. MANDATORY CORE INFRASTRUCTURE (Required for MVP Operation)

```env
# -----------------------------------------------------------------------------
# SUPABASE DATABASE & AUTHENTICATION (Cloud Project)
# -----------------------------------------------------------------------------
# The public HTTPS URL of your Supabase project (from Project Settings -> API)
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co

# The public anonymous client API key (Safe for client browsers)
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.your_anon_key_here

# The secret service-role API key (SERVER-SIDE ONLY - NEVER expose to client)
# Used for administrative operations, automated escalations, and system actions
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.your_service_role_key_here

# -----------------------------------------------------------------------------
# SITE & AUTHENTICATION REDIRECTS
# -----------------------------------------------------------------------------
# The canonical public production URL of your application (HTTPS required in prod)
# Example: https://kavach.college.edu or https://kavach-campus.vercel.app
NEXT_PUBLIC_SITE_URL=https://kavach.college.edu

# -----------------------------------------------------------------------------
# AUTOMATED CRON SECURITY SECRET
# -----------------------------------------------------------------------------
# High-entropy random secret (min 32 characters) used to authorize Vercel / server cron jobs
# Endpoints: /api/cron/safe-walk-timeout, /api/cron/escalate
CRON_SECRET=generate_a_random_32_plus_char_secret_for_cron_calls
```

---

## 2. ARTIFICIAL INTELLIGENCE & SAFETY CLASSIFIER

```env
# -----------------------------------------------------------------------------
# GOOGLE GEMINI AI (Campus Incident Severity Classifier)
# -----------------------------------------------------------------------------
# Google AI Studio API key used by src/lib/ai.ts
# If omitted or invalid, the system automatically falls back to the deterministic
# multi-lingual (English, Telugu, Hindi) safety rules engine.
GEMINI_API_KEY=AIzaSyYourGeminiApiKeyHere
```

---

## 3. PRODUCTION PHONE & SMS GATEWAY (Optional for Real Telecom SMS)

```env
# -----------------------------------------------------------------------------
# REAL SMS DISPATCH (Twilio or Indian DLT Gateway)
# -----------------------------------------------------------------------------
# Set to 'true' only when you have funded Twilio/SMS credentials and want real SMS sent
ENABLE_REAL_NOTIFICATIONS=false

# Twilio Account SID (from Twilio Console)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Twilio Auth Token (from Twilio Console)
TWILIO_AUTH_TOKEN=your_twilio_auth_token_here

# Registered Twilio sender phone number in E.164 format (e.g. +1234567890 or +91...)
TWILIO_PHONE_NUMBER=+1234567890

# -----------------------------------------------------------------------------
# DEMO OTP SIMULATION (Strictly for Development & MVP Testing)
# -----------------------------------------------------------------------------
# In production builds, Demo OTP is automatically disabled in code.
# In development, setting this to 'false' disables simulated demo SMS.
ENABLE_DEMO_OTP=false
ENABLE_DEMO_SMS=false
```

---

## 4. EMAIL & PUSH NOTIFICATIONS (Optional)

```env
# -----------------------------------------------------------------------------
# SMTP EMAIL DISPATCH (Nodemailer / Institutional Mail Server)
# -----------------------------------------------------------------------------
# Institutional mail server host
SMTP_HOST=smtp.college.edu
SMTP_PORT=587
SMTP_USER=safety-alerts@college.edu
SMTP_PASS=your_smtp_app_password
SMTP_FROM=Kavach Campus Safety <safety-alerts@college.edu>

# -----------------------------------------------------------------------------
# FIREBASE CLOUD MESSAGING (For Native Android/iOS Push Notifications)
# -----------------------------------------------------------------------------
FCM_PROJECT_ID=kavach-campus-push
FCM_CLIENT_EMAIL=firebase-adminsdk@kavach-campus-push.iam.gserviceaccount.com
FCM_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASC...\n-----END PRIVATE KEY-----\n"

# -----------------------------------------------------------------------------
# GOOGLE OAUTH (Institutional Google Workspace Sign-In)
# -----------------------------------------------------------------------------
GOOGLE_CLIENT_ID=your_google_oauth_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret
```

---

## 5. HOSTING PLATFORM CHECKLIST

| Variable Name | Environment Scope | Secret Level | Required for Basic Launch? |
| :--- | :---: | :---: | :---: |
| `NEXT_PUBLIC_SUPABASE_URL` | Public / Client | Low | **YES** |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public / Client | Low | **YES** |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side only | **CRITICAL** | **YES** |
| `NEXT_PUBLIC_SITE_URL` | Public / Client | Low | **YES** |
| `CRON_SECRET` | Server-side only | **HIGH** | **YES** |
| `GEMINI_API_KEY` | Server-side only | **HIGH** | Optional (Fallback Active) |
| `ENABLE_REAL_NOTIFICATIONS` | Server-side only | Low | Optional (Defaults to false) |
| `TWILIO_*` | Server-side only | **HIGH** | Optional (Requires Account) |
| `SMTP_*` | Server-side only | **HIGH** | Optional (Institutional Mail) |

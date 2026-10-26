# KAVACH CAMPUS — FREE-TIER LIMITATIONS & QUOTA MANAGEMENT

**Project:** Kavach Campus — Safety in One Tap  
**Workspace:** `D:\Kavach Campus`  
**Execution Timestamp:** October 19, 2026  
**Auditor:** Antigravity Autonomous Security Subsystem  

---

## 1. Provider Quotas and Free-Tier Ceilings

While Kavach Campus is 100% free for students, external infrastructure providers impose operational limits on their free tiers. This document catalogs all known ceilings and specifies how the application behaves when any quota is approached or reached.

```text
================================================================================
                    FREE-TIER SERVICE QUOTAS & SYSTEM BEHAVIOR
================================================================================
1. Supabase Free Plan Database:    500 MB PostgreSQL Storage
                                   50,000 Monthly Active Users (MAU)
                                   1 GB File Storage (Buckets)
                                   2 GB Bandwidth / Month
                                   30 Emails / Hour (Built-in Auth SMTP)
                                   500 Concurrent Realtime Connections

2. Vercel Hobby Free Tier:         100 GB Bandwidth / Month
                                   100,000 Serverless Function Invocations / Day
                                   10s Maximum Serverless Execution Timeout
                                   Non-commercial / Educational eligibility

3. Google Gemini AI Free Tier:     15 Requests Per Minute (RPM)
                                   1,000,000 Tokens Per Minute (TPM)
                                   1,500 Requests Per Day (RPD)

4. Firebase Cloud Messaging:       Free Unlimited Push Notifications
                                   Standard Google Cloud terms

5. Demo SMS OTP Service:           100% Free Local Simulated SMS (₹0 cost)
                                   NOT DELIVERED TO REAL MOBILE PHONES
                                   Expires in 5 minutes (300 seconds)
                                   5-attempt lockout; 60s resend cooldown
                                   In-memory storage in local development

6. Twilio SMS (Third-Party):       PAID (Trial credits only / ₹0.50 - ₹2.00 per SMS)
                                   KEPT DISABLED BY DEFAULT (Zero unexpected bills)
================================================================================
```

---

## 2. Quota Exhaustion Behaviors & Mitigations

### A. Supabase Database Storage (500 MB Ceiling)
- **Current Footprint:** Less than 15 MB across all tables, indexes, and triggers.
- **Exhaustion Behavior:** Supabase marks the database read-only if 500 MB is exceeded.
- **Application Mitigation:** Evidence upload routes restrict photo uploads to max 25 MB and purge resolved incident attachments older than 180 days.

### B. Supabase Built-in Auth Email (30 Emails / Hour)
- **Exhaustion Behavior:** If more than 30 new students attempt registration within a single hour using the default Supabase SMTP, Supabase queues or rejects additional verification emails.
- **Application Mitigation:**
  - In local development, Demo OTP (`123456`) allows unlimited testing without sending emails.
  - For institutional deployments, administrators can link a free Brevo (Sendinblue) account (300 free emails/day) or Resend free tier (100 free emails/day) in the Supabase Dashboard under `Authentication -> Email Settings -> Custom SMTP`.

### C. Gemini AI Rate Limits (15 RPM Ceiling)
- **Exhaustion Behavior:** Gemini API returns HTTP 429 (`RESOURCE_EXHAUSTED`).
- **Application Mitigation:**
  - Emergency SOS creation **never calls Gemini AI**; it persists directly to PostgreSQL in sub-50ms.
  - Incident categorization calls to Gemini automatically catch HTTP 429 and immediately fall back to local keyword classification (`severity-classification.ts`) with zero delay.

### D. Demo SMS OTP Simulation Limits & Boundaries
- **Simulated Only:** Demo SMS OTP does NOT deliver messages to real mobile phones or carrier networks. It is a local, simulated workflow for zero-cost testing.
- **Display Location:** In development mode, the simulated SMS is rendered directly in the **Demo SMS Inbox** on `/verify-otp` and printed to the server terminal.
- **5-Minute Expiry:** Demo OTPs expire exactly 300 seconds (5 minutes) after creation. Expired OTPs are unconditionally rejected.
- **Brute-Force & Attempt Limits:** If a user enters an incorrect OTP 5 times, the code is invalidated, and the user must request a new OTP.
- **Rate Limiting:** Users can request at most 3 demo SMS codes per 10 minutes, with a 60-second cooldown between resends.
- **Production Gate:** Demo SMS endpoints are strictly disabled in production environments (`NODE_ENV=production`).

### E. Twilio Telecommunication SMS Bills
- **Mitigation:**
  - `ENABLE_REAL_NOTIFICATIONS` is set to `false` by default.
  - The notification dispatcher outputs `[NotificationDispatch] provider=TWILIO status=DISABLED` and does not attempt network calls.
  - No SMS fees can be incurred accidentally.

---

## 3. Cost-Safety Recommendations for University Administrators

1. **Keep In-App Alerts Primary:** Use database-backed real-time feeds and Web Notifications for campus security staff instead of paid telecom SMS.
2. **Configure Custom Free SMTP:** Connect a free tier SMTP provider (e.g. Resend free 3,000 emails/mo) in the Supabase Dashboard if initial campus student onboarding exceeds 30 signups/hour.
3. **Monitor Database Metrics:** Check the Supabase Dashboard weekly during peak campus onboarding to ensure database storage remains well under 250 MB (50% of free quota).

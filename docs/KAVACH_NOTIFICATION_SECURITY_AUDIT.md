# Kavach Campus — Notification Security & Delivery Audit Report

**Date:** 2026-10-19  
**System:** Kavach Campus Emergency Safety Platform  
**Scope:** Multi-Channel Notification Architecture, Adapters, Retry Policies, and Delivery Safety  
**Policy:** Free Essential Safety (Zero Student Fees, Real External Providers Disabled Unless Explicitly Configured)

---

## 1. Notification Architecture Overview

Kavach Campus uses a unified, decoupled notification delivery framework located in `src/lib/notifications/`:
- **In-App Notifications:** Database-backed notifications in `public.notifications` table with live query capabilities.
- **Simulated Demo SMS:** `src/lib/demo-sms.ts` providing 6-digit CSPRNG OTP delivery for development and demonstration at ₹0 cost.
- **External SMS Adapter (Twilio):** Dormant by default. Requires both explicit configuration of credentials and `ENABLE_REAL_NOTIFICATIONS=true`.
- **Push Notification Adapter (FCM):** Dormant by default. Requires Google Firebase Service Account JSON credentials.
- **Email Notification Adapter (SMTP):** Institutional email dispatch with idempotency key tracking.

---

## 2. Provider Adapter Security Matrix

| Provider / Channel | Default Mode | Configuration Prerequisite | Fallback Behavior | Classification |
|---|:---:|---|---|:---:|
| **In-App Alerts (`public.notifications`)** | **ACTIVE** | Supabase database connection | Persists alerts directly in user inbox | **PASS** |
| **Demo SMS Simulation** | **ACTIVE** | `isDemoSmsEnabled() = true` | Dispatches simulated OTP to session storage | **PASS** |
| **External SMS (Twilio)** | **DISABLED** | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `ENABLE_REAL_NOTIFICATIONS=true` | Returns `NOT_CONFIGURED` or `DISABLED` without throwing | **PASS** (Safe default) |
| **Push Notifications (FCM)** | **DISABLED** | `FIREBASE_PROJECT_ID`, `FIREBASE_SERVICE_ACCOUNT_KEY` | Returns `NOT_CONFIGURED` without throwing | **PASS** (Safe default) |
| **Institutional Email (SMTP)** | **SIMULATED** | `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` | Logs sanitized recipient in development mode | **PASS** |

---

## 3. Reliability, Idempotency & Bounded Retry Rules

1. **Non-Throwing Guarantee:**
   - External notification dispatches are wrapped in defensive try/catch blocks. Network failures, HTTP 4xx/5xx provider responses, or invalid phone numbers return status `FAILED` or `NOT_CONFIGURED` without crashing the parent emergency SOS API route.
2. **Idempotency Keys:**
   - Critical emergency alerts generate a unique idempotency key (e.g. `idem-key-${incidentId}-${recipientId}`). Duplicate dispatches within the same window are suppressed to prevent spamming staff or emergency contacts.
3. **Bounded Retries:**
   - Transient 5xx network errors undergo a maximum of 2 retries with exponential backoff. Non-retryable errors (e.g., HTTP 400 Invalid Phone Number) terminate immediately.
4. **Delivery Status Transparency:**
   - Alert logs explicitly state delivery outcome: `DELIVERED`, `SIMULATED`, `NOT_CONFIGURED`, `DISABLED`, or `FAILED`. The system never misleads users into believing an external SMS was transmitted if the provider was unconfigured.

---

## 4. Test Evidence

From automated Vitest suite `src/__tests__/notification-adapters.test.ts` (15 passing tests):
- Returns `NOT_CONFIGURED` when Twilio credentials are missing.
- Returns `DISABLED` when credentials exist but `ENABLE_REAL_NOTIFICATIONS` is false.
- Handles provider HTTP 400 and network timeouts safely without throwing.
- Returns `NOT_CONFIGURED` when FCM credentials are missing.
- Dispatches combined emergency notifications safely across SMS and Push adapters.
- Masks phone numbers and email addresses in dispatch telemetry.

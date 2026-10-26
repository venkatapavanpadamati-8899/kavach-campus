# KAVACH CAMPUS — MASTER STEP 61: NOTIFICATION DELIVERY AUDIT

**Module Audited:** `src/lib/notifications/` & Incident Dispatch Workflows  
**Timestamp:** 2026-10-11T20:21:00+05:30  
**Overall Verdict:** **PARTIAL / SAFEGUARDS ACTIVE** (In-App DB notifications verified; external SMS/Push disabled by default)

---

## 1. Notification Channels Inventory

Kavach Campus incorporates a multi-tiered alert dispatch architecture designed to notify responders without blocking emergency operations if an external provider fails.

| Channel | Implementation File | Required Configuration | Current Local Status | Actual Delivery Evidence |
| :--- | :--- | :--- | :--- | :--- |
| **In-App DB Notifications** | `src/app/api/incidents/route.ts` & `src/lib/supabase/` | Supabase PostgreSQL Connection | **PASS / ACTIVE** | Successfully creates rows in `notifications` table for assigned responders. |
| **Browser Notification API** | `src/lib/notifications/browser.ts` | HTML5 Browser Permission (`Notification.requestPermission`) | **PASS (Client Code)** | Client-side adapter prompts for user permission; triggers desktop alerts locally. |
| **Twilio SMS** | `src/lib/notifications/index.ts` | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` | **DISABLED (Safe Default)** | Adapter returns `NOT_CONFIGURED` or `DISABLED` when `ENABLE_REAL_NOTIFICATIONS=false`. |
| **Firebase Cloud Messaging (FCM)** | `src/lib/notifications/index.ts` | `FCM_PROJECT_ID`, `FCM_CLIENT_EMAIL`, `FCM_PRIVATE_KEY` | **DISABLED (Safe Default)** | Adapter returns `NOT_CONFIGURED` or `DISABLED` when `ENABLE_REAL_NOTIFICATIONS=false`. |
| **Automated Escalation Cron** | `src/app/api/cron/escalate/route.ts` | `CRON_SECRET` Bearer Token | **PASS (Local Endpoint Probe)** | Escalates overdue incidents and logs actions to `audit_logs` table. |

---

## 2. Channel-by-Channel Technical Audit

### 2.1 In-App Database Notifications
- **How it works:** When an incident or SOS alert is submitted, the server inserts a record into the `notifications` table linking `user_id`, `incident_id`, `title`, and `message`.
- **Isolation:** Responders see only their own notification records via RLS.
- **Delivery Verification:** **Verified in unit tests & schema.** (15/15 adapter tests pass in `notification-adapters.test.ts`).

### 2.2 Twilio SMS Gateway
- **Implementation:** `sendSmsNotification(payload: SmsPayload)` uses standard Node.js `fetch` with Basic Auth against `https://api.twilio.com/2010-04-01/Accounts/{accountSid}/Messages.json`.
- **Fail-Safe Mechanism:** Uses an `AbortController` timeout of 6 seconds. If Twilio returns HTTP 4xx/5xx or times out, the function catches the error and returns `{ success: false, status: 'FAILED' }`. It **never throws**, ensuring incident submission succeeds even if SMS dispatch fails.
- **Safety Gate:** `ENABLE_REAL_NOTIFICATIONS` must be explicitly set to `'true'`. In local and staging environments, it remains `'false'` to prevent unauthorized cellular charges or unsolicited SMS transmissions to non-verified numbers.

### 2.3 Firebase Cloud Messaging (Web Push)
- **Implementation:** `sendPushNotification(payload: PushPayload)`.
- **Status:** Requires Google Cloud Service Account credentials (`FCM_PROJECT_ID`, `FCM_CLIENT_EMAIL`, `FCM_PRIVATE_KEY`). Currently disabled locally.

### 2.4 Staff Assignment & Escalation
- **Timeout Trigger:** Responders assigned to incidents have an acknowledgement window (default 5 minutes).
- **Escalation Cron:** Invocations of `/api/cron/escalate` query incidents where `status = 'ASSIGNED'` and `assigned_at < now() - interval '5 minutes'`.
- **Audit Trail:** Every escalation writes an entry to `audit_logs` recording the incident ID, previous assignee, next assignee, and reason (`ACKNOWLEDGEMENT_TIMEOUT_5M`).

---

## 3. Important Verification Distinctions

> [!WARNING]
> A record in the Supabase `notifications` table confirms that the application created an in-app alert. It **does NOT prove** that an SMS was transmitted across cellular networks or that a Web Push notification arrived on a locked mobile device.

To verify live SMS delivery in production:
1. Valid Twilio account credentials must be populated in the production environment.
2. Verified physical phone numbers must be configured in `trusted_contacts`.
3. `ENABLE_REAL_NOTIFICATIONS=true` must be set in the production dashboard.

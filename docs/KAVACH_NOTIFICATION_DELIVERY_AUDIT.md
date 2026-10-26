# KAVACH CAMPUS — NOTIFICATIONS & MULTI-CHANNEL DELIVERY AUDIT
**Project:** Kavach Campus — “Safety in One Tap”  
**Workspace:** `D:\Kavach Campus`  
**Execution Timestamp:** October 11, 2026  
**Notification Adapter Source:** `src/lib/notifications/`

---

## 1. Notification Architecture & Channels Audit

Kavach Campus defines 4 distinct notification tiers. To maintain strict compliance with the **Free-Only & No-Fabrication** policy, each channel is audited individually:

| Notification Channel | Technical Mechanism | Configuration State | Delivery Verification Status | Real Hardware Receipt Proof |
| :--- | :--- | :--- | :---: | :---: |
| **1. In-App Notifications** | PostgreSQL `notifications` table insert via Supabase client | **ACTIVE (FREE TIER)** | **VERIFIED** | Real database rows inserted with `user_id`, `incident_id`, `title`, `type` |
| **2. Browser Notification API** | W3C HTML5 `window.Notification` API in client browser | **ACTIVE (FREE TIER)** | **VERIFIED (LOCAL)** | Displays system toast if browser permission is granted and tab is open |
| **3. Firebase Web Push (FCM)** | Server-side FCM REST API adapter (`src/lib/notifications/push.ts`) | **NOT CONFIGURED** | **BLOCKED (CONFIG)** | Requires Google Cloud Service Account JSON credentials |
| **4. Cellular SMS (Twilio)** | REST API adapter (`src/lib/notifications/sms.ts`) | **DISABLED (BY DESIGN)** | **FREE POLICY ACTIVE** | Intentionally disabled (`ENABLE_REAL_NOTIFICATIONS=false`) to avoid billing |

---

## 2. Critical Safety & Integrity Principles

### A. The "Database Row != Cellular Delivery" Rule
- A database row in PostgreSQL is **proof of intent**, not proof of cellular reception.
- The system logs delivery status explicitly: `(Delivery: DISABLED_BY_CONFIG)` or `(Delivery: NO_FCM_CREDENTIALS)`.
- It never falsely marks an SMS as "delivered to handset" when no telecom carrier transmitted the packet.

### B. Background Push vs Open Browser Limitations
- **Browser Notification API:** Can only present notifications when the browser application is active and running in memory. If a student closes their laptop or locks their mobile phone screen, HTML5 browser notifications will not ring.
- **Web Push (FCM/ServiceWorker):** Required for true background wake-up on locked mobile devices. When production deployment occurs, configuring Google Firebase Cloud Messaging will provide background delivery.

### C. Sensitive Data Minimization in Previews
- To prevent shoulder-surfing and lock-screen leaks:
  - Emergency alerts state: `"CRITICAL SOS ALERT: Nearest responder please claim Case KC-XXXX"`
  - Full personal history, medical notes, and student phone numbers are **never included** in notification body previews.
  - Responders must authenticate and open the secure incident view to inspect sensitive case records.

---

## 3. Trusted Contact Alerts
- When a student registers emergency contacts (Parent, Local Guardian):
  - In-app notification is recorded.
  - SMS adapter is invoked with student case ID and safe link.
  - In local development / free tier mode, the SMS payload is safely logged to server console without incurring carrier fees.

# KAVACH CAMPUS — BATCH 20 REMAINING BLOCKERS & PRODUCTION READINESS CHECKLIST

**Project:** Kavach Campus — Safety in One Tap  
**Workspace:** `D:\Kavach Campus`  
**Generated:** October 18, 2026  
**Status:** 🟡 **DEVELOPMENT COMPLETE — PRODUCTION VERIFICATION PENDING**

---

## 1. Summary of Remaining Production Blockers

While all local code, automated tests (296/296), database bootstrap simulations, and security evaluations are **100% PASS**, the following items require external institutional action before production deployment can be authorized:

| # | Blocker Item | Category | Required Action | Status |
|:---:|:---|:---:|:---|:---:|
| **B1** | **Remote Production Database Verification** | Security / DB | Institutional administrator must provide a restricted read-only PostgreSQL connection string or execute `supabase/verification/kavach_step121_readonly_preflight.sql` in the Supabase Dashboard SQL Editor on `polbnvszmvblwenfnqll`. | ⛔ **BLOCKED** |
| **B2** | **Production Twilio SMS Provisioning** | Notifications | Configure production `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and `TWILIO_PHONE_NUMBER` in production deployment environment (Vercel/Cloudflare). Set `ENABLE_REAL_NOTIFICATIONS=true`. | ⏳ **PENDING** |
| **B3** | **Production FCM Push Provisioning** | Notifications | Configure `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, and `FIREBASE_PRIVATE_KEY` for browser/mobile push alert broadcasts. | ⏳ **PENDING** |
| **B4** | **Production Gemini AI Key** | AI Service | Configure institutional `GEMINI_API_KEY` for automated incident severity classification and routing. | ⏳ **PENDING** |
| **B5** | **Commit Migration Renaming & Quarantining** | DB Schema | Obtain formal team sign-off to rename the 8 canonical migration files in `supabase/migrations/` and move the 4 quarantined scripts into `supabase/migrations/archive/`. | ⏳ **READY FOR SIGNOFF** |

---

## 2. Remote Production Database Verification Protocol (Blocker B1)

### Why is this Blocked?
Per Master Audit safety guidelines:
1. Production database `polbnvszmvblwenfnqll` cannot be probed using write-privileged `SUPABASE_SERVICE_ROLE_KEY` to prevent accidental DDL or data mutations.
2. Direct connection string with a read-only role (`kavach_auditor`) is not yet provisioned.

### Remediation Protocol:
Run the non-destructive diagnostic script in the remote Supabase SQL Editor:
```sql
-- File: supabase/verification/kavach_step121_readonly_preflight.sql
-- 1. Verify schema migrations history
SELECT version, inserted_at FROM supabase_migrations.schema_migrations ORDER BY version;

-- 2. Verify table RLS status
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';

-- 3. Verify active storage buckets
SELECT id, name, public FROM storage.buckets WHERE id IN ('kavach-evidence', 'kavach-id-cards');
```

---

## 3. Production Environment Variables Checklist (Blockers B2, B3, B4)

To take the application live, configure the following secrets in the hosting provider dashboard (e.g., Vercel Project Settings > Environment Variables):

```bash
# Core Supabase (Required)
NEXT_PUBLIC_SUPABASE_URL=https://polbnvszmvblwenfnqll.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<production-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<production-service-role-key>

# Institutional AI Integration
GEMINI_API_KEY=<production-gemini-api-key>

# Emergency SMS Gateway (Twilio)
TWILIO_ACCOUNT_SID=<production-twilio-sid>
TWILIO_AUTH_TOKEN=<production-twilio-token>
TWILIO_PHONE_NUMBER=<production-twilio-phone>
ENABLE_REAL_NOTIFICATIONS=true

# Mobile & Web Push (Firebase Cloud Messaging)
FIREBASE_PROJECT_ID=<production-firebase-project>
FIREBASE_CLIENT_EMAIL=<production-firebase-client-email>
FIREBASE_PRIVATE_KEY="<production-firebase-private-key>"

# Institutional Safety Officers (Auto-assignment)
SUPER_ADMIN_EMAILS="security-chief@campus.edu,dean-student-affairs@campus.edu"
CAMPUS_HELPLINE_NUMBERS="112,108,+91-XXX-XXXXXXX"
```

---

## 4. Rollback and Disaster Recovery Plan

If an unexpected regression occurs in production after release:

1. **Database Rollback:**
   - Execute `supabase/verification/kavach_step115_rollback_candidate.sql` to restore previous policy states without data loss.
2. **Storage Rollback:**
   - Supabase Dashboard > Storage > Buckets > Toggle `kavach-id-cards` / `kavach-evidence` policies.
3. **Frontend Rollback:**
   - In Vercel or deployment host, use Instant Rollback to redeploy the previous stable build artifact with one click.

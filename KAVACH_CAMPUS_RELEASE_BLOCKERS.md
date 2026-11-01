# KAVACH CAMPUS — RELEASE BLOCKERS & ACTIONABLE RESOLUTION GUIDE

**Audit Date:** November 1, 2026  
**Repository Directory:** `D:\Kavach Campus`  
**Current Status:** **PRODUCTION RELEASE GATED**  
**Remaining Blockers:** **4 External Configuration & Hardware Dependencies**  

---

## 1. Blocker Summary Matrix

| Blocker ID | Domain | Description | Current Impact | Owner | Action Required |
| :--- | :---: | :--- | :--- | :--- | :--- |
| **BLK-01** | Database | Staging RLS Migration `013_014_combined.sql` not executed against Supabase `polbnvszmvblwenfnqll`. | Cross-campus multi-tenant isolation is synthetically proven in code, but live catalog enforcement is pending. | Database Admin | Take snapshot backup in Supabase Dashboard; run SQL in SQL Editor. |
| **BLK-02** | Notifications | Real institutional SMTP credentials not configured in Vercel environment variables. | Live email OTP delivery fails closed safely (`503 Service Unavailable`). Accounts verify via development simulation. | Project Owner | Add `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `ENABLE_REAL_EMAIL_DELIVERY=true` in Vercel. |
| **BLK-03** | Auth | Google Cloud Console OAuth 2.0 Web Client missing Supabase Auth callback URI. | Google sign-in fails with provider redirect mismatch. | Security Admin | Add `https://polbnvszmvblwenfnqll.supabase.co/auth/v1/callback` to Authorized Redirect URIs in Google Cloud Console. |
| **BLK-04** | Mobile | Real Android smartphone not connected via ADB or tested manually. | Hardware GPS satellite latency, camera ID capture autofocus, and Doze mode Safe Walk behavior unverified on physical silicon. | QA Engineer | Perform physical testing on an Android phone using Chrome / installed PWA. |

---

## 2. Step-by-Step Operator Resolution Instructions

### Resolution for BLK-01: Staging Database Migration
*Comprehensive Safety Analysis: See [`KAVACH_CAMPUS_DATABASE_VERIFICATION_REPORT.md`](file:///d:/Kavach%20Campus/KAVACH_CAMPUS_DATABASE_VERIFICATION_REPORT.md)*

1. Open [Supabase Dashboard](https://supabase.com/dashboard/project/polbnvszmvblwenfnqll).
2. Navigate to **Database → Backups → Create Backup**. Wait until the backup status displays "Completed".
3. Navigate to **SQL Editor → New Query**.
4. Paste the entire content of [`supabase/staged_migrations_013_014_combined.sql`](file:///d:/Kavach%20Campus/supabase/staged_migrations_013_014_combined.sql).
5. Click **Run**. Confirm output: `"Comprehensive staging migration bundle 013 & 014 applied successfully with full RLS multi-tenant isolation."`
6. Run `supabase/verification/kavach_step121_readonly_preflight.sql` and `supabase/verification/kavach_cross_college_policy_preflight.sql` to verify active policies.
7. Run the post-migration cross-college isolation test script:
   ```powershell
   $env:KAVACH_ALLOW_LIVE_RLS_TESTS="true"
   $env:KAVACH_STAGING_PROJECT_REF="polbnvszmvblwenfnqll"
   npx tsx scripts/test_live_cross_college_isolation.ts
   $env:KAVACH_ALLOW_LIVE_RLS_TESTS=""
   $env:KAVACH_STAGING_PROJECT_REF=""
   ```

### Resolution for BLK-02: Institutional SMTP Credentials
1. Open [Vercel Dashboard](https://vercel.com/) → Project `kavach-campus` → **Settings → Environment Variables**.
2. Add the following variables (for Production and Preview):
   * `SMTP_HOST`: `smtp.gmail.com` (or your institution's SMTP server)
   * `SMTP_PORT`: `587`
   * `SMTP_USER`: `safety@campus.edu` (authenticated SMTP account)
   * `SMTP_PASS`: Application-specific password / API key *(do not share in chat)*
   * `SMTP_FROM`: `Kavach Campus Safety <safety@campus.edu>` (`SMTP_FROM_EMAIL` also supported)
   * `ENABLE_REAL_EMAIL_DELIVERY`: `true`
3. Go to **Deployments** → Click the three dots on the latest deployment → Select **Redeploy** to load the new environment variables into the serverless functions.
4. Verify using `npx tsx scripts/verify_smtp_connection.ts --send-test your-email@domain.com`.

### Resolution for BLK-03: Google Cloud OAuth 2.0 Redirect URI
1. Open [Google Cloud Console](https://console.cloud.google.com/) → **APIs & Services → Credentials**.
2. Locate the Web Client ID configured for this project (`538218379520-a2306ij74uc0tbj3rdu1f12thprum411.apps.googleusercontent.com`).
3. Under **Authorized redirect URIs**, add both:
   * `https://polbnvszmvblwenfnqll.supabase.co/auth/v1/callback`
   * `https://kavach-campus.vercel.app/api/auth/callback`
4. Save changes (changes take 5–10 minutes to propagate across Google's edge cache).

### Resolution for BLK-04: Android Device Testing Checklist
1. Connect an Android device to a testing station or open Chrome on the physical phone.
2. Navigate to `https://kavach-campus.vercel.app`.
3. Install the PWA by clicking "Add to Home screen".
4. Trigger an SOS and verify that geolocation accuracy is reported under 15 meters on cellular data.
5. Initiate a 5-minute Safe Walk session, lock the screen, and walk 100 meters to confirm that background tracking does not freeze under Android Doze mode.
6. Verify student ID card photo upload autofocus on the physical camera.

---

## 3. Post-Blocker Release Execution

Once BLK-01 through BLK-04 are completed, execute the final release sequence:
1. Run local pre-release gates:
   ```powershell
   npm test
   npx tsc --noEmit
   npm run lint
   npm run build
   npm audit --omit=dev
   git diff --check
   ```
2. Run post-migration live isolation test:
   ```powershell
   $env:KAVACH_ALLOW_LIVE_RLS_TESTS="true"
   $env:KAVACH_STAGING_PROJECT_REF="polbnvszmvblwenfnqll"
   npx tsx scripts/test_live_cross_college_isolation.ts
   $env:KAVACH_ALLOW_LIVE_RLS_TESTS=""
   $env:KAVACH_STAGING_PROJECT_REF=""
   ```
3. Commit and deploy with explicit operator approval.

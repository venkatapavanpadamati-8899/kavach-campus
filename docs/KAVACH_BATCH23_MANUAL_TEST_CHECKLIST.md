# KAVACH CAMPUS — BATCH 23 MANUAL TEST CHECKLIST FOR USER

**Project:** Kavach Campus — Safety in One Tap  
**Workspace:** `D:\Kavach Campus`  
**Execution Timestamp:** October 18, 2026  
**Status:** 🟡 **DEVELOPMENT COMPLETE — PRODUCTION VERIFICATION PENDING**

---

## 1. Manual User Action Checklist

Follow these 4 clear steps to verify the remaining external components:

### ✅ Test 1: Google OAuth Manual Verification
1. Open [Google Cloud Console](https://console.cloud.google.com/) and create an OAuth 2.0 Web Client.
2. In **Authorized redirect URIs**, add:
   ```text
   https://polbnvszmvblwenfnqll.supabase.co/auth/v1/callback
   ```
3. In [Supabase Auth Providers Dashboard](https://supabase.com/dashboard/project/polbnvszmvblwenfnqll/auth/providers), enable **Google** and paste your Client ID and Client Secret.
4. Navigate to your local app: `http://localhost:3000/login`.
5. Click **Continue with Google**, complete Google consent with your test account.
6. **Expected Outcome:** You are redirected to `/student` dashboard with your Google name and email populated in `profiles`. Refreshing the browser preserves the session. Clicking Logout clears the session.

---

### ✅ Test 2: Email OTP Registration Test
1. Navigate to: `http://localhost:3000/register`.
2. Fill out the form with a test college email (e.g. `student.test@campus.edu`) and password.
3. Submit the registration form.
4. **Expected Outcome:** You are redirected to `/verify-otp`.
5. Check your terminal log for the 6-digit OTP (e.g. `[DEVELOPMENT ONLY] OTP for student.test@campus.edu is 123456`).
6. Test submitting an incorrect OTP: The page must reject it with "Invalid OTP".
7. Test submitting the correct OTP: You are registered and directed to login.

---

### ✅ Test 3: Remote Database Preflight Verification
1. Navigate to: `https://supabase.com/dashboard/project/polbnvszmvblwenfnqll/sql/new`.
2. Open and copy the entire contents of [kavach_step121_readonly_preflight.sql](file:///D:/Kavach%20Campus/supabase/verification/kavach_step121_readonly_preflight.sql).
3. Paste into the SQL Editor and click **Run**.
4. **Expected Outcome:** The query executes in read-only mode and returns:
   - `audit_logs` columns showing `metadata JSONB` and `entity_type TEXT`.
   - `rls_enabled: true` across all sensitive tables (`incidents`, `evidence`, `profiles`, `student_profiles`).
   - `kavach-evidence` and `kavach-id-cards` showing `is_public: false`.

---

### ✅ Test 4: Production Deployment Keys (Vercel)
In your Vercel Project Settings > Environment Variables, configure:
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`
- `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`
- `GEMINI_API_KEY`
- `ENABLE_REAL_NOTIFICATIONS=true`

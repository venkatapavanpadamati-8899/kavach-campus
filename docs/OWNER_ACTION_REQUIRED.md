# KAVACH CAMPUS — OWNER ACTION REQUIRED CHECKLIST

The project owner must execute the following 3 external dashboard configurations to finalize live operations:

---

## 1. Supabase Dashboard (Fixes Google Login Redirect)

* **Dashboard URL:** [https://supabase.com/dashboard/project/polbnvszmvblwenfnqll](https://supabase.com/dashboard/project/polbnvszmvblwenfnqll)
* **Step 1:** In the left sidebar, navigate to **Authentication ➔ URL Configuration**.
* **Step 2:** Update **Site URL** from `http://localhost:3000` to:
  ```text
  https://kavach-campus.vercel.app
  ```
* **Step 3:** Under **Redirect URLs**, add the following 4 entries and click **Save**:
  ```text
  https://kavach-campus.vercel.app/api/auth/callback
  https://kavach-campus.vercel.app/**
  http://localhost:3000/api/auth/callback
  http://localhost:3000/**
  ```

---

## 2. Google Cloud Console (OAuth Client Credentials)

* **Console URL:** [https://console.cloud.google.com/apis/credentials](https://console.cloud.google.com/apis/credentials)
* **Step 1:** Select your active OAuth 2.0 Web Client ID.
* **Step 2:** Under **Authorized redirect URIs**, verify that the Supabase callback URL is present:
  ```text
  https://polbnvszmvblwenfnqll.supabase.co/auth/v1/callback
  ```
* **Step 3:** Save changes.

---

## 3. GitHub Repository Secrets (Fixes Workflow #32)

* **Repository URL:** [https://github.com/venkatapavanpadamati-8899/kavach-campus/settings/secrets/actions](https://github.com/venkatapavanpadamati-8899/kavach-campus/settings/secrets/actions)
* **Step 1:** Navigate to **Settings ➔ Secrets and variables ➔ Actions**.
* **Step 2:** Under **Repository secrets**, ensure the following two secrets are added/updated:
  * **`CRON_SECRET`**: Paste the same secret token configured under `CRON_SECRET` in Vercel.
  * **`VERCEL_PROJECT_URL`**: `https://kavach-campus.vercel.app`
* **Step 3:** Go to the **Actions** tab, select **Kavach Safe Walk & Escalation Scheduler**, and click **Run workflow** to verify a successful run.

---

## 4. Twilio SMS Account (For Real Carrier Delivery)

* Upgrade Twilio from Trial to Pay-as-you-go if real SMS delivery to unverified mobile numbers is required during the pilot.
* (The application currently uses ₹0 simulated SMS fallback via `ENABLE_DEMO_SMS=true` which works without cost).

---

## 5. Physical Phone Field Verification

Before public student rollout, test these features on a physical smartphone:
* [ ] Open `/student/sos` outdoors and confirm satellite GPS acquisition.
* [ ] Open `/student/safe-box` and take a photo via mobile camera.
* [ ] Open `/student/voice-report` and record a voice memo via microphone.
* [ ] Confirm emergency call button opens native dialer with `tel:112`.

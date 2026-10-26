# KAVACH CAMPUS — CLOUD DEPLOYMENT GUIDE (VERCEL / AWS / CLOUD HOSTING)

**Document Version:** 1.0.0  
**Target Platform:** Vercel (Recommended for Next.js 16 App Router) or Custom Node.js Linux VM  
**App Framework:** Next.js 16.4.0 (Turbopack, Server-Side Rendering & Dynamic Route Handlers)  
**Database:** Managed Supabase PostgreSQL Cloud

---

## 1. PRE-DEPLOYMENT VERIFICATION CHECKLIST

Before deploying to any cloud host, confirm that all local verification gates have passed:

- [x] `npm test`: 368 / 368 passed (Vitest)
- [x] `npx tsc --noEmit`: 0 TypeScript compilation errors
- [x] `npm run lint`: 0 ESLint errors and 0 warnings
- [x] `npm run build`: 63 routes generated with Turbopack (Exit 0)
- [x] `npm audit --omit=dev`: 0 production vulnerabilities
- [x] `.env.local` is ignored in `.gitignore` (Never committed to Git)

---

## 2. STEP-BY-STEP DEPLOYMENT TO VERCEL

### Step 1: Push Repository to GitHub / GitLab
Ensure your latest changes are pushed to your private Git repository:
```bash
git add .
git commit -m "chore(release): prepare production release candidate"
git push origin main
```

### Step 2: Create a New Project on Vercel
1. Log in to [Vercel](https://vercel.com).
2. Click **Add New...** -> **Project**.
3. Import your `Kavach Campus` repository.
4. Framework Preset: Select **Next.js**.
5. Root Directory: `./` (Repository root).

### Step 3: Configure Environment Variables in Vercel Dashboard
In the **Environment Variables** section of the Vercel project settings, add the variables documented in [KAVACH_PRODUCTION_ENV_TEMPLATE.md](file:///d:/Kavach%20Campus/docs/KAVACH_PRODUCTION_ENV_TEMPLATE.md):

| Variable Name | Environment Target | Description |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | Production & Preview | Supabase Project URL (`https://polbnvszmvblwenfnqll.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Production & Preview | Supabase Anonymous Public Key |
| `SUPABASE_SERVICE_ROLE_KEY` | Production & Preview | Supabase Service Role Secret Key (Server-side) |
| `NEXT_PUBLIC_SITE_URL` | Production | Your production domain (e.g., `https://kavach.college.edu` or `https://kavach-campus.vercel.app`) |
| `CRON_SECRET` | Production | Random 32+ character string for Vercel Cron authorization |
| `GEMINI_API_KEY` | Production & Preview | Google AI Studio Key (or leave blank to use Deterministic Engine) |
| `ENABLE_DEMO_OTP` | Production | Set to `false` (Unconditionally disabled in production) |

### Step 4: Configure Supabase Authentication Redirect URLs
In your Supabase Dashboard (`https://supabase.com/dashboard/project/polbnvszmvblwenfnqll`):
1. Navigate to **Authentication** -> **URL Configuration**.
2. **Site URL:** Enter your production URL (e.g. `https://kavach.college.edu`).
3. **Redirect URLs:** Add the following callback URLs:
   - `https://kavach.college.edu/api/auth/callback`
   - `https://your-vercel-domain.vercel.app/api/auth/callback`
   - `http://localhost:3000/api/auth/callback` (for local development)
4. Click **Save**.

### Step 5: Vercel Cron Job Configuration
The repository includes [vercel.json](file:///d:/Kavach%20Campus/vercel.json) at the root:
```json
{
  "crons": [
    {
      "path": "/api/cron/safe-walk-timeout",
      "schedule": "* * * * *"
    },
    {
      "path": "/api/cron/escalate",
      "schedule": "* * * * *"
    }
  ]
}
```
Vercel automatically triggers these endpoints each minute with the `Authorization: Bearer <CRON_SECRET>` header.

---

## 3. CUSTOM DOMAIN & DNS SETUP (e.g. `kavach.college.edu`)

1. In Vercel Project Settings, navigate to **Domains**.
2. Enter your custom domain: `kavach.college.edu`.
3. Configure the following DNS records in the college domain registrar / DNS provider:
   - **Type:** `CNAME`
   - **Name:** `kavach`
   - **Value:** `cname.vercel-dns.com.`
4. Vercel will automatically provision a free Let's Encrypt **SSL/TLS Certificate** for HTTPS.
5. HTTPS is strictly enforced by Vercel; all HTTP requests automatically redirect to HTTPS with HSTS headers.

---

## 4. COOKIE & SESSION SECURITY IN PRODUCTION

The application's session cookies in [src/lib/supabase/server.ts](file:///d:/Kavach%20Campus/src/lib/supabase/server.ts) automatically adhere to modern web security:
- `HttpOnly`: Prevents client-side script access to session tokens.
- `SameSite: Lax`: Protects against Cross-Site Request Forgery (CSRF).
- `Secure: true`: Automatically enforced on HTTPS in production builds.

---

## 5. FILE UPLOAD & EVIDENCE STORAGE POLICY

- **Max File Size:** Enforced at 10 MB per attachment in API route handler.
- **Allowed MIME Types:** `image/jpeg`, `image/png`, `image/webp`, `application/pdf`, `audio/mp4`, `video/mp4`.
- **Magic-Byte / Header Validation:** Checks file signatures server-side.
- **Path Isolation:** Files are written to `/[student_uuid]/[random_uuid].[ext]`.
- **Signed URLs:** Expire in 300 seconds (5 minutes) and are issued only after validating staff assignment or student ownership.

---

## 6. MONITORING, LOGGING & ERROR RECOVERY

1. **Vercel Log Drain:** Real-time runtime logs are streamed under the **Logs** tab in Vercel.
2. **PII Masking:** The notification dispatcher in `src/lib/notifications/index.ts` automatically masks phone numbers (`+91 *** 3210`) and email addresses (`s***@campus.edu`). Secrets are redacted with `[REDACTED]`.
3. **Health Check Probe:** Configure an external uptime monitor (e.g., UptimeRobot, BetterStack) to ping:
   `https://kavach.college.edu/api/system/health` every 5 minutes.
   - Expected status: `HTTP 200 OK`
   - Response body contains `{"status":"healthy","liveness":"UP","readiness":"READY"}`.

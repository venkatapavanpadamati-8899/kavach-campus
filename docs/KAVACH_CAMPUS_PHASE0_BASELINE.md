# KAVACH CAMPUS PHASE 0 - BASELINE

## 1. Current Project Root
`d:\Kavach Campus`

## 2. Package.json
Dependencies include `@google/genai`, `@supabase/ssr`, `@supabase/supabase-js`, `framer-motion`, `lucide-react`, `next`, `react`, `react-dom`. Leftover legacy dependencies like `bcryptjs`, `google-auth-library`, `jose`, `jsonwebtoken`, `nodemailer`, `socket.io`, `socket.io-client`, `uuid` still exist.

## 3. Configuration
- `next.config.ts`: `cacheComponents: true` and `partialPrefetching: true` are enabled.
- `tsconfig.json`: Standard Next.js TS config. `nextjs_backup` is excluded.

## 4. Source Tree Inventory
- `src/app/`: Next.js 16 App Router structure.
- `src/components/layouts`: Common layouts.
- `src/lib/`: `ai.ts`, `auth.ts`, `supabase/`.
- `supabase/`: Contains `migrations/` and `verification/`.
- `nextjs_backup/`: Old legacy structure preserved.

## 5. Route Inventory
**App Routes:**
`/`, `/login`, `/register`, `/verify-otp`, `/about`, `/features`, `/contact`, `/privacy`, `/forgot-password`, `/reset-password`
`/student`, `/staff`, `/management`, `/admin` (some specific pages within these are assumed but will be audited in Phase 2).
`/api/auth/...`, `/api/system/...`

## 6. Components & Middleware
- `src/proxy.ts`: Contains Edge middleware logic.
- `src/lib/auth.ts`: Authentication utilities.
- `src/lib/ai.ts`: Gemini integration.

## 7. Database Migrations
Found `001_kavach_campus.sql`, `001_kavach_campus_final.sql`, `002_kavach_campus_final_repair.sql`, and `verify_kavach_database.sql`.

## 8. Existing Reports
Read KAVACH_CAMPUS_COMPLETION_AUDIT.md, KAVACH_CAMPUS_COMPLETION_REPORT.md, PROJECT_AUDIT.md, and README.md.

## 9. Environment Variables
Identified required env vars from `.env.example`:
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GEMINI_API_KEY`, `SMTP_PASSWORD`. 
No actual secrets are recorded.

## 10. Git Status
Uncommitted deletions of legacy files (`backend/`, `css/`, `js/`, `pages/`, `index.html`) and newly untracked files (`src/`, `supabase/`, `AGENTS.md`, etc.).

## 11. Build and Test Results
- `npm run build`: Passes successfully when `instant = false` is used to bypass `cacheComponents` static-shell validation. 
- Tests: No `npm test` script is configured currently.

## 12. Leftovers and Legacy
- Legacy files moved to `nextjs_backup/` and pending deletion from Git.
- Legacy dependencies (Nodemailer, Socket.IO, JWT) are still in `package.json` and need to be audited for relevance in Phase 1.

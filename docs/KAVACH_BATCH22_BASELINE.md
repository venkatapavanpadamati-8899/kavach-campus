# Kavach Campus — Batch 22 Baseline Report

**Project:** Kavach Campus — Safety in One Tap  
**Workspace:** `D:\Kavach Campus`  
**Execution Timestamp:** October 18, 2026  
**Git Branch & Commit:** `master` (`aa96b34`)  
**Production Remote Database Reference:** `polbnvszmvblwenfnqll` (⛔ **STRICT RELEASE HOLD**)  
**Audit Focus:** Complete End-to-End Functionality, Authentication, OTP, Google Login, SMS, Links & Security

---

## 1. Safety & Operational Constraints

1. **Production Database (`polbnvszmvblwenfnqll`):** **STRICT HOLD**. No DDL, no migrations, no data mutations directed at remote Supabase.
2. **Secrets Protection:** No API keys, passwords, tokens, OTPs, or service-role keys are printed or committed.
3. **Local Database:** Local Supabase containers active and healthy (`supabase_db_kavach_campus` on port 54322, Kong API gateway on port 54321).
4. **Preservation:** All existing user changes preserved.

---

## 2. Toolchain and Configuration Baseline

- **Runtime & Framework:** Next.js 16.4.0 (Turbopack), React 19, TypeScript 5.
- **Middleware:** `src/proxy.ts` enforcing RBAC across `/student`, `/staff`, `/management`, `/admin`, `/super-admin`.
- **Database:** Supabase PostgreSQL with Row Level Security (RLS) on all public tables.
- **Storage:** Supabase Storage with private buckets `kavach-evidence` and `kavach-id-cards`.
- **Package Manager:** `npm` (verified via `package-lock.json`).
- **NPM Scripts:** `dev`, `build`, `start`, `lint`, `test`, `test:watch`.

---

## 3. Git Status Summary

- **Modified Tracked Files:** `.env.example`, `.gitignore`, `package.json`, `package-lock.json`, `src/app/api/incidents/route.ts`
- **Recent Remediation Changes:**
  - `src/app/student/verification-status/page.tsx`: Aligned storage path to `kavach-id-cards/${userId}/${studentId}-card.jpg`.
  - `src/app/api/student/verify-id/route.ts`: Server-side user.id folder isolation enforcement.
- **Untracked Directories:** `docs/`, `scratch/`, `scripts/`, `src/__tests__/`, `src/app/`, `src/components/`, `src/lib/`, `supabase/`.

# KAVACH CAMPUS — PHASE 10: CONTINGENCY & ROLLBACK PLAN

**Phase:** Phase 10 — Production Execution & Rollback Protocols  
**Date:** November 4, 2026  
**Auditor:** Antigravity Autonomous Pair Programming Agent  

---

## 1. Executive Summary

This contingency and rollback procedure establishes explicit, automated, and manual reversal protocols in the event that any unforeseen regression occurs during database migration application, data cleanup, or Vercel deployment.

---

## 2. Component-by-Component Rollback Procedures

### A. Database Migration Rollback Procedures

#### Rollback for Migration 015 (Scoped Unique Student ID Index)
If any index violation occurs or college scoping requires reversal:
```sql
-- Revert 015: Restore global index
DROP INDEX IF EXISTS public.idx_profiles_college_student_id;
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_student_id 
ON public.profiles(student_id) 
WHERE role = 'STUDENT' AND student_id IS NOT NULL;
```

#### Rollback for Migration 016 (Safe Box Private Notes)
If table creation causes unexpected lock contention:
```sql
-- Revert 016: Drop private notes table
DROP TABLE IF EXISTS public.safe_box_private_notes CASCADE;
```
*(Note: Application code is already equipped with fallback logic to seamlessly operate even if this table does not exist).*

#### Rollback for Migration 017 (RLS Policy Hardening)
If policy updates conflict with legacy queries:
```sql
-- Revert 017: Restore baseline SELECT policy
DROP POLICY IF EXISTS "Users can view incidents within their college" ON public.incidents;
DROP FUNCTION IF EXISTS public.current_user_college_id();

CREATE POLICY "Users can view incidents"
ON public.incidents
FOR SELECT
USING (true);
```

---

### B. Vercel Deployment Instant Rollback
In the event that a production build or edge deployment encounters unexpected latency or runtime issues:
1. **Instant Rollback via Vercel Dashboard:**
   - Go to `https://vercel.com/venkatapavanpadamati-8899/kavach-campus/deployments`.
   - Locate the previous successful production deployment.
   - Click the three dots `...` -> Select **"Instant Rollback"** (promotes previous deployment to production within 2 seconds).
2. **Instant Rollback via Vercel CLI:**
   ```bash
   vercel rollback
   ```

---

### C. Git Codebase Rollback
If a committed code change must be reverted on `main`:
```bash
# Option 1: Create a safe revert commit
git revert HEAD --no-edit
git push origin main

# Option 2: Hard reset to pre-push commit (if unpushed)
git reset --hard HEAD~1
```

---

### D. Demo OTP & Service Preservation Guarantee
Under NO circumstances will any rollback action:
1. Alter or disable the Mobile Demo OTP constant (`123456`).
2. Delete active institutional college records (`srkr-bhimavaram`, `vit-bhimavaram`).
3. Compromise the private bucket security flags on `kavach-id-cards` or `kavach-evidence`.

---

## 3. Incident Escalation Contacts & Support

- **Campus Technical Lead:** Venkata Pavan Padamati
- **Primary Repository:** `https://github.com/venkatapavanpadamati-8899/kavach-campus`
- **Hosting Infrastructure:** Vercel Pro Team
- **Database Engine:** Supabase PostgreSQL (AWS ap-south-1)


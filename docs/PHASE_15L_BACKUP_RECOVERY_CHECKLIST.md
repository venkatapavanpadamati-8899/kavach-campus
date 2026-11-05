# KAVACH CAMPUS — PHASE 15L BACKUP & DISASTER RECOVERY READINESS

**Target Project:** Supabase Production (`dvyiclyyvmsfipzrdowu`)  
**Assessment Date:** 2026-11-05  
**Review Status:** **`GATED — OWNER ACTION REQUIRED`**  

---

## 1. Owner Backup Verification Checklist

> [!CAUTION]
> The AI assistant cannot and will not access remote production database credentials. The repository owner must personally perform the following verification in the Supabase Cloud Management Console before approving any migration DDL.

- [ ] **1.1 Supabase Backup Console Inspection:**
  - Navigate to: `https://supabase.com/dashboard/project/dvyiclyyvmsfipzrdowu/settings/database`
  - Open the **Backups** tab.
  - Confirm that automated daily backups are listed as **Active / Healthy**.

- [ ] **1.2 Point-in-Time Recovery (PITR) Inspection:**
  - Verify if PITR (Point-in-Time Recovery) is enabled on project `dvyiclyyvmsfipzrdowu`.
  - Confirm retention period (default: 7 days on Pro plan).

- [ ] **1.3 Latest Backup Timestamp Capture:**
  - Record the exact timestamp of the latest restorable snapshot:
    - *Observed Timestamp:* `________________________ (UTC)`
    - *Maximum Acceptable Age:* Less than 24 hours prior to scheduled migration window.

- [ ] **1.4 Manual Snapshot Trigger (Recommended Prerequisite):**
  - If a manual backup button or CLI dump is accessible, trigger an immediate backup prior to running migration 010.

---

## 2. Recovery Objectives & Contingency Planning

| Metric | Target Standard | Operational Strategy |
| :--- | :---: | :--- |
| **Recovery Point Objective (RPO)** | **< 1 hour** | Point-in-Time Recovery allows restoring to the minute immediately preceding migration execution. |
| **Recovery Time Objective (RTO)** | **< 30 minutes** | One-click Supabase Dashboard restore or schema DDL rollback script. |

---

## 3. Database Restore & Rollback Procedures

### Procedure A: Schema DDL Rollback (Fast Path)
If a specific migration encounters an error during execution in the Supabase SQL Editor, execute the reverse DDL statements documented in the rollback section of each migration:
```sql
-- Fast Rollback for Migrations 018 down to 015
DROP TABLE IF EXISTS public.safe_box_private_notes CASCADE;
DROP TABLE IF EXISTS public.staff_locations CASCADE;
DROP INDEX IF EXISTS public.idx_profiles_college_student_id;
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_student_id ON public.profiles(student_id) WHERE student_id IS NOT NULL AND role = 'STUDENT';
ALTER TABLE public.student_profiles DROP COLUMN IF EXISTS claimed_college_id;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS profile_photo_path;
```

### Procedure B: Full Instance Point-in-Time Restore (Disaster Recovery Path)
If an unexpected schema failure or data corruption occurs:
1. Immediately halt all client application traffic.
2. In the Supabase Dashboard, select **Database -> Backups -> Restore**.
3. Choose the backup timestamp recorded in Step 1.3.
4. Allow Supabase automated provisioning to complete restore.
5. Re-run verification queries to confirm data integrity across 40 incidents and 481 audit logs.


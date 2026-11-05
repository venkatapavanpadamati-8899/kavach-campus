# KAVACH CAMPUS — PHASE 15: SUPABASE BACKUP OWNER CHECKLIST

**Project:** Kavach Campus (`D:\kavach-campus`)  
**Database Reference:** `dvyiclyyvmsfipzrdowu`  
**Supabase Dashboard Link:** [https://supabase.com/dashboard/project/dvyiclyyvmsfipzrdowu/database/backups](https://supabase.com/dashboard/project/dvyiclyyvmsfipzrdowu/database/backups)  
**Audit Date:** November 4, 2026  
**Status:** **`OWNER ACTION REQUIRED (MUST COMPLETE BEFORE MIGRATIONS)`**

---

## 1. Why Owner Verification is Mandatory

Automated agents and server-side service keys do not possess administrative permissions to access the Supabase Management Console or inspect cloud infrastructure snapshots.

Per project release safety guidelines:
> *"Do not assume backups exist merely because the dashboard offers a backup feature. Do not execute migrations without owner confirmation of a restorable backup."*

The Institutional Project Owner must manually log in and complete the checklist below before migrations 015, 016, and 017 can be safely authorized.

---

## 2. Step-by-Step Owner Verification Checklist

### STEP 1: Log in to Supabase Cloud Console
- Navigate to: **[https://supabase.com/dashboard/project/dvyiclyyvmsfipzrdowu/database/backups](https://supabase.com/dashboard/project/dvyiclyyvmsfipzrdowu/database/backups)**
- Log in as the project owner (`venkatapavanpadamati1@gmail.com`).

---

### STEP 2: Verify Scheduled Daily Backups
1. Under **Database Backups**, locate the **Scheduled Backups** tab.
2. Confirm that daily backups are active.
3. Check the **Timestamp of the Latest Successful Backup**.
   - *Requirement:* Must be within the last 24 hours.
4. Verify the backup state is marked **`Completed`** or **`Available`** (not `Failed` or `Pending`).

---

### STEP 3: Verify Point-in-Time Recovery (PITR) Status
1. Check whether **Point in Time Recovery (PITR)** is enabled for the project.
2. If enabled, note the **Earliest Restorable Time** and **Latest Restorable Time**.
3. If PITR is disabled on the Free tier, ensure a manual snapshot or scheduled backup is verified.

---

### STEP 4: Review Restoration Procedure
In the event that a migration fails or corrupts data:
1. Locate the **Restore** button next to the latest backup.
2. Review the restoration target options:
   - *In-place restore:* Reverts the active database to the snapshot state.
   - *Clone project restore:* Spawns a separate project containing the restored database.
3. Identify authorized personnel: Only the Organization Owner (`venkatapavanpadamati1@gmail.com`) can initiate restoration.

---

## 3. Owner Backup Evidence Form

Please review and fill in the following evidence template (without exposing any passwords, tokens, or confidential keys):

| Verification Check | Target Value | Owner Confirmed Value |
|---|---|---|
| Project Reference ID | `dvyiclyyvmsfipzrdowu` | `dvyiclyyvmsfipzrdowu` |
| Backup Service Status | Active / Healthy | `[ YES / NO ]` |
| Latest Backup Timestamp | Within last 24h | `YYYY-MM-DD HH:MM UTC` |
| Backup Type | Scheduled Daily / PITR / Manual | `[ Specify Type ]` |
| Restorable State Confirmed | Yes | `[ CONFIRMED ]` |
| Authorized Restorer | Institutional Owner | `venkatapavanpadamati1@gmail.com` |

---

## 4. Disaster Recovery & Rollback Assurance

Executing DDL migrations without verified disaster recovery exposes the system to catastrophic data loss:
- If Migration 015 encounters a unique index conflict, it can be dropped via `DROP INDEX IF EXISTS idx_profiles_college_student_id;`.
- If Migration 016 requires removal, executing `DROP TABLE safe_box_private_notes;` permanently destroys student private notes.
- If Migration 017 columns are dropped, student claimed college inputs are permanently erased.

Having a verified snapshot guarantees that the entire database can be restored to its exact current pre-migration state (**670 public rows, 40 incidents, 481 audit logs, 34 OTPs, 8 users**) in minutes.

---

## 5. Gate Sign-Off

```text
================================================================================
GATE STATUS: BLOCKED PENDING OWNER BACKUP CONFIRMATION
================================================================================
Migrations 015, 016, and 017 will NOT be executed until the owner confirms
completion of this checklist.
```


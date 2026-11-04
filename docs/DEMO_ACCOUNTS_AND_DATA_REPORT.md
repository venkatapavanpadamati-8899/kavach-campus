# KAVACH CAMPUS — SYNTHETIC DEMO ACCOUNTS AND DATA REPORT
**Date:** November 2026  
**Auditor:** QA Automation & Security Specialist  
**Scope:** Synthetic Test Environment, Isolated Seed Data, Role Mappings, and Credentials Sanitization  

---

## 1. Security & Privacy Guarantees

> [!IMPORTANT]
> All synthetic accounts operate in the isolated developer simulation mode (`ENABLE_DEMO_OTP=true`, `ENABLE_DEMO_SMS=true`).
> - **Zero Real Student PII:** No actual student names, mobile numbers, or academic credentials were used.
> - **Zero Plaintext Secrets:** Passwords, tokens, and private keys are never stored in git or printed in logs.
> - **Automatic Post-Test Cleanup:** Temporary accounts created during E2E testing scripts are cleaned up immediately from `auth.users`, `profiles`, `student_profiles`, and `incidents`.

---

## 2. Synthetic Test Accounts Roster

| Demo Name | Demo Role | College Affiliation | Department | Simulated OTP | Dashboard Route | Verified Permissions |
| :--- | :--- | :--- | :--- | :---: | :--- | :--- |
| `Live Test Student` | `STUDENT` | SRKR Engineering College | Computer Science and Engineering | `123456` | `/student` | File complaints, trigger SOS, request Safe Walk, upload ID card |
| `Live Test Assistant Professor` | `STAFF` | SRKR Engineering College | Computer Science and Engineering | `123456` | `/staff` | View assigned incidents, campus emergency responder queue |
| `CSE Head of Department` | `HOD` | SRKR Engineering College | Computer Science and Engineering | N/A (Admin) | `/management` | Approve CSE staff, view CSE department incidents |
| `Dr. Principal Executive` | `PRINCIPAL` | SRKR Engineering College | Administration | N/A (Admin) | `/management` | Approve all SRKR staff across departments, college overview |
| `SRKR Campus Administrator` | `ADMIN` | SRKR Engineering College | Campus Administration | N/A (Admin) | `/admin` | Review student ID verifications, manage campus zones, audit logs |
| `Platform Root Administrator` | `SUPER_ADMIN` | Multi-Tenant Platform | Platform Root Administration | N/A (Admin) | `/super-admin` | Platform-wide root governance across all colleges |

---

## 3. Permanent Root Super Admin Record

The existing root Super Admin profile was inspected via read-only query on remote Supabase:

```text
ID:          c1f85578-70b1-40e5-afb2-b6f8aa861b0a
Full Name:   Venkata Pavan (Super Admin)
Email:       venkatapavanpadamati1@gmail.com
Role:        SUPER_ADMIN
Department:  Platform Root Administration
College ID:  srkr-bhimavaram
Approval:    true (Active)
```

No modification or replacement of the owner's root account was performed during any test.

---

## 4. Test Data Cleanup Lifecycle

All test scripts (`test_user_workflows_e2e.ts`, `test_principal_and_sos_live.ts`, and `verify_all_six_roles_and_dashboards.ts`) execute a deterministic `🧹 [CLEANUP]` phase:
```ts
for (const uid of createdUserIds) {
  await adminClient.from('student_profiles').delete().eq('id', uid);
  await adminClient.from('staff_profiles').delete().eq('id', uid);
  await adminClient.from('profiles').delete().eq('id', uid);
  await adminClient.auth.admin.deleteUser(uid);
}
```
This guarantees that no synthetic test pollution persists in the staging database.


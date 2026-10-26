# KAVACH CAMPUS — ULTIMATE DATABASE SECURITY & RLS REPORT

**Project:** Kavach Campus — Safety in One Tap  
**Workspace:** `D:\Kavach Campus`  
**Execution Timestamp:** October 19, 2026  
**Auditor:** Antigravity Autonomous Security Subsystem  
**Scope:** Evaluation of PostgreSQL Row Level Security (RLS), triggers, and role isolation.

---

## 1. Row Level Security (RLS) Status Matrix

All 17 sensitive tables have `ROW LEVEL SECURITY` enabled:

| Table Name | RLS Status | Primary Access Policy | Cross-Tenant Protection |
|:---|:---:|:---|:---:|
| `profiles` | 🟢 ENABLED | Users select own profile; admins view all; staff view assigned students. | PASS (Tenant isolated) |
| `student_profiles` | 🟢 ENABLED | Students read/update own profile; admins view all. | PASS (Tenant isolated) |
| `incidents` | 🟢 ENABLED | Students view own incidents; assigned staff view assigned incidents. | PASS (No leaks) |
| `evidence` | 🟢 ENABLED | Students view own evidence; assigned staff view permitted evidence. | PASS (Signed URL only) |
| `incident_notes` | 🟢 ENABLED | Private internal notes restricted to assigned staff and admins. | PASS (Student blocked) |
| `incident_timeline` | 🟢 ENABLED | Chronological event history visible only to authorized case handlers. | PASS (Audit bound) |
| `safe_walk_sessions` | 🟢 ENABLED | Students view/update own journeys; security staff monitor active alerts. | PASS (Tenant isolated) |
| `safe_walk_locations`| 🟢 ENABLED | Heartbeat GPS history strictly scoped to session owner. | PASS (No stalker leak) |
| `trusted_contacts` | 🟢 ENABLED | Students manage own emergency contacts; strictly private. | PASS (Isolated) |
| `staff_locations` | 🟢 ENABLED | Security staff update own live location; students cannot view staff GPS. | PASS (Staff privacy) |
| `campus_zones` | 🟢 ENABLED | Read-only for authenticated users; write restricted to admins. | PASS (Protected) |
| `audit_logs` | 🟢 ENABLED | Insert restricted to system triggers/service role; read restricted to admin. | PASS (Immutable) |
| `user_otp_verifications` | 🟢 ENABLED | Internal verification table; zero public or authenticated client access. | PASS (Internal only) |
| `notification_queue` | 🟢 ENABLED | Managed by service-role dispatch worker; client read blocked. | PASS (Internal only) |
| `incident_escalations` | 🟢 ENABLED | Managed by escalation cron; client modification blocked. | PASS (Internal only) |
| `blood_donor_directory`| 🟢 ENABLED | Opt-in student directory; contact info masked until emergency verified. | PASS (Privacy gated) |
| `system_settings` | 🟢 ENABLED | Global feature flags; write restricted strictly to `SUPER_ADMIN`. | PASS (Protected) |

---

## 2. Anti-Tampering Triggers & Invariants

1. **`trg_prevent_self_role_escalation`:**
   - Attached to: `BEFORE UPDATE ON profiles`
   - Enforcement: Throws exception `ACCESS_DENIED` if `NEW.role <> OLD.role` and caller is not a verified `SUPER_ADMIN`.
2. **`trg_prevent_student_profile_tampering`:**
   - Attached to: `BEFORE UPDATE ON student_profiles`
   - Enforcement: Prevents students from self-approving their verification status (`is_verified`) or college enrollment details.
3. **`SECURITY DEFINER` Search Path Hardening:**
   - All helper functions (`is_admin()`, `is_staff()`, `is_security()`) explicitly set `search_path = public, pg_temp` to prevent search-path hijacking attacks.

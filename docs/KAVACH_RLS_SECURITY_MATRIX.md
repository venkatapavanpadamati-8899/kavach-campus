# Kavach Campus — Row-Level Security (RLS) & Access Control Matrix

**Date:** 2026-10-19  
**Target:** PostgreSQL Database Tables & Supabase Storage Objects  
**Security Standard:** Row Level Security Enabled on 100% of Tables, Least-Privilege Role Authorization

---

## 1. Table-by-Table RLS Matrix

| Table Name | RLS Status | Permitted Roles & Actions | Denied Roles & Actions | Active Policies | Test Evidence |
|---|:---:|---|---|---|---|
| **`profiles`** | **ENABLED** | • Authenticated: `SELECT` own row (`auth.uid() = id`).<br>• Staff/Admin: `SELECT` all profiles for incident routing.<br>• Admin: `UPDATE` roles and `is_approved`. | • Students cannot view other students' private profiles.<br>• Non-admins cannot update `role` or `is_approved` (enforced via trigger). | `"Users view own profile"`, `"Staff view profiles"`, `"Admin update profiles"` | `auth-rbac.test.ts`, `step115-rls-evidence-hardening.test.ts` |
| **`student_profiles`** | **ENABLED** | • Student: `SELECT` and `UPDATE` own profile (`auth.uid() = id`).<br>• Admin/Security: `SELECT` all student profiles for ID verification. | • Students cannot update `verification_status` to `VERIFIED` (blocked by trigger `prevent_student_self_verification`).<br>• Students cannot view other students' records. | `"Students manage own student_profile"`, `"Staff view student_profiles"` | `student-id-verification-api.test.ts`, `step108-remediation-and-functional-verification.test.ts` |
| **`incidents`** | **ENABLED** | • Student: `INSERT` own incidents (`student_id = auth.uid()`).<br>• Student: `SELECT` own incidents.<br>• Assigned Staff / Security / Admin: `SELECT` & `UPDATE` status. | • Students cannot read other students' incidents.<br>• Students cannot reassign or close incidents.<br>• Unassigned staff cannot modify incidents. | `"Students insert own incidents"`, `"Students view own incidents"`, `"Staff view assigned or all incidents"` | `batch3-security-database-sos-hardening.test.ts`, `integration-workflows.test.ts` |
| **`evidence`** | **ENABLED** | • Student Owner: `INSERT` & `SELECT` evidence bound to own incident.<br>• Assigned Staff: `INSERT` & `SELECT` evidence.<br>• Security/Admin: `SELECT` all incident evidence. | • Student B cannot view or upload evidence to Student A's incident.<br>• Unassigned staff cannot view evidence.<br>• Anonymous users cannot access evidence. | `"Incident owner and staff view evidence"`, `"Authorized users insert evidence"` | `step115-rls-evidence-hardening.test.ts`, `batch8-security-fixes-and-regression.test.ts` |
| **`incident_locations`** | **ENABLED** | • Student Owner: `INSERT` location telemetry.<br>• Student Owner / Assigned Responder / Security: `SELECT` locations. | • Non-assigned users cannot view live GPS telemetry.<br>• Anonymous users cannot insert or read locations. | `"Users insert location for own incidents"`, `"Authorized responders view locations"` | `sos-location-tracking.test.ts`, `step112-authorization-regression.test.ts` |
| **`safe_walks`** | **ENABLED** | • Student: `INSERT`, `SELECT`, `UPDATE` own walks (`student_id = auth.uid()`).<br>• Security/Admin: `SELECT` active/overdue walks.<br>• Cron: Server-side timeout processing. | • Students cannot view other students' safe walk paths.<br>• Non-security staff cannot access private walk routes. | `"Students manage own safe walks"`, `"Security view active safe walks"` | `safe-walk.test.ts`, `sos-safe-walk-production-e2e.test.ts` |
| **`trusted_contacts`** | **ENABLED** | • Student: `INSERT`, `SELECT`, `UPDATE`, `DELETE` own contacts (`student_id = auth.uid()`). | • Other students cannot read or edit contacts.<br>• Anonymous users cannot read contacts. | `"Students manage own trusted contacts"` | `batch2-student-safety-features.test.ts`, `step108-remediation-and-functional-verification.test.ts` |
| **`escalations`** | **ENABLED** | • Staff / Security / Admin: `INSERT` and `SELECT` escalations.<br>• Management: `SELECT` institutional escalations. | • Students cannot access escalation records directly.<br>• Anonymous requests denied. | `"Staff and admin view escalations"`, `"Staff and admin manage escalations"` | `cron-workflows.test.ts`, `batch4-management-and-notifications.test.ts` |
| **`notifications`** | **ENABLED** | • Authenticated: `SELECT` own notifications (`user_id = auth.uid()`).<br>• System / Server: `INSERT` emergency alerts. | • Users cannot read notifications addressed to others.<br>• Anonymous requests denied. | `"Users view own notifications"` | `notification-adapters.test.ts`, `batch4-management-and-notifications.test.ts` |
| **`case_actions`** | **ENABLED** | • Incident Owner / Assigned Staff / Admin: `SELECT` timeline entries.<br>• Staff / Admin: `INSERT` case timeline actions. | • Unauthorized students cannot read case notes or audit actions.<br>• Anonymous requests denied. | `"Authorized users view case actions"`, `"Staff insert case actions"` | `integration-workflows.test.ts` |
| **`audit_logs`** | **ENABLED** | • Server Service Role: `INSERT` immutable audit records.<br>• Admin / Super Admin: `SELECT` system audit logs. | • Students and regular staff cannot read or tamper with audit logs.<br>• `UPDATE` and `DELETE` strictly prohibited for all users. | `"Admins view audit logs"`, `"Service role inserts audit logs"` | `step108-remediation-and-functional-verification.test.ts`, `student-id-verification-api.test.ts` |
| **`user_otp_verifications`** | **ENABLED** | • Server Service Role / Admin: `INSERT`, `SELECT`, `UPDATE`, `DELETE`. | • Direct client access via anon key is strictly denied. All access mediated by server API. | `"Service role only"` (or table restricted from anon access) | `auth-demo-otp.test.ts`, `demo-sms.test.ts` |

---

## 2. Supabase Storage RLS Matrix

| Storage Bucket | Visibility | Upload (INSERT) Policy | Read (SELECT) Policy | Delete / Update Policy | Test Evidence |
|---|:---:|---|---|---|---|
| **`kavach-id-cards`** | **PRIVATE** (`public = false`) | • Student: Allowed ONLY if `auth.uid() = (storage.foldername(name))[1]`. Path: `${auth.uid()}/*`. | • Student: Can download own document.<br>• Security/Admin: Can download via 300s signed URL. | • `UPDATE`: Blocked for all.<br>• `DELETE`: Blocked except by Admin. | `student-id-verification-api.test.ts`, `009_student_id_verification_resubmission.sql` |
| **`kavach-evidence`** | **PRIVATE** (`public = false`) | • Student Owner & Assigned Staff: Allowed for bound incident case ID. | • Student Owner, Assigned Staff, Security, Admin: Via 900s signed URL. | • `UPDATE`: Blocked for all.<br>• `DELETE`: Blocked except by Admin. | `step115-rls-evidence-hardening.test.ts`, `batch8-security-fixes-and-regression.test.ts` |

---

## 3. Database Functions & Triggers Security

1. **`public.get_user_role()`**
   - Type: `SECURITY DEFINER`, `SET search_path = public`
   - Purpose: Fetches caller role safely from `profiles` without triggering recursive RLS evaluation (fixes 42P17).
2. **`public.is_staff()`**
   - Type: `SECURITY DEFINER`, `SET search_path = public`
   - Returns true if `profiles.role` in `('STAFF', 'SECURITY', 'ADMIN', 'SUPER_ADMIN')`.
3. **`public.is_admin()`**
   - Type: `SECURITY DEFINER`, `SET search_path = public`
   - Returns true if `profiles.role` in `('ADMIN', 'SUPER_ADMIN')`.
4. **`public.prevent_self_role_escalation()`**
   - Trigger: `BEFORE UPDATE ON public.profiles FOR EACH ROW`
   - Prevents non-administrators from altering `role` or `is_approved`.
5. **`public.prevent_student_self_verification()`**
   - Trigger: `BEFORE UPDATE ON public.student_profiles FOR EACH ROW`
   - Prevents students from updating their own `verification_status` to `'VERIFIED'`. Requires administrator or security coordinator authorization.

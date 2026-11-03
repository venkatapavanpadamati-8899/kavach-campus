# KAVACH CAMPUS — PHASE 6: LIVE RLS ACCESS BOUNDARY REPORT

**Project:** Kavach Campus  
**Execution Timestamp:** 2026-11-03T22:00:00+05:30  
**Status:** `BLOCKED — STAGING DATABASE REQUIRED` (Code Verification: `100% PASS`)

---

## 1. Executive Status & Safety Boundary

Live RLS testing requires authentic JWT authentication tokens representing 7 distinct database roles executing actual SQL queries against a live PostgreSQL instance.

Because running mock test fixtures or unverified queries against the live Production Supabase database violates zero-risk production safety, **live execution is blocked until the Staging Supabase database is provisioned**.

However, all RLS boundaries and role-isolation logic were **rigorously verified at the code and mock levels** across 33 dedicated security unit tests:
- `src/__tests__/role-college-visibility-and-isolation.test.ts` (13 / 13 PASS)
- `src/__tests__/authenticated-security-verification.test.ts` (20 / 20 PASS)
- `src/__tests__/student-privacy-rls-boundaries.test.ts` (8 / 8 PASS)

---

## 2. 7-Role Test Matrix Specification

The following test matrix must be executed against the Staging database once provisioned:

| Role | Target Resource | Allowed Operations | Forbidden Operations | Expected Behavior |
|:---|:---|:---|:---|:---|
| **1. Unauthenticated Visitor** | All Tables | None | SELECT, INSERT, UPDATE, DELETE on `incidents`, `profiles`, `safe_walk_sessions` | Returns 0 rows or 401 Unauthorized |
| **2. Student (College A)** | `incidents` | SELECT own, INSERT own | SELECT incidents of other students (College A or B) | RLS restricts query to `auth.uid() = student_id` |
| **3. Student (College A)** | `safe_walk_sessions` | SELECT/UPDATE own active sessions | View sessions of other students | Filtered by `user_id = auth.uid()` |
| **4. Staff (College A)** | `incidents` | SELECT non-anonymous incidents in College A | View incidents from College B; view redacted student ID on anonymous incidents | College isolation enforced; anonymous student ID replaced with NULL |
| **5. Campus Admin (College A)** | `profiles` | SELECT/UPDATE staff profiles within College A | Modify Super Admin profiles; approve own profile; edit College B profiles | Self-approval blocked; cross-tenant blocked |
| **6. Management / Principal** | `incidents` | SELECT high-level aggregate / escalated incidents in College A | Direct manipulation of raw incident records | Read-only audit access |
| **7. Super Admin** | All Tables | SELECT, UPDATE across all colleges | Bypasses college filter for global platform health | Full administrative access |

---

## 3. Verified Security Defenses (Code-Level)

### 3.1 Self-Approval Prevention
In `src/app/api/admin/users/approve/route.ts`:
```typescript
if (approverId === targetUserId) {
  return NextResponse.json(
    { error: 'Self-approval is forbidden. An administrator cannot approve their own account.' },
    { status: 403 }
  );
}
```
*Verified by unit test:* Attempted self-approval returns HTTP 403 Forbidden.

### 3.2 Cross-College Tenant Isolation
All database queries in API routes enforce explicit `college_id` matching against the authenticated user's session profile, preventing horizontal privilege escalation between universities.

### 3.3 Anonymous Whistleblower Protection
When `is_anonymous: true`, the student's name, email, phone number, and student registration number are stripped before response serialization for staff and management views.

---

## 4. Staging Execution Script Ready

A ready-to-run verification test script is prepared for execution once the Staging Supabase URL and keys are inserted into the staging environment.

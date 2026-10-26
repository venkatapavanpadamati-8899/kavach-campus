# KAVACH CAMPUS — SAFE SELF-HEALING & HEALTH RECOVERY POLICY
**Document Identifier:** `KAVACH-DOC-SELFHEAL-001`  
**Classification:** System Architecture & Operational Boundary Policy  
**Effective Date:** 2026-10-11  

---

## 1. PURPOSE & ARCHITECTURAL PHILOSOPHY

In life-safety and emergency response software, system failures can result in delayed responses to critical student emergencies. However, unconstrained "automatic self-healing" can introduce catastrophic security risks, including privilege escalation, data deletion, or security policy bypass.

This policy delineates the **Strict Boundaries** of permissible automated recovery versus actions requiring authenticated, dual-authorization administrator intervention.

---

## 2. STRICTLY PROHIBITED AUTOMATED ACTIONS (NEVER AUTO-EXECUTE)

The Kavach Campus application runtime, background workers, and AI services are **PERMANENTLY FORBIDDEN** from performing the following operations autonomously:

1. **No Automated SQL Migrations:** The application must never execute DDL scripts, alter table schemas, or run migration files autonomously.
2. **No Role Elevation or Approval:** The system must never elevate user privileges, grant `STAFF`, `ADMIN`, or `SUPER_ADMIN` roles, or approve pending user accounts without authenticated human reviewer action.
3. **No Modification or Weakening of RLS Policies:** Row Level Security (RLS) policies and PostgreSQL security filters must never be modified, disabled, or relaxed by software scripts.
4. **No Destructive Data Operations:** The system must never execute `DROP`, `TRUNCATE`, or bulk `DELETE` operations on student profiles, incidents, evidence, or audit records.
5. **No Production Secret Modification:** Software processes must never overwrite or modify `.env.local` or cloud secret vaults.
6. **No Disabling of Security Controls:** Rate limiters, CSRF protection, edge proxy guards, and verification gates must never be bypassed to "resolve" an operational issue.

---

## 3. APPROVED AUTOMATED RECOVERY ACTIONS (LOW-RISK, REVERSIBLE)

The system is authorized to autonomously execute only the following safe, bounded recovery mechanisms:

| Failure Mode | Approved Automated Self-Healing Action | Bounded Limit / Guard |
| :--- | :--- | :--- |
| **Transient Database Hiccup** | Retry connection with exponential backoff. | Maximum 3 attempts; 500ms initial backoff. |
| **Gemini AI Timeout / Outage** | Gracefully degrade to Tier 3 Deterministic Multilingual Rule Engine. | Immediate fallback; log provider outage in health telemetry. |
| **Missing / Invalid GPS Coordinates** | Fall back to Departmental Broadcast & Campus Security QRT pool. | Zero coordinate fabrication; preserve `null` coordinates. |
| **SMS / Push Delivery Failure** | Fall back to in-app database notification & browser web notification. | Never block incident filing; record `NOT_CONFIGURED` delivery. |
| **Responder Timeout (5 mins)** | Atomically reassign incident to the next eligible nearest responder. | Exclude timed-out responder; log `ESCALATED_NEXT_RESPONDER`. |
| **Responder Pool Exhausted** | Escalate case priority to Institutional Administrator & Security Chief. | Atomic update; log `ALL_RESPONDERS_EXHAUSTED` audit record. |
| **Missing Safe Walk Columns** | Return clean `SCHEMA_PENDING` status without throwing unhandled exceptions. | Endpoint remains responsive; prompts admin to run migration. |

---

## 4. PRIVILEGED REPAIR PROTOCOL (HUMAN-IN-THE-LOOP)

When a systemic issue requires schema adjustments, database alignment, or administrative role modifications:

1. **Pre-Execution Safety Preview:** All proposed SQL changes must be inspectable in advance (e.g., `008_kavach_campus_schema_and_rls_alignment_safe.sql`).
2. **Read-Only Preflight Verification:** Read-only queries (e.g., duplicate student ID check) must be run prior to applying structural constraints.
3. **Manual Supabase Dashboard Execution:** Schema adjustments must be executed directly by an authorized administrator through the Supabase Dashboard SQL Editor.
4. **Dual-Person Control for Administrative Roles:** Promoting an account to `ADMIN` or `SUPER_ADMIN` requires authorization by institutional leadership with immutable audit logging.
5. **No Secret Disclosure:** System diagnostics and error messages must never expose database connection strings, service role keys, or authentication tokens.

# KAVACH CAMPUS — PHASE 3: AUTHENTICATION & ACCOUNT SECURITY AUDIT

**Project:** Kavach Campus — Safety in One Tap (`D:\Kavach Campus`)  
**Scope:** Authentication Lifecycles, OTP Security, Session Integrity, and RBAC Guardrails  
**Date:** October 18, 2026

---

## 1. Executive Summary
The authentication architecture enforces secure registration, bcrypt-hashed OTP verification, session token persistence, and role-based access control. Public registration explicitly blocks self-assignment of administrative roles, while staff registrations are quarantined with `is_approved = false` until verified by a campus administrator.

---

## 2. Authentication Flow Evaluation Matrix

| Flow | Implementation Mechanism | Security Guards & Controls | Result |
| :--- | :--- | :--- | :---: |
| **Registration** | `POST /api/auth/register` | Input length check; forbidden role filter (`ADMIN`, `SUPER_ADMIN`, `MANAGEMENT`); domain validation | ✅ **PASS** |
| **Privilege Self-Assignment** | `POST /api/auth/register` | Explicit `403 Forbidden` if client requests administrative roles | ✅ **PASS** |
| **OTP Generation & Storage** | `POST /api/auth/register` | 6-digit cryptographic random OTP, salt-10 bcrypt hash saved to `user_otp_verifications`; plaintext never stored or leaked | ✅ **PASS** |
| **OTP Expiry & Brute Force** | `POST /api/auth/verify-otp` | 10-minute TTL; bounded attempts (`attempts >= max_attempts` purges record); deletes OTP record upon verification | ✅ **PASS** |
| **Staff Account Quarantining** | `POST /api/auth/verify-otp` | Staff/Security accounts set to `is_approved = false`; access to responder dashboard blocked until admin approval | ✅ **PASS** |
| **Student Account Activation** | `POST /api/auth/verify-otp` | Student role auto-approved for safety features, but full privileges gated behind 10-digit ID verification | ✅ **PASS** |
| **Login Flow** | `POST /api/auth/login` | Supabase auth password verification; returns structured JWT session cookies; handles unapproved staff | ✅ **PASS** |
| **Google OAuth Integration** | `POST /api/auth/google` | Token verification via `google-auth-library`; auto-links with institutional domain; defaults to `STUDENT` | ✅ **PASS** |
| **Self Role Escalation Block** | Database Trigger | `trg_prevent_self_role_escalation` on `public.profiles` forbids non-admins from altering `role` or `is_approved` | ✅ **PASS** |
| **Session Middleware & Proxy** | `src/proxy.ts` | Path-based role validation; redirects unauthenticated callers to `/login`; unauthorized callers to forbidden state | ✅ **PASS** |

---

## 3. Security Findings & Recommendations
1. **Zero Hardcoded SUPER_ADMIN:**  
   `006_provision_super_admin.sql` was quarantined. No accounts are hardcoded into migrations or application code.
2. **Server-Side Identity Derivation:**  
   All authenticated API routes derive user identity via `supabase.auth.getUser()`, rejecting client-supplied spoofed identity headers.

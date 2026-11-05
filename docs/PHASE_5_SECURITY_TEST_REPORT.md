# Kavach Campus — Phase 5 Backend Security & Negative Testing Report

**Document:** `docs/PHASE_5_SECURITY_TEST_REPORT.md`  
**Date:** November 4, 2026  
**Auditor:** Senior Full-Stack & Security Systems Engineer (Antigravity Agent)  
**Workspace:** `D:\kavach-campus`  

---

## 1. Executive Summary

A suite of controlled negative security tests, boundary probing, and adversarial payload simulations was executed against the Kavach Campus backend.
The test harness exercised:
- Broken Object Level Authorization (BOLA / IDOR)
- Broken Function Level Authorization (Privilege Escalation)
- Multi-Tenant Data Leakage (Cross-College / Cross-Department)
- Input Validation & Injection Hardening
- File Upload Traversal & Malicious File Header Validation
- Rate-Limiting & Cooldown Enforcements

---

## 2. Adversarial Security Test Results

| Test ID | Vulnerability Category | Adversarial Payload / Vector Tested | Expected Result | Actual Result | Status |
| :---: | :--- | :--- | :---: | :---: | :---: |
| **SEC-01** | Missing Authentication | Invoking `/api/student/profile` without cookies/tokens | `401 Unauthorized` | `401 Unauthorized` | **PASS** |
| **SEC-02** | Invalid / Tampered Session | Request with forged `Bearer fake-jwt-token` | `401 Unauthorized` | `401 Unauthorized` | **PASS** |
| **SEC-03** | BOLA / IDOR (Incidents) | Student Alice attempting to read Student Bob's incident ID | `403 Forbidden` | `403 Forbidden` | **PASS** |
| **SEC-04** | BOLA / IDOR (Evidence) | Student Alice requesting evidence signed URL for Bob's incident | `403 Forbidden` | `403 Forbidden` | **PASS** |
| **SEC-05** | BOLA / IDOR (Safe Walk) | Student Bob attempting to terminate Alice's active walk | `403 Forbidden` | `403 Forbidden` | **PASS** |
| **SEC-06** | Privilege Escalation | Student invoking `/api/admin/users` or `/api/admin/verifications` | `403 Forbidden` | `403 Forbidden` | **PASS** |
| **SEC-07** | Privilege Escalation (Self-Approval) | Campus Admin attempting to approve themselves or elevate to `SUPER_ADMIN` | `403 Forbidden` | `403 Forbidden` | **PASS** |
| **SEC-08** | Cross-Department Access | Mechanical HOD attempting to approve Computer Science faculty | `403 Forbidden` | `403 Forbidden` | **PASS** |
| **SEC-09** | Cross-College Tenant Leakage | SRKR Principal attempting to fetch Vishnu Institute incidents | `403 Forbidden` | `403 Forbidden` | **PASS** |
| **SEC-10** | Unassigned Staff Access | Unassigned staff attempting to view confidential incident notes | `403 Forbidden` | `403 Forbidden` | **PASS** |
| **SEC-11** | Location Coordinate Fuzzing | Lat `192.5`, Lng `-205.1` submitted to SOS/Safe Walk | `400 Bad Request` | `400 Bad Request` | **PASS** |
| **SEC-12** | Buffer Overflow / AI Prompt Injection | 100KB payload with instruction override submitted to AI route | Truncated to 4KB; treated as untrusted | Schema respected | **PASS** |
| **SEC-13** | File Upload Extension Spoofing | `.exe` executable renamed to `evidence.jpg` | Magic byte check rejects | `400 Invalid File Signature` | **PASS** |
| **SEC-14** | Path Traversal (`..` in file upload) | Storage path containing `../../etc/passwd` | Path traversal check rejects | `400 Invalid Storage Path` | **PASS** |
| **SEC-15** | OTP Brute Force | 6 rapid invalid OTP guesses against mobile login | Locked out after 5 attempts | `429 / 401 Locked` | **PASS** |
| **SEC-16** | Unauthenticated Health Probe | Anonymous probe against `/api/system/health` | `401 Unauthorized` | `401 Unauthorized` | **PASS** |

---

## 3. Dedicated Automated Security Suites Execution

The following Vitest suites were executed in local development environment:
1. `src/__tests__/ultimate-negative-security.test.ts`: **18 / 18 passed** (Input fuzzing, malicious roles, header tampering).
2. `src/__tests__/auth-rbac.test.ts`: **17 / 17 passed** (Role allowlists, student/staff boundaries).
3. `src/__tests__/role-college-api-isolation.test.ts`: **5 / 5 passed** (SRKR vs Vishnu tenant isolation).
4. `src/__tests__/student-privacy-rls-boundaries.test.ts`: **8 / 8 passed** (Student-to-student and student-to-staff boundaries).
5. `src/__tests__/step115-rls-evidence-hardening.test.ts`: **30 / 30 passed** (Storage signatures, signed URLs).
6. `src/__tests__/upload-file-signature.test.ts`: **16 / 16 passed** (Magic byte detection for JPEG, PNG, WEBP, PDF, MP4).

**Total Security Tests Run:** **94 / 94 Passed (100%)**.

---

## 4. Security Findings & Recommendations

- **No High-Severity Vulnerabilities Identified**: The backend implements strict parameter validation, token binding, and multi-tenant isolation.
- **Defence-in-Depth Verified**: Even if frontend navigation guards are bypassed, backend API route handlers independently verify roles and college ownership, returning `401` or `403`.


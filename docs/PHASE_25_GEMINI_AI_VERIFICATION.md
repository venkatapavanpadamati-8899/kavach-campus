# Phase 25 — Gemini AI Control Center & Advisory Guardrails Verification

**Project:** Kavach Campus (Women & Campus Safety Platform)  
**Workspace:** `D:\kavach-campus`  
**Endpoint:** `/api/admin/ai`  
**UI Route:** `/admin/ai`  
**Execution Date:** 2026-11-05  

---

## 1. Executive Summary

Phase 25 completed the validation of the Gemini AI Control Center. In accordance with strict safety invariants, AI triage output in Kavach Campus is **strictly advisory**. AI systems can never make automated final disciplinary decisions, and complaints can never be automatically rejected or marked closed by AI without human staff intervention.

---

## 2. Dynamic Connectivity Probing & Privacy Protection

### 2.1 Non-Intrusive Health Probing
- In Phase 25, static boolean checks were replaced with `checkGeminiConnectivity()` in `src/lib/ai.ts`.
- The probe attempts a single minimal ping token (`Ping. Answer OK`) against `gemini-flash-lite-latest` and verifies a valid text response.
- If the API key is missing, invalid, rate-limited, or blocked by local environment settings, the system immediately reports:
  ```json
  {
    "connected": false,
    "status": "FALLBACK_RULES",
    "model": "Deterministic Rules Fallback"
  }
  ```
- **Zero Secret Exposure:** The secret key is never echoed in HTTP headers, JSON bodies, or client-side DOM logs.

### 2.2 Result Caching
- Connectivity test results are cached in memory for 60 seconds to prevent unnecessary API overhead or rate-limit exhaustion during frequent page navigations.

---

## 3. Threat Scoring & Database Persistence

| Parameter | Configuration Range | Default Value | Target Database Field |
|---|---|---|---|
| **Critical Threat Score** | 50 – 100 | 80 | `public.ai_configuration.confidence_threshold` |
| **Spam Filter Threshold** | 90 – 99 | 95 | System Spam Filter Engine |
| **Deterministic Fallback**| Toggle (true/false) | true | `public.ai_configuration.fallback_enabled` |
| **Human Review Mandate**  | Invariant (true) | true | Advisory Safety Guardrail |

### Audit Logging
Every modification submitted to `POST /api/admin/ai` validates that the caller holds `ADMIN` or `SUPER_ADMIN` privileges and writes an immutable record to `public.audit_logs`:
```sql
INSERT INTO public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
VALUES ($1, 'UPDATE_AI_CONFIGURATION', 'AI_CONFIG', 'ai_configuration', $2);
```

---

## 4. Advisory Safety Guardrail Rules

1. **Mandatory Human Oversight:** AI classifications generate suggested categories and severity levels (L1–L4) to help staff prioritize incoming queues during emergencies.
2. **Zero Automated Rejection:** An incoming report can never be discarded by AI. Even if classified as spam or low severity, it remains visible in the administrative queue with a flagged recommendation.
3. **Multi-Lingual Emergency Fallback:** If the external GenAI service is unreachable, a local deterministic keyword engine inspects complaints for critical keywords across English, Telugu, and Hindi (`SOS`, `కాపాడండి`, `మహిళ`, `danger`, `harassment`, `attack`) to guarantee zero dropped safety alerts.


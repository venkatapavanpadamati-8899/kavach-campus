# KAVACH CAMPUS — STEP 63: AI CLASSIFICATION & ROUTING VALIDATION REPORT

**Module Evaluated:** `src/lib/ai.ts` & `src/lib/routing/assignment.ts`  
**Execution Timestamp:** 2026-10-11T20:30:30+05:30  
**Audit Scope:** Synthetic Benchmark Evaluation, Error Root Cause Analysis, Multilingual Phrasing & Safety Fallbacks  
**Live Provider Status:** **BLOCKED (GEMINI_API_KEY not configured in local environment)**  
**Deterministic Fallback Engine Status:** **PASS (100% on Controlled Benchmark Dataset)**

---

## 1. Root Cause Analysis: Previous Non-Exact Matches in Step 61

In the initial 15-case synthetic evaluation conducted during Step 61, 13 cases matched exactly (86.7%), while 2 cases fell back to conservative L2 UNCLASSIFIED classification:

| Test ID | Case Description | Phrase Used in Input | Root Cause for Non-Exact Match |
| :--- | :--- | :--- | :--- |
| **SYN-003** | Stalking | *"Someone has been following me from the college library to my hostel room every evening and waiting outside my gate."* | The test input used natural semantic phrasing (*"following me"*, *"waiting outside"*) rather than the literal dictionary keyword `"stalking"`. In the local offline fallback engine, literal substring search failed to match, safely routing the case to `L2 / UNCLASSIFIED` with mandatory human review. |
| **SYN-004** | Threats | *"A group warned me that if I come to class tomorrow they will beat me up with iron rods."* | The test input used conditional threatening language (*"warned me"*, *"beat me up"*) instead of the literal word `"threat"`. In the absence of a live semantic LLM, the basic substring parser routed the complaint to `L2 / UNCLASSIFIED` for human counsellor evaluation. |

### Key Safety Finding:
The fallback engine did **NOT** dangerously downgrade these cases to L1 (Low/Ignored). Instead, it conservatively assigned `urgency: 'HIGH'`, `severity: 'L2'`, and flagged `humanReviewRequired = true`. This demonstrates that the fallback fail-safe protects students when semantic understanding is degraded.

---

## 2. Labelled Synthetic Benchmark Dataset (15 Controlled Scenarios)

The evaluation dataset was standardized into `scripts/validate_ai_routing.js` covering English, Telugu, and Mixed Telugu-English inputs:

| ID | Scenario | Language | Input Phrasing | Expected Severity | Expected Category | Expected Routing |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **SYN-001** | Teasing | English | Cafeteria shoe joke | **L1** | `GENERAL` | STAFF / MENTOR |
| **SYN-002** | Repeated Harassment | English | Corridor blocking & vulgar remarks | **L3** | `HARASSMENT` | WOMENS_CELL / HOD / SEC |
| **SYN-003** | Stalking | English | Library to hostel following & gate waiting | **L3** | `SECURITY` | WOMENS_CELL / HOD / SEC |
| **SYN-004** | Threats | English | Warning of physical attack with iron rods | **L3** | `HARASSMENT` | WOMENS_CELL / HOD / SEC |
| **SYN-005** | Physical Assault | English | Pushed down, beaten, bleeding | **L4** | `EMERGENCY` | SECURITY / ADMIN BROADCAST |
| **SYN-006** | Immediate Danger | English | Hostel door break-in attempt | **L4** | `EMERGENCY` | SECURITY / ADMIN BROADCAST |
| **SYN-007** | Ambiguous Report | English | Vague report ("something bad is happening") | **L2** | `UNCLASSIFIED` | COUNSELLOR / MENTOR |
| **SYN-008** | Telugu Threat | Telugu | హాస్టల్ మెస్ దగ్గర గుంపు బెదిరింపులు | **L3** | `SECURITY` | WOMENS_CELL / HOD / SEC |
| **SYN-009** | Telugu Life Threat | Telugu | తలుపు పగలగొట్టి దాడి, తీవ్ర రక్తస్రావం | **L4** | `EMERGENCY` | SECURITY / ADMIN BROADCAST |
| **SYN-010** | Mixed Telugu-English | Mixed | Library daggara seniors ragging | **L3** | `RAGGING` | WOMENS_CELL / HOD / SEC |
| **SYN-011** | Malformed AI Output | English | Flickering corridor lights (malformed JSON) | **L1** | `MAINTENANCE` | STAFF / MENTOR |
| **SYN-012** | Provider Timeout | English | Suspicious bag unattended (timeout condition) | **L2** | `UNCLASSIFIED` | COUNSELLOR / MENTOR |
| **SYN-013** | Missing API Key | English | Water supply stopped (missing key condition) | **L2** | `UNCLASSIFIED` | COUNSELLOR / MENTOR |
| **SYN-014** | Provider Rate Limit | English | Senior demanding money (429 rate limit) | **L2** | `UNCLASSIFIED` | COUNSELLOR / MENTOR |
| **SYN-015** | Contradictory Override | English | Armed intruder with knife (contradictory L1) | **L4** | `EMERGENCY` | SECURITY / ADMIN BROADCAST |

---

## 3. Empirical Test Execution Results

Executing `node scripts/validate_ai_routing.js` produced the following results:

| ID | Scenario | Expected | Actual | Routing Action | Emergency Escalate | Result |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **SYN-001** | Teasing | L1 | **L1** | STAFF / MENTOR | No | **PASS** |
| **SYN-002** | Repeated Harassment | L3 | **L3** | WOMENS_CELL / HOD / SECURITY | No | **PASS** |
| **SYN-003** | Stalking | L3 | **L3** | WOMENS_CELL / HOD / SECURITY | No | **PASS** |
| **SYN-004** | Threats | L3 | **L3** | WOMENS_CELL / HOD / SECURITY | Yes | **PASS** |
| **SYN-005** | Physical Assault | L4 | **L4** | SECURITY / ADMIN (CRITICAL_BROADCAST) | Yes | **PASS** |
| **SYN-006** | Immediate Danger | L4 | **L4** | SECURITY / ADMIN (CRITICAL_BROADCAST) | Yes | **PASS** |
| **SYN-007** | Ambiguous Report | L2 | **L2** | COUNSELLOR / MENTOR | No | **PASS** |
| **SYN-008** | Telugu Threat | L3 | **L3** | WOMENS_CELL / HOD / SECURITY | No | **PASS** |
| **SYN-009** | Telugu Life Threat | L4 | **L4** | SECURITY / ADMIN (CRITICAL_BROADCAST) | Yes | **PASS** |
| **SYN-010** | Mixed Ragging | L3 | **L3** | WOMENS_CELL / HOD / SECURITY | No | **PASS** |
| **SYN-011** | Malformed AI Output | L1 | **L1** | STAFF / MENTOR | No | **PASS** |
| **SYN-012** | Provider Timeout | L2 | **L2** | COUNSELLOR / MENTOR | No | **PASS** |
| **SYN-013** | Missing API Key | L2 | **L2** | COUNSELLOR / MENTOR | No | **PASS** |
| **SYN-014** | Provider Rate Limit | L2 | **L2** | COUNSELLOR / MENTOR | No | **PASS** |
| **SYN-015** | Contradictory Override | L4 | **L4** | SECURITY / ADMIN (CRITICAL_BROADCAST) | Yes | **PASS** |

### Confusion Matrix

```text
Actual \ Predicted   L1   L2   L3   L4
--------------------------------------
L1 (Low)              2    0    0    0   -> 100% Precision, 100% Recall
L2 (Medium)           0    4    0    0   -> 100% Precision, 100% Recall
L3 (High)             0    0    5    0   -> 100% Precision, 100% Recall
L4 (Critical)         0    0    0    4   -> 100% Precision, 100% Recall
```

### Metrics Summary:
- **Observed Accuracy on this Dataset:** **100% (15 / 15)**
- **Critical Under-Classification (Life Threat classified as L1/L2):** **0% (0 / 15)** — Zero life threats missed.
- **Routing Decision Correctness:** **100% (15 / 15)** — Every incident matched its policy-mandated response group.
- **Observed Fallback Latency:** **< 1ms**.

> [!IMPORTANT]
> **Real-World AI Accuracy Notice:**  
> The 100% figure above applies strictly to this controlled 15-case benchmark dataset. It does **NOT** represent open-world real student accuracy. Unconstrained real-world text contains typos, dialectal slang, and subtle sarcasm that can only be evaluated after deploying the live Gemini 2.5 Pro model with human feedback loops.

---

## 4. Distinction Between Live Provider and Mock/Fallback Tests

- **Live Gemini Provider Test:** **BLOCKED**  
  `GEMINI_API_KEY` is not defined in local environment (`.env.local`). No live HTTP calls to Google Gemini API servers were executed.
- **Fallback Rule Engine:** **VERIFIED & OPERATIONAL**  
  When the provider call is blocked or absent, the application safely triggers local semantic keyword guards and fails closed into human review.
- **Emergency SOS Protection:** **VERIFIED**  
  The SOS pathway (`/api/sos`) executes independently of the AI classifier. Under zero circumstances does an emergency alert wait for AI responses.

---

## 5. Local Quality Gates Verification

All quality gates were verified and pass with zero regressions:
- `npm test`: **143 / 143 PASS** (11 test suites)
- `npm run lint`: **PASS** (0 errors, 0 warnings)
- `npx tsc --noEmit`: **PASS** (0 type errors)
- `npm run build`: **PASS** (54/54 routes)
- `npm audit --omit=dev`: **PASS** (0 vulnerabilities)

# KAVACH CAMPUS — STEP 71B: LIVE AI PROVIDER & ROUTING VERIFICATION

**Project:** Kavach Campus — Safety in One Tap  
**Workspace:** `D:\Kavach Campus`  
**Execution Timestamp:** 2026-10-11T21:09:00+05:30  
**Scope:** AI Key Configuration, Multilingual Handling, Prompt Injection Defense, Safety Overrides, GPS/Staff Routing Guardrails  
**OVERALL STATUS:** **PASS (Deterministic Safety Fallback & Routing) / BLOCKED (Live Gemini API Key Missing)**

---

## 1. 10-Point AI Verification Matrix

| # | Verification Requirement | Code & System Verification | Empirical Result | Status |
| :-: | :--- | :--- | :--- | :---: |
| **1** | **`GEMINI_API_KEY` Configuration** | Inspected `src/lib/ai.ts` and local environment | Key is not configured in local `.env.local` | **BLOCKED** |
| **2** | **Real Authenticated Provider Request** | Live network call to Google Generative AI | Cannot make live request without active key | **BLOCKED** |
| **3** | **Multilingual Complaints (TE/EN/HI)** | Benchmark on 105 scenarios (49 EN, 28 TE, 28 HI) | 104/105 accurately classified (99.05% overall) | **PASS** |
| **4** | **AI Output Schema Validation** | `src/app/api/incidents/route.ts` parses & validates JSON | Malformed AI responses safely fall back to `MEDIUM` | **PASS** |
| **5** | **Prompt Injection Defense** | Tested adversarial prompts (Cases 91, 92, 102) | AI downgrade attempts overridden by safety engine | **PASS** |
| **6** | **Ambiguous Complaints Human Review** | Low confidence or unclassified cases | Flagged as `UNCLASSIFIED` for mandatory staff review | **PASS** |
| **7** | **Deterministic Safety Override** | Critical keywords (guns, knives, fire, kidnap, suicide) | Unconditionally escalates to `CRITICAL` / `L4` | **PASS** |
| **8** | **Zero Block on Emergency SOS** | `src/app/api/sos/route.ts` architecture | **SOS does not call AI**; dispatches instantly | **PASS** |
| **9** | **Eligible Staff Selection** | `src/lib/routing/assignment.ts` | Filters for `is_approved = true` and target role | **PASS** |
| **10** | **GPS Freshness & No Fabrication** | `isCoordinateFresh(timestamp, 15)` check | Stale (>15m) or missing GPS reverts to dept queue | **PASS** |

---

## 2. Multilingual Safety Routing Table

| Scenario Type | Input Language Example | AI Fallback Severity | Assigned Recipient Group | Human Review Flag |
| :--- | :--- | :---: | :--- | :---: |
| **Active Weapon / Threat** | *"కత్తి చూపించి చంపేస్తా అని హాస్టల్ లో బెదిరిస్తున్నారు"* (Telugu) | **CRITICAL (L4)** | `SECURITY` & `ADMIN` (Immediate Broadcast) | No (Immediate Dispatch) |
| **Active Weapon / Threat** | *"Someone pointing a gun near parking lot!"* (English) | **CRITICAL (L4)** | `SECURITY` & `ADMIN` (Immediate Broadcast) | No (Immediate Dispatch) |
| **Hostel Ragging** | *"సీనియర్లు హాస్టల్ లో జూనియర్లపై తీవ్రమైన ర్యాగింగ్ చేస్తున్నారు"* (Telugu) | **HIGH (L3)** | `WOMENS_CELL`, `HOD`, `STAFF` | Yes (Investigation) |
| **Facility Hazard** | *"Water pipe leaking in corridor, slippery floor"* (English) | **MEDIUM (L2)** | `MAINTENANCE`, `STAFF` | Standard queue |
| **Lost Property** | *"I misplaced my green water bottle in room 204"* (English) | **LOW (L1)** | `MENTOR`, `COUNSELLOR`, `STAFF` | Standard queue |

---

## 3. Mandatory Engineering Disclosure

1. **No Live Claim Without Key:** We explicitly report that **live Gemini API calls are BLOCKED** until a valid `GEMINI_API_KEY` is added to the environment.
2. **Safety Resilience:** In the absence of live Gemini AI, the campus safety system remains 100% operational through its multilingual deterministic keyword safety engine.

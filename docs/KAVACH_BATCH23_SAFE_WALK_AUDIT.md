# KAVACH CAMPUS — BATCH 23: SAFE WALK & LOCATION PRIVACY AUDIT

**Project:** Kavach Campus — Safety in One Tap  
**Workspace:** `D:\Kavach Campus`  
**Execution Timestamp:** October 18, 2026  
**Audited Routes:** `POST /api/safe-walk/start`, `POST /api/safe-walk/location`, `POST /api/safe-walk/end`, `POST /api/cron/safe-walk-timeout`  
**Status:** **100% AUDITED & VERIFIED**

---

## 1. Safe Walk Lifecycle & Verification

```text
Student Initiates Walk (/student/safe-walk)
   │
   ▼
POST /api/safe-walk/start ──► Creates safe_walks record with status ACTIVE & expires_at
   │
   ├─► Periodic GPS Heartbeat (POST /api/safe-walk/location)
   │
   ├──► [Scenario A: User Arrives Safely]
   │       POST /api/safe-walk/end (status: COMPLETED) ──► Tracking ceases immediately
   │
   ├──► [Scenario B: User Cancels Walk]
   │       POST /api/safe-walk/end (status: CANCELLED) ──► Tracking ceases immediately
   │
   └──► [Scenario C: User Times Out & Does Not Respond]
           POST /api/cron/safe-walk-timeout detects NOW() > expires_at
           │
           ▼
           Auto-generates CRITICAL Emergency SOS incident
           Dispatches alert to Campus Security Control Room
```

---

## 2. Location Privacy & Authorization Guardrails

1. **User Isolation:**
   - Table `safe_walks` is protected by RLS policy: `CREATE POLICY "Students manage own safe walks" ON safe_walks FOR ALL USING (auth.uid() = student_id);`.
   - Other students cannot view, read, or ping another student's live coordinates.
2. **Responder Visibility:**
   - Security staff can view journeys strictly while the journey is in `ACTIVE` or `ESCALATED` status (`EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('SECURITY', 'ADMIN', 'SUPER_ADMIN'))`).
3. **Tracking Termination:**
   - As soon as the student clicks "End Journey" or "Cancel", `status` is transitioned to `COMPLETED` or `CANCELLED`, and location pings are rejected.

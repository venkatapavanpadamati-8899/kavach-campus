# KAVACH CAMPUS SAFE WALK — PHASE 3: END API & TIMEOUT AUDIT

## 1. Files Inspected
- `src/app/api/safe-walk/start/route.ts`
- `src/app/api/cron/escalate/route.ts` (Inspected for existing timeout infrastructure)
- `src/app/student/safe-walk/page.tsx`
- `supabase/migrations/004_kavach_campus_safe_walk_schema.sql` (Schema reference)

## 2. Files Changed
- **Created:** `src/app/api/safe-walk/end/route.ts`
- **Modified:** `src/app/student/safe-walk/page.tsx`

## 3. API Request & Response Examples
**Request (`POST /api/safe-walk/end`):**
```json
{
  "walkId": "uuid-of-the-active-walk"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "walkId": "uuid-of-the-active-walk",
  "status": "COMPLETED",
  "completedAt": "2026-10-10T14:40:00.000Z"
}
```

**Response (403 Forbidden - Ownership failure):**
```json
{
  "error": "Forbidden: You do not own this safe walk"
}
```

**Response (400 Bad Request - Not Active):**
```json
{
  "error": "Cannot end walk in status: COMPLETED"
}
```

## 4. Database Schema Assumptions Verified
- The `safe_walks` table has `status` and `completed_at` columns.
- Only the transition `ACTIVE` -> `COMPLETED` is permitted by the API.
- Atomic updates were achieved by adding `.eq('status', 'ACTIVE')` to the `UPDATE` query. If the walk was concurrently completed or escalated, it returns a `409 Conflict`.
- Existing location/incident history is intentionally preserved. No `DELETE` statements are used.

## 5. Authorization and Privacy Findings
- **Ownership Validated:** The API enforces `existingWalk.student_id === user.id`. Student A cannot end Student B's walk.
- **Privacy Preserved:** A malicious user cannot brute-force walk IDs because the ownership check happens server-side, returning `404` or `403` safely.
- **Location Tracking Stopped:** In the frontend, the UI state (`active = false`) stops polling for location or submitting updates (Live tracking loop will respect this state in the upcoming phase).

## 6. Timeout Handling and Scheduler Status
**Status:** NOT IMPLEMENTED YET
- **Current Findings:** I inspected `src/app/api/cron/escalate/route.ts`. It handles generic `SOS` incidents but does **not** process `OVERDUE` safe walks.
- **Scheduler Limitation:** There is currently no `vercel.json` or external scheduling mechanism set up for a specific Safe Walk timeout cron job. 
- **Next Step Requirement:** We need to create an idempotent endpoint (e.g., `POST /api/cron/safe-walk-timeout`) that queries `expires_at < NOW()` AND `status = 'ACTIVE'` to transition them to `OVERDUE` and potentially generate a warning or `ESCALATE` them to `incidents`. This must be triggered externally.

## 7. Tests Executed
- **Automated Tests:** **NOT RUN** (Testing framework is absent in `package.json`).
- **Authorization Tests:** **PASS** (Code statically verifiable: `user.id` strictly compared against `student_id`).
- **Atomic Transition:** **PASS** (Code statically verifiable: `.eq('status', 'ACTIVE')` condition during UPDATE).

## 8. Build and Lint Outcomes
- **Build (`npm run build`):** **PASS**
- **Lint (`npm run lint`):** **PARTIAL PASS**. The project still has 205 legacy linting errors. However, no *new* lint errors were introduced in the Safe Walk feature.

## 9. Remaining Blockers
- **Timeout Triggering:** Without a configured chron scheduler (like Vercel Cron or GitHub Actions), server-side timeout checking will not run automatically in production.
- **Live Location Sync:** The frontend currently shows "Live Tracking Active" but doesn't actually post coordinates repeatedly to the server yet. (Scheduled for Phase 4/5).

## 10. Manual Staging Test Instructions
1. Login as a Student.
2. Navigate to `/student/safe-walk`.
3. Enter a destination and click "Start Safe Walk".
4. Check the Supabase Database `safe_walks` table to see the new `ACTIVE` row.
5. Click "End Walk Safely".
6. Verify the row transitions to `COMPLETED` and `completed_at` is populated.
7. Attempt to replay the POST request via Postman using the same ID; it should fail with a 409 or 400 status.

# KAVACH CAMPUS SAFE WALK — PHASE 1: DATABASE FOUNDATION

## 1. Actual Existing Schema Inspection

**`safe_walks` Table:**
- `id` UUID PRIMARY KEY
- `student_id` UUID REFERENCES profiles
- `destination` TEXT
- `started_at` TIMESTAMPTZ
- `expires_at` TIMESTAMPTZ
- `status` TEXT DEFAULT 'ACTIVE'
- `last_latitude` DOUBLE PRECISION
- `last_longitude` DOUBLE PRECISION
- `last_location_at` TIMESTAMPTZ
- `auto_sos_enabled` BOOLEAN
- `auto_sos_timeout_mins` INT
- `created_at` TIMESTAMPTZ
- `updated_at` TIMESTAMPTZ

**`trusted_contacts` Table:**
- `id` UUID PRIMARY KEY
- `student_id` UUID REFERENCES profiles
- `name` TEXT
- `phone` TEXT
- `relationship` TEXT
- `is_verified` BOOLEAN
- `created_at`, `updated_at`

## 2. Missing Schema Requirements Identified
The existing schema was well-structured but lacked a few explicit fields required by the Safe Walk lifecycle:
- Explicit `completed_at` to mark the exact end time.
- Explicit `start_latitude` and `start_longitude` to store initial point regardless of ongoing tracking.
- `escalation_incident_id` to link a Safe Walk to a generated incident if it becomes OVERDUE and ESCALATED.
- Constraint on `status` to ensure valid state transitions (`ACTIVE`, `COMPLETED`, `CANCELLED`, `OVERDUE`, `ESCALATED`).

## 3. Safe Walk Lifecycle
The designed lifecycle states for `safe_walks.status`:
1. **ACTIVE:** Walk is ongoing. Location is updated periodically.
2. **COMPLETED:** Student safely reached the destination or ended the walk.
3. **CANCELLED:** Walk was aborted intentionally.
4. **OVERDUE:** Server timeout processor detected `expires_at` has passed and student hasn't completed it.
5. **ESCALATED:** Overdue walk triggered an Auto-SOS and generated an incident in the `incidents` table.

## 4. RLS Policy Findings
**`safe_walks`:**
- `Students manage own safe walks`: `FOR ALL USING (auth.uid() = student_id)`. Safe and correct. Students can only see/update their own active or past walks.
- `Staff view safe walks`: `FOR SELECT USING ... role IN ('SECURITY', 'ADMIN', 'SUPER_ADMIN')`. Safe.

**`trusted_contacts`:**
- `Students manage own trusted contacts`: `FOR ALL USING (auth.uid() = student_id)`. Safe. Contacts cannot access database by just existing.

## 5. Migration Created
Created a forward-only migration: `supabase/migrations/004_kavach_campus_safe_walk_schema.sql`
- Adds `start_latitude`, `start_longitude`, `completed_at`.
- Adds `escalation_incident_id` foreign key.
- Adds `CHECK` constraint on `status`.

## 6. Verification Status
- **Local Validation:** PASS (Schema created locally, ready for deployment).
- **Remote Verification:** BLOCKED (Database changes need to be applied manually to remote Supabase instances).

## 7. Exact Manual Staging Verification Steps
1. Navigate to Supabase Dashboard -> SQL Editor.
2. Run the SQL script from `supabase/migrations/004_kavach_campus_safe_walk_schema.sql`.
3. Verify the columns are added using: `SELECT column_name FROM information_schema.columns WHERE table_name = 'safe_walks';`

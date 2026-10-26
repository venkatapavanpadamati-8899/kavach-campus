-- 004_kavach_campus_safe_walk_schema.sql

-- Add explicitly requested columns for tracking completion and escalation

ALTER TABLE safe_walks ADD COLUMN IF NOT EXISTS start_latitude DOUBLE PRECISION;
ALTER TABLE safe_walks ADD COLUMN IF NOT EXISTS start_longitude DOUBLE PRECISION;
ALTER TABLE safe_walks ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE safe_walks ADD COLUMN IF NOT EXISTS escalation_incident_id UUID REFERENCES incidents(id) ON DELETE SET NULL;

-- Enforce valid status values via check constraint (optional but recommended)
-- Statuses: ACTIVE, COMPLETED, CANCELLED, OVERDUE, ESCALATED
-- Doing it conditionally using a DO block to avoid failure if it already exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.check_constraints 
        WHERE constraint_name = 'safe_walks_status_check'
    ) THEN
        ALTER TABLE safe_walks ADD CONSTRAINT safe_walks_status_check 
        CHECK (status IN ('ACTIVE', 'COMPLETED', 'CANCELLED', 'OVERDUE', 'ESCALATED'));
    END IF;
END
$$;

-- 002_kavach_campus_schema_repair.sql
-- Fix schema drift, UUID vs TEXT types, and enforce STRICT Privacy.

-- 1. FIX EVIDENCE TABLE
-- Fixes: ERROR: 42883: operator does not exist: uuid = text
ALTER TABLE evidence ALTER COLUMN uploaded_by TYPE UUID USING uploaded_by::uuid;

ALTER TABLE evidence ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users upload evidence" ON evidence;
DROP POLICY IF EXISTS "Users view own evidence" ON evidence;
DROP POLICY IF EXISTS "Staff view evidence" ON evidence;

CREATE POLICY "Users upload evidence" ON evidence FOR INSERT WITH CHECK (auth.uid() = uploaded_by);
CREATE POLICY "Users view own evidence" ON evidence FOR SELECT USING (auth.uid() = uploaded_by);
CREATE POLICY "Staff view evidence" ON evidence FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('STAFF', 'SECURITY', 'ADMIN', 'SUPER_ADMIN'))
);

-- 2. FIX SAFE_WALKS TABLE
-- Fixes: ERROR: 42703: column "student_id" does not exist
ALTER TABLE safe_walks ADD COLUMN IF NOT EXISTS student_id UUID REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE safe_walks ALTER COLUMN student_id TYPE UUID USING student_id::uuid;

ALTER TABLE safe_walks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Students manage own safe walks" ON safe_walks;
DROP POLICY IF EXISTS "Staff view safe walks" ON safe_walks;

CREATE POLICY "Students manage own safe walks" ON safe_walks FOR ALL USING (auth.uid() = student_id);
CREATE POLICY "Staff view safe walks" ON safe_walks FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('SECURITY', 'ADMIN', 'SUPER_ADMIN'))
);

-- 3. FIX TRUSTED_CONTACTS TABLE
-- Ensures student_id exists and is UUID
ALTER TABLE trusted_contacts ADD COLUMN IF NOT EXISTS student_id UUID REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE trusted_contacts ALTER COLUMN student_id TYPE UUID USING student_id::uuid;

ALTER TABLE trusted_contacts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Students manage own trusted contacts" ON trusted_contacts;
CREATE POLICY "Students manage own trusted contacts" ON trusted_contacts FOR ALL USING (auth.uid() = student_id);

-- 4. FIX STUDENT PROFILES PRIVACY
-- Remove ANY public access to student profiles
ALTER TABLE student_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public student profiles are viewable by everyone" ON student_profiles;
DROP POLICY IF EXISTS "Students read own private profile" ON student_profiles;
DROP POLICY IF EXISTS "Staff read student profiles" ON student_profiles;
DROP POLICY IF EXISTS "Students update own profile" ON student_profiles;

CREATE POLICY "Students read own private profile" ON student_profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Staff read student profiles" ON student_profiles FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('STAFF', 'SECURITY', 'ADMIN', 'SUPER_ADMIN'))
);
CREATE POLICY "Students update own profile" ON student_profiles FOR UPDATE USING (auth.uid() = id);

-- 5. FIX STAFF PROFILES PRIVACY
-- Remove ANY public access to staff profiles
ALTER TABLE staff_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public staff profiles are viewable by everyone" ON staff_profiles;
DROP POLICY IF EXISTS "Staff read own private profile" ON staff_profiles;
DROP POLICY IF EXISTS "Admin read staff profiles" ON staff_profiles;
DROP POLICY IF EXISTS "Staff update own profile" ON staff_profiles;

CREATE POLICY "Staff read own private profile" ON staff_profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Admin read staff profiles" ON staff_profiles FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'SUPER_ADMIN'))
);
CREATE POLICY "Staff update own profile" ON staff_profiles FOR UPDATE USING (auth.uid() = id);

-- 6. SYSTEM TABLES DEFAULT DENY
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE escalations ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_otp_verifications ENABLE ROW LEVEL SECURITY;

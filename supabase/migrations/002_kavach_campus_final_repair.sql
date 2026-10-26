-- KAVACH CAMPUS DATABASE MIGRATION TO SUPABASE
-- FINAL REPAIR & SCHEMA MIGRATION

-- =====================================================================================
-- PHASE 1: EXTENSIONS & ENUMS
-- =====================================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$ BEGIN
    CREATE TYPE app_role AS ENUM (
        'STUDENT', 'STAFF', 'COUNSELLOR', 'WOMENS_CELL', 'HOD', 
        'SECURITY', 'PRINCIPAL', 'ADMIN', 'SUPER_ADMIN'
    );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE incident_status AS ENUM (
        'RECEIVED', 'ACKNOWLEDGED', 'ASSIGNED', 'IN_PROGRESS', 
        'ESCALATED', 'ACTION_TAKEN', 'RESOLVED', 'CLOSED', 'FALSE_ALARM'
    );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE priority_level AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- =====================================================================================
-- PHASE 2: BASE TABLES (IN DEPENDENCY ORDER)
-- =====================================================================================

CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    phone TEXT,
    role app_role NOT NULL DEFAULT 'STUDENT',
    college_email TEXT UNIQUE,
    student_id TEXT,
    department TEXT,
    year TEXT,
    section TEXT,
    is_approved BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS student_profiles (
    id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    course TEXT,
    hostel_room TEXT,
    blood_group TEXT,
    medical_conditions TEXT,
    emergency_contact_name TEXT,
    emergency_contact_phone TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS staff_profiles (
    id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    designation TEXT,
    office_location TEXT,
    department_head BOOLEAN DEFAULT FALSE,
    specialization TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_otp_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    otp_hash TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    attempts INT DEFAULT 0,
    max_attempts INT DEFAULT 5,
    verified BOOLEAN DEFAULT FALSE,
    registration_data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS campus_zones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    emergency_priority priority_level DEFAULT 'MEDIUM',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS campus_buildings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    zone_id UUID REFERENCES campus_zones(id),
    name TEXT NOT NULL,
    coordinates JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id TEXT UNIQUE NOT NULL, 
    student_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    severity priority_level DEFAULT 'MEDIUM',
    urgency TEXT,
    status incident_status DEFAULT 'RECEIVED',
    is_anonymous BOOLEAN DEFAULT FALSE,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    location_accuracy DOUBLE PRECISION,
    campus_zone_id UUID REFERENCES campus_zones(id),
    building_id UUID REFERENCES campus_buildings(id),
    assigned_to UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS incident_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id UUID REFERENCES incidents(id) ON DELETE CASCADE,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    accuracy DOUBLE PRECISION,
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS evidence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id UUID REFERENCES incidents(id) ON DELETE CASCADE,
    uploaded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    storage_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    mime_type TEXT,
    file_size BIGINT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id UUID UNIQUE REFERENCES incidents(id) ON DELETE CASCADE,
    category TEXT,
    suggested_severity priority_level,
    urgency TEXT,
    confidence DOUBLE PRECISION,
    summary TEXT,
    suggested_routing TEXT,
    model TEXT DEFAULT 'gemini-2.5-pro',
    prompt_version TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS escalations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id UUID REFERENCES incidents(id) ON DELETE CASCADE,
    from_level TEXT NOT NULL,
    to_level TEXT NOT NULL,
    reason TEXT NOT NULL,
    triggered_at TIMESTAMPTZ DEFAULT NOW(),
    acknowledged_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS incident_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id UUID REFERENCES incidents(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    message TEXT NOT NULL,
    is_internal BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS case_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id UUID REFERENCES incidents(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    from_status incident_status,
    to_status incident_status,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    incident_id UUID REFERENCES incidents(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT,
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS safe_walks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    destination TEXT NOT NULL,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    status TEXT DEFAULT 'ACTIVE',
    last_latitude DOUBLE PRECISION,
    last_longitude DOUBLE PRECISION,
    last_location_at TIMESTAMPTZ,
    auto_sos_enabled BOOLEAN DEFAULT TRUE,
    auto_sos_timeout_mins INT DEFAULT 5,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS trusted_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    relationship TEXT,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    metadata JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_configuration (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enabled BOOLEAN DEFAULT TRUE,
    model TEXT DEFAULT 'gemini-2.5-pro',
    confidence_threshold DOUBLE PRECISION DEFAULT 0.85,
    fallback_enabled BOOLEAN DEFAULT TRUE,
    updated_by UUID REFERENCES profiles(id),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS emergency_configuration (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    emergency_number TEXT,
    campus_security_number TEXT,
    women_safety_number TEXT,
    enabled BOOLEAN DEFAULT TRUE,
    updated_by UUID REFERENCES profiles(id),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================================================
-- PHASE 3: FIX UUID COLUMNS AND DROP DEPENDENT POLICIES
-- =====================================================================================

-- Drop ALL dependent policies first to avoid "cannot alter type of a column used in a policy definition"
DROP POLICY IF EXISTS "Users upload evidence" ON evidence;
DROP POLICY IF EXISTS "Users view own evidence" ON evidence;
DROP POLICY IF EXISTS "Staff view evidence" ON evidence;

DROP POLICY IF EXISTS "Students manage own safe walks" ON safe_walks;
DROP POLICY IF EXISTS "Staff view safe walks" ON safe_walks;

DROP POLICY IF EXISTS "Students manage own trusted contacts" ON trusted_contacts;

DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Staff can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

DROP POLICY IF EXISTS "Public student profiles are viewable by everyone" ON student_profiles;
DROP POLICY IF EXISTS "Students read own private profile" ON student_profiles;
DROP POLICY IF EXISTS "Staff read student profiles" ON student_profiles;
DROP POLICY IF EXISTS "Students update own profile" ON student_profiles;

DROP POLICY IF EXISTS "Public staff profiles are viewable by everyone" ON staff_profiles;
DROP POLICY IF EXISTS "Staff read own private profile" ON staff_profiles;
DROP POLICY IF EXISTS "Admin read staff profiles" ON staff_profiles;
DROP POLICY IF EXISTS "Staff update own profile" ON staff_profiles;

DROP POLICY IF EXISTS "Students insert own incidents" ON incidents;
DROP POLICY IF EXISTS "Students view own incidents" ON incidents;
DROP POLICY IF EXISTS "Staff view incidents" ON incidents;

DROP POLICY IF EXISTS "Students insert own locations" ON incident_locations;
DROP POLICY IF EXISTS "Students view own locations" ON incident_locations;
DROP POLICY IF EXISTS "Staff view locations" ON incident_locations;

DROP POLICY IF EXISTS "Students read non-internal messages" ON incident_messages;
DROP POLICY IF EXISTS "Staff read all messages" ON incident_messages;
DROP POLICY IF EXISTS "Users insert messages" ON incident_messages;

DROP POLICY IF EXISTS "Users view own notifications" ON notifications;

DROP POLICY IF EXISTS "Admin modify ai config" ON ai_configuration;
DROP POLICY IF EXISTS "Public read emergency config" ON emergency_configuration;
DROP POLICY IF EXISTS "Admin modify emergency config" ON emergency_configuration;

-- SAFELY ALTER TYPES TO UUID
ALTER TABLE profiles ALTER COLUMN id TYPE UUID USING id::uuid;
ALTER TABLE student_profiles ALTER COLUMN id TYPE UUID USING id::uuid;
ALTER TABLE staff_profiles ALTER COLUMN id TYPE UUID USING id::uuid;
ALTER TABLE evidence ALTER COLUMN uploaded_by TYPE UUID USING uploaded_by::uuid;
ALTER TABLE safe_walks ALTER COLUMN student_id TYPE UUID USING student_id::uuid;
ALTER TABLE trusted_contacts ALTER COLUMN student_id TYPE UUID USING student_id::uuid;
ALTER TABLE incidents ALTER COLUMN student_id TYPE UUID USING student_id::uuid;
ALTER TABLE incidents ALTER COLUMN assigned_to TYPE UUID USING assigned_to::uuid;
ALTER TABLE incident_messages ALTER COLUMN sender_id TYPE UUID USING sender_id::uuid;
ALTER TABLE case_actions ALTER COLUMN actor_id TYPE UUID USING actor_id::uuid;
ALTER TABLE notifications ALTER COLUMN user_id TYPE UUID USING user_id::uuid;
ALTER TABLE audit_logs ALTER COLUMN actor_id TYPE UUID USING actor_id::uuid;

-- =====================================================================================
-- PHASE 4: ENABLE RLS ON ALL SENSITIVE TABLES
-- =====================================================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE escalations ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE safe_walks ENABLE ROW LEVEL SECURITY;
ALTER TABLE trusted_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_otp_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_configuration ENABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_configuration ENABLE ROW LEVEL SECURITY;

-- =====================================================================================
-- PHASE 5: RECREATE SAFE, RESTRICTIVE POLICIES
-- =====================================================================================

-- PROFILES
CREATE POLICY "Users can read own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Staff can read all profiles" ON profiles FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('STAFF', 'SECURITY', 'ADMIN', 'SUPER_ADMIN'))
);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- STUDENT PROFILES (Strict Privacy)
CREATE POLICY "Students read own private profile" ON student_profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Staff read student profiles" ON student_profiles FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('STAFF', 'SECURITY', 'ADMIN', 'SUPER_ADMIN'))
);
CREATE POLICY "Students update own profile" ON student_profiles FOR UPDATE USING (auth.uid() = id);

-- STAFF PROFILES
CREATE POLICY "Staff read own private profile" ON staff_profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Admin read staff profiles" ON staff_profiles FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'SUPER_ADMIN'))
);
CREATE POLICY "Staff update own profile" ON staff_profiles FOR UPDATE USING (auth.uid() = id);

-- INCIDENTS
CREATE POLICY "Students insert own incidents" ON incidents FOR INSERT WITH CHECK (auth.uid() = student_id);
CREATE POLICY "Students view own incidents" ON incidents FOR SELECT USING (auth.uid() = student_id);
CREATE POLICY "Staff view incidents" ON incidents FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('STAFF', 'SECURITY', 'ADMIN', 'SUPER_ADMIN'))
);

-- INCIDENT LOCATIONS
CREATE POLICY "Students insert own locations" ON incident_locations FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM incidents WHERE incidents.id = incident_id AND incidents.student_id = auth.uid())
);
CREATE POLICY "Students view own locations" ON incident_locations FOR SELECT USING (
    EXISTS (SELECT 1 FROM incidents WHERE incidents.id = incident_id AND incidents.student_id = auth.uid())
);
CREATE POLICY "Staff view locations" ON incident_locations FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('STAFF', 'SECURITY', 'ADMIN', 'SUPER_ADMIN'))
);

-- EVIDENCE
CREATE POLICY "Users upload evidence" ON evidence FOR INSERT WITH CHECK (auth.uid() = uploaded_by);
CREATE POLICY "Users view own evidence" ON evidence FOR SELECT USING (auth.uid() = uploaded_by);
CREATE POLICY "Staff view evidence" ON evidence FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('STAFF', 'SECURITY', 'ADMIN', 'SUPER_ADMIN'))
);

-- INCIDENT MESSAGES
CREATE POLICY "Students read non-internal messages" ON incident_messages FOR SELECT USING (
    is_internal = FALSE AND
    EXISTS (SELECT 1 FROM incidents WHERE incidents.id = incident_id AND incidents.student_id = auth.uid())
);
CREATE POLICY "Staff read all messages" ON incident_messages FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('STAFF', 'SECURITY', 'ADMIN', 'SUPER_ADMIN'))
);
CREATE POLICY "Users insert messages" ON incident_messages FOR INSERT WITH CHECK (
    sender_id = auth.uid() AND
    (
        EXISTS (SELECT 1 FROM incidents WHERE incidents.id = incident_id AND incidents.student_id = auth.uid()) OR
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('STAFF', 'SECURITY', 'ADMIN', 'SUPER_ADMIN'))
    )
);

-- SAFE WALKS
CREATE POLICY "Students manage own safe walks" ON safe_walks FOR ALL USING (auth.uid() = student_id);
CREATE POLICY "Staff view safe walks" ON safe_walks FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('SECURITY', 'ADMIN', 'SUPER_ADMIN'))
);

-- TRUSTED CONTACTS
CREATE POLICY "Students manage own trusted contacts" ON trusted_contacts FOR ALL USING (auth.uid() = student_id);

-- NOTIFICATIONS
CREATE POLICY "Users view own notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);

-- AI CONFIGURATION
CREATE POLICY "Admin modify ai config" ON ai_configuration FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'SUPER_ADMIN'))
);

-- EMERGENCY CONFIGURATION
CREATE POLICY "Public read emergency config" ON emergency_configuration FOR SELECT USING (true);
CREATE POLICY "Admin modify emergency config" ON emergency_configuration FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'SUPER_ADMIN'))
);

-- SYSTEM TABLES (Audit, AI, Escalations, Case Actions, OTP Verifications)
-- Already RLS enabled. No permissive policies created. Deny by default. Access granted via Service Role key backend.

-- =====================================================================================
-- PHASE 6: STORAGE BUCKET CREATION & POLICIES
-- =====================================================================================
INSERT INTO storage.buckets (id, name, public) 
VALUES ('kavach-evidence', 'kavach-evidence', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Users upload evidence files" ON storage.objects;
DROP POLICY IF EXISTS "Users view own evidence files" ON storage.objects;
DROP POLICY IF EXISTS "Staff view evidence files" ON storage.objects;

CREATE POLICY "Users upload evidence files" ON storage.objects
FOR INSERT TO authenticated WITH CHECK (bucket_id = 'kavach-evidence');

CREATE POLICY "Users view own evidence files" ON storage.objects
FOR SELECT TO authenticated USING (bucket_id = 'kavach-evidence' AND auth.uid() = owner);

CREATE POLICY "Staff view evidence files" ON storage.objects
FOR SELECT TO authenticated USING (
    bucket_id = 'kavach-evidence' AND 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('STAFF', 'SECURITY', 'ADMIN', 'SUPER_ADMIN'))
);

-- =====================================================================================
-- PHASE 7: TRIGGERS
-- =====================================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

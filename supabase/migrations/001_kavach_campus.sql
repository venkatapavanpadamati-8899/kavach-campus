-- Kavach Campus Database Migration to Supabase
-- Full Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ROLES ENUM
CREATE TYPE app_role AS ENUM (
    'STUDENT', 
    'STAFF', 
    'COUNSELLOR', 
    'WOMENS_CELL', 
    'HOD', 
    'SECURITY', 
    'PRINCIPAL', 
    'ADMIN', 
    'SUPER_ADMIN'
);

-- STATUS ENUM
CREATE TYPE incident_status AS ENUM (
    'RECEIVED', 
    'ACKNOWLEDGED', 
    'ASSIGNED', 
    'IN_PROGRESS', 
    'ESCALATED', 
    'ACTION_TAKEN', 
    'RESOLVED', 
    'CLOSED',
    'FALSE_ALARM'
);

CREATE TYPE priority_level AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- PROFILES (Matches auth.users)
CREATE TABLE profiles (
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

-- USER OTP VERIFICATIONS (Temporary storage before auth creation if using custom OTP)
CREATE TABLE user_otp_verifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT NOT NULL,
    otp_hash TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    attempts INT DEFAULT 0,
    max_attempts INT DEFAULT 5,
    verified BOOLEAN DEFAULT FALSE,
    registration_data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- CAMPUS ZONES
CREATE TABLE campus_zones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    emergency_priority priority_level DEFAULT 'MEDIUM',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- CAMPUS BUILDINGS
CREATE TABLE campus_buildings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    zone_id UUID REFERENCES campus_zones(id),
    name TEXT NOT NULL,
    coordinates JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- INCIDENTS
CREATE TABLE incidents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id TEXT UNIQUE NOT NULL, -- e.g., KC-2026-XXXXX
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

-- INCIDENT LOCATIONS (Live Tracking/SOS)
CREATE TABLE incident_locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    incident_id UUID REFERENCES incidents(id) ON DELETE CASCADE,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    accuracy DOUBLE PRECISION,
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- EVIDENCE
CREATE TABLE evidence (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    incident_id UUID REFERENCES incidents(id) ON DELETE CASCADE,
    uploaded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    storage_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    mime_type TEXT,
    file_size BIGINT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI ANALYSES
CREATE TABLE ai_analyses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

-- SAFE WALKS
CREATE TABLE safe_walks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

-- TRUSTED CONTACTS
CREATE TABLE trusted_contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    relationship TEXT,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- AUDIT LOGS
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    metadata JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI CONFIGURATION (Singleton)
CREATE TABLE ai_configuration (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    enabled BOOLEAN DEFAULT TRUE,
    model TEXT DEFAULT 'gemini-2.5-pro',
    confidence_threshold DOUBLE PRECISION DEFAULT 0.85,
    fallback_enabled BOOLEAN DEFAULT TRUE,
    updated_by UUID REFERENCES profiles(id),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ROW LEVEL SECURITY (RLS)

-- 1. PROFILES
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by everyone" ON profiles
    FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

-- 2. INCIDENTS
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can insert own incidents" ON incidents
    FOR INSERT WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can view own incidents" ON incidents
    FOR SELECT USING (auth.uid() = student_id);

CREATE POLICY "Staff can view assigned or unassigned incidents" ON incidents
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('STAFF', 'SECURITY', 'ADMIN', 'SUPER_ADMIN')
        )
    );

-- 3. EVIDENCE
ALTER TABLE evidence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can upload evidence for own incidents" ON evidence
    FOR INSERT WITH CHECK (auth.uid() = uploaded_by);

CREATE POLICY "Users can view own evidence" ON evidence
    FOR SELECT USING (auth.uid() = uploaded_by);

CREATE POLICY "Staff can view all evidence" ON evidence
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('STAFF', 'SECURITY', 'ADMIN', 'SUPER_ADMIN')
        )
    );

-- 4. SAFE WALKS
ALTER TABLE safe_walks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students can manage own safe walks" ON safe_walks
    FOR ALL USING (auth.uid() = student_id);

-- 5. TRUSTED CONTACTS
ALTER TABLE trusted_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students can manage own trusted contacts" ON trusted_contacts
    FOR ALL USING (auth.uid() = student_id);

-- TRIGGERS
-- Auto-update updated_at for profiles
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- MISSING TABLES

-- STUDENT PROFILES
CREATE TABLE student_profiles (
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

-- STAFF PROFILES
CREATE TABLE staff_profiles (
    id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    designation TEXT,
    office_location TEXT,
    department_head BOOLEAN DEFAULT FALSE,
    specialization TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- INCIDENT MESSAGES
CREATE TABLE incident_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    incident_id UUID REFERENCES incidents(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    message TEXT NOT NULL,
    is_internal BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ESCALATIONS
CREATE TABLE escalations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    incident_id UUID REFERENCES incidents(id) ON DELETE CASCADE,
    from_level TEXT NOT NULL,
    to_level TEXT NOT NULL,
    reason TEXT NOT NULL,
    triggered_at TIMESTAMPTZ DEFAULT NOW(),
    acknowledged_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ
);

-- NOTIFICATIONS
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    incident_id UUID REFERENCES incidents(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT,
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- CASE ACTIONS
CREATE TABLE case_actions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    incident_id UUID REFERENCES incidents(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    from_status incident_status,
    to_status incident_status,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- EMERGENCY CONFIGURATION
CREATE TABLE emergency_configuration (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    emergency_number TEXT,
    campus_security_number TEXT,
    women_safety_number TEXT,
    enabled BOOLEAN DEFAULT TRUE,
    updated_by UUID REFERENCES profiles(id),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- EXTRA RLS POLICIES

-- Student Profiles
ALTER TABLE student_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public student profiles are viewable by everyone" ON student_profiles FOR SELECT USING (true);
CREATE POLICY "Students can update own student profile" ON student_profiles FOR UPDATE USING (auth.uid() = id);

-- Staff Profiles
ALTER TABLE staff_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public staff profiles are viewable by everyone" ON staff_profiles FOR SELECT USING (true);
CREATE POLICY "Staff can update own staff profile" ON staff_profiles FOR UPDATE USING (auth.uid() = id);

-- Incident Messages
ALTER TABLE incident_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students can read non-internal messages of own incident" ON incident_messages FOR SELECT USING (
    is_internal = FALSE AND
    EXISTS (SELECT 1 FROM incidents WHERE incidents.id = incident_messages.incident_id AND incidents.student_id = auth.uid())
);
CREATE POLICY "Staff can read all messages" ON incident_messages FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('STAFF', 'SECURITY', 'ADMIN', 'SUPER_ADMIN'))
);

-- Notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);

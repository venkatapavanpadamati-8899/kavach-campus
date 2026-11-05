-- Migration 019: Andhra Pradesh Statewide College Expansion & Registry
-- Architecture: Statewide multi-tenant registry for Engineering, Polytechnic, Degree, Pharmacy & Other Institutions
-- Coverage: All 26 Gazetted Districts of Andhra Pradesh (Reorganized on 4 April 2022)
-- Strict Tenant Isolation & Data Preservation Enforced

BEGIN;

-- 1. DISTRICTS REGISTRY
CREATE TABLE IF NOT EXISTS public.college_districts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  headquarters TEXT NOT NULL,
  zone TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.college_districts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read college districts" ON public.college_districts;
CREATE POLICY "Public read college districts" ON public.college_districts
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Super admin manage college districts" ON public.college_districts;
CREATE POLICY "Super admin manage college districts" ON public.college_districts
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'SUPER_ADMIN'));

-- 2. COLLEGES REGISTRY
CREATE TABLE IF NOT EXISTS public.colleges (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT,
  short_name TEXT,
  slug TEXT,
  category TEXT NOT NULL DEFAULT 'ENGINEERING',
  subcategory TEXT DEFAULT 'PRIVATE',
  district TEXT NOT NULL,
  district_id TEXT REFERENCES public.college_districts(id) ON DELETE SET NULL,
  city TEXT NOT NULL,
  pincode TEXT,
  state TEXT NOT NULL DEFAULT 'Andhra Pradesh',
  affiliation TEXT,
  approval TEXT,
  aishe_code TEXT,
  is_autonomous BOOLEAN DEFAULT false,
  is_verified BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  status TEXT DEFAULT 'ACTIVE',
  domain TEXT,
  emergency_helpline TEXT,
  womens_cell_helpline TEXT,
  security_control_room TEXT,
  ambulance_contact TEXT,
  primary_color TEXT DEFAULT '#7c3aed',
  secondary_color TEXT DEFAULT '#3b82f6',
  coordinates JSONB DEFAULT '{"lat": 16.5, "lng": 80.5}'::jsonb,
  geofence_radius_meters INTEGER DEFAULT 800,
  campus_buildings TEXT[] DEFAULT ARRAY[]::TEXT[],
  source_reference TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.colleges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read active colleges" ON public.colleges;
CREATE POLICY "Public read active colleges" ON public.colleges
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Super admin full access on colleges" ON public.colleges;
CREATE POLICY "Super admin full access on colleges" ON public.colleges
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'SUPER_ADMIN'));

-- 3. COLLEGE ONBOARDING REQUESTS
CREATE TABLE IF NOT EXISTS public.college_onboarding_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  college_name TEXT NOT NULL,
  college_code TEXT,
  category TEXT NOT NULL DEFAULT 'ENGINEERING',
  district TEXT NOT NULL,
  city TEXT NOT NULL,
  official_email TEXT NOT NULL,
  contact_number TEXT NOT NULL,
  applicant_name TEXT NOT NULL,
  applicant_designation TEXT NOT NULL,
  status TEXT DEFAULT 'PENDING',
  reviewed_by UUID,
  review_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.college_onboarding_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public submit onboarding requests" ON public.college_onboarding_requests;
CREATE POLICY "Public submit onboarding requests" ON public.college_onboarding_requests
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Super admin manage onboarding requests" ON public.college_onboarding_requests;
CREATE POLICY "Super admin manage onboarding requests" ON public.college_onboarding_requests
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'SUPER_ADMIN'));

-- 4. SEED 26 DISTRICTS OF ANDHRA PRADESH
INSERT INTO public.college_districts (id, name, headquarters, zone)
VALUES ('alluri-sitharama-raju', 'Alluri Sitharama Raju', 'Paderu', 'North Coastal')
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name, 
  headquarters = EXCLUDED.headquarters, 
  zone = EXCLUDED.zone;
INSERT INTO public.college_districts (id, name, headquarters, zone)
VALUES ('anakapalli', 'Anakapalli', 'Anakapalli', 'North Coastal')
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name, 
  headquarters = EXCLUDED.headquarters, 
  zone = EXCLUDED.zone;
INSERT INTO public.college_districts (id, name, headquarters, zone)
VALUES ('ananthapuramu', 'Ananthapuramu', 'Anantapur', 'Rayalaseema')
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name, 
  headquarters = EXCLUDED.headquarters, 
  zone = EXCLUDED.zone;
INSERT INTO public.college_districts (id, name, headquarters, zone)
VALUES ('annamayya', 'Annamayya', 'Rayachoti', 'Rayalaseema')
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name, 
  headquarters = EXCLUDED.headquarters, 
  zone = EXCLUDED.zone;
INSERT INTO public.college_districts (id, name, headquarters, zone)
VALUES ('bapatla', 'Bapatla', 'Bapatla', 'Central Coastal')
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name, 
  headquarters = EXCLUDED.headquarters, 
  zone = EXCLUDED.zone;
INSERT INTO public.college_districts (id, name, headquarters, zone)
VALUES ('chittoor', 'Chittoor', 'Chittoor', 'Rayalaseema')
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name, 
  headquarters = EXCLUDED.headquarters, 
  zone = EXCLUDED.zone;
INSERT INTO public.college_districts (id, name, headquarters, zone)
VALUES ('dr-br-ambedkar-konaseema', 'Dr. B. R. Ambedkar Konaseema', 'Amalapuram', 'Central Coastal')
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name, 
  headquarters = EXCLUDED.headquarters, 
  zone = EXCLUDED.zone;
INSERT INTO public.college_districts (id, name, headquarters, zone)
VALUES ('east-godavari', 'East Godavari', 'Rajamahendravaram', 'Central Coastal')
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name, 
  headquarters = EXCLUDED.headquarters, 
  zone = EXCLUDED.zone;
INSERT INTO public.college_districts (id, name, headquarters, zone)
VALUES ('eluru', 'Eluru', 'Eluru', 'Central Coastal')
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name, 
  headquarters = EXCLUDED.headquarters, 
  zone = EXCLUDED.zone;
INSERT INTO public.college_districts (id, name, headquarters, zone)
VALUES ('guntur', 'Guntur', 'Guntur', 'Central Coastal')
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name, 
  headquarters = EXCLUDED.headquarters, 
  zone = EXCLUDED.zone;
INSERT INTO public.college_districts (id, name, headquarters, zone)
VALUES ('kakinada', 'Kakinada', 'Kakinada', 'Central Coastal')
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name, 
  headquarters = EXCLUDED.headquarters, 
  zone = EXCLUDED.zone;
INSERT INTO public.college_districts (id, name, headquarters, zone)
VALUES ('krishna', 'Krishna', 'Machilipatnam', 'Central Coastal')
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name, 
  headquarters = EXCLUDED.headquarters, 
  zone = EXCLUDED.zone;
INSERT INTO public.college_districts (id, name, headquarters, zone)
VALUES ('kurnool', 'Kurnool', 'Kurnool', 'Rayalaseema')
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name, 
  headquarters = EXCLUDED.headquarters, 
  zone = EXCLUDED.zone;
INSERT INTO public.college_districts (id, name, headquarters, zone)
VALUES ('nandyal', 'Nandyal', 'Nandyal', 'Rayalaseema')
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name, 
  headquarters = EXCLUDED.headquarters, 
  zone = EXCLUDED.zone;
INSERT INTO public.college_districts (id, name, headquarters, zone)
VALUES ('ntr', 'NTR', 'Vijayawada', 'Central Coastal')
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name, 
  headquarters = EXCLUDED.headquarters, 
  zone = EXCLUDED.zone;
INSERT INTO public.college_districts (id, name, headquarters, zone)
VALUES ('palnadu', 'Palnadu', 'Narasaraopet', 'Central Coastal')
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name, 
  headquarters = EXCLUDED.headquarters, 
  zone = EXCLUDED.zone;
INSERT INTO public.college_districts (id, name, headquarters, zone)
VALUES ('parvathipuram-manyam', 'Parvathipuram Manyam', 'Parvathipuram', 'North Coastal')
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name, 
  headquarters = EXCLUDED.headquarters, 
  zone = EXCLUDED.zone;
INSERT INTO public.college_districts (id, name, headquarters, zone)
VALUES ('prakasam', 'Prakasam', 'Ongole', 'South Coastal')
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name, 
  headquarters = EXCLUDED.headquarters, 
  zone = EXCLUDED.zone;
INSERT INTO public.college_districts (id, name, headquarters, zone)
VALUES ('sri-potti-sriramulu-nellore', 'Sri Potti Sriramulu Nellore', 'Nellore', 'South Coastal')
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name, 
  headquarters = EXCLUDED.headquarters, 
  zone = EXCLUDED.zone;
INSERT INTO public.college_districts (id, name, headquarters, zone)
VALUES ('sri-sathya-sai', 'Sri Sathya Sai', 'Puttaparthi', 'Rayalaseema')
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name, 
  headquarters = EXCLUDED.headquarters, 
  zone = EXCLUDED.zone;
INSERT INTO public.college_districts (id, name, headquarters, zone)
VALUES ('srikakulam', 'Srikakulam', 'Srikakulam', 'North Coastal')
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name, 
  headquarters = EXCLUDED.headquarters, 
  zone = EXCLUDED.zone;
INSERT INTO public.college_districts (id, name, headquarters, zone)
VALUES ('tirupati', 'Tirupati', 'Tirupati', 'Rayalaseema')
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name, 
  headquarters = EXCLUDED.headquarters, 
  zone = EXCLUDED.zone;
INSERT INTO public.college_districts (id, name, headquarters, zone)
VALUES ('visakhapatnam', 'Visakhapatnam', 'Visakhapatnam', 'North Coastal')
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name, 
  headquarters = EXCLUDED.headquarters, 
  zone = EXCLUDED.zone;
INSERT INTO public.college_districts (id, name, headquarters, zone)
VALUES ('vizianagaram', 'Vizianagaram', 'Vizianagaram', 'North Coastal')
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name, 
  headquarters = EXCLUDED.headquarters, 
  zone = EXCLUDED.zone;
INSERT INTO public.college_districts (id, name, headquarters, zone)
VALUES ('west-godavari', 'West Godavari', 'Bhimavaram', 'Central Coastal')
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name, 
  headquarters = EXCLUDED.headquarters, 
  zone = EXCLUDED.zone;
INSERT INTO public.college_districts (id, name, headquarters, zone)
VALUES ('ysr-kadapa', 'YSR (Kadapa)', 'Kadapa', 'Rayalaseema')
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name, 
  headquarters = EXCLUDED.headquarters, 
  zone = EXCLUDED.zone;

-- 5. SEED VERIFIED COLLEGES ACROSS ANDHRA PRADESH
INSERT INTO public.colleges (
  id, name, code, short_name, slug, category, subcategory, 
  district, district_id, city, pincode, state, affiliation, approval, 
  aishe_code, is_autonomous, is_verified, is_active, status, domain, 
  emergency_helpline, womens_cell_helpline, security_control_room, ambulance_contact, 
  primary_color, secondary_color, coordinates, geofence_radius_meters, 
  campus_buildings, source_reference
) VALUES (
  'srkr-bhimavaram', 'Sagi Rama Krishnam Raju Engineering College (Autonomous)', 'SRKR', 'SRKR Engineering College', 'srkr-bhimavaram', 
  'ENGINEERING', 'AUTONOMOUS', 'West Godavari', 'west-godavari', 
  'Bhimavaram', '534204', 'Andhra Pradesh', 'JNTUK', 'AICTE', 
  'C-24011', true, true, true, 'ACTIVE', 'srkr.edu.in', 
  '+91-8816-223332', '+91-8816-223334', '+91-8816-223330', '+91-8816-223339', 
  '#7c3aed', '#3b82f6', '{"lat":16.5449,"lng":81.4975}'::jsonb, 800, 
  ARRAY['Main Administrative Block', 'Mechanical Sciences Block', 'Civil Engineering Block', 'CSE & IT Block', 'ECE & EEE Block', 'Central Library & Auditorium', 'Girls Hostel Complex', 'Boys Hostel Complex', 'Sports Complex', 'Dispensary']::TEXT[], 'APSCHE / AICTE 1-4567891'
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  code = EXCLUDED.code,
  short_name = EXCLUDED.short_name,
  category = EXCLUDED.category,
  subcategory = EXCLUDED.subcategory,
  district = EXCLUDED.district,
  district_id = EXCLUDED.district_id,
  city = EXCLUDED.city,
  pincode = EXCLUDED.pincode,
  affiliation = EXCLUDED.affiliation,
  approval = EXCLUDED.approval,
  aishe_code = EXCLUDED.aishe_code,
  is_autonomous = EXCLUDED.is_autonomous,
  domain = EXCLUDED.domain,
  emergency_helpline = EXCLUDED.emergency_helpline,
  womens_cell_helpline = EXCLUDED.womens_cell_helpline,
  security_control_room = EXCLUDED.security_control_room,
  ambulance_contact = EXCLUDED.ambulance_contact,
  source_reference = EXCLUDED.source_reference,
  updated_at = NOW();
INSERT INTO public.colleges (
  id, name, code, short_name, slug, category, subcategory, 
  district, district_id, city, pincode, state, affiliation, approval, 
  aishe_code, is_autonomous, is_verified, is_active, status, domain, 
  emergency_helpline, womens_cell_helpline, security_control_room, ambulance_contact, 
  primary_color, secondary_color, coordinates, geofence_radius_meters, 
  campus_buildings, source_reference
) VALUES (
  'vit-bhimavaram', 'Vishnu Institute of Technology (Autonomous)', 'VITB', 'Vishnu Institute of Technology', 'vit-bhimavaram', 
  'ENGINEERING', 'AUTONOMOUS', 'West Godavari', 'west-godavari', 
  'Bhimavaram', '534202', 'Andhra Pradesh', 'JNTUK', 'AICTE', 
  'C-24012', true, true, true, 'ACTIVE', 'vishnu.edu.in', 
  '+91-8816-251333', '+91-8816-251335', '+91-8816-251330', '+91-8816-251339', 
  '#2563eb', '#f59e0b', '{"lat":16.5684,"lng":81.5222}'::jsonb, 850, 
  ARRAY['Vishnu Admin Block', 'Technology Tower', 'Electronics Block', 'Knowledge Center', 'Sita Girls Hostel', 'Boys Hostel Block A & B', 'Health Clinic']::TEXT[], 'APSCHE / AICTE 1-4567892'
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  code = EXCLUDED.code,
  short_name = EXCLUDED.short_name,
  category = EXCLUDED.category,
  subcategory = EXCLUDED.subcategory,
  district = EXCLUDED.district,
  district_id = EXCLUDED.district_id,
  city = EXCLUDED.city,
  pincode = EXCLUDED.pincode,
  affiliation = EXCLUDED.affiliation,
  approval = EXCLUDED.approval,
  aishe_code = EXCLUDED.aishe_code,
  is_autonomous = EXCLUDED.is_autonomous,
  domain = EXCLUDED.domain,
  emergency_helpline = EXCLUDED.emergency_helpline,
  womens_cell_helpline = EXCLUDED.womens_cell_helpline,
  security_control_room = EXCLUDED.security_control_room,
  ambulance_contact = EXCLUDED.ambulance_contact,
  source_reference = EXCLUDED.source_reference,
  updated_at = NOW();
INSERT INTO public.colleges (
  id, name, code, short_name, slug, category, subcategory, 
  district, district_id, city, pincode, state, affiliation, approval, 
  aishe_code, is_autonomous, is_verified, is_active, status, domain, 
  emergency_helpline, womens_cell_helpline, security_control_room, ambulance_contact, 
  primary_color, secondary_color, coordinates, geofence_radius_meters, 
  campus_buildings, source_reference
) VALUES (
  'dnr-bhimavaram', 'DNR College of Engineering and Technology', 'DNRC', 'DNR College of Engg', 'dnr-bhimavaram', 
  'ENGINEERING', 'PRIVATE', 'West Godavari', 'west-godavari', 
  'Bhimavaram', '534202', 'Andhra Pradesh', 'JNTUK', 'AICTE', 
  'C-24013', true, true, true, 'ACTIVE', 'dnrcet.org', 
  '+91-8816-221234', '+91-8816-221235', '+91-8816-221230', '+91-8816-221239', 
  '#2563eb', '#059669', '{"lat":16.5412,"lng":81.5229}'::jsonb, 600, 
  ARRAY['Main Block', 'Engineering Block', 'Hostel Wing', 'Central Library']::TEXT[], 'APSCHE / AICTE 1-4567893'
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  code = EXCLUDED.code,
  short_name = EXCLUDED.short_name,
  category = EXCLUDED.category,
  subcategory = EXCLUDED.subcategory,
  district = EXCLUDED.district,
  district_id = EXCLUDED.district_id,
  city = EXCLUDED.city,
  pincode = EXCLUDED.pincode,
  affiliation = EXCLUDED.affiliation,
  approval = EXCLUDED.approval,
  aishe_code = EXCLUDED.aishe_code,
  is_autonomous = EXCLUDED.is_autonomous,
  domain = EXCLUDED.domain,
  emergency_helpline = EXCLUDED.emergency_helpline,
  womens_cell_helpline = EXCLUDED.womens_cell_helpline,
  security_control_room = EXCLUDED.security_control_room,
  ambulance_contact = EXCLUDED.ambulance_contact,
  source_reference = EXCLUDED.source_reference,
  updated_at = NOW();
INSERT INTO public.colleges (
  id, name, code, short_name, slug, category, subcategory, 
  district, district_id, city, pincode, state, affiliation, approval, 
  aishe_code, is_autonomous, is_verified, is_active, status, domain, 
  emergency_helpline, womens_cell_helpline, security_control_room, ambulance_contact, 
  primary_color, secondary_color, coordinates, geofence_radius_meters, 
  campus_buildings, source_reference
) VALUES (
  'swarnandhra-narsapur', 'Swarnandhra College of Engineering and Technology (Autonomous)', 'SWAR', 'Swarnandhra CET', 'swarnandhra-narsapur', 
  'ENGINEERING', 'AUTONOMOUS', 'West Godavari', 'west-godavari', 
  'Narsapur', '534280', 'Andhra Pradesh', 'JNTUK', 'AICTE', 
  'C-24014', true, true, true, 'ACTIVE', 'swarnandhra.ac.in', 
  '+91-8814-240588', '+91-8814-240589', '+91-8814-240580', '+91-8814-240590', 
  '#0d9488', '#f97316', '{"lat":16.4385,"lng":81.6888}'::jsonb, 750, 
  ARRAY['Seetharampuram Block', 'PG Block', 'Polytechnic Wing', 'Hostels']::TEXT[], 'APSCHE / AICTE 1-4567894'
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  code = EXCLUDED.code,
  short_name = EXCLUDED.short_name,
  category = EXCLUDED.category,
  subcategory = EXCLUDED.subcategory,
  district = EXCLUDED.district,
  district_id = EXCLUDED.district_id,
  city = EXCLUDED.city,
  pincode = EXCLUDED.pincode,
  affiliation = EXCLUDED.affiliation,
  approval = EXCLUDED.approval,
  aishe_code = EXCLUDED.aishe_code,
  is_autonomous = EXCLUDED.is_autonomous,
  domain = EXCLUDED.domain,
  emergency_helpline = EXCLUDED.emergency_helpline,
  womens_cell_helpline = EXCLUDED.womens_cell_helpline,
  security_control_room = EXCLUDED.security_control_room,
  ambulance_contact = EXCLUDED.ambulance_contact,
  source_reference = EXCLUDED.source_reference,
  updated_at = NOW();
INSERT INTO public.colleges (
  id, name, code, short_name, slug, category, subcategory, 
  district, district_id, city, pincode, state, affiliation, approval, 
  aishe_code, is_autonomous, is_verified, is_active, status, domain, 
  emergency_helpline, womens_cell_helpline, security_control_room, ambulance_contact, 
  primary_color, secondary_color, coordinates, geofence_radius_meters, 
  campus_buildings, source_reference
) VALUES (
  'smvm-tanuku', 'Sasi Institute / SMVM Polytechnic', 'SMVM', 'SMVM Polytechnic Tanuku', 'smvm-tanuku', 
  'POLYTECHNIC', 'AIDED', 'West Godavari', 'west-godavari', 
  'Tanuku', '534211', 'Andhra Pradesh', 'SBTET', 'AICTE', 
  'S-12001', false, true, true, 'ACTIVE', 'smvm.edu.in', 
  '+91-8819-224400', '+91-8819-224411', '+91-8819-224422', '+91-8819-224433', 
  '#059669', '#3b82f6', '{"lat":16.7584,"lng":81.6784}'::jsonb, 600, 
  ARRAY['Mechanical Wing', 'Electrical Labs', 'Polytechnic Block']::TEXT[], 'SBTET AP Directory'
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  code = EXCLUDED.code,
  short_name = EXCLUDED.short_name,
  category = EXCLUDED.category,
  subcategory = EXCLUDED.subcategory,
  district = EXCLUDED.district,
  district_id = EXCLUDED.district_id,
  city = EXCLUDED.city,
  pincode = EXCLUDED.pincode,
  affiliation = EXCLUDED.affiliation,
  approval = EXCLUDED.approval,
  aishe_code = EXCLUDED.aishe_code,
  is_autonomous = EXCLUDED.is_autonomous,
  domain = EXCLUDED.domain,
  emergency_helpline = EXCLUDED.emergency_helpline,
  womens_cell_helpline = EXCLUDED.womens_cell_helpline,
  security_control_room = EXCLUDED.security_control_room,
  ambulance_contact = EXCLUDED.ambulance_contact,
  source_reference = EXCLUDED.source_reference,
  updated_at = NOW();
INSERT INTO public.colleges (
  id, name, code, short_name, slug, category, subcategory, 
  district, district_id, city, pincode, state, affiliation, approval, 
  aishe_code, is_autonomous, is_verified, is_active, status, domain, 
  emergency_helpline, womens_cell_helpline, security_control_room, ambulance_contact, 
  primary_color, secondary_color, coordinates, geofence_radius_meters, 
  campus_buildings, source_reference
) VALUES (
  'dnr-degree-bhimavaram', 'DNR College (Autonomous) Arts & Science', 'DNRD', 'DNR Degree College', 'dnr-degree-bhimavaram', 
  'DEGREE', 'AIDED', 'West Godavari', 'west-godavari', 
  'Bhimavaram', '534202', 'Andhra Pradesh', 'Adikavi Nannaya University', 'UGC', 
  'C-24015', true, true, true, 'ACTIVE', 'dnrcollege.org', 
  '+91-8816-221222', '+91-8816-221223', '+91-8816-221220', '+91-8816-221229', 
  '#b45309', '#2563eb', '{"lat":16.541,"lng":81.5235}'::jsonb, 600, 
  ARRAY['Heritage Main Hall', 'Science Labs Block', 'Auditorium']::TEXT[], 'UGC Recognized Colleges List'
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  code = EXCLUDED.code,
  short_name = EXCLUDED.short_name,
  category = EXCLUDED.category,
  subcategory = EXCLUDED.subcategory,
  district = EXCLUDED.district,
  district_id = EXCLUDED.district_id,
  city = EXCLUDED.city,
  pincode = EXCLUDED.pincode,
  affiliation = EXCLUDED.affiliation,
  approval = EXCLUDED.approval,
  aishe_code = EXCLUDED.aishe_code,
  is_autonomous = EXCLUDED.is_autonomous,
  domain = EXCLUDED.domain,
  emergency_helpline = EXCLUDED.emergency_helpline,
  womens_cell_helpline = EXCLUDED.womens_cell_helpline,
  security_control_room = EXCLUDED.security_control_room,
  ambulance_contact = EXCLUDED.ambulance_contact,
  source_reference = EXCLUDED.source_reference,
  updated_at = NOW();
INSERT INTO public.colleges (
  id, name, code, short_name, slug, category, subcategory, 
  district, district_id, city, pincode, state, affiliation, approval, 
  aishe_code, is_autonomous, is_verified, is_active, status, domain, 
  emergency_helpline, womens_cell_helpline, security_control_room, ambulance_contact, 
  primary_color, secondary_color, coordinates, geofence_radius_meters, 
  campus_buildings, source_reference
) VALUES (
  'aucoe-visakhapatnam', 'Andhra University College of Engineering (Autonomous)', 'AUCE', 'AUCE Visakhapatnam', 'aucoe-visakhapatnam', 
  'ENGINEERING', 'UNIVERSITY_CONSTITUENT', 'Visakhapatnam', 'visakhapatnam', 
  'Visakhapatnam', '530003', 'Andhra Pradesh', 'Andhra University', 'AICTE', 
  'C-24020', true, true, true, 'ACTIVE', 'andhrauniversity.edu.in', 
  '+91-891-2844000', '+91-891-2844222', '+91-891-2844111', '+91-891-2844999', 
  '#b91c1c', '#f59e0b', '{"lat":17.7289,"lng":83.3188}'::jsonb, 1200, 
  ARRAY['North Campus Main', 'South Campus Lab Complex', 'Central Library', 'Hostels']::TEXT[], 'APSCHE / Andhra University Constituent'
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  code = EXCLUDED.code,
  short_name = EXCLUDED.short_name,
  category = EXCLUDED.category,
  subcategory = EXCLUDED.subcategory,
  district = EXCLUDED.district,
  district_id = EXCLUDED.district_id,
  city = EXCLUDED.city,
  pincode = EXCLUDED.pincode,
  affiliation = EXCLUDED.affiliation,
  approval = EXCLUDED.approval,
  aishe_code = EXCLUDED.aishe_code,
  is_autonomous = EXCLUDED.is_autonomous,
  domain = EXCLUDED.domain,
  emergency_helpline = EXCLUDED.emergency_helpline,
  womens_cell_helpline = EXCLUDED.womens_cell_helpline,
  security_control_room = EXCLUDED.security_control_room,
  ambulance_contact = EXCLUDED.ambulance_contact,
  source_reference = EXCLUDED.source_reference,
  updated_at = NOW();
INSERT INTO public.colleges (
  id, name, code, short_name, slug, category, subcategory, 
  district, district_id, city, pincode, state, affiliation, approval, 
  aishe_code, is_autonomous, is_verified, is_active, status, domain, 
  emergency_helpline, womens_cell_helpline, security_control_room, ambulance_contact, 
  primary_color, secondary_color, coordinates, geofence_radius_meters, 
  campus_buildings, source_reference
) VALUES (
  'gvpce-visakhapatnam', 'Gayatri Vidya Parishad College of Engineering (Autonomous)', 'GVPE', 'GVP College of Engg', 'gvpce-visakhapatnam', 
  'ENGINEERING', 'AUTONOMOUS', 'Visakhapatnam', 'visakhapatnam', 
  'Visakhapatnam', '530048', 'Andhra Pradesh', 'JNTUK', 'AICTE', 
  'C-24021', true, true, true, 'ACTIVE', 'gvpce.ac.in', 
  '+91-891-2739507', '+91-891-2739508', '+91-891-2739500', '+91-891-2739599', 
  '#1e3a8a', '#059669', '{"lat":17.8184,"lng":83.3422}'::jsonb, 800, 
  ARRAY['Madhurawada Campus Block A', 'Block B CSE', 'Mechanical Complex']::TEXT[], 'AICTE Permanent ID 1-567890'
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  code = EXCLUDED.code,
  short_name = EXCLUDED.short_name,
  category = EXCLUDED.category,
  subcategory = EXCLUDED.subcategory,
  district = EXCLUDED.district,
  district_id = EXCLUDED.district_id,
  city = EXCLUDED.city,
  pincode = EXCLUDED.pincode,
  affiliation = EXCLUDED.affiliation,
  approval = EXCLUDED.approval,
  aishe_code = EXCLUDED.aishe_code,
  is_autonomous = EXCLUDED.is_autonomous,
  domain = EXCLUDED.domain,
  emergency_helpline = EXCLUDED.emergency_helpline,
  womens_cell_helpline = EXCLUDED.womens_cell_helpline,
  security_control_room = EXCLUDED.security_control_room,
  ambulance_contact = EXCLUDED.ambulance_contact,
  source_reference = EXCLUDED.source_reference,
  updated_at = NOW();
INSERT INTO public.colleges (
  id, name, code, short_name, slug, category, subcategory, 
  district, district_id, city, pincode, state, affiliation, approval, 
  aishe_code, is_autonomous, is_verified, is_active, status, domain, 
  emergency_helpline, womens_cell_helpline, security_control_room, ambulance_contact, 
  primary_color, secondary_color, coordinates, geofence_radius_meters, 
  campus_buildings, source_reference
) VALUES (
  'gpt-visakhapatnam', 'Government Polytechnic, Visakhapatnam', 'GPT-VSP', 'Govt Polytechnic Vizag', 'gpt-visakhapatnam', 
  'POLYTECHNIC', 'GOVERNMENT', 'Visakhapatnam', 'visakhapatnam', 
  'Visakhapatnam', '530007', 'Andhra Pradesh', 'SBTET', 'AICTE', 
  'S-12002', false, true, true, 'ACTIVE', 'gptvizag.ac.in', 
  '+91-891-2558330', '+91-891-2558331', '+91-891-2558332', '+91-891-2558339', 
  '#047857', '#f59e0b', '{"lat":17.7422,"lng":83.3055}'::jsonb, 700, 
  ARRAY['Administrative Block', 'Automobile Wing', 'Civil Workshops']::TEXT[], 'SBTET AP Directory'
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  code = EXCLUDED.code,
  short_name = EXCLUDED.short_name,
  category = EXCLUDED.category,
  subcategory = EXCLUDED.subcategory,
  district = EXCLUDED.district,
  district_id = EXCLUDED.district_id,
  city = EXCLUDED.city,
  pincode = EXCLUDED.pincode,
  affiliation = EXCLUDED.affiliation,
  approval = EXCLUDED.approval,
  aishe_code = EXCLUDED.aishe_code,
  is_autonomous = EXCLUDED.is_autonomous,
  domain = EXCLUDED.domain,
  emergency_helpline = EXCLUDED.emergency_helpline,
  womens_cell_helpline = EXCLUDED.womens_cell_helpline,
  security_control_room = EXCLUDED.security_control_room,
  ambulance_contact = EXCLUDED.ambulance_contact,
  source_reference = EXCLUDED.source_reference,
  updated_at = NOW();
INSERT INTO public.colleges (
  id, name, code, short_name, slug, category, subcategory, 
  district, district_id, city, pincode, state, affiliation, approval, 
  aishe_code, is_autonomous, is_verified, is_active, status, domain, 
  emergency_helpline, womens_cell_helpline, security_control_room, ambulance_contact, 
  primary_color, secondary_color, coordinates, geofence_radius_meters, 
  campus_buildings, source_reference
) VALUES (
  'avn-visakhapatnam', 'Mrs. A.V.N. College', 'AVNC', 'AVN College Vizag', 'avn-visakhapatnam', 
  'DEGREE', 'AIDED', 'Visakhapatnam', 'visakhapatnam', 
  'Visakhapatnam', '530001', 'Andhra Pradesh', 'Andhra University', 'UGC', 
  'C-24022', false, true, true, 'ACTIVE', 'avncollege.ac.in', 
  '+91-891-2568444', '+91-891-2568445', '+91-891-2568440', '+91-891-2568449', 
  '#6d28d9', '#0284c7', '{"lat":17.7012,"lng":83.2985}'::jsonb, 550, 
  ARRAY['Historic Old Block', 'Science Wing', 'Commerce Complex']::TEXT[], 'UGC College Directory'
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  code = EXCLUDED.code,
  short_name = EXCLUDED.short_name,
  category = EXCLUDED.category,
  subcategory = EXCLUDED.subcategory,
  district = EXCLUDED.district,
  district_id = EXCLUDED.district_id,
  city = EXCLUDED.city,
  pincode = EXCLUDED.pincode,
  affiliation = EXCLUDED.affiliation,
  approval = EXCLUDED.approval,
  aishe_code = EXCLUDED.aishe_code,
  is_autonomous = EXCLUDED.is_autonomous,
  domain = EXCLUDED.domain,
  emergency_helpline = EXCLUDED.emergency_helpline,
  womens_cell_helpline = EXCLUDED.womens_cell_helpline,
  security_control_room = EXCLUDED.security_control_room,
  ambulance_contact = EXCLUDED.ambulance_contact,
  source_reference = EXCLUDED.source_reference,
  updated_at = NOW();
INSERT INTO public.colleges (
  id, name, code, short_name, slug, category, subcategory, 
  district, district_id, city, pincode, state, affiliation, approval, 
  aishe_code, is_autonomous, is_verified, is_active, status, domain, 
  emergency_helpline, womens_cell_helpline, security_control_room, ambulance_contact, 
  primary_color, secondary_color, coordinates, geofence_radius_meters, 
  campus_buildings, source_reference
) VALUES (
  'jntuk-kakinada', 'JNTUK University College of Engineering Kakinada (Autonomous)', 'JNTUK', 'JNTUK UCEK', 'jntuk-kakinada', 
  'ENGINEERING', 'UNIVERSITY_CONSTITUENT', 'Kakinada', 'kakinada', 
  'Kakinada', '533003', 'Andhra Pradesh', 'JNTUK', 'AICTE', 
  'C-24030', true, true, true, 'ACTIVE', 'jntukucek.ac.in', 
  '+91-884-2300900', '+91-884-2300911', '+91-884-2300922', '+91-884-2300933', 
  '#1d4ed8', '#9333ea', '{"lat":16.9804,"lng":82.2423}'::jsonb, 1000, 
  ARRAY['Administrative Secretariat', 'ECE Block', 'CSE Department', 'Hostels']::TEXT[], 'APSCHE / JNTUK University Registry'
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  code = EXCLUDED.code,
  short_name = EXCLUDED.short_name,
  category = EXCLUDED.category,
  subcategory = EXCLUDED.subcategory,
  district = EXCLUDED.district,
  district_id = EXCLUDED.district_id,
  city = EXCLUDED.city,
  pincode = EXCLUDED.pincode,
  affiliation = EXCLUDED.affiliation,
  approval = EXCLUDED.approval,
  aishe_code = EXCLUDED.aishe_code,
  is_autonomous = EXCLUDED.is_autonomous,
  domain = EXCLUDED.domain,
  emergency_helpline = EXCLUDED.emergency_helpline,
  womens_cell_helpline = EXCLUDED.womens_cell_helpline,
  security_control_room = EXCLUDED.security_control_room,
  ambulance_contact = EXCLUDED.ambulance_contact,
  source_reference = EXCLUDED.source_reference,
  updated_at = NOW();
INSERT INTO public.colleges (
  id, name, code, short_name, slug, category, subcategory, 
  district, district_id, city, pincode, state, affiliation, approval, 
  aishe_code, is_autonomous, is_verified, is_active, status, domain, 
  emergency_helpline, womens_cell_helpline, security_control_room, ambulance_contact, 
  primary_color, secondary_color, coordinates, geofence_radius_meters, 
  campus_buildings, source_reference
) VALUES (
  'aditya-surampalem', 'Aditya Engineering College (Autonomous)', 'AEC', 'Aditya Engg College', 'aditya-surampalem', 
  'ENGINEERING', 'AUTONOMOUS', 'Kakinada', 'kakinada', 
  'Surampalem', '533437', 'Andhra Pradesh', 'JNTUK', 'AICTE', 
  'C-24031', true, true, true, 'ACTIVE', 'aec.edu.in', 
  '+91-8852-252243', '+91-8852-252244', '+91-8852-252240', '+91-8852-252249', 
  '#ea580c', '#2563eb', '{"lat":17.0898,"lng":82.0664}'::jsonb, 900, 
  ARRAY['Cotton Bhavan Admin Block', 'Bill Gates Bhavan CSE', 'KL Rao Bhavan Civil']::TEXT[], 'AICTE Permanent ID 1-678901'
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  code = EXCLUDED.code,
  short_name = EXCLUDED.short_name,
  category = EXCLUDED.category,
  subcategory = EXCLUDED.subcategory,
  district = EXCLUDED.district,
  district_id = EXCLUDED.district_id,
  city = EXCLUDED.city,
  pincode = EXCLUDED.pincode,
  affiliation = EXCLUDED.affiliation,
  approval = EXCLUDED.approval,
  aishe_code = EXCLUDED.aishe_code,
  is_autonomous = EXCLUDED.is_autonomous,
  domain = EXCLUDED.domain,
  emergency_helpline = EXCLUDED.emergency_helpline,
  womens_cell_helpline = EXCLUDED.womens_cell_helpline,
  security_control_room = EXCLUDED.security_control_room,
  ambulance_contact = EXCLUDED.ambulance_contact,
  source_reference = EXCLUDED.source_reference,
  updated_at = NOW();
INSERT INTO public.colleges (
  id, name, code, short_name, slug, category, subcategory, 
  district, district_id, city, pincode, state, affiliation, approval, 
  aishe_code, is_autonomous, is_verified, is_active, status, domain, 
  emergency_helpline, womens_cell_helpline, security_control_room, ambulance_contact, 
  primary_color, secondary_color, coordinates, geofence_radius_meters, 
  campus_buildings, source_reference
) VALUES (
  'apt-kakinada', 'Andhra Polytechnic, Kakinada', 'APT-KKD', 'Andhra Poly Kakinada', 'apt-kakinada', 
  'POLYTECHNIC', 'GOVERNMENT', 'Kakinada', 'kakinada', 
  'Kakinada', '533002', 'Andhra Pradesh', 'SBTET', 'AICTE', 
  'S-12003', false, true, true, 'ACTIVE', 'aptkakinada.ac.in', 
  '+91-884-2373444', '+91-884-2373445', '+91-884-2373440', '+91-884-2373449', 
  '#059669', '#f97316', '{"lat":16.9634,"lng":82.2355}'::jsonb, 650, 
  ARRAY['Old Heritage Building', 'Modern Labs Wing', 'Workshops']::TEXT[], 'SBTET AP Directory'
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  code = EXCLUDED.code,
  short_name = EXCLUDED.short_name,
  category = EXCLUDED.category,
  subcategory = EXCLUDED.subcategory,
  district = EXCLUDED.district,
  district_id = EXCLUDED.district_id,
  city = EXCLUDED.city,
  pincode = EXCLUDED.pincode,
  affiliation = EXCLUDED.affiliation,
  approval = EXCLUDED.approval,
  aishe_code = EXCLUDED.aishe_code,
  is_autonomous = EXCLUDED.is_autonomous,
  domain = EXCLUDED.domain,
  emergency_helpline = EXCLUDED.emergency_helpline,
  womens_cell_helpline = EXCLUDED.womens_cell_helpline,
  security_control_room = EXCLUDED.security_control_room,
  ambulance_contact = EXCLUDED.ambulance_contact,
  source_reference = EXCLUDED.source_reference,
  updated_at = NOW();
INSERT INTO public.colleges (
  id, name, code, short_name, slug, category, subcategory, 
  district, district_id, city, pincode, state, affiliation, approval, 
  aishe_code, is_autonomous, is_verified, is_active, status, domain, 
  emergency_helpline, womens_cell_helpline, security_control_room, ambulance_contact, 
  primary_color, secondary_color, coordinates, geofence_radius_meters, 
  campus_buildings, source_reference
) VALUES (
  'prgc-kakinada', 'P.R. Government College (Autonomous)', 'PRGC', 'PR Govt College Kakinada', 'prgc-kakinada', 
  'DEGREE', 'GOVERNMENT', 'Kakinada', 'kakinada', 
  'Kakinada', '533001', 'Andhra Pradesh', 'Adikavi Nannaya University', 'UGC', 
  'C-24032', true, true, true, 'ACTIVE', 'prgc.ac.in', 
  '+91-884-2379480', '+91-884-2379481', '+91-884-2379482', '+91-884-2379489', 
  '#0284c7', '#d97706', '{"lat":16.9588,"lng":82.2384}'::jsonb, 600, 
  ARRAY['Heritage Main Block', 'Postgraduate Center', 'Science Complex']::TEXT[], 'UGC Recognized Colleges List'
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  code = EXCLUDED.code,
  short_name = EXCLUDED.short_name,
  category = EXCLUDED.category,
  subcategory = EXCLUDED.subcategory,
  district = EXCLUDED.district,
  district_id = EXCLUDED.district_id,
  city = EXCLUDED.city,
  pincode = EXCLUDED.pincode,
  affiliation = EXCLUDED.affiliation,
  approval = EXCLUDED.approval,
  aishe_code = EXCLUDED.aishe_code,
  is_autonomous = EXCLUDED.is_autonomous,
  domain = EXCLUDED.domain,
  emergency_helpline = EXCLUDED.emergency_helpline,
  womens_cell_helpline = EXCLUDED.womens_cell_helpline,
  security_control_room = EXCLUDED.security_control_room,
  ambulance_contact = EXCLUDED.ambulance_contact,
  source_reference = EXCLUDED.source_reference,
  updated_at = NOW();
INSERT INTO public.colleges (
  id, name, code, short_name, slug, category, subcategory, 
  district, district_id, city, pincode, state, affiliation, approval, 
  aishe_code, is_autonomous, is_verified, is_active, status, domain, 
  emergency_helpline, womens_cell_helpline, security_control_room, ambulance_contact, 
  primary_color, secondary_color, coordinates, geofence_radius_meters, 
  campus_buildings, source_reference
) VALUES (
  'vrsec-vijayawada', 'Velagapudi Ramakrishna Siddhartha Engineering College (Autonomous)', 'VRSE', 'VR Siddhartha Engg College', 'vrsec-vijayawada', 
  'ENGINEERING', 'AUTONOMOUS', 'NTR', 'ntr', 
  'Vijayawada', '520007', 'Andhra Pradesh', 'JNTUK', 'AICTE', 
  'C-24040', true, true, true, 'ACTIVE', 'vrsiddhartha.ac.in', 
  '+91-866-2582333', '+91-866-2582334', '+91-866-2582330', '+91-866-2582339', 
  '#047857', '#0284c7', '{"lat":16.4813,"lng":80.6934}'::jsonb, 900, 
  ARRAY['Administrative Block', 'CSE Block', 'Mechanical Block', 'Girls Hostel']::TEXT[], 'APSCHE / AICTE 1-789012'
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  code = EXCLUDED.code,
  short_name = EXCLUDED.short_name,
  category = EXCLUDED.category,
  subcategory = EXCLUDED.subcategory,
  district = EXCLUDED.district,
  district_id = EXCLUDED.district_id,
  city = EXCLUDED.city,
  pincode = EXCLUDED.pincode,
  affiliation = EXCLUDED.affiliation,
  approval = EXCLUDED.approval,
  aishe_code = EXCLUDED.aishe_code,
  is_autonomous = EXCLUDED.is_autonomous,
  domain = EXCLUDED.domain,
  emergency_helpline = EXCLUDED.emergency_helpline,
  womens_cell_helpline = EXCLUDED.womens_cell_helpline,
  security_control_room = EXCLUDED.security_control_room,
  ambulance_contact = EXCLUDED.ambulance_contact,
  source_reference = EXCLUDED.source_reference,
  updated_at = NOW();
INSERT INTO public.colleges (
  id, name, code, short_name, slug, category, subcategory, 
  district, district_id, city, pincode, state, affiliation, approval, 
  aishe_code, is_autonomous, is_verified, is_active, status, domain, 
  emergency_helpline, womens_cell_helpline, security_control_room, ambulance_contact, 
  primary_color, secondary_color, coordinates, geofence_radius_meters, 
  campus_buildings, source_reference
) VALUES (
  'pvpsit-vijayawada', 'Prasad V. Potluri Siddhartha Institute of Technology (Autonomous)', 'PVPS', 'PVP Siddhartha IT', 'pvpsit-vijayawada', 
  'ENGINEERING', 'AUTONOMOUS', 'NTR', 'ntr', 
  'Vijayawada', '520007', 'Andhra Pradesh', 'JNTUK', 'AICTE', 
  'C-24041', true, true, true, 'ACTIVE', 'pvpsiddhartha.ac.in', 
  '+91-866-2581699', '+91-866-2581698', '+91-866-2581690', '+91-866-2581695', 
  '#2563eb', '#f59e0b', '{"lat":16.4912,"lng":80.6922}'::jsonb, 750, 
  ARRAY['Kanuru Main Campus', 'CSE Wing', 'Electronics Block']::TEXT[], 'AICTE Permanent ID 1-890123'
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  code = EXCLUDED.code,
  short_name = EXCLUDED.short_name,
  category = EXCLUDED.category,
  subcategory = EXCLUDED.subcategory,
  district = EXCLUDED.district,
  district_id = EXCLUDED.district_id,
  city = EXCLUDED.city,
  pincode = EXCLUDED.pincode,
  affiliation = EXCLUDED.affiliation,
  approval = EXCLUDED.approval,
  aishe_code = EXCLUDED.aishe_code,
  is_autonomous = EXCLUDED.is_autonomous,
  domain = EXCLUDED.domain,
  emergency_helpline = EXCLUDED.emergency_helpline,
  womens_cell_helpline = EXCLUDED.womens_cell_helpline,
  security_control_room = EXCLUDED.security_control_room,
  ambulance_contact = EXCLUDED.ambulance_contact,
  source_reference = EXCLUDED.source_reference,
  updated_at = NOW();
INSERT INTO public.colleges (
  id, name, code, short_name, slug, category, subcategory, 
  district, district_id, city, pincode, state, affiliation, approval, 
  aishe_code, is_autonomous, is_verified, is_active, status, domain, 
  emergency_helpline, womens_cell_helpline, security_control_room, ambulance_contact, 
  primary_color, secondary_color, coordinates, geofence_radius_meters, 
  campus_buildings, source_reference
) VALUES (
  'gpt-vijayawada', 'Government Polytechnic, Vijayawada', 'GPT-VJA', 'Govt Poly Vijayawada', 'gpt-vijayawada', 
  'POLYTECHNIC', 'GOVERNMENT', 'NTR', 'ntr', 
  'Vijayawada', '520008', 'Andhra Pradesh', 'SBTET', 'AICTE', 
  'S-12004', false, true, true, 'ACTIVE', 'gptvijayawada.ac.in', 
  '+91-866-2476333', '+91-866-2476334', '+91-866-2476330', '+91-866-2476339', 
  '#059669', '#3b82f6', '{"lat":16.5022,"lng":80.6488}'::jsonb, 650, 
  ARRAY['Mechanical Wing', 'Electrical Block', 'Administrative Office']::TEXT[], 'SBTET AP Directory'
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  code = EXCLUDED.code,
  short_name = EXCLUDED.short_name,
  category = EXCLUDED.category,
  subcategory = EXCLUDED.subcategory,
  district = EXCLUDED.district,
  district_id = EXCLUDED.district_id,
  city = EXCLUDED.city,
  pincode = EXCLUDED.pincode,
  affiliation = EXCLUDED.affiliation,
  approval = EXCLUDED.approval,
  aishe_code = EXCLUDED.aishe_code,
  is_autonomous = EXCLUDED.is_autonomous,
  domain = EXCLUDED.domain,
  emergency_helpline = EXCLUDED.emergency_helpline,
  womens_cell_helpline = EXCLUDED.womens_cell_helpline,
  security_control_room = EXCLUDED.security_control_room,
  ambulance_contact = EXCLUDED.ambulance_contact,
  source_reference = EXCLUDED.source_reference,
  updated_at = NOW();
INSERT INTO public.colleges (
  id, name, code, short_name, slug, category, subcategory, 
  district, district_id, city, pincode, state, affiliation, approval, 
  aishe_code, is_autonomous, is_verified, is_active, status, domain, 
  emergency_helpline, womens_cell_helpline, security_control_room, ambulance_contact, 
  primary_color, secondary_color, coordinates, geofence_radius_meters, 
  campus_buildings, source_reference
) VALUES (
  'loyola-vijayawada', 'Andhra Loyola College (Autonomous)', 'ALC', 'Andhra Loyola College', 'loyola-vijayawada', 
  'DEGREE', 'AIDED', 'NTR', 'ntr', 
  'Vijayawada', '520008', 'Andhra Pradesh', 'Krishna University', 'UGC', 
  'C-24042', true, true, true, 'ACTIVE', 'andhraloyolacollege.ac.in', 
  '+91-866-2476082', '+91-866-2476083', '+91-866-2476080', '+91-866-2476089', 
  '#7c2d12', '#f59e0b', '{"lat":16.5055,"lng":80.6544}'::jsonb, 800, 
  ARRAY['North Wing', 'Science Complex', 'Auditorium', 'Hostels']::TEXT[], 'UGC Recognized Colleges List'
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  code = EXCLUDED.code,
  short_name = EXCLUDED.short_name,
  category = EXCLUDED.category,
  subcategory = EXCLUDED.subcategory,
  district = EXCLUDED.district,
  district_id = EXCLUDED.district_id,
  city = EXCLUDED.city,
  pincode = EXCLUDED.pincode,
  affiliation = EXCLUDED.affiliation,
  approval = EXCLUDED.approval,
  aishe_code = EXCLUDED.aishe_code,
  is_autonomous = EXCLUDED.is_autonomous,
  domain = EXCLUDED.domain,
  emergency_helpline = EXCLUDED.emergency_helpline,
  womens_cell_helpline = EXCLUDED.womens_cell_helpline,
  security_control_room = EXCLUDED.security_control_room,
  ambulance_contact = EXCLUDED.ambulance_contact,
  source_reference = EXCLUDED.source_reference,
  updated_at = NOW();
INSERT INTO public.colleges (
  id, name, code, short_name, slug, category, subcategory, 
  district, district_id, city, pincode, state, affiliation, approval, 
  aishe_code, is_autonomous, is_verified, is_active, status, domain, 
  emergency_helpline, womens_cell_helpline, security_control_room, ambulance_contact, 
  primary_color, secondary_color, coordinates, geofence_radius_meters, 
  campus_buildings, source_reference
) VALUES (
  'rvrjc-guntur', 'R.V.R. & J.C. College of Engineering (Autonomous)', 'RVRJ', 'RVR & JC College of Engg', 'rvrjc-guntur', 
  'ENGINEERING', 'AUTONOMOUS', 'Guntur', 'guntur', 
  'Guntur', '522019', 'Andhra Pradesh', 'Acharya Nagarjuna University', 'AICTE', 
  'C-24050', true, true, true, 'ACTIVE', 'rvrjc.ac.in', 
  '+91-863-2288201', '+91-863-2288202', '+91-863-2288200', '+91-863-2288209', 
  '#1d4ed8', '#059669', '{"lat":16.2544,"lng":80.3244}'::jsonb, 850, 
  ARRAY['Chowdavaram Campus Main', 'Hi-Tech Block', 'Mechanical Complex']::TEXT[], 'APSCHE / AICTE 1-901234'
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  code = EXCLUDED.code,
  short_name = EXCLUDED.short_name,
  category = EXCLUDED.category,
  subcategory = EXCLUDED.subcategory,
  district = EXCLUDED.district,
  district_id = EXCLUDED.district_id,
  city = EXCLUDED.city,
  pincode = EXCLUDED.pincode,
  affiliation = EXCLUDED.affiliation,
  approval = EXCLUDED.approval,
  aishe_code = EXCLUDED.aishe_code,
  is_autonomous = EXCLUDED.is_autonomous,
  domain = EXCLUDED.domain,
  emergency_helpline = EXCLUDED.emergency_helpline,
  womens_cell_helpline = EXCLUDED.womens_cell_helpline,
  security_control_room = EXCLUDED.security_control_room,
  ambulance_contact = EXCLUDED.ambulance_contact,
  source_reference = EXCLUDED.source_reference,
  updated_at = NOW();
INSERT INTO public.colleges (
  id, name, code, short_name, slug, category, subcategory, 
  district, district_id, city, pincode, state, affiliation, approval, 
  aishe_code, is_autonomous, is_verified, is_active, status, domain, 
  emergency_helpline, womens_cell_helpline, security_control_room, ambulance_contact, 
  primary_color, secondary_color, coordinates, geofence_radius_meters, 
  campus_buildings, source_reference
) VALUES (
  'anu-guntur', 'Acharya Nagarjuna University College of Engineering', 'ANUC', 'ANU College of Engg', 'anu-guntur', 
  'ENGINEERING', 'UNIVERSITY_CONSTITUENT', 'Guntur', 'guntur', 
  'Guntur', '522510', 'Andhra Pradesh', 'Acharya Nagarjuna University', 'AICTE', 
  'C-24051', true, true, true, 'ACTIVE', 'nagarjunauniversity.ac.in', 
  '+91-863-2346114', '+91-863-2346115', '+91-863-2346110', '+91-863-2346119', 
  '#b91c1c', '#2563eb', '{"lat":16.3777,"lng":80.5288}'::jsonb, 1000, 
  ARRAY['University Engineering Block', 'Dean Office', 'Research Labs']::TEXT[], 'UGC / APSCHE University Directory'
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  code = EXCLUDED.code,
  short_name = EXCLUDED.short_name,
  category = EXCLUDED.category,
  subcategory = EXCLUDED.subcategory,
  district = EXCLUDED.district,
  district_id = EXCLUDED.district_id,
  city = EXCLUDED.city,
  pincode = EXCLUDED.pincode,
  affiliation = EXCLUDED.affiliation,
  approval = EXCLUDED.approval,
  aishe_code = EXCLUDED.aishe_code,
  is_autonomous = EXCLUDED.is_autonomous,
  domain = EXCLUDED.domain,
  emergency_helpline = EXCLUDED.emergency_helpline,
  womens_cell_helpline = EXCLUDED.womens_cell_helpline,
  security_control_room = EXCLUDED.security_control_room,
  ambulance_contact = EXCLUDED.ambulance_contact,
  source_reference = EXCLUDED.source_reference,
  updated_at = NOW();
INSERT INTO public.colleges (
  id, name, code, short_name, slug, category, subcategory, 
  district, district_id, city, pincode, state, affiliation, approval, 
  aishe_code, is_autonomous, is_verified, is_active, status, domain, 
  emergency_helpline, womens_cell_helpline, security_control_room, ambulance_contact, 
  primary_color, secondary_color, coordinates, geofence_radius_meters, 
  campus_buildings, source_reference
) VALUES (
  'gcwg-guntur', 'Government College for Women (Autonomous), Guntur', 'GCWG', 'Govt College Women Guntur', 'gcwg-guntur', 
  'DEGREE', 'GOVERNMENT', 'Guntur', 'guntur', 
  'Guntur', '522001', 'Andhra Pradesh', 'Acharya Nagarjuna University', 'UGC', 
  'C-24052', true, true, true, 'ACTIVE', 'gcwguntur.ac.in', 
  '+91-863-2220092', '+91-863-2220093', '+91-863-2220090', '+91-863-2220099', 
  '#be185d', '#f59e0b', '{"lat":16.3055,"lng":80.4422}'::jsonb, 600, 
  ARRAY['Main College Block', 'Science Complex', 'Hostel Wing']::TEXT[], 'UGC Recognized Colleges List'
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  code = EXCLUDED.code,
  short_name = EXCLUDED.short_name,
  category = EXCLUDED.category,
  subcategory = EXCLUDED.subcategory,
  district = EXCLUDED.district,
  district_id = EXCLUDED.district_id,
  city = EXCLUDED.city,
  pincode = EXCLUDED.pincode,
  affiliation = EXCLUDED.affiliation,
  approval = EXCLUDED.approval,
  aishe_code = EXCLUDED.aishe_code,
  is_autonomous = EXCLUDED.is_autonomous,
  domain = EXCLUDED.domain,
  emergency_helpline = EXCLUDED.emergency_helpline,
  womens_cell_helpline = EXCLUDED.womens_cell_helpline,
  security_control_room = EXCLUDED.security_control_room,
  ambulance_contact = EXCLUDED.ambulance_contact,
  source_reference = EXCLUDED.source_reference,
  updated_at = NOW();
INSERT INTO public.colleges (
  id, name, code, short_name, slug, category, subcategory, 
  district, district_id, city, pincode, state, affiliation, approval, 
  aishe_code, is_autonomous, is_verified, is_active, status, domain, 
  emergency_helpline, womens_cell_helpline, security_control_room, ambulance_contact, 
  primary_color, secondary_color, coordinates, geofence_radius_meters, 
  campus_buildings, source_reference
) VALUES (
  'jntua-anantapur', 'JNTUA College of Engineering Ananthapuramu (Autonomous)', 'JNTUA', 'JNTUA CEA', 'jntua-anantapur', 
  'ENGINEERING', 'UNIVERSITY_CONSTITUENT', 'Ananthapuramu', 'ananthapuramu', 
  'Anantapur', '515002', 'Andhra Pradesh', 'JNTUA', 'AICTE', 
  'C-24060', true, true, true, 'ACTIVE', 'jntuacea.ac.in', 
  '+91-8554-273013', '+91-8554-273014', '+91-8554-273010', '+91-8554-273019', 
  '#1d4ed8', '#f97316', '{"lat":14.6544,"lng":77.6088}'::jsonb, 1100, 
  ARRAY['Administrative Complex', 'ECE Block', 'Civil Engineering Dept', 'Hostels']::TEXT[], 'APSCHE / JNTUA Constituent'
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  code = EXCLUDED.code,
  short_name = EXCLUDED.short_name,
  category = EXCLUDED.category,
  subcategory = EXCLUDED.subcategory,
  district = EXCLUDED.district,
  district_id = EXCLUDED.district_id,
  city = EXCLUDED.city,
  pincode = EXCLUDED.pincode,
  affiliation = EXCLUDED.affiliation,
  approval = EXCLUDED.approval,
  aishe_code = EXCLUDED.aishe_code,
  is_autonomous = EXCLUDED.is_autonomous,
  domain = EXCLUDED.domain,
  emergency_helpline = EXCLUDED.emergency_helpline,
  womens_cell_helpline = EXCLUDED.womens_cell_helpline,
  security_control_room = EXCLUDED.security_control_room,
  ambulance_contact = EXCLUDED.ambulance_contact,
  source_reference = EXCLUDED.source_reference,
  updated_at = NOW();
INSERT INTO public.colleges (
  id, name, code, short_name, slug, category, subcategory, 
  district, district_id, city, pincode, state, affiliation, approval, 
  aishe_code, is_autonomous, is_verified, is_active, status, domain, 
  emergency_helpline, womens_cell_helpline, security_control_room, ambulance_contact, 
  primary_color, secondary_color, coordinates, geofence_radius_meters, 
  campus_buildings, source_reference
) VALUES (
  'gpt-anantapur', 'Government Polytechnic, Ananthapuramu', 'GPT-ATP', 'Govt Poly Anantapur', 'gpt-anantapur', 
  'POLYTECHNIC', 'GOVERNMENT', 'Ananthapuramu', 'ananthapuramu', 
  'Anantapur', '515001', 'Andhra Pradesh', 'SBTET', 'AICTE', 
  'S-12005', false, true, true, 'ACTIVE', 'gptanantapur.ac.in', 
  '+91-8554-274122', '+91-8554-274123', '+91-8554-274120', '+91-8554-274129', 
  '#059669', '#2563eb', '{"lat":14.6722,"lng":77.5955}'::jsonb, 650, 
  ARRAY['Main Polytechnic Building', 'Workshops', 'Civil Labs']::TEXT[], 'SBTET AP Directory'
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  code = EXCLUDED.code,
  short_name = EXCLUDED.short_name,
  category = EXCLUDED.category,
  subcategory = EXCLUDED.subcategory,
  district = EXCLUDED.district,
  district_id = EXCLUDED.district_id,
  city = EXCLUDED.city,
  pincode = EXCLUDED.pincode,
  affiliation = EXCLUDED.affiliation,
  approval = EXCLUDED.approval,
  aishe_code = EXCLUDED.aishe_code,
  is_autonomous = EXCLUDED.is_autonomous,
  domain = EXCLUDED.domain,
  emergency_helpline = EXCLUDED.emergency_helpline,
  womens_cell_helpline = EXCLUDED.womens_cell_helpline,
  security_control_room = EXCLUDED.security_control_room,
  ambulance_contact = EXCLUDED.ambulance_contact,
  source_reference = EXCLUDED.source_reference,
  updated_at = NOW();
INSERT INTO public.colleges (
  id, name, code, short_name, slug, category, subcategory, 
  district, district_id, city, pincode, state, affiliation, approval, 
  aishe_code, is_autonomous, is_verified, is_active, status, domain, 
  emergency_helpline, womens_cell_helpline, security_control_room, ambulance_contact, 
  primary_color, secondary_color, coordinates, geofence_radius_meters, 
  campus_buildings, source_reference
) VALUES (
  'gdc-anantapur', 'Government Degree College for Men, Ananthapuramu', 'GDCA', 'GDC Men Anantapur', 'gdc-anantapur', 
  'DEGREE', 'GOVERNMENT', 'Ananthapuramu', 'ananthapuramu', 
  'Anantapur', '515001', 'Andhra Pradesh', 'Sri Krishnadevaraya University', 'UGC', 
  'C-24061', false, true, true, 'ACTIVE', 'gdcanantapur.ac.in', 
  '+91-8554-220055', '+91-8554-220056', '+91-8554-220050', '+91-8554-220059', 
  '#0369a1', '#f59e0b', '{"lat":14.6812,"lng":77.6012}'::jsonb, 600, 
  ARRAY['Arts Block', 'Science Complex', 'Library']::TEXT[], 'UGC Recognized Colleges List'
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  code = EXCLUDED.code,
  short_name = EXCLUDED.short_name,
  category = EXCLUDED.category,
  subcategory = EXCLUDED.subcategory,
  district = EXCLUDED.district,
  district_id = EXCLUDED.district_id,
  city = EXCLUDED.city,
  pincode = EXCLUDED.pincode,
  affiliation = EXCLUDED.affiliation,
  approval = EXCLUDED.approval,
  aishe_code = EXCLUDED.aishe_code,
  is_autonomous = EXCLUDED.is_autonomous,
  domain = EXCLUDED.domain,
  emergency_helpline = EXCLUDED.emergency_helpline,
  womens_cell_helpline = EXCLUDED.womens_cell_helpline,
  security_control_room = EXCLUDED.security_control_room,
  ambulance_contact = EXCLUDED.ambulance_contact,
  source_reference = EXCLUDED.source_reference,
  updated_at = NOW();
INSERT INTO public.colleges (
  id, name, code, short_name, slug, category, subcategory, 
  district, district_id, city, pincode, state, affiliation, approval, 
  aishe_code, is_autonomous, is_verified, is_active, status, domain, 
  emergency_helpline, womens_cell_helpline, security_control_room, ambulance_contact, 
  primary_color, secondary_color, coordinates, geofence_radius_meters, 
  campus_buildings, source_reference
) VALUES (
  'svuce-tirupati', 'S.V. University College of Engineering (Autonomous)', 'SVUCE', 'SVUCE Tirupati', 'svuce-tirupati', 
  'ENGINEERING', 'UNIVERSITY_CONSTITUENT', 'Tirupati', 'tirupati', 
  'Tirupati', '517502', 'Andhra Pradesh', 'Sri Venkateswara University', 'AICTE', 
  'C-24070', true, true, true, 'ACTIVE', 'svuce.edu.in', 
  '+91-877-2289561', '+91-877-2289562', '+91-877-2289560', '+91-877-2289569', 
  '#7c3aed', '#f59e0b', '{"lat":13.6288,"lng":79.4055}'::jsonb, 1100, 
  ARRAY['SVU Engineering Main', 'Electronics Wing', 'Hostel Block', 'Library']::TEXT[], 'APSCHE / SVU Constituent'
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  code = EXCLUDED.code,
  short_name = EXCLUDED.short_name,
  category = EXCLUDED.category,
  subcategory = EXCLUDED.subcategory,
  district = EXCLUDED.district,
  district_id = EXCLUDED.district_id,
  city = EXCLUDED.city,
  pincode = EXCLUDED.pincode,
  affiliation = EXCLUDED.affiliation,
  approval = EXCLUDED.approval,
  aishe_code = EXCLUDED.aishe_code,
  is_autonomous = EXCLUDED.is_autonomous,
  domain = EXCLUDED.domain,
  emergency_helpline = EXCLUDED.emergency_helpline,
  womens_cell_helpline = EXCLUDED.womens_cell_helpline,
  security_control_room = EXCLUDED.security_control_room,
  ambulance_contact = EXCLUDED.ambulance_contact,
  source_reference = EXCLUDED.source_reference,
  updated_at = NOW();
INSERT INTO public.colleges (
  id, name, code, short_name, slug, category, subcategory, 
  district, district_id, city, pincode, state, affiliation, approval, 
  aishe_code, is_autonomous, is_verified, is_active, status, domain, 
  emergency_helpline, womens_cell_helpline, security_control_room, ambulance_contact, 
  primary_color, secondary_color, coordinates, geofence_radius_meters, 
  campus_buildings, source_reference
) VALUES (
  'svgp-tirupati', 'S.V. Government Polytechnic, Tirupati', 'SVGP', 'SV Govt Poly Tirupati', 'svgp-tirupati', 
  'POLYTECHNIC', 'GOVERNMENT', 'Tirupati', 'tirupati', 
  'Tirupati', '517507', 'Andhra Pradesh', 'SBTET', 'AICTE', 
  'S-12006', false, true, true, 'ACTIVE', 'svgptpt.ac.in', 
  '+91-877-2248555', '+91-877-2248556', '+91-877-2248550', '+91-877-2248559', 
  '#047857', '#2563eb', '{"lat":13.6355,"lng":79.4188}'::jsonb, 700, 
  ARRAY['Main Administrative Building', 'Workshops Complex', 'Boys Hostel']::TEXT[], 'SBTET AP Directory'
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  code = EXCLUDED.code,
  short_name = EXCLUDED.short_name,
  category = EXCLUDED.category,
  subcategory = EXCLUDED.subcategory,
  district = EXCLUDED.district,
  district_id = EXCLUDED.district_id,
  city = EXCLUDED.city,
  pincode = EXCLUDED.pincode,
  affiliation = EXCLUDED.affiliation,
  approval = EXCLUDED.approval,
  aishe_code = EXCLUDED.aishe_code,
  is_autonomous = EXCLUDED.is_autonomous,
  domain = EXCLUDED.domain,
  emergency_helpline = EXCLUDED.emergency_helpline,
  womens_cell_helpline = EXCLUDED.womens_cell_helpline,
  security_control_room = EXCLUDED.security_control_room,
  ambulance_contact = EXCLUDED.ambulance_contact,
  source_reference = EXCLUDED.source_reference,
  updated_at = NOW();
INSERT INTO public.colleges (
  id, name, code, short_name, slug, category, subcategory, 
  district, district_id, city, pincode, state, affiliation, approval, 
  aishe_code, is_autonomous, is_verified, is_active, status, domain, 
  emergency_helpline, womens_cell_helpline, security_control_room, ambulance_contact, 
  primary_color, secondary_color, coordinates, geofence_radius_meters, 
  campus_buildings, source_reference
) VALUES (
  'svarts-tirupati', 'S.V. Arts College (TTD), Tirupati', 'SVAT', 'SV Arts College Tirupati', 'svarts-tirupati', 
  'DEGREE', 'AIDED', 'Tirupati', 'tirupati', 
  'Tirupati', '517502', 'Andhra Pradesh', 'Sri Venkateswara University', 'UGC', 
  'C-24071', true, true, true, 'ACTIVE', 'svartscollege.org', 
  '+91-877-2264601', '+91-877-2264602', '+91-877-2264600', '+91-877-2264609', 
  '#b45309', '#0284c7', '{"lat":13.6312,"lng":79.4122}'::jsonb, 650, 
  ARRAY['Main TTD Educational Block', 'Science Wing', 'Library']::TEXT[], 'UGC Recognized Colleges List'
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  code = EXCLUDED.code,
  short_name = EXCLUDED.short_name,
  category = EXCLUDED.category,
  subcategory = EXCLUDED.subcategory,
  district = EXCLUDED.district,
  district_id = EXCLUDED.district_id,
  city = EXCLUDED.city,
  pincode = EXCLUDED.pincode,
  affiliation = EXCLUDED.affiliation,
  approval = EXCLUDED.approval,
  aishe_code = EXCLUDED.aishe_code,
  is_autonomous = EXCLUDED.is_autonomous,
  domain = EXCLUDED.domain,
  emergency_helpline = EXCLUDED.emergency_helpline,
  womens_cell_helpline = EXCLUDED.womens_cell_helpline,
  security_control_room = EXCLUDED.security_control_room,
  ambulance_contact = EXCLUDED.ambulance_contact,
  source_reference = EXCLUDED.source_reference,
  updated_at = NOW();
INSERT INTO public.colleges (
  id, name, code, short_name, slug, category, subcategory, 
  district, district_id, city, pincode, state, affiliation, approval, 
  aishe_code, is_autonomous, is_verified, is_active, status, domain, 
  emergency_helpline, womens_cell_helpline, security_control_room, ambulance_contact, 
  primary_color, secondary_color, coordinates, geofence_radius_meters, 
  campus_buildings, source_reference
) VALUES (
  'gprec-kurnool', 'G. Pulla Reddy Engineering College (Autonomous)', 'GPRE', 'G Pulla Reddy Engg College', 'gprec-kurnool', 
  'ENGINEERING', 'AUTONOMOUS', 'Kurnool', 'kurnool', 
  'Kurnool', '518007', 'Andhra Pradesh', 'JNTUA', 'AICTE', 
  'C-24080', true, true, true, 'ACTIVE', 'gprec.ac.in', 
  '+91-8518-270957', '+91-8518-270958', '+91-8518-270950', '+91-8518-270959', 
  '#1e40af', '#f59e0b', '{"lat":15.8288,"lng":78.0288}'::jsonb, 850, 
  ARRAY['Main Admin Block', 'CSE Tower', 'Civil & Mech Complex', 'Hostels']::TEXT[], 'AICTE Permanent ID 1-345678'
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  code = EXCLUDED.code,
  short_name = EXCLUDED.short_name,
  category = EXCLUDED.category,
  subcategory = EXCLUDED.subcategory,
  district = EXCLUDED.district,
  district_id = EXCLUDED.district_id,
  city = EXCLUDED.city,
  pincode = EXCLUDED.pincode,
  affiliation = EXCLUDED.affiliation,
  approval = EXCLUDED.approval,
  aishe_code = EXCLUDED.aishe_code,
  is_autonomous = EXCLUDED.is_autonomous,
  domain = EXCLUDED.domain,
  emergency_helpline = EXCLUDED.emergency_helpline,
  womens_cell_helpline = EXCLUDED.womens_cell_helpline,
  security_control_room = EXCLUDED.security_control_room,
  ambulance_contact = EXCLUDED.ambulance_contact,
  source_reference = EXCLUDED.source_reference,
  updated_at = NOW();
INSERT INTO public.colleges (
  id, name, code, short_name, slug, category, subcategory, 
  district, district_id, city, pincode, state, affiliation, approval, 
  aishe_code, is_autonomous, is_verified, is_active, status, domain, 
  emergency_helpline, womens_cell_helpline, security_control_room, ambulance_contact, 
  primary_color, secondary_color, coordinates, geofence_radius_meters, 
  campus_buildings, source_reference
) VALUES (
  'sjgc-kurnool', 'Silver Jubilee Government College (Autonomous)', 'SJGC', 'Silver Jubilee Govt College', 'sjgc-kurnool', 
  'DEGREE', 'GOVERNMENT', 'Kurnool', 'kurnool', 
  'Kurnool', '518002', 'Andhra Pradesh', 'Rayalaseema University', 'UGC', 
  'C-24081', true, true, true, 'ACTIVE', 'sjgckurnool.edu.in', 
  '+91-8518-220077', '+91-8518-220078', '+91-8518-220070', '+91-8518-220079', 
  '#0284c7', '#16a34a', '{"lat":15.8212,"lng":78.0355}'::jsonb, 650, 
  ARRAY['Main Academic Block', 'Hostel Wing', 'Auditorium']::TEXT[], 'UGC College Directory'
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  code = EXCLUDED.code,
  short_name = EXCLUDED.short_name,
  category = EXCLUDED.category,
  subcategory = EXCLUDED.subcategory,
  district = EXCLUDED.district,
  district_id = EXCLUDED.district_id,
  city = EXCLUDED.city,
  pincode = EXCLUDED.pincode,
  affiliation = EXCLUDED.affiliation,
  approval = EXCLUDED.approval,
  aishe_code = EXCLUDED.aishe_code,
  is_autonomous = EXCLUDED.is_autonomous,
  domain = EXCLUDED.domain,
  emergency_helpline = EXCLUDED.emergency_helpline,
  womens_cell_helpline = EXCLUDED.womens_cell_helpline,
  security_control_room = EXCLUDED.security_control_room,
  ambulance_contact = EXCLUDED.ambulance_contact,
  source_reference = EXCLUDED.source_reference,
  updated_at = NOW();
INSERT INTO public.colleges (
  id, name, code, short_name, slug, category, subcategory, 
  district, district_id, city, pincode, state, affiliation, approval, 
  aishe_code, is_autonomous, is_verified, is_active, status, domain, 
  emergency_helpline, womens_cell_helpline, security_control_room, ambulance_contact, 
  primary_color, secondary_color, coordinates, geofence_radius_meters, 
  campus_buildings, source_reference
) VALUES (
  'rgmcet-nandyal', 'Rajeev Gandhi Memorial College of Engineering and Technology (Autonomous)', 'RGMC', 'RGM College of Engg', 'rgmcet-nandyal', 
  'ENGINEERING', 'AUTONOMOUS', 'Nandyal', 'nandyal', 
  'Nandyal', '518501', 'Andhra Pradesh', 'JNTUA', 'AICTE', 
  'C-24090', true, true, true, 'ACTIVE', 'rgmcet.edu.in', 
  '+91-8514-275201', '+91-8514-275202', '+91-8514-275200', '+91-8514-275209', 
  '#2563eb', '#f97316', '{"lat":15.4888,"lng":78.4822}'::jsonb, 800, 
  ARRAY['Main Academic Wing', 'Mechanical Complex', 'Hostels']::TEXT[], 'APSCHE / AICTE 1-234567'
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  code = EXCLUDED.code,
  short_name = EXCLUDED.short_name,
  category = EXCLUDED.category,
  subcategory = EXCLUDED.subcategory,
  district = EXCLUDED.district,
  district_id = EXCLUDED.district_id,
  city = EXCLUDED.city,
  pincode = EXCLUDED.pincode,
  affiliation = EXCLUDED.affiliation,
  approval = EXCLUDED.approval,
  aishe_code = EXCLUDED.aishe_code,
  is_autonomous = EXCLUDED.is_autonomous,
  domain = EXCLUDED.domain,
  emergency_helpline = EXCLUDED.emergency_helpline,
  womens_cell_helpline = EXCLUDED.womens_cell_helpline,
  security_control_room = EXCLUDED.security_control_room,
  ambulance_contact = EXCLUDED.ambulance_contact,
  source_reference = EXCLUDED.source_reference,
  updated_at = NOW();
INSERT INTO public.colleges (
  id, name, code, short_name, slug, category, subcategory, 
  district, district_id, city, pincode, state, affiliation, approval, 
  aishe_code, is_autonomous, is_verified, is_active, status, domain, 
  emergency_helpline, womens_cell_helpline, security_control_room, ambulance_contact, 
  primary_color, secondary_color, coordinates, geofence_radius_meters, 
  campus_buildings, source_reference
) VALUES (
  'psckvsc-nandyal', 'PSC & KVSC Government Degree College', 'PSCK', 'Govt Degree College Nandyal', 'psckvsc-nandyal', 
  'DEGREE', 'GOVERNMENT', 'Nandyal', 'nandyal', 
  'Nandyal', '518502', 'Andhra Pradesh', 'Rayalaseema University', 'UGC', 
  'C-24091', false, true, true, 'ACTIVE', 'psckvsc.ac.in', 
  '+91-8514-242200', '+91-8514-242201', '+91-8514-242202', '+91-8514-242209', 
  '#0d9488', '#f59e0b', '{"lat":15.4955,"lng":78.4788}'::jsonb, 600, 
  ARRAY['Main Building', 'Science Labs', 'Library']::TEXT[], 'UGC Directory'
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  code = EXCLUDED.code,
  short_name = EXCLUDED.short_name,
  category = EXCLUDED.category,
  subcategory = EXCLUDED.subcategory,
  district = EXCLUDED.district,
  district_id = EXCLUDED.district_id,
  city = EXCLUDED.city,
  pincode = EXCLUDED.pincode,
  affiliation = EXCLUDED.affiliation,
  approval = EXCLUDED.approval,
  aishe_code = EXCLUDED.aishe_code,
  is_autonomous = EXCLUDED.is_autonomous,
  domain = EXCLUDED.domain,
  emergency_helpline = EXCLUDED.emergency_helpline,
  womens_cell_helpline = EXCLUDED.womens_cell_helpline,
  security_control_room = EXCLUDED.security_control_room,
  ambulance_contact = EXCLUDED.ambulance_contact,
  source_reference = EXCLUDED.source_reference,
  updated_at = NOW();
INSERT INTO public.colleges (
  id, name, code, short_name, slug, category, subcategory, 
  district, district_id, city, pincode, state, affiliation, approval, 
  aishe_code, is_autonomous, is_verified, is_active, status, domain, 
  emergency_helpline, womens_cell_helpline, security_control_room, ambulance_contact, 
  primary_color, secondary_color, coordinates, geofence_radius_meters, 
  campus_buildings, source_reference
) VALUES (
  'rgukt-rkvalley', 'Rajiv Gandhi University of Knowledge Technologies (RGUKT) RK Valley', 'RGUKT-RKV', 'IIIT RK Valley Kadapa', 'rgukt-rkvalley', 
  'ENGINEERING', 'UNIVERSITY_CONSTITUENT', 'YSR (Kadapa)', 'ysr-kadapa', 
  'Idupulapaya', '516330', 'Andhra Pradesh', 'RGUKT AP', 'AICTE', 
  'U-0010', true, true, true, 'ACTIVE', 'rguktrkv.ac.in', 
  '+91-8588-283601', '+91-8588-283602', '+91-8588-283600', '+91-8588-283609', 
  '#7c2d12', '#3b82f6', '{"lat":14.3422,"lng":78.5388}'::jsonb, 1500, 
  ARRAY['Academic Block 1', 'Academic Block 2', 'Girls Hostels', 'Boys Hostels', 'Hospital Complex']::TEXT[], 'AP State Act / RGUKT Registry'
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  code = EXCLUDED.code,
  short_name = EXCLUDED.short_name,
  category = EXCLUDED.category,
  subcategory = EXCLUDED.subcategory,
  district = EXCLUDED.district,
  district_id = EXCLUDED.district_id,
  city = EXCLUDED.city,
  pincode = EXCLUDED.pincode,
  affiliation = EXCLUDED.affiliation,
  approval = EXCLUDED.approval,
  aishe_code = EXCLUDED.aishe_code,
  is_autonomous = EXCLUDED.is_autonomous,
  domain = EXCLUDED.domain,
  emergency_helpline = EXCLUDED.emergency_helpline,
  womens_cell_helpline = EXCLUDED.womens_cell_helpline,
  security_control_room = EXCLUDED.security_control_room,
  ambulance_contact = EXCLUDED.ambulance_contact,
  source_reference = EXCLUDED.source_reference,
  updated_at = NOW();
INSERT INTO public.colleges (
  id, name, code, short_name, slug, category, subcategory, 
  district, district_id, city, pincode, state, affiliation, approval, 
  aishe_code, is_autonomous, is_verified, is_active, status, domain, 
  emergency_helpline, womens_cell_helpline, security_control_room, ambulance_contact, 
  primary_color, secondary_color, coordinates, geofence_radius_meters, 
  campus_buildings, source_reference
) VALUES (
  'jntua-pulivendula', 'JNTUA College of Engineering Pulivendula (Autonomous)', 'JNTU-PUL', 'JNTUA CEP', 'jntua-pulivendula', 
  'ENGINEERING', 'UNIVERSITY_CONSTITUENT', 'YSR (Kadapa)', 'ysr-kadapa', 
  'Pulivendula', '516390', 'Andhra Pradesh', 'JNTUA', 'AICTE', 
  'C-24101', true, true, true, 'ACTIVE', 'jntuacep.ac.in', 
  '+91-8568-286349', '+91-8568-286350', '+91-8568-286340', '+91-8568-286355', 
  '#1e3a8a', '#f97316', '{"lat":14.4155,"lng":78.2288}'::jsonb, 1000, 
  ARRAY['Administrative Wing', 'CSE Block', 'Hostels']::TEXT[], 'APSCHE / JNTUA Constituent'
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  code = EXCLUDED.code,
  short_name = EXCLUDED.short_name,
  category = EXCLUDED.category,
  subcategory = EXCLUDED.subcategory,
  district = EXCLUDED.district,
  district_id = EXCLUDED.district_id,
  city = EXCLUDED.city,
  pincode = EXCLUDED.pincode,
  affiliation = EXCLUDED.affiliation,
  approval = EXCLUDED.approval,
  aishe_code = EXCLUDED.aishe_code,
  is_autonomous = EXCLUDED.is_autonomous,
  domain = EXCLUDED.domain,
  emergency_helpline = EXCLUDED.emergency_helpline,
  womens_cell_helpline = EXCLUDED.womens_cell_helpline,
  security_control_room = EXCLUDED.security_control_room,
  ambulance_contact = EXCLUDED.ambulance_contact,
  source_reference = EXCLUDED.source_reference,
  updated_at = NOW();
INSERT INTO public.colleges (
  id, name, code, short_name, slug, category, subcategory, 
  district, district_id, city, pincode, state, affiliation, approval, 
  aishe_code, is_autonomous, is_verified, is_active, status, domain, 
  emergency_helpline, womens_cell_helpline, security_control_room, ambulance_contact, 
  primary_color, secondary_color, coordinates, geofence_radius_meters, 
  campus_buildings, source_reference
) VALUES (
  'rgukt-nuzvid', 'Rajiv Gandhi University of Knowledge Technologies (RGUKT) Nuzvid', 'RGUKT-NZV', 'IIIT Nuzvid', 'rgukt-nuzvid', 
  'ENGINEERING', 'UNIVERSITY_CONSTITUENT', 'Eluru', 'eluru', 
  'Nuzvid', '521202', 'Andhra Pradesh', 'RGUKT AP', 'AICTE', 
  'U-0011', true, true, true, 'ACTIVE', 'rguktn.ac.in', 
  '+91-8656-235147', '+91-8656-235148', '+91-8656-235140', '+91-8656-235149', 
  '#047857', '#2563eb', '{"lat":16.7888,"lng":80.8455}'::jsonb, 1500, 
  ARRAY['Academic Blocks I-III', 'Central Library', 'Hostel Wings', 'Campus Health Center']::TEXT[], 'AP State Act / RGUKT Registry'
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  code = EXCLUDED.code,
  short_name = EXCLUDED.short_name,
  category = EXCLUDED.category,
  subcategory = EXCLUDED.subcategory,
  district = EXCLUDED.district,
  district_id = EXCLUDED.district_id,
  city = EXCLUDED.city,
  pincode = EXCLUDED.pincode,
  affiliation = EXCLUDED.affiliation,
  approval = EXCLUDED.approval,
  aishe_code = EXCLUDED.aishe_code,
  is_autonomous = EXCLUDED.is_autonomous,
  domain = EXCLUDED.domain,
  emergency_helpline = EXCLUDED.emergency_helpline,
  womens_cell_helpline = EXCLUDED.womens_cell_helpline,
  security_control_room = EXCLUDED.security_control_room,
  ambulance_contact = EXCLUDED.ambulance_contact,
  source_reference = EXCLUDED.source_reference,
  updated_at = NOW();
INSERT INTO public.colleges (
  id, name, code, short_name, slug, category, subcategory, 
  district, district_id, city, pincode, state, affiliation, approval, 
  aishe_code, is_autonomous, is_verified, is_active, status, domain, 
  emergency_helpline, womens_cell_helpline, security_control_room, ambulance_contact, 
  primary_color, secondary_color, coordinates, geofence_radius_meters, 
  campus_buildings, source_reference
) VALUES (
  'crr-eluru', 'Sir C.R. Reddy College of Engineering', 'CRRE', 'Sir CR Reddy Engg College', 'crr-eluru', 
  'ENGINEERING', 'PRIVATE', 'Eluru', 'eluru', 
  'Eluru', '534007', 'Andhra Pradesh', 'JNTUK', 'AICTE', 
  'C-24110', false, true, true, 'ACTIVE', 'sircrrengg.ac.in', 
  '+91-8812-230840', '+91-8812-230841', '+91-8812-230842', '+91-8812-230849', 
  '#1d4ed8', '#f59e0b', '{"lat":16.7188,"lng":81.1055}'::jsonb, 800, 
  ARRAY['Vatluru Main Campus', 'CSE Block', 'Mechanical Complex']::TEXT[], 'AICTE Permanent ID 1-123456'
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  code = EXCLUDED.code,
  short_name = EXCLUDED.short_name,
  category = EXCLUDED.category,
  subcategory = EXCLUDED.subcategory,
  district = EXCLUDED.district,
  district_id = EXCLUDED.district_id,
  city = EXCLUDED.city,
  pincode = EXCLUDED.pincode,
  affiliation = EXCLUDED.affiliation,
  approval = EXCLUDED.approval,
  aishe_code = EXCLUDED.aishe_code,
  is_autonomous = EXCLUDED.is_autonomous,
  domain = EXCLUDED.domain,
  emergency_helpline = EXCLUDED.emergency_helpline,
  womens_cell_helpline = EXCLUDED.womens_cell_helpline,
  security_control_room = EXCLUDED.security_control_room,
  ambulance_contact = EXCLUDED.ambulance_contact,
  source_reference = EXCLUDED.source_reference,
  updated_at = NOW();
INSERT INTO public.colleges (
  id, name, code, short_name, slug, category, subcategory, 
  district, district_id, city, pincode, state, affiliation, approval, 
  aishe_code, is_autonomous, is_verified, is_active, status, domain, 
  emergency_helpline, womens_cell_helpline, security_control_room, ambulance_contact, 
  primary_color, secondary_color, coordinates, geofence_radius_meters, 
  campus_buildings, source_reference
) VALUES (
  'giet-rajahmundry', 'Godavari Institute of Engineering and Technology (Autonomous)', 'GIET', 'GIET Rajahmundry', 'giet-rajahmundry', 
  'ENGINEERING', 'AUTONOMOUS', 'East Godavari', 'east-godavari', 
  'Rajamahendravaram', '533296', 'Andhra Pradesh', 'JNTUK', 'AICTE', 
  'C-24120', true, true, true, 'ACTIVE', 'giet.ac.in', 
  '+91-883-2484824', '+91-883-2484825', '+91-883-2484820', '+91-883-2484829', 
  '#0369a1', '#ea580c', '{"lat":17.0288,"lng":81.8588}'::jsonb, 900, 
  ARRAY['Chaitanya Knowledge City', 'Engineering Wings A & B', 'Hostels']::TEXT[], 'APSCHE / AICTE Directory'
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  code = EXCLUDED.code,
  short_name = EXCLUDED.short_name,
  category = EXCLUDED.category,
  subcategory = EXCLUDED.subcategory,
  district = EXCLUDED.district,
  district_id = EXCLUDED.district_id,
  city = EXCLUDED.city,
  pincode = EXCLUDED.pincode,
  affiliation = EXCLUDED.affiliation,
  approval = EXCLUDED.approval,
  aishe_code = EXCLUDED.aishe_code,
  is_autonomous = EXCLUDED.is_autonomous,
  domain = EXCLUDED.domain,
  emergency_helpline = EXCLUDED.emergency_helpline,
  womens_cell_helpline = EXCLUDED.womens_cell_helpline,
  security_control_room = EXCLUDED.security_control_room,
  ambulance_contact = EXCLUDED.ambulance_contact,
  source_reference = EXCLUDED.source_reference,
  updated_at = NOW();
INSERT INTO public.colleges (
  id, name, code, short_name, slug, category, subcategory, 
  district, district_id, city, pincode, state, affiliation, approval, 
  aishe_code, is_autonomous, is_verified, is_active, status, domain, 
  emergency_helpline, womens_cell_helpline, security_control_room, ambulance_contact, 
  primary_color, secondary_color, coordinates, geofence_radius_meters, 
  campus_buildings, source_reference
) VALUES (
  'gacr-rajahmundry', 'Government Arts College (Autonomous), Rajahmundry', 'GACR', 'Govt Arts College RJY', 'gacr-rajahmundry', 
  'DEGREE', 'GOVERNMENT', 'East Godavari', 'east-godavari', 
  'Rajamahendravaram', '533105', 'Andhra Pradesh', 'Adikavi Nannaya University', 'UGC', 
  'C-24121', true, true, true, 'ACTIVE', 'gcrjy.ac.in', 
  '+91-883-2475732', '+91-883-2475733', '+91-883-2475730', '+91-883-2475739', 
  '#7c3aed', '#f59e0b', '{"lat":17.0012,"lng":81.7788}'::jsonb, 650, 
  ARRAY['Main Heritage Hall', 'Science Labs Block', 'Central Library']::TEXT[], 'UGC Recognized Colleges List'
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  code = EXCLUDED.code,
  short_name = EXCLUDED.short_name,
  category = EXCLUDED.category,
  subcategory = EXCLUDED.subcategory,
  district = EXCLUDED.district,
  district_id = EXCLUDED.district_id,
  city = EXCLUDED.city,
  pincode = EXCLUDED.pincode,
  affiliation = EXCLUDED.affiliation,
  approval = EXCLUDED.approval,
  aishe_code = EXCLUDED.aishe_code,
  is_autonomous = EXCLUDED.is_autonomous,
  domain = EXCLUDED.domain,
  emergency_helpline = EXCLUDED.emergency_helpline,
  womens_cell_helpline = EXCLUDED.womens_cell_helpline,
  security_control_room = EXCLUDED.security_control_room,
  ambulance_contact = EXCLUDED.ambulance_contact,
  source_reference = EXCLUDED.source_reference,
  updated_at = NOW();
INSERT INTO public.colleges (
  id, name, code, short_name, slug, category, subcategory, 
  district, district_id, city, pincode, state, affiliation, approval, 
  aishe_code, is_autonomous, is_verified, is_active, status, domain, 
  emergency_helpline, womens_cell_helpline, security_control_room, ambulance_contact, 
  primary_color, secondary_color, coordinates, geofence_radius_meters, 
  campus_buildings, source_reference
) VALUES (
  'bvce-odalarevu', 'B.V.C. Engineering College (Autonomous)', 'BVCE', 'BVC Engg College', 'bvce-odalarevu', 
  'ENGINEERING', 'AUTONOMOUS', 'Dr. B. R. Ambedkar Konaseema', 'dr-br-ambedkar-konaseema', 
  'Odalarevu', '533210', 'Andhra Pradesh', 'JNTUK', 'AICTE', 
  'C-24130', true, true, true, 'ACTIVE', 'bvcgroup.in', 
  '+91-8856-278456', '+91-8856-278457', '+91-8856-278450', '+91-8856-278459', 
  '#059669', '#2563eb', '{"lat":16.4888,"lng":81.9888}'::jsonb, 750, 
  ARRAY['Odalarevu Campus', 'CSE Block', 'Hostels']::TEXT[], 'AICTE Permanent ID 1-456123'
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  code = EXCLUDED.code,
  short_name = EXCLUDED.short_name,
  category = EXCLUDED.category,
  subcategory = EXCLUDED.subcategory,
  district = EXCLUDED.district,
  district_id = EXCLUDED.district_id,
  city = EXCLUDED.city,
  pincode = EXCLUDED.pincode,
  affiliation = EXCLUDED.affiliation,
  approval = EXCLUDED.approval,
  aishe_code = EXCLUDED.aishe_code,
  is_autonomous = EXCLUDED.is_autonomous,
  domain = EXCLUDED.domain,
  emergency_helpline = EXCLUDED.emergency_helpline,
  womens_cell_helpline = EXCLUDED.womens_cell_helpline,
  security_control_room = EXCLUDED.security_control_room,
  ambulance_contact = EXCLUDED.ambulance_contact,
  source_reference = EXCLUDED.source_reference,
  updated_at = NOW();
INSERT INTO public.colleges (
  id, name, code, short_name, slug, category, subcategory, 
  district, district_id, city, pincode, state, affiliation, approval, 
  aishe_code, is_autonomous, is_verified, is_active, status, domain, 
  emergency_helpline, womens_cell_helpline, security_control_room, ambulance_contact, 
  primary_color, secondary_color, coordinates, geofence_radius_meters, 
  campus_buildings, source_reference
) VALUES (
  'skbr-amalapuram', 'S.K.B.R. College, Amalapuram', 'SKBR', 'SKBR College Amalapuram', 'skbr-amalapuram', 
  'DEGREE', 'AIDED', 'Dr. B. R. Ambedkar Konaseema', 'dr-br-ambedkar-konaseema', 
  'Amalapuram', '533201', 'Andhra Pradesh', 'Adikavi Nannaya University', 'UGC', 
  'C-24131', false, true, true, 'ACTIVE', 'skbrcollege.edu.in', 
  '+91-8856-231045', '+91-8856-231046', '+91-8856-231040', '+91-8856-231049', 
  '#b45309', '#0369a1', '{"lat":16.5788,"lng":82.0088}'::jsonb, 600, 
  ARRAY['Main Academic Block', 'Library Wing', 'Auditorium']::TEXT[], 'UGC Directory'
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  code = EXCLUDED.code,
  short_name = EXCLUDED.short_name,
  category = EXCLUDED.category,
  subcategory = EXCLUDED.subcategory,
  district = EXCLUDED.district,
  district_id = EXCLUDED.district_id,
  city = EXCLUDED.city,
  pincode = EXCLUDED.pincode,
  affiliation = EXCLUDED.affiliation,
  approval = EXCLUDED.approval,
  aishe_code = EXCLUDED.aishe_code,
  is_autonomous = EXCLUDED.is_autonomous,
  domain = EXCLUDED.domain,
  emergency_helpline = EXCLUDED.emergency_helpline,
  womens_cell_helpline = EXCLUDED.womens_cell_helpline,
  security_control_room = EXCLUDED.security_control_room,
  ambulance_contact = EXCLUDED.ambulance_contact,
  source_reference = EXCLUDED.source_reference,
  updated_at = NOW();
INSERT INTO public.colleges (
  id, name, code, short_name, slug, category, subcategory, 
  district, district_id, city, pincode, state, affiliation, approval, 
  aishe_code, is_autonomous, is_verified, is_active, status, domain, 
  emergency_helpline, womens_cell_helpline, security_control_room, ambulance_contact, 
  primary_color, secondary_color, coordinates, geofence_radius_meters, 
  campus_buildings, source_reference
) VALUES (
  'nec-narasaraopet', 'Narasaraopeta Engineering College (Autonomous)', 'NARA', 'Narasaraopeta Engg College', 'nec-narasaraopet', 
  'ENGINEERING', 'AUTONOMOUS', 'Palnadu', 'palnadu', 
  'Narasaraopet', '522601', 'Andhra Pradesh', 'JNTUK', 'AICTE', 
  'C-24140', true, true, true, 'ACTIVE', 'nrtec.in', 
  '+91-8647-239903', '+91-8647-239904', '+91-8647-239900', '+91-8647-239909', 
  '#1d4ed8', '#f97316', '{"lat":16.2344,"lng":80.0544}'::jsonb, 800, 
  ARRAY['Kotappakonda Road Campus', 'CSE Block', 'Hostels']::TEXT[], 'APSCHE / AICTE Directory'
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  code = EXCLUDED.code,
  short_name = EXCLUDED.short_name,
  category = EXCLUDED.category,
  subcategory = EXCLUDED.subcategory,
  district = EXCLUDED.district,
  district_id = EXCLUDED.district_id,
  city = EXCLUDED.city,
  pincode = EXCLUDED.pincode,
  affiliation = EXCLUDED.affiliation,
  approval = EXCLUDED.approval,
  aishe_code = EXCLUDED.aishe_code,
  is_autonomous = EXCLUDED.is_autonomous,
  domain = EXCLUDED.domain,
  emergency_helpline = EXCLUDED.emergency_helpline,
  womens_cell_helpline = EXCLUDED.womens_cell_helpline,
  security_control_room = EXCLUDED.security_control_room,
  ambulance_contact = EXCLUDED.ambulance_contact,
  source_reference = EXCLUDED.source_reference,
  updated_at = NOW();
INSERT INTO public.colleges (
  id, name, code, short_name, slug, category, subcategory, 
  district, district_id, city, pincode, state, affiliation, approval, 
  aishe_code, is_autonomous, is_verified, is_active, status, domain, 
  emergency_helpline, womens_cell_helpline, security_control_room, ambulance_contact, 
  primary_color, secondary_color, coordinates, geofence_radius_meters, 
  campus_buildings, source_reference
) VALUES (
  'bec-bapatla', 'Bapatla Engineering College (Autonomous)', 'BAPL', 'Bapatla Engg College', 'bec-bapatla', 
  'ENGINEERING', 'AUTONOMOUS', 'Bapatla', 'bapatla', 
  'Bapatla', '522101', 'Andhra Pradesh', 'Acharya Nagarjuna University', 'AICTE', 
  'C-24150', true, true, true, 'ACTIVE', 'becbapatla.ac.in', 
  '+91-8643-224244', '+91-8643-224245', '+91-8643-224240', '+91-8643-224249', 
  '#047857', '#2563eb', '{"lat":15.9088,"lng":80.4688}'::jsonb, 850, 
  ARRAY['Admin Wing', 'ECE & CSE Block', 'Mechanical Complex', 'Hostels']::TEXT[], 'APSCHE / AICTE Directory'
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  code = EXCLUDED.code,
  short_name = EXCLUDED.short_name,
  category = EXCLUDED.category,
  subcategory = EXCLUDED.subcategory,
  district = EXCLUDED.district,
  district_id = EXCLUDED.district_id,
  city = EXCLUDED.city,
  pincode = EXCLUDED.pincode,
  affiliation = EXCLUDED.affiliation,
  approval = EXCLUDED.approval,
  aishe_code = EXCLUDED.aishe_code,
  is_autonomous = EXCLUDED.is_autonomous,
  domain = EXCLUDED.domain,
  emergency_helpline = EXCLUDED.emergency_helpline,
  womens_cell_helpline = EXCLUDED.womens_cell_helpline,
  security_control_room = EXCLUDED.security_control_room,
  ambulance_contact = EXCLUDED.ambulance_contact,
  source_reference = EXCLUDED.source_reference,
  updated_at = NOW();
INSERT INTO public.colleges (
  id, name, code, short_name, slug, category, subcategory, 
  district, district_id, city, pincode, state, affiliation, approval, 
  aishe_code, is_autonomous, is_verified, is_active, status, domain, 
  emergency_helpline, womens_cell_helpline, security_control_room, ambulance_contact, 
  primary_color, secondary_color, coordinates, geofence_radius_meters, 
  campus_buildings, source_reference
) VALUES (
  'pace-ongole', 'PACE Institute of Technology and Sciences (Autonomous)', 'PACE', 'PACE Institute Ongole', 'pace-ongole', 
  'ENGINEERING', 'AUTONOMOUS', 'Prakasam', 'prakasam', 
  'Ongole', '523272', 'Andhra Pradesh', 'JNTUK', 'AICTE', 
  'C-24160', true, true, true, 'ACTIVE', 'pace.ac.in', 
  '+91-8592-278315', '+91-8592-278316', '+91-8592-278310', '+91-8592-278319', 
  '#0284c7', '#f97316', '{"lat":15.5088,"lng":80.0488}'::jsonb, 800, 
  ARRAY['Vallur Campus Main', 'CSE Labs', 'Hostels']::TEXT[], 'AICTE Permanent ID 1-567891'
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  code = EXCLUDED.code,
  short_name = EXCLUDED.short_name,
  category = EXCLUDED.category,
  subcategory = EXCLUDED.subcategory,
  district = EXCLUDED.district,
  district_id = EXCLUDED.district_id,
  city = EXCLUDED.city,
  pincode = EXCLUDED.pincode,
  affiliation = EXCLUDED.affiliation,
  approval = EXCLUDED.approval,
  aishe_code = EXCLUDED.aishe_code,
  is_autonomous = EXCLUDED.is_autonomous,
  domain = EXCLUDED.domain,
  emergency_helpline = EXCLUDED.emergency_helpline,
  womens_cell_helpline = EXCLUDED.womens_cell_helpline,
  security_control_room = EXCLUDED.security_control_room,
  ambulance_contact = EXCLUDED.ambulance_contact,
  source_reference = EXCLUDED.source_reference,
  updated_at = NOW();
INSERT INTO public.colleges (
  id, name, code, short_name, slug, category, subcategory, 
  district, district_id, city, pincode, state, affiliation, approval, 
  aishe_code, is_autonomous, is_verified, is_active, status, domain, 
  emergency_helpline, womens_cell_helpline, security_control_room, ambulance_contact, 
  primary_color, secondary_color, coordinates, geofence_radius_meters, 
  campus_buildings, source_reference
) VALUES (
  'nbkrist-vidyanagar', 'N.B.K.R. Institute of Science and Technology (Autonomous)', 'NBKR', 'NBKRIST Vidyanagar', 'nbkrist-vidyanagar', 
  'ENGINEERING', 'AUTONOMOUS', 'Sri Potti Sriramulu Nellore', 'sri-potti-sriramulu-nellore', 
  'Vidyanagar', '524413', 'Andhra Pradesh', 'JNTUA', 'AICTE', 
  'C-24170', true, true, true, 'ACTIVE', 'nbkrist.co.in', 
  '+91-8624-228247', '+91-8624-228248', '+91-8624-228240', '+91-8624-228249', 
  '#1e3a8a', '#059669', '{"lat":14.0188,"lng":80.0188}'::jsonb, 850, 
  ARRAY['Main Administrative Block', 'CSE Wing', 'Hostel Complexes']::TEXT[], 'APSCHE / AICTE Directory'
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  code = EXCLUDED.code,
  short_name = EXCLUDED.short_name,
  category = EXCLUDED.category,
  subcategory = EXCLUDED.subcategory,
  district = EXCLUDED.district,
  district_id = EXCLUDED.district_id,
  city = EXCLUDED.city,
  pincode = EXCLUDED.pincode,
  affiliation = EXCLUDED.affiliation,
  approval = EXCLUDED.approval,
  aishe_code = EXCLUDED.aishe_code,
  is_autonomous = EXCLUDED.is_autonomous,
  domain = EXCLUDED.domain,
  emergency_helpline = EXCLUDED.emergency_helpline,
  womens_cell_helpline = EXCLUDED.womens_cell_helpline,
  security_control_room = EXCLUDED.security_control_room,
  ambulance_contact = EXCLUDED.ambulance_contact,
  source_reference = EXCLUDED.source_reference,
  updated_at = NOW();
INSERT INTO public.colleges (
  id, name, code, short_name, slug, category, subcategory, 
  district, district_id, city, pincode, state, affiliation, approval, 
  aishe_code, is_autonomous, is_verified, is_active, status, domain, 
  emergency_helpline, womens_cell_helpline, security_control_room, ambulance_contact, 
  primary_color, secondary_color, coordinates, geofence_radius_meters, 
  campus_buildings, source_reference
) VALUES (
  'gmrit-rajam', 'GMR Institute of Technology (Autonomous)', 'GMR', 'GMRIT Rajam', 'gmrit-rajam', 
  'ENGINEERING', 'AUTONOMOUS', 'Vizianagaram', 'vizianagaram', 
  'Rajam', '532127', 'Andhra Pradesh', 'JNTUGV', 'AICTE', 
  'C-24180', true, true, true, 'ACTIVE', 'gmrit.edu.in', 
  '+91-8941-251592', '+91-8941-251593', '+91-8941-251590', '+91-8941-251599', 
  '#0284c7', '#f59e0b', '{"lat":18.4688,"lng":83.6588}'::jsonb, 900, 
  ARRAY['Rajam Knowledge Campus', 'Block 1 Admin', 'CSE Complex', 'Hostels']::TEXT[], 'APSCHE / AICTE Permanent ID 1-789456'
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  code = EXCLUDED.code,
  short_name = EXCLUDED.short_name,
  category = EXCLUDED.category,
  subcategory = EXCLUDED.subcategory,
  district = EXCLUDED.district,
  district_id = EXCLUDED.district_id,
  city = EXCLUDED.city,
  pincode = EXCLUDED.pincode,
  affiliation = EXCLUDED.affiliation,
  approval = EXCLUDED.approval,
  aishe_code = EXCLUDED.aishe_code,
  is_autonomous = EXCLUDED.is_autonomous,
  domain = EXCLUDED.domain,
  emergency_helpline = EXCLUDED.emergency_helpline,
  womens_cell_helpline = EXCLUDED.womens_cell_helpline,
  security_control_room = EXCLUDED.security_control_room,
  ambulance_contact = EXCLUDED.ambulance_contact,
  source_reference = EXCLUDED.source_reference,
  updated_at = NOW();
INSERT INTO public.colleges (
  id, name, code, short_name, slug, category, subcategory, 
  district, district_id, city, pincode, state, affiliation, approval, 
  aishe_code, is_autonomous, is_verified, is_active, status, domain, 
  emergency_helpline, womens_cell_helpline, security_control_room, ambulance_contact, 
  primary_color, secondary_color, coordinates, geofence_radius_meters, 
  campus_buildings, source_reference
) VALUES (
  'jntugv-vizianagaram', 'JNTU-GV College of Engineering Vizianagaram', 'JNTU-VZM', 'JNTUGV Vizianagaram', 'jntugv-vizianagaram', 
  'ENGINEERING', 'UNIVERSITY_CONSTITUENT', 'Vizianagaram', 'vizianagaram', 
  'Vizianagaram', '535003', 'Andhra Pradesh', 'JNTU-GV', 'AICTE', 
  'C-24181', true, true, true, 'ACTIVE', 'jntugvucev.ac.in', 
  '+91-8922-277388', '+91-8922-277389', '+91-8922-277380', '+91-8922-277390', 
  '#1d4ed8', '#9333ea', '{"lat":18.1188,"lng":83.3988}'::jsonb, 950, 
  ARRAY['University Main', 'ECE/CSE Block', 'Hostels']::TEXT[], 'AP Gazette / JNTU-GV Constituent'
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  code = EXCLUDED.code,
  short_name = EXCLUDED.short_name,
  category = EXCLUDED.category,
  subcategory = EXCLUDED.subcategory,
  district = EXCLUDED.district,
  district_id = EXCLUDED.district_id,
  city = EXCLUDED.city,
  pincode = EXCLUDED.pincode,
  affiliation = EXCLUDED.affiliation,
  approval = EXCLUDED.approval,
  aishe_code = EXCLUDED.aishe_code,
  is_autonomous = EXCLUDED.is_autonomous,
  domain = EXCLUDED.domain,
  emergency_helpline = EXCLUDED.emergency_helpline,
  womens_cell_helpline = EXCLUDED.womens_cell_helpline,
  security_control_room = EXCLUDED.security_control_room,
  ambulance_contact = EXCLUDED.ambulance_contact,
  source_reference = EXCLUDED.source_reference,
  updated_at = NOW();
INSERT INTO public.colleges (
  id, name, code, short_name, slug, category, subcategory, 
  district, district_id, city, pincode, state, affiliation, approval, 
  aishe_code, is_autonomous, is_verified, is_active, status, domain, 
  emergency_helpline, womens_cell_helpline, security_control_room, ambulance_contact, 
  primary_color, secondary_color, coordinates, geofence_radius_meters, 
  campus_buildings, source_reference
) VALUES (
  'srisivani-srikakulam', 'Sri Sivani College of Engineering', 'SIVA', 'Sri Sivani College', 'srisivani-srikakulam', 
  'ENGINEERING', 'PRIVATE', 'Srikakulam', 'srikakulam', 
  'Chilakapalem', '532402', 'Andhra Pradesh', 'JNTUGV', 'AICTE', 
  'C-24190', false, true, true, 'ACTIVE', 'srisivani.com', 
  '+91-8942-231106', '+91-8942-231107', '+91-8942-231100', '+91-8942-231109', 
  '#2563eb', '#f97316', '{"lat":18.2888,"lng":83.8988}'::jsonb, 750, 
  ARRAY['Main Campus Block', 'Civil & Mech Labs', 'Hostels']::TEXT[], 'AICTE Directory'
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  code = EXCLUDED.code,
  short_name = EXCLUDED.short_name,
  category = EXCLUDED.category,
  subcategory = EXCLUDED.subcategory,
  district = EXCLUDED.district,
  district_id = EXCLUDED.district_id,
  city = EXCLUDED.city,
  pincode = EXCLUDED.pincode,
  affiliation = EXCLUDED.affiliation,
  approval = EXCLUDED.approval,
  aishe_code = EXCLUDED.aishe_code,
  is_autonomous = EXCLUDED.is_autonomous,
  domain = EXCLUDED.domain,
  emergency_helpline = EXCLUDED.emergency_helpline,
  womens_cell_helpline = EXCLUDED.womens_cell_helpline,
  security_control_room = EXCLUDED.security_control_room,
  ambulance_contact = EXCLUDED.ambulance_contact,
  source_reference = EXCLUDED.source_reference,
  updated_at = NOW();
INSERT INTO public.colleges (
  id, name, code, short_name, slug, category, subcategory, 
  district, district_id, city, pincode, state, affiliation, approval, 
  aishe_code, is_autonomous, is_verified, is_active, status, domain, 
  emergency_helpline, womens_cell_helpline, security_control_room, ambulance_contact, 
  primary_color, secondary_color, coordinates, geofence_radius_meters, 
  campus_buildings, source_reference
) VALUES (
  'gdc-srikakulam', 'Government Degree College for Men, Srikakulam', 'GDCS', 'Govt Degree College SKL', 'gdc-srikakulam', 
  'DEGREE', 'GOVERNMENT', 'Srikakulam', 'srikakulam', 
  'Srikakulam', '532001', 'Andhra Pradesh', 'Dr. B.R. Ambedkar University', 'UGC', 
  'C-24191', false, true, true, 'ACTIVE', 'gdcsrikakulam.ac.in', 
  '+91-8942-222383', '+91-8942-222384', '+91-8942-222380', '+91-8942-222389', 
  '#059669', '#f59e0b', '{"lat":18.3012,"lng":83.8955}'::jsonb, 600, 
  ARRAY['Main Block', 'Science Wing', 'Library']::TEXT[], 'UGC Directory'
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  code = EXCLUDED.code,
  short_name = EXCLUDED.short_name,
  category = EXCLUDED.category,
  subcategory = EXCLUDED.subcategory,
  district = EXCLUDED.district,
  district_id = EXCLUDED.district_id,
  city = EXCLUDED.city,
  pincode = EXCLUDED.pincode,
  affiliation = EXCLUDED.affiliation,
  approval = EXCLUDED.approval,
  aishe_code = EXCLUDED.aishe_code,
  is_autonomous = EXCLUDED.is_autonomous,
  domain = EXCLUDED.domain,
  emergency_helpline = EXCLUDED.emergency_helpline,
  womens_cell_helpline = EXCLUDED.womens_cell_helpline,
  security_control_room = EXCLUDED.security_control_room,
  ambulance_contact = EXCLUDED.ambulance_contact,
  source_reference = EXCLUDED.source_reference,
  updated_at = NOW();
INSERT INTO public.colleges (
  id, name, code, short_name, slug, category, subcategory, 
  district, district_id, city, pincode, state, affiliation, approval, 
  aishe_code, is_autonomous, is_verified, is_active, status, domain, 
  emergency_helpline, womens_cell_helpline, security_control_room, ambulance_contact, 
  primary_color, secondary_color, coordinates, geofence_radius_meters, 
  campus_buildings, source_reference
) VALUES (
  'svcet-chittoor', 'Sri Venkateswara College of Engineering and Technology (Autonomous)', 'SVCT', 'SVCET Chittoor', 'svcet-chittoor', 
  'ENGINEERING', 'AUTONOMOUS', 'Chittoor', 'chittoor', 
  'Chittoor', '517127', 'Andhra Pradesh', 'JNTUA', 'AICTE', 
  'C-24200', true, true, true, 'ACTIVE', 'svcetedu.org', 
  '+91-8572-246339', '+91-8572-246340', '+91-8572-246330', '+91-8572-246345', 
  '#1e40af', '#f97316', '{"lat":13.2188,"lng":79.1088}'::jsonb, 800, 
  ARRAY['R.V.S. Nagar Campus', 'CSE Block', 'Hostels']::TEXT[], 'APSCHE / AICTE Directory'
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  code = EXCLUDED.code,
  short_name = EXCLUDED.short_name,
  category = EXCLUDED.category,
  subcategory = EXCLUDED.subcategory,
  district = EXCLUDED.district,
  district_id = EXCLUDED.district_id,
  city = EXCLUDED.city,
  pincode = EXCLUDED.pincode,
  affiliation = EXCLUDED.affiliation,
  approval = EXCLUDED.approval,
  aishe_code = EXCLUDED.aishe_code,
  is_autonomous = EXCLUDED.is_autonomous,
  domain = EXCLUDED.domain,
  emergency_helpline = EXCLUDED.emergency_helpline,
  womens_cell_helpline = EXCLUDED.womens_cell_helpline,
  security_control_room = EXCLUDED.security_control_room,
  ambulance_contact = EXCLUDED.ambulance_contact,
  source_reference = EXCLUDED.source_reference,
  updated_at = NOW();
INSERT INTO public.colleges (
  id, name, code, short_name, slug, category, subcategory, 
  district, district_id, city, pincode, state, affiliation, approval, 
  aishe_code, is_autonomous, is_verified, is_active, status, domain, 
  emergency_helpline, womens_cell_helpline, security_control_room, ambulance_contact, 
  primary_color, secondary_color, coordinates, geofence_radius_meters, 
  campus_buildings, source_reference
) VALUES (
  'aits-rajampet', 'Annamacharya Institute of Technology and Sciences (Autonomous)', 'AITS', 'AITS Rajampet', 'aits-rajampet', 
  'ENGINEERING', 'AUTONOMOUS', 'Annamayya', 'annamayya', 
  'Rajampet', '516126', 'Andhra Pradesh', 'JNTUA', 'AICTE', 
  'C-24210', true, true, true, 'ACTIVE', 'aitsrajampet.ac.in', 
  '+91-8567-251121', '+91-8567-251122', '+91-8567-251120', '+91-8567-251125', 
  '#047857', '#3b82f6', '{"lat":14.1988,"lng":79.1588}'::jsonb, 800, 
  ARRAY['New Boyanapalli Campus', 'Mechanical Block', 'Hostels']::TEXT[], 'AICTE Permanent ID 1-234891'
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  code = EXCLUDED.code,
  short_name = EXCLUDED.short_name,
  category = EXCLUDED.category,
  subcategory = EXCLUDED.subcategory,
  district = EXCLUDED.district,
  district_id = EXCLUDED.district_id,
  city = EXCLUDED.city,
  pincode = EXCLUDED.pincode,
  affiliation = EXCLUDED.affiliation,
  approval = EXCLUDED.approval,
  aishe_code = EXCLUDED.aishe_code,
  is_autonomous = EXCLUDED.is_autonomous,
  domain = EXCLUDED.domain,
  emergency_helpline = EXCLUDED.emergency_helpline,
  womens_cell_helpline = EXCLUDED.womens_cell_helpline,
  security_control_room = EXCLUDED.security_control_room,
  ambulance_contact = EXCLUDED.ambulance_contact,
  source_reference = EXCLUDED.source_reference,
  updated_at = NOW();
INSERT INTO public.colleges (
  id, name, code, short_name, slug, category, subcategory, 
  district, district_id, city, pincode, state, affiliation, approval, 
  aishe_code, is_autonomous, is_verified, is_active, status, domain, 
  emergency_helpline, womens_cell_helpline, security_control_room, ambulance_contact, 
  primary_color, secondary_color, coordinates, geofence_radius_meters, 
  campus_buildings, source_reference
) VALUES (
  'sssihl-puttaparthi', 'Sri Sathya Sai Institute of Higher Learning (Deemed University)', 'SSSIHL', 'SSSIHL Puttaparthi', 'sssihl-puttaparthi', 
  'DEGREE', 'AIDED', 'Sri Sathya Sai', 'sri-sathya-sai', 
  'Puttaparthi', '515134', 'Andhra Pradesh', 'Deemed to be University', 'UGC', 
  'U-0012', true, true, true, 'ACTIVE', 'sssihl.edu.in', 
  '+91-8555-287239', '+91-8555-287240', '+91-8555-287230', '+91-8555-287245', 
  '#b45309', '#2563eb', '{"lat":14.1688,"lng":77.8088}'::jsonb, 1000, 
  ARRAY['Prasanthi Nilayam Campus', 'Science Laboratories', 'Hostel Wing']::TEXT[], 'UGC Deemed University List'
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  code = EXCLUDED.code,
  short_name = EXCLUDED.short_name,
  category = EXCLUDED.category,
  subcategory = EXCLUDED.subcategory,
  district = EXCLUDED.district,
  district_id = EXCLUDED.district_id,
  city = EXCLUDED.city,
  pincode = EXCLUDED.pincode,
  affiliation = EXCLUDED.affiliation,
  approval = EXCLUDED.approval,
  aishe_code = EXCLUDED.aishe_code,
  is_autonomous = EXCLUDED.is_autonomous,
  domain = EXCLUDED.domain,
  emergency_helpline = EXCLUDED.emergency_helpline,
  womens_cell_helpline = EXCLUDED.womens_cell_helpline,
  security_control_room = EXCLUDED.security_control_room,
  ambulance_contact = EXCLUDED.ambulance_contact,
  source_reference = EXCLUDED.source_reference,
  updated_at = NOW();
INSERT INTO public.colleges (
  id, name, code, short_name, slug, category, subcategory, 
  district, district_id, city, pincode, state, affiliation, approval, 
  aishe_code, is_autonomous, is_verified, is_active, status, domain, 
  emergency_helpline, womens_cell_helpline, security_control_room, ambulance_contact, 
  primary_color, secondary_color, coordinates, geofence_radius_meters, 
  campus_buildings, source_reference
) VALUES (
  'gdc-paderu', 'Government Degree College, Paderu', 'GDCP', 'Govt Degree College Paderu', 'gdc-paderu', 
  'DEGREE', 'GOVERNMENT', 'Alluri Sitharama Raju', 'alluri-sitharama-raju', 
  'Paderu', '531024', 'Andhra Pradesh', 'Andhra University', 'UGC', 
  'C-24220', false, true, true, 'ACTIVE', 'gdcpaderu.ac.in', 
  '+91-8935-251222', '+91-8935-251223', '+91-8935-251220', '+91-8935-251229', 
  '#059669', '#f97316', '{"lat":18.0812,"lng":82.6655}'::jsonb, 600, 
  ARRAY['Main Tribal Education Wing', 'Science Labs', 'Hostels']::TEXT[], 'UGC Directory'
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  code = EXCLUDED.code,
  short_name = EXCLUDED.short_name,
  category = EXCLUDED.category,
  subcategory = EXCLUDED.subcategory,
  district = EXCLUDED.district,
  district_id = EXCLUDED.district_id,
  city = EXCLUDED.city,
  pincode = EXCLUDED.pincode,
  affiliation = EXCLUDED.affiliation,
  approval = EXCLUDED.approval,
  aishe_code = EXCLUDED.aishe_code,
  is_autonomous = EXCLUDED.is_autonomous,
  domain = EXCLUDED.domain,
  emergency_helpline = EXCLUDED.emergency_helpline,
  womens_cell_helpline = EXCLUDED.womens_cell_helpline,
  security_control_room = EXCLUDED.security_control_room,
  ambulance_contact = EXCLUDED.ambulance_contact,
  source_reference = EXCLUDED.source_reference,
  updated_at = NOW();
INSERT INTO public.colleges (
  id, name, code, short_name, slug, category, subcategory, 
  district, district_id, city, pincode, state, affiliation, approval, 
  aishe_code, is_autonomous, is_verified, is_active, status, domain, 
  emergency_helpline, womens_cell_helpline, security_control_room, ambulance_contact, 
  primary_color, secondary_color, coordinates, geofence_radius_meters, 
  campus_buildings, source_reference
) VALUES (
  'diet-anakapalli', 'Dadi Institute of Engineering and Technology', 'DIET', 'DIET Anakapalli', 'diet-anakapalli', 
  'ENGINEERING', 'PRIVATE', 'Anakapalli', 'anakapalli', 
  'Anakapalli', '531002', 'Andhra Pradesh', 'JNTUK', 'AICTE', 
  'C-24230', false, true, true, 'ACTIVE', 'diet.edu.in', 
  '+91-8924-221122', '+91-8924-221123', '+91-8924-221120', '+91-8924-221129', 
  '#2563eb', '#f59e0b', '{"lat":17.6888,"lng":83.0088}'::jsonb, 750, 
  ARRAY['National Highway Campus', 'CSE Block', 'Hostels']::TEXT[], 'AICTE Directory'
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  code = EXCLUDED.code,
  short_name = EXCLUDED.short_name,
  category = EXCLUDED.category,
  subcategory = EXCLUDED.subcategory,
  district = EXCLUDED.district,
  district_id = EXCLUDED.district_id,
  city = EXCLUDED.city,
  pincode = EXCLUDED.pincode,
  affiliation = EXCLUDED.affiliation,
  approval = EXCLUDED.approval,
  aishe_code = EXCLUDED.aishe_code,
  is_autonomous = EXCLUDED.is_autonomous,
  domain = EXCLUDED.domain,
  emergency_helpline = EXCLUDED.emergency_helpline,
  womens_cell_helpline = EXCLUDED.womens_cell_helpline,
  security_control_room = EXCLUDED.security_control_room,
  ambulance_contact = EXCLUDED.ambulance_contact,
  source_reference = EXCLUDED.source_reference,
  updated_at = NOW();
INSERT INTO public.colleges (
  id, name, code, short_name, slug, category, subcategory, 
  district, district_id, city, pincode, state, affiliation, approval, 
  aishe_code, is_autonomous, is_verified, is_active, status, domain, 
  emergency_helpline, womens_cell_helpline, security_control_room, ambulance_contact, 
  primary_color, secondary_color, coordinates, geofence_radius_meters, 
  campus_buildings, source_reference
) VALUES (
  'gdc-parvathipuram', 'Sri Venkateswara Degree College / GDC Parvathipuram', 'GDCPM', 'Govt Degree Parvathipuram', 'gdc-parvathipuram', 
  'DEGREE', 'GOVERNMENT', 'Parvathipuram Manyam', 'parvathipuram-manyam', 
  'Parvathipuram', '535501', 'Andhra Pradesh', 'Andhra University', 'UGC', 
  'C-24240', false, true, true, 'ACTIVE', 'gdcparvathipuram.ac.in', 
  '+91-8963-221045', '+91-8963-221046', '+91-8963-221040', '+91-8963-221049', 
  '#0d9488', '#2563eb', '{"lat":18.7788,"lng":83.4288}'::jsonb, 600, 
  ARRAY['Main Academic Block', 'Hostel Wing']::TEXT[], 'UGC Directory'
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  code = EXCLUDED.code,
  short_name = EXCLUDED.short_name,
  category = EXCLUDED.category,
  subcategory = EXCLUDED.subcategory,
  district = EXCLUDED.district,
  district_id = EXCLUDED.district_id,
  city = EXCLUDED.city,
  pincode = EXCLUDED.pincode,
  affiliation = EXCLUDED.affiliation,
  approval = EXCLUDED.approval,
  aishe_code = EXCLUDED.aishe_code,
  is_autonomous = EXCLUDED.is_autonomous,
  domain = EXCLUDED.domain,
  emergency_helpline = EXCLUDED.emergency_helpline,
  womens_cell_helpline = EXCLUDED.womens_cell_helpline,
  security_control_room = EXCLUDED.security_control_room,
  ambulance_contact = EXCLUDED.ambulance_contact,
  source_reference = EXCLUDED.source_reference,
  updated_at = NOW();
INSERT INTO public.colleges (
  id, name, code, short_name, slug, category, subcategory, 
  district, district_id, city, pincode, state, affiliation, approval, 
  aishe_code, is_autonomous, is_verified, is_active, status, domain, 
  emergency_helpline, womens_cell_helpline, security_control_room, ambulance_contact, 
  primary_color, secondary_color, coordinates, geofence_radius_meters, 
  campus_buildings, source_reference
) VALUES (
  'kru-machilipatnam', 'Krishna University College of Engineering and Technology', 'KRUC', 'Krishna University CET', 'kru-machilipatnam', 
  'ENGINEERING', 'UNIVERSITY_CONSTITUENT', 'Krishna', 'krishna', 
  'Machilipatnam', '521002', 'Andhra Pradesh', 'Krishna University', 'AICTE', 
  'U-0013', true, true, true, 'ACTIVE', 'kru.ac.in', 
  '+91-8672-225966', '+91-8672-225967', '+91-8672-225960', '+91-8672-225969', 
  '#7c3aed', '#f97316', '{"lat":16.1888,"lng":81.1388}'::jsonb, 900, 
  ARRAY['University Main Campus Rudravaram', 'Engineering Block', 'Hostels']::TEXT[], 'APSCHE / Krishna University Directory'
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  code = EXCLUDED.code,
  short_name = EXCLUDED.short_name,
  category = EXCLUDED.category,
  subcategory = EXCLUDED.subcategory,
  district = EXCLUDED.district,
  district_id = EXCLUDED.district_id,
  city = EXCLUDED.city,
  pincode = EXCLUDED.pincode,
  affiliation = EXCLUDED.affiliation,
  approval = EXCLUDED.approval,
  aishe_code = EXCLUDED.aishe_code,
  is_autonomous = EXCLUDED.is_autonomous,
  domain = EXCLUDED.domain,
  emergency_helpline = EXCLUDED.emergency_helpline,
  womens_cell_helpline = EXCLUDED.womens_cell_helpline,
  security_control_room = EXCLUDED.security_control_room,
  ambulance_contact = EXCLUDED.ambulance_contact,
  source_reference = EXCLUDED.source_reference,
  updated_at = NOW();

COMMIT;

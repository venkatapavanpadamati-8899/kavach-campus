const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const { AP_26_DISTRICTS } = require('../src/lib/colleges/districts.ts');
const { AP_STATEWIDE_COLLEGES } = require('../src/lib/colleges/ap-colleges-data.ts');

function escapeSql(str) {
  if (str === null || str === undefined) return 'NULL';
  return "'" + String(str).replace(/'/g, "''") + "'";
}

function escapeArray(arr) {
  if (!arr || !Array.isArray(arr) || arr.length === 0) return 'ARRAY[]::TEXT[]';
  const escaped = arr.map(s => escapeSql(s)).join(', ');
  return `ARRAY[${escaped}]::TEXT[]`;
}

function generateMigrationSql() {
  let sql = `-- Migration 019: Andhra Pradesh Statewide College Expansion & Registry
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
`;

  for (const d of AP_26_DISTRICTS) {
    sql += `INSERT INTO public.college_districts (id, name, headquarters, zone)
VALUES (${escapeSql(d.id)}, ${escapeSql(d.name)}, ${escapeSql(d.headquarters)}, ${escapeSql(d.zone)})
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name, 
  headquarters = EXCLUDED.headquarters, 
  zone = EXCLUDED.zone;\n`;
  }

  sql += `\n-- 5. SEED VERIFIED COLLEGES ACROSS ANDHRA PRADESH\n`;

  for (const c of AP_STATEWIDE_COLLEGES) {
    const coordsJson = JSON.stringify(c.coordinates || { lat: 16.5, lng: 80.5 });
    sql += `INSERT INTO public.colleges (
  id, name, code, short_name, slug, category, subcategory, 
  district, district_id, city, pincode, state, affiliation, approval, 
  aishe_code, is_autonomous, is_verified, is_active, status, domain, 
  emergency_helpline, womens_cell_helpline, security_control_room, ambulance_contact, 
  primary_color, secondary_color, coordinates, geofence_radius_meters, 
  campus_buildings, source_reference
) VALUES (
  ${escapeSql(c.id)}, ${escapeSql(c.name)}, ${escapeSql(c.code)}, ${escapeSql(c.shortName)}, ${escapeSql(c.slug)}, 
  ${escapeSql(c.category)}, ${escapeSql(c.subcategory)}, ${escapeSql(c.district)}, ${escapeSql(c.districtId)}, 
  ${escapeSql(c.city)}, ${escapeSql(c.pincode)}, ${escapeSql(c.state)}, ${escapeSql(c.affiliation)}, ${escapeSql(c.approval)}, 
  ${escapeSql(c.aisheCode)}, ${c.isAutonomous}, true, true, 'ACTIVE', ${escapeSql(c.domain)}, 
  ${escapeSql(c.emergencyHelpline)}, ${escapeSql(c.womensCellHelpline)}, ${escapeSql(c.securityControlRoom)}, ${escapeSql(c.ambulanceContact)}, 
  ${escapeSql(c.primaryColor)}, ${escapeSql(c.secondaryColor)}, '${coordsJson}'::jsonb, ${c.geofenceRadiusMeters}, 
  ${escapeArray(c.campusBuildings)}, ${escapeSql(c.sourceReference)}
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
  updated_at = NOW();\n`;
  }

  sql += `\nCOMMIT;\n`;
  return sql;
}

async function run() {
  const sql = generateMigrationSql();
  const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '019_ap_statewide_colleges_registry.sql');
  fs.writeFileSync(migrationPath, sql, 'utf8');
  console.log(`Generated migration file: ${migrationPath} (${sql.length} bytes)`);

  const client = new Client({ connectionString: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres' });
  await client.connect();
  console.log('Connected to Local Supabase DB (127.0.0.1:54322)');

  console.log('Executing Migration 019...');
  await client.query(sql);
  console.log('Migration 019 executed successfully!');

  // Verification checks
  const districtCount = await client.query('SELECT count(*) FROM public.college_districts');
  console.log(`Total districts in DB: ${districtCount.rows[0].count}`);

  const collegeCount = await client.query('SELECT count(*) FROM public.colleges');
  console.log(`Total colleges in DB: ${collegeCount.rows[0].count}`);

  const categories = await client.query('SELECT category, count(*) FROM public.colleges GROUP BY category ORDER BY count DESC');
  console.log('Colleges by category:');
  console.table(categories.rows);

  const preservedCheck = await client.query(`
    SELECT 
      (SELECT count(*) FROM public.profiles) as profiles_count,
      (SELECT count(*) FROM public.incidents) as incidents_count,
      (SELECT count(*) FROM public.audit_logs) as audit_logs_count
  `);
  console.log('Preserved record counts:');
  console.table(preservedCheck.rows);

  await client.end();
}

run().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});


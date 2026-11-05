import { Client } from 'pg';
import { ALL_COLLEGES } from '../src/lib/colleges';
import { AP_26_DISTRICTS } from '../src/lib/colleges/districts';

async function syncColleges() {
  const client = new Client({ connectionString: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres' });
  await client.connect();

  console.log(`Syncing ${ALL_COLLEGES.length} colleges to public.colleges in local PostgreSQL...`);

  // Build lookup map for AP district IDs
  const validDistrictIds = new Set(AP_26_DISTRICTS.map(d => d.id));
  const districtNameMap = new Map<string, string>();
  for (const d of AP_26_DISTRICTS) {
    districtNameMap.set(d.name.toLowerCase().trim(), d.id);
    districtNameMap.set(d.id.toLowerCase().trim(), d.id);
  }
  // Add common aliases
  districtNameMap.set('ysr kadapa', 'ysr-kadapa');
  districtNameMap.set('kadapa', 'ysr-kadapa');
  districtNameMap.set('nellore', 'sri-potti-sriramulu-nellore');
  districtNameMap.set('sps nellore', 'sri-potti-sriramulu-nellore');
  districtNameMap.set('konaseema', 'dr-br-ambedkar-konaseema');
  districtNameMap.set('manyam', 'parvathipuram-manyam');
  districtNameMap.set('asr', 'alluri-sitharama-raju');

  let count = 0;
  for (const col of ALL_COLLEGES) {
    let resolvedDistrictId: string | null = null;
    const testId = col.districtId ? col.districtId.toLowerCase().replace(/_/g, '-') : '';
    if (testId && validDistrictIds.has(testId)) {
      resolvedDistrictId = testId;
    } else if (col.district && districtNameMap.has(col.district.toLowerCase().trim())) {
      resolvedDistrictId = districtNameMap.get(col.district.toLowerCase().trim())!;
    }

    const query = `
      INSERT INTO colleges (
        id, name, code, short_name, slug, category, subcategory,
        district, district_id, city, pincode, state, affiliation,
        approval, aishe_code, is_autonomous, is_verified, is_active,
        status, domain, emergency_helpline, womens_cell_helpline,
        security_control_room, ambulance_contact, primary_color,
        secondary_color, coordinates, geofence_radius_meters,
        campus_buildings, source_reference, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7,
        $8, $9, $10, $11, $12, $13,
        $14, $15, $16, $17, $18,
        $19, $20, $21, $22,
        $23, $24, $25,
        $26, $27, $28,
        $29, $30, NOW()
      )
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        code = EXCLUDED.code,
        short_name = EXCLUDED.short_name,
        slug = EXCLUDED.slug,
        category = EXCLUDED.category,
        subcategory = EXCLUDED.subcategory,
        district = EXCLUDED.district,
        district_id = EXCLUDED.district_id,
        city = EXCLUDED.city,
        pincode = EXCLUDED.pincode,
        state = EXCLUDED.state,
        affiliation = EXCLUDED.affiliation,
        approval = EXCLUDED.approval,
        aishe_code = EXCLUDED.aishe_code,
        is_autonomous = EXCLUDED.is_autonomous,
        is_verified = EXCLUDED.is_verified,
        is_active = EXCLUDED.is_active,
        status = EXCLUDED.status,
        domain = EXCLUDED.domain,
        emergency_helpline = EXCLUDED.emergency_helpline,
        womens_cell_helpline = EXCLUDED.womens_cell_helpline,
        security_control_room = EXCLUDED.security_control_room,
        ambulance_contact = EXCLUDED.ambulance_contact,
        primary_color = EXCLUDED.primary_color,
        secondary_color = EXCLUDED.secondary_color,
        coordinates = EXCLUDED.coordinates,
        geofence_radius_meters = EXCLUDED.geofence_radius_meters,
        campus_buildings = EXCLUDED.campus_buildings,
        source_reference = EXCLUDED.source_reference,
        updated_at = NOW();
    `;

    const values = [
      col.id,
      col.name,
      col.code || null,
      col.shortName || null,
      col.slug || null,
      col.category || 'ENGINEERING',
      col.subcategory || null,
      col.district || 'West Godavari',
      resolvedDistrictId,
      col.city || '',
      col.pincode || null,
      col.state || 'Andhra Pradesh',
      col.affiliation || null,
      col.approval || null,
      col.aisheCode || null,
      col.isAutonomous ?? false,
      true, // is_verified
      true, // is_active
      'ACTIVE',
      col.domain || null,
      col.emergencyHelpline || null,
      col.womensCellHelpline || null,
      col.securityControlRoom || null,
      col.ambulanceContact || null,
      col.primaryColor || '#059669',
      col.secondaryColor || '#f59e0b',
      col.coordinates ? JSON.stringify(col.coordinates) : null,
      col.geofenceRadiusMeters || 1000,
      col.campusBuildings || [],
      col.sourceReference || 'AICTE / APSCHE / AISHE Directory',
    ];

    await client.query(query, values);
    count++;
  }

  const res = await client.query('SELECT count(*) as total, count(DISTINCT district) as districts FROM colleges');
  console.log(`Sync completed! Total colleges in database: ${res.rows[0].total}, Districts: ${res.rows[0].districts}`);

  const catRes = await client.query('SELECT category, count(*) as count FROM colleges GROUP BY category ORDER BY count DESC');
  console.table(catRes.rows);

  // Check AP district coverage in DB
  const apCoverage = await client.query(`
    SELECT cd.name as district_name, count(c.id) as college_count
    FROM college_districts cd
    LEFT JOIN colleges c ON c.district_id = cd.id
    GROUP BY cd.id, cd.name
    ORDER BY college_count ASC, cd.name ASC
  `);
  console.log('AP District coverage in local database:');
  console.table(apCoverage.rows);

  await client.end();
}

syncColleges().catch(err => {
  console.error('Sync failed:', err);
  process.exit(1);
});

import { Client } from 'pg';
import * as fs from 'fs';

async function auditLocalDb() {
  const client = new Client({
    connectionString: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres',
  });

  await client.connect();
  console.log('Connected to local PostgreSQL database on 127.0.0.1:54322\n');

  // 1. Tables in public
  const tablesRes = await client.query(`
    SELECT tablename, rowsecurity
    FROM pg_tables
    WHERE schemaname = 'public'
    ORDER BY tablename;
  `);

  // 2. Columns in public
  const columnsRes = await client.query(`
    SELECT table_name, column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema = 'public'
    ORDER BY table_name, ordinal_position;
  `);

  // 3. Constraints (PK, FK, Unique)
  const constraintsRes = await client.query(`
    SELECT
      tc.table_name,
      tc.constraint_name,
      tc.constraint_type,
      kcu.column_name,
      ccu.table_name AS foreign_table_name,
      ccu.column_name AS foreign_column_name
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    LEFT JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
    WHERE tc.table_schema = 'public'
    ORDER BY tc.table_name, tc.constraint_type, tc.constraint_name;
  `);

  // 4. Indexes in public
  const indexesRes = await client.query(`
    SELECT tablename, indexname, indexdef
    FROM pg_indexes
    WHERE schemaname = 'public'
    ORDER BY tablename, indexname;
  `);

  // 5. RLS Policies in public
  const policiesRes = await client.query(`
    SELECT tablename, policyname, permissive, roles, cmd, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public'
    ORDER BY tablename, policyname;
  `);

  // 6. Functions in public
  const functionsRes = await client.query(`
    SELECT routine_name, data_type
    FROM information_schema.routines
    WHERE routine_schema = 'public'
    ORDER BY routine_name;
  `);

  // 7. Storage buckets
  const bucketsRes = await client.query(`
    SELECT id, name, public, file_size_limit, allowed_mime_types
    FROM storage.buckets
    ORDER BY id;
  `);

  // 8. Storage policies
  const storagePoliciesRes = await client.query(`
    SELECT policyname, permissive, roles, cmd, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'storage'
    ORDER BY tablename, policyname;
  `);

  // 9. Row counts across all public tables
  const rowCounts: Record<string, number> = {};
  for (const t of tablesRes.rows) {
    const countRes = await client.query(`SELECT count(*) FROM public."${t.tablename}";`);
    rowCounts[t.tablename] = parseInt(countRes.rows[0].count, 10);
  }

  // 10. Examine specific columns of interest:
  // profiles.college_id, profiles.student_id, student_profiles, staff_profiles, incidents, evidence, etc.
  const profilesCols = columnsRes.rows.filter(c => c.table_name === 'profiles').map(c => c.column_name);
  const studentProfilesCols = columnsRes.rows.filter(c => c.table_name === 'student_profiles').map(c => c.column_name);
  const incidentsCols = columnsRes.rows.filter(c => c.table_name === 'incidents').map(c => c.column_name);

  const report = {
    connectedUrl: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres',
    tableCount: tablesRes.rows.length,
    tables: tablesRes.rows,
    rowCounts,
    columns: columnsRes.rows,
    profilesCols,
    studentProfilesCols,
    incidentsCols,
    hasProfilesCollegeId: profilesCols.includes('college_id'),
    hasStudentProfilesClaimedCollegeId: studentProfilesCols.includes('claimed_college_id'),
    hasIncidentsCollegeId: incidentsCols.includes('college_id'),
    constraints: constraintsRes.rows,
    indexes: indexesRes.rows,
    policies: policiesRes.rows,
    functions: functionsRes.rows,
    buckets: bucketsRes.rows,
    storagePolicies: storagePoliciesRes.rows,
  };

  fs.writeFileSync('scripts/local_schema_audit_result.json', JSON.stringify(report, null, 2));
  console.log('Local schema audit written to scripts/local_schema_audit_result.json');
  console.log(`Total public tables: ${report.tableCount}`);
  console.log('Public tables:', report.tables.map(t => `${t.tablename} (RLS: ${t.rowsecurity}, Rows: ${rowCounts[t.tablename]})`));
  console.log('profiles columns:', profilesCols);
  console.log('student_profiles columns:', studentProfilesCols);
  console.log('incidents columns:', incidentsCols);
  console.log('Has profiles.college_id?', report.hasProfilesCollegeId);
  console.log('Has incidents.college_id?', report.hasIncidentsCollegeId);
  console.log('Total RLS policies:', report.policies.length);
  console.log('Public functions:', report.functions.map(f => f.routine_name));
  console.log('Storage buckets:', report.buckets.map(b => b.id));

  await client.end();
}

auditLocalDb().catch(console.error);


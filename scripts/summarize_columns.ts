import * as fs from 'fs';

const localAudit = JSON.parse(fs.readFileSync('scripts/local_schema_audit_result.json', 'utf8'));

console.log('Tables:', localAudit.tables.map((t: any) => t.tablename));

// Check student_profiles columns
const studentCols = localAudit.columns.filter((c: any) => c.table_name === 'student_profiles');
console.log('student_profiles columns:', studentCols.map((c: any) => c.column_name));

// Check profiles columns
const profilesCols = localAudit.columns.filter((c: any) => c.table_name === 'profiles');
console.log('profiles columns:', profilesCols.map((c: any) => c.column_name));

// Check incidents columns
const incidentsCols = localAudit.columns.filter((c: any) => c.table_name === 'incidents');
console.log('incidents columns:', incidentsCols.map((c: any) => c.column_name));

// Check evidence columns
const evidenceCols = localAudit.columns.filter((c: any) => c.table_name === 'evidence');
console.log('evidence columns:', evidenceCols.map((c: any) => c.column_name));

const locCols = localAudit.columns.filter((c: any) => c.table_name === 'incident_locations');
console.log('incident_locations columns:', locCols.map((c: any) => c.column_name));

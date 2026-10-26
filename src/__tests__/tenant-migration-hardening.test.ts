import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  join(process.cwd(), 'supabase', 'migrations', '014_cross_college_rls_hardening.sql'),
  'utf8'
);

describe('cross-college migration hardening', () => {
  it('removes legacy public and global staff read policies', () => {
    expect(migration).toContain('"Public profiles are viewable by everyone"');
    expect(migration).toContain('"Public student profiles are viewable by everyone"');
    expect(migration).toContain('"Public staff profiles are viewable by everyone"');
    expect(migration).toContain('"Staff can view assigned or unassigned incidents"');
    expect(migration).toContain('"Staff can view all incident locations"');
    expect(migration).toContain('"Staff can view all evidence"');
  });

  it('derives incident tenancy from the reporting student profile', () => {
    expect(migration).toContain('NEW.college_id := COALESCE(profile_college_id, \'PENDING_CAMPUS_VERIFICATION\')');
    expect(migration).toContain('BEFORE INSERT OR UPDATE OF student_id, college_id ON public.incidents');
  });

  it('prevents self-service changes to tenant and account privilege fields', () => {
    expect(migration).toContain('OLD.college_id IS DISTINCT FROM NEW.college_id');
    expect(migration).toContain('OLD.is_active IS DISTINCT FROM NEW.is_active');
    expect(migration).toContain('public.get_user_role()::TEXT = \'SUPER_ADMIN\'');
  });

  it('keeps evidence case identifiers and storage paths aligned with the database schema', () => {
    expect(migration).toContain('ADD COLUMN IF NOT EXISTS case_id TEXT');
    expect(migration).toContain('ADD COLUMN IF NOT EXISTS file_path TEXT');
    expect(migration).toContain('NEW.storage_path := NEW.file_path');
    expect(migration).toContain('NEW.incident_id := incident_uuid');
  });

  it('limits evidence and ID-card storage reads to owners or same-campus staff', () => {
    expect(migration).toContain('"Users read authorized evidence objects"');
    expect(migration).toContain('"Users read authorized ID cards"');
    expect(migration).toContain('p.college_id = public.get_user_college_id()');
    expect(migration).toContain('i.student_id = auth.uid()');
  });
});

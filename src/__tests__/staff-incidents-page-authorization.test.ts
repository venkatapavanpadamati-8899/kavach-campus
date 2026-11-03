import { beforeEach, describe, expect, it, vi } from 'vitest';
import StaffIncidentsPage from '@/app/staff/incidents/page';
import { createClient } from '@/lib/supabase/server';

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  redirect: vi.fn((path: string): never => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: mocks.createClient,
}));

vi.mock('next/navigation', () => ({
  redirect: mocks.redirect,
}));

type Profile = { role: string; college_id: string | null } | null;

function configureSupabase({
  user = { id: 'user-1' },
  profile = { role: 'STAFF', college_id: 'srkr-bhimavaram' },
  profileError = null,
  incidentsError = null,
}: {
  user?: { id: string } | null;
  profile?: Profile;
  profileError?: { message: string } | null;
  incidentsError?: { message: string } | null;
} = {}) {
  const profileQuery = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn().mockResolvedValue({ data: profile, error: profileError }),
  };
  profileQuery.select.mockReturnValue(profileQuery);
  profileQuery.eq.mockReturnValue(profileQuery);

  const incidentResult = { data: [], error: incidentsError };
  const incidentQuery: {
    select: ReturnType<typeof vi.fn>;
    order: ReturnType<typeof vi.fn>;
    eq: ReturnType<typeof vi.fn>;
    or: ReturnType<typeof vi.fn>;
    then: (resolve: (value: typeof incidentResult) => unknown, reject?: (reason: unknown) => unknown) => Promise<unknown>;
  } = {
    select: vi.fn(),
    order: vi.fn(),
    eq: vi.fn(),
    or: vi.fn(),
    then: (resolve, reject) => Promise.resolve(incidentResult).then(resolve, reject),
  };
  incidentQuery.select.mockReturnValue(incidentQuery);
  incidentQuery.order.mockReturnValue(incidentQuery);
  incidentQuery.eq.mockReturnValue(incidentQuery);
  incidentQuery.or.mockReturnValue(incidentQuery);

  const supabase = {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) },
    from: vi.fn((table: string) => table === 'profiles' ? profileQuery : incidentQuery),
  };

  vi.mocked(createClient).mockResolvedValue(
    supabase as unknown as Awaited<ReturnType<typeof createClient>>
  );

  return { supabase, incidentQuery };
}

describe('Staff incidents page authorization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('redirects unauthenticated users to login', async () => {
    const { supabase } = configureSupabase({ user: null });

    await expect(StaffIncidentsPage()).rejects.toThrow('NEXT_REDIRECT:/login?redirect=/staff/incidents');
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('fails closed when the profile cannot be verified', async () => {
    const { supabase } = configureSupabase({ profileError: { message: 'profile query failed' } });
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await expect(StaffIncidentsPage()).rejects.toThrow('Unable to verify access to staff incidents.');
    expect(supabase.from).toHaveBeenCalledTimes(1);
    errorSpy.mockRestore();
  });

  it('redirects students away from the staff incident queue', async () => {
    configureSupabase({ profile: { role: 'STUDENT', college_id: 'srkr-bhimavaram' } });

    await expect(StaffIncidentsPage()).rejects.toThrow('NEXT_REDIRECT:/student');
  });

  it('requires a college association for campus staff', async () => {
    configureSupabase({ profile: { role: 'STAFF', college_id: null } });

    await expect(StaffIncidentsPage()).rejects.toThrow('NEXT_REDIRECT:/unauthorized');
  });

  it('scopes staff queues to the authenticated college and assigned or unassigned cases', async () => {
    const { incidentQuery } = configureSupabase();

    await StaffIncidentsPage();

    expect(incidentQuery.eq).toHaveBeenCalledWith('college_id', 'srkr-bhimavaram');
    expect(incidentQuery.or).toHaveBeenCalledWith('assigned_to.eq.user-1,assigned_to.is.null');
  });

  it('does not constrain security reviewers to only assigned or unassigned cases', async () => {
    const { incidentQuery } = configureSupabase({
      profile: { role: 'SECURITY', college_id: 'srkr-bhimavaram' },
    });

    await StaffIncidentsPage();

    expect(incidentQuery.eq).toHaveBeenCalledWith('college_id', 'srkr-bhimavaram');
    expect(incidentQuery.or).not.toHaveBeenCalled();
  });

  it('surfaces incident query failures rather than showing a false empty state', async () => {
    configureSupabase({ incidentsError: { message: 'incident query failed' } });
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await expect(StaffIncidentsPage()).rejects.toThrow('Unable to load staff incidents.');
    errorSpy.mockRestore();
  });
});

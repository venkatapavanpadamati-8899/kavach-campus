import { beforeEach, describe, expect, it, vi } from 'vitest';
import ManagementIncidentsPage from '@/app/management/incidents/page';
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

vi.mock('@/app/management/incidents/ManagementIncidentsList', () => ({
  default: vi.fn(() => null),
}));

type Profile = { role: string; college_id: string | null } | null;

function configureSupabase({
  user = { id: 'user-1' },
  profile = { role: 'HOD', college_id: 'srkr-bhimavaram' },
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
    then: (resolve: (value: typeof incidentResult) => unknown, reject?: (reason: unknown) => unknown) => Promise<unknown>;
  } = {
    select: vi.fn(),
    order: vi.fn(),
    eq: vi.fn(),
    then: (resolve, reject) => Promise.resolve(incidentResult).then(resolve, reject),
  };
  incidentQuery.select.mockReturnValue(incidentQuery);
  incidentQuery.order.mockReturnValue(incidentQuery);
  incidentQuery.eq.mockReturnValue(incidentQuery);

  const supabase = {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) },
    from: vi.fn((table: string) => table === 'profiles' ? profileQuery : incidentQuery),
  };

  vi.mocked(createClient).mockResolvedValue(
    supabase as unknown as Awaited<ReturnType<typeof createClient>>
  );

  return { supabase, profileQuery, incidentQuery };
}

describe('Management incidents page authorization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('redirects unauthenticated users to login', async () => {
    const { supabase } = configureSupabase({ user: null });

    await expect(ManagementIncidentsPage()).rejects.toThrow('NEXT_REDIRECT:/login?redirect=/management/incidents');
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('fails closed when no profile exists', async () => {
    const { supabase } = configureSupabase({ profile: null });

    await expect(ManagementIncidentsPage()).rejects.toThrow('NEXT_REDIRECT:/unauthorized');
    expect(supabase.from).toHaveBeenCalledTimes(1);
  });

  it('surfaces profile lookup errors without querying incidents', async () => {
    const { supabase } = configureSupabase({ profileError: { message: 'profile query failed' } });
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await expect(ManagementIncidentsPage()).rejects.toThrow('Unable to verify access to management incidents.');
    expect(supabase.from).toHaveBeenCalledTimes(1);
    errorSpy.mockRestore();
  });

  it('redirects students away from management incidents', async () => {
    configureSupabase({ profile: { role: 'STUDENT', college_id: 'srkr-bhimavaram' } });

    await expect(ManagementIncidentsPage()).rejects.toThrow('NEXT_REDIRECT:/student');
  });

  it('redirects campus staff to their staff portal', async () => {
    const { supabase } = configureSupabase({ profile: { role: 'STAFF', college_id: 'srkr-bhimavaram' } });

    await expect(ManagementIncidentsPage()).rejects.toThrow('NEXT_REDIRECT:/staff');
    expect(supabase.from).toHaveBeenCalledTimes(1);
  });

  it('requires a college association for management roles', async () => {
    configureSupabase({ profile: { role: 'HOD', college_id: null } });

    await expect(ManagementIncidentsPage()).rejects.toThrow('NEXT_REDIRECT:/unauthorized');
  });

  it('scopes management incident queries to the authenticated college', async () => {
    const { incidentQuery } = configureSupabase();

    const page = await ManagementIncidentsPage();

    expect(incidentQuery.eq).toHaveBeenCalledWith('college_id', 'srkr-bhimavaram');
    expect(page).toMatchObject({
      props: {
        userRole: 'HOD',
        collegeName: 'Sagi Rama Krishnam Raju Engineering College (Autonomous)',
      },
    });
  });

  it('keeps platform administrators college-neutral and unscoped', async () => {
    const { incidentQuery } = configureSupabase({
      profile: { role: 'ADMIN', college_id: 'srkr-bhimavaram' },
    });

    const page = await ManagementIncidentsPage();

    expect(incidentQuery.eq).not.toHaveBeenCalled();
    expect(page).toMatchObject({
      props: {
        userRole: 'ADMIN',
        collegeName: null,
      },
    });
  });

  it('surfaces incident query failures rather than showing a false empty state', async () => {
    configureSupabase({ incidentsError: { message: 'incident query failed' } });
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await expect(ManagementIncidentsPage()).rejects.toThrow('Unable to load management incidents.');
    errorSpy.mockRestore();
  });
});

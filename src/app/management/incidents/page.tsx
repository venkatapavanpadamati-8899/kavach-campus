import React from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getCollegeById } from '@/lib/colleges';
import ManagementIncidentsList from './ManagementIncidentsList';

export const dynamic = 'force-dynamic';

export default async function ManagementIncidentsPage() {
  const supabase = await createClient();

  // 1. Server-side Authentication
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login?redirect=/management/incidents');
  }

  // 2. Resolve authorization from the authenticated profile; never fail open.
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, college_id')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError) {
    console.error('Management incident profile lookup failed:', profileError);
    throw new Error('Unable to verify access to management incidents.');
  }
  if (!profile) {
    redirect('/unauthorized');
  }

  const userRole = profile.role;
  if (userRole === 'STUDENT') {
    redirect('/student');
  }

  const platformAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';
  const managementRoles = ['HOD', 'PRINCIPAL', 'MANAGEMENT', 'MANAGEMENT_ADMIN'];
  const staffRoles = [
    'STAFF',
    'SECURITY',
    'MENTOR',
    'COUNSELLOR',
    'COUNSELOR',
    'WOMENS_CELL',
    'WARDEN',
  ];
  if (!platformAdmin && !managementRoles.includes(userRole)) {
    redirect(staffRoles.includes(userRole) ? '/staff' : '/unauthorized');
  }

  const collegeId = profile.college_id && profile.college_id !== 'PENDING_CAMPUS_VERIFICATION'
    ? profile.college_id
    : null;
  if (!platformAdmin && !collegeId) {
    redirect('/unauthorized');
  }

  let collegeName: string | null = null;
  if (!platformAdmin && collegeId) {
    const col = getCollegeById(collegeId);
    if (col) collegeName = col.name;
  }

  // 3. Fetch Incidents — strictly scoped to campus for College Management
  let query = supabase
    .from('incidents')
    .select('*')
    .order('created_at', { ascending: false });

  if (!platformAdmin && collegeId) {
    query = query.eq('college_id', collegeId);
  }

  const { data: rawIncidents, error: incidentsError } = await query;
  if (incidentsError) {
    console.error('Management incident query failed:', incidentsError);
    throw new Error('Unable to load management incidents.');
  }

  // 4. Sanitize anonymous reports for non-super-admin staff
  const isSuperAdmin = userRole === 'SUPER_ADMIN';
  const incidents = (rawIncidents || []).map((inc) => {
    const isOwner = inc.student_id === user.id;
    const maskAnonymous = inc.is_anonymous && !isSuperAdmin && !isOwner;
    return {
      ...inc,
      student_id: maskAnonymous ? null : inc.student_id,
    };
  });

  return (
    <ManagementIncidentsList
      initialIncidents={incidents}
      userRole={userRole}
      collegeName={collegeName}
    />
  );
}

import React from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import ManagementIncidentsList from './ManagementIncidentsList';

export const dynamic = 'force-dynamic';

export default async function ManagementIncidentsPage() {
  const supabase = await createClient();

  // 1. Server-side Authentication
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login?redirect=/management/incidents');
  }

  // 2. Server-side Authorization Check
  let userRole = 'STAFF';
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role === 'STUDENT') {
      redirect('/student');
    }
    if (profile?.role) {
      userRole = profile.role;
    }
  } catch {
    // Fallback for mock environments
  }

  // 3. Fetch Incidents
  const { data: rawIncidents } = await supabase
    .from('incidents')
    .select('*')
    .order('created_at', { ascending: false });

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

  return <ManagementIncidentsList initialIncidents={incidents} userRole={userRole} />;
}

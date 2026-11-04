"use client";
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { isManagementRole, isStaffRole } from '@/lib/staff-roles';

export default function DashboardRedirect() {
  const router = useRouter();

  useEffect(() => {
    async function routeUser() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.replace('/login');
          return;
        }
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        const role = profile?.role;
        if (role === 'SUPER_ADMIN') {
          router.replace('/super-admin');
          return;
        }
        if (role === 'ADMIN') {
          router.replace('/admin');
          return;
        }
        if (role && isManagementRole(role)) {
          router.replace('/management');
          return;
        }
        if (role && isStaffRole(role)) {
          router.replace('/staff');
          return;
        }
      } catch {
        // Fallback
      }
      router.replace('/student');
    }
    routeUser();
  }, [router]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '0.95rem' }}>
      Redirecting to portal...
    </div>
  );
}

"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  Home, 
  ShieldAlert, 
  FileText, 
  MapPin, 
  Users, 
  Settings,
  Bell,
  LogOut,
  Mic,
  User,
  Building2
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { getCollegeBranding, CollegeBranding, getPageBackground, setActiveCollegeTenant } from '@/lib/college-branding';
import { CollegeTenant, getCollegeById } from '@/lib/colleges';

interface SidebarItem {
  name: string;
  href: string;
  icon: React.ElementType;
}

const studentNav: SidebarItem[] = [
  { name: 'Dashboard', href: '/student', icon: Home },
  { name: 'SOS Emergency', href: '/student/sos', icon: ShieldAlert },
  { name: 'File Report', href: '/student/report', icon: FileText },
  { name: 'Voice Report', href: '/student/voice-report', icon: Mic },
  { name: 'Safe Walk', href: '/student/safe-walk', icon: MapPin },
  { name: 'My Cases', href: '/student/cases', icon: FileText },
  { name: 'Trusted Contacts', href: '/student/trusted-contacts', icon: Users },
  { name: 'Profile & ID', href: '/student/profile', icon: User },
  { name: 'Settings', href: '/student/settings', icon: Settings },
];

const staffNav: SidebarItem[] = [
  { name: 'Dashboard', href: '/staff', icon: Home },
  { name: 'Assigned Cases', href: '/staff/incidents', icon: FileText },
];

const adminNav: SidebarItem[] = [
  { name: 'Control Center', href: '/admin', icon: Home },
  { name: 'All Incidents', href: '/admin/incidents', icon: FileText },
  { name: 'AI Config', href: '/admin/ai', icon: Settings },
  { name: 'User Management', href: '/admin/users', icon: Users },
  { name: 'System Audit', href: '/admin/system-audit', icon: ShieldAlert },
];

import { Suspense } from 'react';

function DashboardLayoutContent({ children, role }: { children: React.ReactNode, role: 'STUDENT' | 'STAFF' | 'ADMIN' }) {
  const pathname = usePathname();
  const router = useRouter();
  const [tenant, setTenant] = useState<CollegeTenant | null>(null);
  const [branding, setBranding] = useState<CollegeBranding>(getCollegeBranding());
  const [avatarPhoto, setAvatarPhoto] = useState<string | null>(null);

  if (pathname.includes('/login')) {
    return <>{children}</>;
  }
  
  useEffect(() => {
    let cancelled = false;
    if (typeof window !== 'undefined') {
      const savedPhoto = localStorage.getItem('kavach_student_profile_photo');
      if (savedPhoto) setAvatarPhoto(savedPhoto);
    }
    async function loadAuthenticatedCollege() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      const { data: profile } = await supabase
        .from('profiles')
        .select('college_id, is_approved')
        .eq('id', user.id)
        .single();
      const isVerified = profile?.is_approved === true || role !== 'STUDENT';
      const authenticatedCollege = (profile?.college_id && profile.college_id !== 'PENDING_CAMPUS_VERIFICATION' && isVerified)
        ? getCollegeById(profile.college_id)
        : null;
      if (authenticatedCollege && !cancelled) {
        setTenant(authenticatedCollege);
        setBranding(getCollegeBranding(authenticatedCollege.id));
        setActiveCollegeTenant(authenticatedCollege);
      } else if (!cancelled) {
        setTenant(null);
      }
    }
    void loadAuthenticatedCollege();
    return () => { cancelled = true; };
  }, [role]);

  const navItems = role === 'STUDENT' ? studentNav : role === 'STAFF' ? staffNav : adminNav;

  // Resolve page key for page-specific background
  const getPageKey = () => {
    if (pathname.includes('/sos')) return 'sos';
    if (pathname.includes('/voice-report')) return 'voice_report';
    if (pathname.includes('/report')) return 'file_report';
    if (pathname.includes('/safe-walk')) return 'safe_walk';
    if (pathname.includes('/cases') || pathname.includes('/incidents')) return 'my_cases';
    if (pathname.includes('/trusted-contacts')) return 'trusted_contacts';
    if (pathname.includes('/profile')) return 'identity_verification';
    if (pathname.includes('/settings')) return 'settings';
    if (role === 'STAFF') return 'staff_dashboard';
    if (role === 'ADMIN') return 'admin_dashboard';
    return 'student_dashboard';
  };

  const bgConfig = getPageBackground(tenant?.id, getPageKey() as any);

  return (
    <div
      className="dashboard-shell"
      style={{ 
        display: 'flex', 
        minHeight: '100vh', 
        color: 'var(--text-primary)',
        backgroundImage: `${bgConfig.overlay}, url('${bgConfig.imageUrl}')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
        transition: 'background-image 0.5s ease'
      }}
    >
      {/* Sidebar */}
      <motion.aside
        className="dashboard-sidebar"
        initial={{ x: -250 }}
        animate={{ x: 0 }}
        style={{
          width: '260px',
          background: 'rgba(10, 10, 15, 0.85)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderRight: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          flexDirection: 'column',
          padding: '24px 16px',
          zIndex: 40
        }}
      >
        {/* Brand Logo & Active Campus Name */}
        <div style={{ padding: '0 8px 24px 8px', borderBottom: '1px solid rgba(255,255,255,0.06)', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <div 
              style={{ width: '40px', height: '40px', flexShrink: 0 }}
              dangerouslySetInnerHTML={{ __html: branding.logoSvg }}
            />
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, background: 'linear-gradient(45deg, #60a5fa, #c084fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Kavach Campus
              </h2>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Safety in One Tap</span>
            </div>
          </div>

          {/* Active Tenant Pill */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 10px',
            borderRadius: '8px',
            background: 'rgba(124, 58, 237, 0.15)',
            border: '1px solid rgba(124, 58, 237, 0.3)',
            marginTop: '8px'
          }}>
            <Building2 size={13} color="var(--accent-purple)" />
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#e0e7ff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {tenant?.shortName || 'Campus verification pending'}
            </span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px', overflowY: 'auto' }}>
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/student' && item.href !== '/staff' && item.href !== '/admin' && pathname.startsWith(item.href));
            return (
              <Link key={item.name} href={item.href} style={{ textDecoration: 'none' }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px',
                  borderRadius: '10px', cursor: 'pointer',
                  background: isActive ? 'linear-gradient(90deg, rgba(59, 130, 246, 0.2) 0%, rgba(139, 92, 246, 0.1) 100%)' : 'transparent',
                  border: isActive ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid transparent',
                  color: isActive ? '#60a5fa' : 'var(--text-secondary)',
                  transition: 'all 0.2s',
                  fontSize: '0.92rem'
                }}>
                  <item.icon size={19} />
                  <span style={{ fontWeight: isActive ? 600 : 400 }}>{item.name}</span>
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <button style={{
            display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px',
            width: '100%', borderRadius: '8px', background: 'transparent',
            border: 'none', color: 'var(--accent-red)', cursor: 'pointer', textAlign: 'left',
            fontSize: '0.9rem'
          }}
          onClick={async () => {
            try {
              const supabase = createClient();
              await supabase.auth.signOut();
            } catch {
              // Ignore network error on client sign out
            }
            try {
              await fetch('/api/auth/logout', { method: 'POST' });
            } catch {
              // Ignore network error on server sign out
            }
            document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
            if (typeof window !== 'undefined') {
              sessionStorage.clear();
            }
            router.push('/login');
          }}>
            <LogOut size={18} />
            <span>Sign Out</span>
          </button>
        </div>
      </motion.aside>

      {/* Main Content Area */}
      <main className="dashboard-main" style={{ flex: 1, padding: '24px 32px', overflowY: 'auto' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          {/* Topbar: Top Right Corner College Logo & Info */}
          <header className="dashboard-topbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
            {/* Campus Background Caption / Breadcrumb */}
            <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
              {bgConfig.caption}
            </div>

            {/* Top-Right Corner Branding & Controls */}
            <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
              {/* College Branding Logo & Name Badge */}
              <div 
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '6px 14px 6px 8px',
                  borderRadius: '30px',
                  background: 'rgba(15, 23, 42, 0.75)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  backdropFilter: 'blur(10px)',
                  boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)'
                }}
              >
                {/* College Official Logo SVG (Top-Right Corner) */}
                <div 
                  style={{ width: '34px', height: '34px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0 }}
                  dangerouslySetInnerHTML={{ __html: branding.logoSvg }}
                  title={`${tenant?.name || 'Kavach Campus'} Official Emblem`}
                />
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>
                    {tenant?.shortName || 'Kavach Campus'}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#38bdf8' }}>
                    {tenant ? `${tenant.city}, ${tenant.state}` : 'Verified profile required'}
                  </div>
                </div>
              </div>

              {/* Notification Button */}
              <Link href={role === 'STUDENT' ? '/student/cases' : role === 'STAFF' ? '/staff/incidents' : '/admin/incidents'}>
                <button 
                  title="View Incident Alerts"
                  style={{ 
                    background: 'rgba(255,255,255,0.06)', 
                    border: '1px solid rgba(255,255,255,0.1)', 
                    padding: '8px', 
                    borderRadius: '50%', 
                    color: 'white', 
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Bell size={18} />
                </button>
              </Link>

              {/* Profile Avatar */}
              <Link href={role === 'STUDENT' ? '/student/profile' : role === 'STAFF' ? '/staff' : '/admin/users'} title="View authorized profile area">
                <div style={{ 
                  width: '38px', 
                  height: '38px', 
                  borderRadius: '50%', 
                  overflow: 'hidden',
                  background: 'linear-gradient(135deg, #7c3aed 0%, #3b82f6 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  border: '2px solid rgba(255,255,255,0.2)'
                }}>
                  {avatarPhoto ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={avatarPhoto} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <User size={18} />
                  )}
                </div>
              </Link>
            </div>
          </header>

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {children}
          </motion.div>
        </div>
      </main>
    </div>
  );
}

export default function DashboardLayout({ children, role }: { children: React.ReactNode, role: 'STUDENT' | 'STAFF' | 'ADMIN' }) {
  return (
    <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center', color: 'white' }}>Loading Dashboard...</div>}>
      <DashboardLayoutContent role={role}>{children}</DashboardLayoutContent>
    </Suspense>
  );
}

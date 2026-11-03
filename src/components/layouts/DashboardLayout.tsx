"use client";
import React, { useState, useEffect, Suspense } from 'react';
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
  Building2,
  Lock
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { getCollegeBranding, CollegeBranding, getPageBackground, setActiveCollegeTenant } from '@/lib/college-branding';
import { CollegeTenant, getCollegeById } from '@/lib/colleges';

export type DashboardRole = 'STUDENT' | 'STAFF' | 'ADMIN' | 'MANAGEMENT';

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
  { name: 'Safe Box', href: '/student/safe-box', icon: Lock },
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

const managementNav: SidebarItem[] = [
  { name: 'Overview', href: '/management', icon: Home },
  { name: 'Campus Incidents', href: '/management/incidents', icon: FileText },
  { name: 'Staff Control', href: '/staff', icon: Users },
];

const adminNav: SidebarItem[] = [
  { name: 'Control Center', href: '/admin', icon: Home },
  { name: 'All Incidents', href: '/admin/incidents', icon: FileText },
  { name: 'AI Config', href: '/admin/ai', icon: Settings },
  { name: 'User Management', href: '/admin/users', icon: Users },
  { name: 'System Audit', href: '/admin/system-audit', icon: ShieldAlert },
];

function DashboardLayoutContent({ children, role }: { children: React.ReactNode, role: DashboardRole }) {
  const pathname = usePathname();
  const router = useRouter();
  const [tenant, setTenant] = useState<CollegeTenant | null>(null);
  const [branding, setBranding] = useState<CollegeBranding>(getCollegeBranding());
  const [avatarPhoto, setAvatarPhoto] = useState<string | null>(null);

  const isPlatformAdmin = role === 'ADMIN';

  useEffect(() => {
    let cancelled = false;

    // Platform-wide Administrators (Super Admin & Admin) must NEVER be bound to a single college
    if (isPlatformAdmin) {
      setTenant(null);
      setBranding(getCollegeBranding());
      return () => { cancelled = true; };
    }

    async function loadAuthenticatedCollege() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, college_id, is_approved')
        .eq('id', user.id)
        .single();

      if (role === 'STUDENT') {
        try {
          const photoResponse = await fetch('/api/student/profile');
          const photoData = await photoResponse.json();
          if (!photoResponse.ok) {
            throw new Error(photoData.error || 'Unable to load the profile photo.');
          }
          if (!cancelled) setAvatarPhoto(photoData.profilePhotoUrl || null);
        } catch (error) {
          console.error('Load student profile photo failed:', error);
        }
      }

      // Platform admins must remain college-neutral
      if (profile?.role === 'ADMIN' || profile?.role === 'SUPER_ADMIN') {
        if (!cancelled) {
          setTenant(null);
          setBranding(getCollegeBranding());
        }
        return;
      }

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
  }, [role, isPlatformAdmin]);

  const navItems = role === 'STUDENT'
    ? studentNav
    : role === 'STAFF'
    ? staffNav
    : role === 'MANAGEMENT'
    ? managementNav
    : adminNav;

  // Resolve page key for page-specific background
  const getPageKey = () => {
    if (pathname.includes('/sos')) return 'sos';
    if (pathname.includes('/voice-report')) return 'voice_report';
    if (pathname.includes('/safe-box')) return 'file_report';
    if (pathname.includes('/report')) return 'file_report';
    if (pathname.includes('/safe-walk')) return 'safe_walk';
    if (pathname.includes('/cases') || pathname.includes('/incidents')) return 'my_cases';
    if (pathname.includes('/trusted-contacts')) return 'trusted_contacts';
    if (pathname.includes('/profile')) return 'identity_verification';
    if (pathname.includes('/settings')) return 'settings';
    if (role === 'STAFF') return 'staff_dashboard';
    if (role === 'MANAGEMENT') return 'management_dashboard';
    if (role === 'ADMIN') return 'admin_dashboard';
    return 'student_dashboard';
  };

  const bgConfig = getPageBackground(tenant?.id, getPageKey() as any);

  if (pathname.includes('/login')) {
    return <>{children}</>;
  }

  return (
    <div
      className="dashboard-shell"
      style={{
        display: 'flex',
        minHeight: '100vh',
        width: '100%',
        minWidth: '100%',
        boxSizing: 'border-box',
        color: 'var(--text-primary)',
        backgroundImage: `${bgConfig.overlay}, url('${bgConfig.imageUrl}')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
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
          width: '270px',
          background: 'linear-gradient(180deg, #0b1329 0%, #0c1a36 45%, #071021 100%)',
          backdropFilter: 'blur(28px)',
          WebkitBackdropFilter: 'blur(28px)',
          borderRight: '1px solid rgba(56, 189, 248, 0.18)',
          boxShadow: 'inset -1px 0 0 rgba(56, 189, 248, 0.12), 6px 0 32px rgba(2, 6, 23, 0.70)',
          display: 'flex',
          flexDirection: 'column',
          padding: '22px 14px',
          zIndex: 40
        }}
      >
        {/* Brand Logo & Active Campus Name */}
        <div style={{ padding: '0 6px 20px 6px', borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <div
              style={{ width: '40px', height: '40px', flexShrink: 0 }}
              dangerouslySetInnerHTML={{ __html: branding.logoSvg }}
            />
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, background: 'linear-gradient(45deg, #60a5fa, #c084fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-0.01em' }}>
                Kavach Campus
              </h2>
              <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 500 }}>Safety in One Tap</span>
            </div>
          </div>

          {/* Active Tenant / Role Pill */}
          {isPlatformAdmin ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 12px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.20) 0%, rgba(99, 102, 241, 0.15) 100%)',
              border: '1px solid rgba(59, 130, 246, 0.35)',
              marginTop: '10px'
            }}>
              <ShieldAlert size={15} color="#60a5fa" />
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#93c5fd', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  Platform Administration
                </div>
                <div style={{ fontSize: '0.68rem', color: '#60a5fa' }}>Central Governance</div>
              </div>
            </div>
          ) : (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 12px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.22) 0%, rgba(59, 130, 246, 0.15) 100%)',
              border: '1px solid rgba(124, 58, 237, 0.35)',
              marginTop: '10px'
            }}>
              <Building2 size={16} color="#c084fc" />
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {tenant?.shortName || (role === 'MANAGEMENT' ? 'Campus Management' : 'Campus verification pending')}
                </div>
                {tenant ? (
                  <div style={{ fontSize: '0.68rem', color: '#a5b4fc' }}>
                    {tenant.city}, {tenant.state}
                  </div>
                ) : (
                  <div style={{ fontSize: '0.68rem', color: '#fbbf24' }}>Verification in progress</div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Navigation Items */}
        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px', overflowY: 'auto' }}>
          {navItems.map((item: SidebarItem) => {
            const isActive = pathname === item.href || (item.href !== '/student' && item.href !== '/staff' && item.href !== '/admin' && item.href !== '/management' && pathname.startsWith(item.href));
            return (
              <Link key={item.name} href={item.href} style={{ textDecoration: 'none' }}>
                <div style={{
                  position: 'relative',
                  display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px',
                  borderRadius: '10px', cursor: 'pointer',
                  background: isActive
                    ? 'linear-gradient(90deg, rgba(37, 99, 235, 0.28) 0%, rgba(56, 189, 248, 0.14) 100%)'
                    : 'transparent',
                  border: isActive
                    ? '1px solid rgba(56, 189, 248, 0.45)'
                    : '1px solid transparent',
                  color: isActive ? '#f8fafc' : '#94a3b8',
                  boxShadow: isActive ? '0 4px 14px rgba(37, 99, 235, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.15)' : 'none',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  fontSize: '0.92rem'
                }}>
                  {isActive && (
                    <div
                      style={{
                        position: 'absolute',
                        left: '0',
                        top: '6px',
                        bottom: '6px',
                        width: '3.5px',
                        borderRadius: '0 4px 4px 0',
                        background: 'linear-gradient(180deg, #38bdf8 0%, #818cf8 100%)',
                        boxShadow: '0 0 8px rgba(56, 189, 248, 0.6)'
                      }}
                    />
                  )}
                  <item.icon size={19} color={isActive ? '#38bdf8' : '#94a3b8'} />
                  <span style={{ fontWeight: isActive ? 600 : 400 }}>{item.name}</span>
                </div>
              </Link>
            );
          })}
        </nav>

        {/* User Profile Mini Badge & Sign Out */}
        <div style={{ marginTop: 'auto', paddingTop: '14px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{
            padding: '10px 12px',
            borderRadius: '10px',
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            marginBottom: '10px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              overflow: 'hidden',
              background: 'linear-gradient(135deg, #7c3aed 0%, #3b82f6 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              {avatarPhoto ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={avatarPhoto} alt="User" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <User size={16} color="#fff" />
              )}
            </div>
            <div style={{ overflow: 'hidden', flex: 1 }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {isPlatformAdmin ? 'Platform Admin' : (tenant?.shortName || 'Verified Member')}
              </div>
              <div style={{ fontSize: '0.68rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
                {role}
              </div>
            </div>
          </div>

          <button style={{
            display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px',
            width: '100%', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.10)',
            border: '1px solid rgba(239, 68, 68, 0.22)', color: '#f87171', cursor: 'pointer', textAlign: 'left',
            fontSize: '0.88rem', fontWeight: 500, transition: 'all 0.2s'
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
            <LogOut size={16} />
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
              {/* Institution / Platform Branding Badge */}
              {isPlatformAdmin ? (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '6px 14px 6px 10px',
                    borderRadius: '30px',
                    background: 'rgba(15, 23, 42, 0.75)',
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                    backdropFilter: 'blur(10px)',
                    boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)'
                  }}
                >
                  <div
                    style={{ width: '34px', height: '34px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(59, 130, 246, 0.2)' }}
                    title="Kavach Platform System Administration"
                  >
                    <ShieldAlert size={18} color="#60a5fa" />
                  </div>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>
                      Platform Admin
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#93c5fd' }}>
                      Central Control • Multi-Campus
                    </div>
                  </div>
                </div>
              ) : (
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
                      {tenant?.shortName || (role === 'MANAGEMENT' ? 'Campus Management' : 'Kavach Campus')}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#38bdf8' }}>
                      {tenant ? `${tenant.city}, ${tenant.state}` : (role === 'MANAGEMENT' ? 'Institutional Oversight' : 'Verified profile required')}
                    </div>
                  </div>
                </div>
              )}

              {/* Notification Button */}
              <Link href={role === 'STUDENT' ? '/student/cases' : role === 'STAFF' ? '/staff/incidents' : role === 'MANAGEMENT' ? '/management/incidents' : '/admin/incidents'}>
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
              <Link href={role === 'STUDENT' ? '/student/profile' : role === 'STAFF' ? '/staff' : role === 'MANAGEMENT' ? '/management' : '/admin/users'} title="View authorized profile area">
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

export default function DashboardLayout({ children, role }: { children: React.ReactNode, role: DashboardRole }) {
  return (
    <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center', color: 'white' }}>Loading Dashboard...</div>}>
      <DashboardLayoutContent role={role}>{children}</DashboardLayoutContent>
    </Suspense>
  );
}

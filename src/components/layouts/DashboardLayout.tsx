"use client";
import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
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
  Lock,
  Menu,
  X
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
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  const isPlatformAdmin = role === 'ADMIN';

  // Responsive device width detector
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close mobile drawer on route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

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
        } catch {
          // Fall back gracefully
        }
      }

      if (profile && profile.college_id && !cancelled) {
        const college = getCollegeById(profile.college_id);
        if (college) {
          setTenant(college);
          setBranding(getCollegeBranding(college.id));
          setActiveCollegeTenant(college);
        }
      }
    }

    loadAuthenticatedCollege();

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
    if (pathname.includes('/safe-box')) return 'safe_box';
    if (pathname.includes('/report')) return 'file_report';
    if (pathname.includes('/safe-walk')) return 'safe_walk';
    if (pathname.includes('/cases') || pathname.includes('/incidents')) return 'my_cases';
    if (pathname.includes('/trusted-contacts')) return 'trusted_contacts';
    if (pathname.includes('/profile')) return 'student_profile';
    if (pathname.includes('/settings')) return 'settings';
    if (pathname.includes('/super-admin')) return 'super_admin';
    if (role === 'STAFF') return 'staff_dashboard';
    if (role === 'MANAGEMENT') return 'management_dashboard';
    if (role === 'ADMIN') return 'admin_dashboard';
    return 'student_dashboard';
  };

  const bgConfig = getPageBackground(tenant?.id, getPageKey() as any);

  if (pathname.includes('/login')) {
    return <>{children}</>;
  }

  const renderSidebarContent = (inDrawer = false) => (
    <>
      {/* Brand Logo & Active Campus Name */}
      <div style={{ padding: '0 6px 16px 6px', borderBottom: '1px solid rgba(16, 185, 129, 0.16)', marginBottom: '14px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <div
            style={{ width: '38px', height: '38px', flexShrink: 0 }}
            dangerouslySetInnerHTML={{ __html: branding.logoSvg }}
          />
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, background: 'linear-gradient(45deg, #10b981, #34d399)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-0.01em' }}>
              Kavach Campus
            </h2>
            <span style={{ fontSize: '0.72rem', color: '#a7f3d0', fontWeight: 500 }}>Safety in One Tap</span>
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
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.20) 0%, rgba(5, 150, 105, 0.15) 100%)',
            border: '1px solid rgba(16, 185, 129, 0.35)',
            marginTop: '10px'
          }}>
            <ShieldAlert size={15} color="#34d399" />
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#ecfdf5', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                Platform Administration
              </div>
              <div style={{ fontSize: '0.68rem', color: '#6ee7b7' }}>Central Governance</div>
            </div>
          </div>
        ) : (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 12px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.20) 0%, rgba(4, 120, 87, 0.15) 100%)',
            border: '1px solid rgba(16, 185, 129, 0.35)',
            marginTop: '10px'
          }}>
            <Building2 size={15} color="#34d399" />
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#ecfdf5', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {tenant ? tenant.shortName : (role === 'MANAGEMENT' ? 'Campus Management' : 'Autonomous Campus')}
              </div>
              <div style={{ fontSize: '0.68rem', color: '#6ee7b7' }}>
                {tenant ? `${tenant.city}, ${tenant.state}` : (role === 'MANAGEMENT' ? 'Executive Oversight' : 'Verified Student')}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Nav List */}
      <nav style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px', paddingRight: '2px' }}>
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => {
                if (inDrawer) setIsMobileMenuOpen(false);
              }}
              style={{ textDecoration: 'none' }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '11px 14px',
                  borderRadius: '10px',
                  background: isActive ? 'linear-gradient(90deg, rgba(16, 185, 129, 0.22) 0%, rgba(5, 150, 105, 0.10) 100%)' : 'transparent',
                  border: isActive ? '1px solid rgba(16, 185, 129, 0.40)' : '1px solid transparent',
                  color: isActive ? '#ecfdf5' : '#94a3b8',
                  fontSize: '0.9rem',
                  fontWeight: isActive ? 600 : 500,
                  transition: 'all 0.2s ease',
                  position: 'relative'
                }}
              >
                {isActive && (
                  <span
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: '20%',
                      bottom: '20%',
                      width: '3.5px',
                      borderRadius: '0 4px 4px 0',
                      background: '#10b981',
                      boxShadow: '0 0 8px rgba(16, 185, 129, 0.7)'
                    }}
                  />
                )}
                <item.icon size={19} color={isActive ? '#34d399' : '#94a3b8'} />
                <span style={{ fontWeight: isActive ? 600 : 400 }}>{item.name}</span>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* User Profile Mini Badge & Sign Out */}
      <div style={{ marginTop: 'auto', paddingTop: '14px', paddingBottom: '6px', borderTop: '1px solid rgba(16, 185, 129, 0.16)', flexShrink: 0 }}>
        <div style={{
          padding: '10px 12px',
          borderRadius: '10px',
          background: 'rgba(16, 185, 129, 0.08)',
          border: '1px solid rgba(16, 185, 129, 0.18)',
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
            background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
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
            <div style={{ fontSize: '0.68rem', color: '#34d399', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
              {role}
            </div>
          </div>
        </div>

        <button style={{
          display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px',
          width: '100%', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.12)',
          border: '1px solid rgba(239, 68, 68, 0.28)', color: '#fca5a5', cursor: 'pointer', textAlign: 'left',
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
    </>
  );

  return (
    <div
      className="dashboard-shell"
      style={{
        display: 'flex',
        height: '100vh',
        maxHeight: '100vh',
        overflow: 'hidden',
        width: '100%',
        minWidth: '100%',
        boxSizing: 'border-box',
        color: 'var(--text-primary)',
        backgroundImage: `${bgConfig.overlay}, url('${bgConfig.imageUrl}')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: isMobile ? 'scroll' : 'fixed',
        transition: 'background-image 0.5s ease'
      }}
    >
      {/* Desktop Sidebar: Strictly fixed on left and does NOT scroll */}
      {!isMobile && (
        <motion.aside
          className="dashboard-sidebar"
          initial={{ x: -250 }}
          animate={{ x: 0 }}
          style={{
            position: 'fixed',
            left: 0,
            top: 0,
            bottom: 0,
            width: '270px',
            height: '100vh',
            background: 'linear-gradient(180deg, #041f16 0%, #062b1f 45%, #031710 100%)',
            backdropFilter: 'blur(28px)',
            WebkitBackdropFilter: 'blur(28px)',
            borderRight: '1px solid rgba(16, 185, 129, 0.22)',
            boxShadow: 'inset -1px 0 0 rgba(16, 185, 129, 0.12), 6px 0 32px rgba(2, 6, 23, 0.70)',
            display: 'flex',
            flexDirection: 'column',
            padding: '20px 14px 18px 14px',
            zIndex: 50,
            boxSizing: 'border-box'
          }}
        >
          {renderSidebarContent(false)}
        </motion.aside>
      )}

      {/* Mobile Drawer with Backdrop */}
      <AnimatePresence>
        {isMobile && isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0, 0, 0, 0.75)',
                backdropFilter: 'blur(6px)',
                WebkitBackdropFilter: 'blur(6px)',
                zIndex: 99
              }}
            />
            <motion.aside
              initial={{ x: -290 }}
              animate={{ x: 0 }}
              exit={{ x: -290 }}
              transition={{ type: 'spring', damping: 25, stiffness: 250 }}
              style={{
                position: 'fixed',
                left: 0,
                top: 0,
                bottom: 0,
                width: '280px',
                maxWidth: '85vw',
                height: '100vh',
                background: 'linear-gradient(180deg, #041f16 0%, #062b1f 45%, #031710 100%)',
                borderRight: '1px solid rgba(16, 185, 129, 0.28)',
                boxShadow: '10px 0 40px rgba(0, 0, 0, 0.85)',
                display: 'flex',
                flexDirection: 'column',
                padding: '16px 14px 18px 14px',
                zIndex: 100,
                boxSizing: 'border-box'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '6px' }}>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  aria-label="Close navigation"
                  style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    color: '#fff',
                    borderRadius: '8px',
                    padding: '6px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <X size={18} />
                </button>
              </div>
              {renderSidebarContent(true)}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content Area - scrolls independently */}
      <main
        className="dashboard-main"
        style={{
          flex: 1,
          marginLeft: isMobile ? 0 : '270px',
          height: '100vh',
          maxHeight: '100vh',
          overflowY: 'auto',
          overflowX: 'hidden',
          width: isMobile ? '100%' : 'calc(100% - 270px)',
          padding: isMobile ? '16px 14px 32px 14px' : '24px 32px',
          boxSizing: 'border-box'
        }}
      >
        <div style={{ maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
          {/* Topbar: Top Right Corner College Logo & Info */}
          <header
            className="dashboard-topbar"
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: isMobile ? '18px' : '28px',
              flexWrap: 'wrap',
              gap: '12px'
            }}
          >
            {/* Left section: Hamburger button on mobile + caption */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {isMobile && (
                <button
                  onClick={() => setIsMobileMenuOpen(true)}
                  aria-label="Open menu"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '8px 12px',
                    background: 'rgba(16, 185, 129, 0.18)',
                    border: '1px solid rgba(16, 185, 129, 0.38)',
                    borderRadius: '10px',
                    color: '#34d399',
                    cursor: 'pointer',
                    gap: '6px',
                    fontWeight: 600,
                    fontSize: '0.85rem'
                  }}
                >
                  <Menu size={18} />
                  <span>Menu</span>
                </button>
              )}

              {/* Campus Background Caption */}
              <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', flexShrink: 0 }} />
                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: isMobile ? '160px' : '360px' }}>
                  {bgConfig.caption}
                </span>
              </div>
            </div>

            {/* Top-Right Corner Branding & Controls */}
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginLeft: 'auto' }}>
              {/* Institution / Platform Branding Badge */}
              {isPlatformAdmin ? (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '6px 12px 6px 8px',
                    borderRadius: '30px',
                    background: 'rgba(15, 23, 42, 0.75)',
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                    backdropFilter: 'blur(10px)',
                    boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)'
                  }}
                >
                  <div
                    style={{ width: '30px', height: '30px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(59, 130, 246, 0.2)' }}
                    title="Kavach Platform System Administration"
                  >
                    <ShieldAlert size={16} color="#60a5fa" />
                  </div>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>
                      Admin
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '6px 12px 6px 8px',
                    borderRadius: '30px',
                    background: 'rgba(15, 23, 42, 0.75)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    backdropFilter: 'blur(10px)',
                    boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)'
                  }}
                >
                  <div
                    style={{ width: '30px', height: '30px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0 }}
                    dangerouslySetInnerHTML={{ __html: branding.logoSvg }}
                    title={`${tenant?.name || 'Kavach Campus'} Official Emblem`}
                  />
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#fff', lineHeight: 1.2, maxWidth: isMobile ? '120px' : '220px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {tenant?.shortName || (role === 'MANAGEMENT' ? 'Management' : 'Kavach Campus')}
                    </div>
                  </div>
                </div>
              )}

              {/* Notification Button */}
              <Link
                href={role === 'STUDENT' ? '/student/cases' : role === 'STAFF' ? '/staff/incidents' : role === 'MANAGEMENT' ? '/management/incidents' : '/admin/incidents'}
                title="View Incident Alerts"
                aria-label="View Incident Alerts"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  padding: '7px',
                  borderRadius: '50%',
                  color: 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textDecoration: 'none'
                }}
              >
                <Bell size={17} />
              </Link>

              {/* Profile Avatar */}
              <Link href={role === 'STUDENT' ? '/student/profile' : role === 'STAFF' ? '/staff' : role === 'MANAGEMENT' ? '/management' : '/admin/users'} title="View authorized profile area">
                <div style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '50%',
                  overflow: 'hidden',
                  background: 'linear-gradient(135deg, #7c3aed 0%, #3b82f6 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  border: '2px solid rgba(255,255,255,0.2)'
                }}>
                  {avatarPhoto ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={avatarPhoto} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <User size={16} />
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

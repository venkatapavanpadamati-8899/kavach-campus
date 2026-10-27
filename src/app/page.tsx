"use client";
import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import styles from './page.module.css';
import { InteractiveSafetyCharacter } from '@/components/animations/InteractiveSafetyCharacter';
import { 
  Shield, 
  Phone, 
  MessageSquare, 
  Users, 
  MapPin, 
  Lock, 
  ShieldCheck, 
  UserPlus, 
  LogIn, 
  ArrowRight, 
  GraduationCap, 
  Building2, 
  User,
  Eye,
  Navigation,
  Sparkles,
  Radio,
  UserCheck
} from 'lucide-react';

export default function LandingPage() {
  const roles = [
    {
      title: "Students",
      desc: "Report incidents, activate SOS in one tap, safe walk monitoring, and track case progress in total privacy.",
      href: "/student",
      cta: "Student Portal",
      badge: "Free & Confidential"
    },
    {
      title: "Campus Staff",
      desc: "Acknowledge assigned cases, review evidence, respond to location alerts, and update case resolution timelines.",
      href: "/staff",
      cta: "Staff Portal",
      badge: "Incident Management"
    },
    {
      title: "Campus Administration",
      desc: "Operational oversight, student ID verifications, departmental routing, safety analytics, and audit log tracking.",
      href: "/admin",
      cta: "Admin Console",
      badge: "Campus Oversight"
    },
    {
      title: "Super Admin",
      desc: "System configuration, role privilege enforcement, institutional security policies, and compliance management.",
      href: "/super-admin/login",
      cta: "Executive Login",
      badge: "System Authority"
    }
  ];

  const features = [
    { 
      icon: <Shield size={26} color="#3b82f6" />, 
      title: "Instant SOS Broadcast", 
      desc: "One-tap emergency alert that instantly pins your GPS location and notifies active campus safety officers and trusted contacts." 
    },
    { 
      icon: <Navigation size={26} color="#8b5cf6" />, 
      title: "Safe Walk Companion", 
      desc: "Activate a monitored route timer when walking across campus at night. Automated alert triggers if you don't arrive safely." 
    },
    { 
      icon: <Eye size={26} color="#10b981" />, 
      title: "Harassment & Incident Report", 
      desc: "Confidential, tamper-proof reporting with evidence attachments, real-time status tracking, and strict student-to-student privacy." 
    },
    { 
      icon: <Sparkles size={26} color="#f59e0b" />, 
      title: "Dual-Layer Safety AI", 
      desc: "Instant multi-lingual urgency classification (English, Telugu, Hindi) ensuring life threats escalate immediately to senior officials." 
    },
    { 
      icon: <Radio size={26} color="#3b82f6" />, 
      title: "Live GPS & Campus Zones", 
      desc: "Precise latitude and longitude bounds validation with zero coordinate fabrication. Stored securely and only during active alerts." 
    },
    { 
      icon: <UserCheck size={26} color="#8b5cf6" />, 
      title: "Verified Student Profiles", 
      desc: "Secure ID card upload, authorized reviewer approvals, and cryptographic session protection backed by Supabase Row-Level Security." 
    },
  ];

  return (
    <div className={styles.container}>
      {/* Top Navbar matching Image 1 */}
      <nav className={styles.nav}>
        <Link href="/" className={styles.brand}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.25) 0%, rgba(37, 99, 235, 0.25) 100%)',
            border: '1.5px solid rgba(34, 211, 238, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 15px rgba(34, 211, 238, 0.35)'
          }}>
            <Shield size={22} color="#22d3ee" />
          </div>
          <div>
            <span className={styles.brandText}>
              Kavach<span className={styles.brandHighlight}>Campus</span>
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <div className={styles.navLinks}>
          <Link href="/" className={`${styles.navLink} ${styles.navLinkActive}`}>
            Home
          </Link>
          <a href="#safety-features" className={styles.navLink}>
            Safety Features
          </a>
          <a href="#how-it-works" className={styles.navLink}>
            How It Works
          </a>
          <Link href="/contact" className={styles.navLink}>
            Contact
          </Link>
        </div>

        {/* Right CTA / Sign In */}
        <div className={styles.navActions}>
          <Link href="/login" className={styles.signInBtn}>
            <User size={16} />
            <span>Sign In</span>
          </Link>
        </div>
      </nav>

      {/* Hero Section matching Image 1 */}
      <header className={styles.hero}>
        <div className={styles.heroContentWrapper}>
          {/* Left Column: Hero Copy & CTA */}
          <motion.div 
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className={styles.heroLeft}
          >
            {/* Pill Badge */}
            <div className={styles.heroBadge}>
              <Shield size={14} color="#38bdf8" />
              <span>A Safer Campus for a Brighter Tomorrow</span>
            </div>

            {/* Main Headline */}
            <h1 className={styles.heroTitle}>
              Your Campus.<br />
              Your Safety.<br />
              <span className={styles.heroTitleCyan}>One Tap Away.</span>
            </h1>

            {/* Subtitle */}
            <p className={styles.heroSubtitle}>
              Report concerns, request emergency help, and stay connected to your campus safety team. Multi-College institutional protection built for modern campuses.
            </p>

            {/* Main Pill Buttons matching Image 1 & Image 2 reference */}
            <div className={styles.heroActions}>
              <Link href="/register" className={styles.btnRegisterPill}>
                <UserPlus size={18} />
                <span>Create Student Account</span>
                <ArrowRight size={18} />
              </Link>

              <Link href="/login" className={styles.btnLoginPill}>
                <LogIn size={18} />
                <span>Student Login</span>
                <ArrowRight size={18} />
              </Link>
            </div>

            {/* Micro Trust Row */}
            <div className={styles.heroTrustRow}>
              <div className={styles.trustItem}>
                <Users size={16} color="#38bdf8" />
                <span>Safe Campus Community</span>
              </div>
              <div className={styles.trustItem}>
                <ShieldCheck size={16} color="#38bdf8" />
                <span>Quick Emergency Support</span>
              </div>
              <div className={styles.trustItem}>
                <Lock size={16} color="#38bdf8" />
                <span>Confidential &amp; Secure</span>
              </div>
            </div>
          </motion.div>

          {/* Right Column: Glowing Holographic Shield Graphic matching Image 1 */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className={styles.heroRight}
          >
            <div className={styles.hologramWrapper}>
              {/* Radial Cyan Glow */}
              <div className={styles.hologramGlow} />

              {/* Orbiting Ring SVGs */}
              <svg 
                width="360" 
                height="360" 
                viewBox="0 0 360 360" 
                style={{ position: 'absolute', top: 20, left: 20, pointerEvents: 'none' }}
              >
                <circle 
                  cx="180" 
                  cy="180" 
                  r="160" 
                  fill="none" 
                  stroke="rgba(34, 211, 238, 0.25)" 
                  strokeWidth="1.5" 
                  strokeDasharray="6 6" 
                />
                <circle 
                  cx="180" 
                  cy="180" 
                  r="135" 
                  fill="none" 
                  stroke="rgba(56, 189, 248, 0.35)" 
                  strokeWidth="2" 
                />
              </svg>

              {/* Interactive 3D Campus Safety Mascot Avatar */}
              <div style={{ position: 'relative', zIndex: 6, marginBottom: '-20px' }}>
                <InteractiveSafetyCharacter />
              </div>

              {/* Central Glowing Shield with University Silhouette */}
              <div className={styles.hologramShield}>
                <svg width="200" height="230" viewBox="0 0 200 230" fill="none">
                  <path 
                    d="M100 8L180 40V110C180 165 145 205 100 222C55 205 20 165 20 110V40L100 8Z" 
                    fill="rgba(8, 145, 178, 0.2)" 
                    stroke="#22d3ee" 
                    strokeWidth="3.5"
                  />
                  <path 
                    d="M100 24L165 52V110C165 154 137 188 100 203C63 188 35 154 35 110V52L100 24Z" 
                    fill="rgba(14, 116, 144, 0.35)" 
                    stroke="rgba(34, 211, 238, 0.6)" 
                    strokeWidth="1.5"
                  />
                  {/* Classical Campus Building Silhouette */}
                  <g transform="translate(62, 70)" fill="#e0f2fe">
                    {/* Roof & Pediment */}
                    <polygon points="38,0 0,22 76,22" fill="#38bdf8" />
                    {/* Clock tower / dome */}
                    <rect x="33" y="-12" width="10" height="12" fill="#7dd3fc" />
                    <polygon points="38,-20 31,-12 45,-12" fill="#bae6fd" />
                    {/* Archway base */}
                    <rect x="6" y="24" width="64" height="38" rx="2" fill="rgba(224, 242, 254, 0.95)" />
                    {/* Pillars */}
                    <rect x="12" y="28" width="6" height="30" fill="#0284c7" />
                    <rect x="26" y="28" width="6" height="30" fill="#0284c7" />
                    <rect x="44" y="28" width="6" height="30" fill="#0284c7" />
                    <rect x="58" y="28" width="6" height="30" fill="#0284c7" />
                    {/* Door */}
                    <path d="M33 46 A 5 5 0 0 1 43 46 V 62 H 33 Z" fill="#0369a1" />
                  </g>
                </svg>
              </div>

              {/* 4 Connected Floating Node Badges */}
              <div className={`${styles.nodeBadge} ${styles.nodeRed}`} title="Instant One-Tap SOS">
                <Phone size={22} />
              </div>

              <div className={`${styles.nodeBadge} ${styles.nodeCyan}`} title="Confidential Incident Reporting">
                <MessageSquare size={20} />
              </div>

              <div className={`${styles.nodeBadge} ${styles.nodeNavy}`} title="Active Campus Safety Team">
                <Users size={20} />
              </div>

              <div className={`${styles.nodeBadge} ${styles.nodeBlue}`} title="Live GPS Zones & Safe Walk">
                <MapPin size={20} />
              </div>

              {/* Vertical Side Banner */}
              <div className={styles.sideBanner}>
                <GraduationCap size={16} color="#38bdf8" />
                <span className={styles.sideBannerText}>Safe Campus Stronger Community</span>
              </div>
            </div>
          </motion.div>
        </div>
      </header>

      {/* Feature Highlights Deck & Trust Bar matching Image 1 */}
      <section className={styles.featureDeckSection} id="safety-features">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className={styles.featureDeckCard}
        >
          {/* 3 Prominent Cards */}
          <div className={styles.featureCardsRow}>
            {/* Card 1: One-Tap SOS */}
            <Link href="/student/sos" className={`${styles.featureCard} ${styles.cardRed}`}>
              <div>
                <div className={`${styles.cardIconBox} ${styles.iconRed}`}>
                  <span style={{ fontSize: '0.9rem', letterSpacing: '0.5px' }}>SOS</span>
                </div>
                <h3 className={styles.cardTitle}>One-Tap SOS</h3>
                <p className={styles.cardDesc}>
                  Get immediate help in emergency situations with a single tap. Verified GPS broadcast to nearest campus security.
                </p>
              </div>
              <span className={`${styles.cardLink} ${styles.linkRed}`}>
                Know More <ArrowRight size={16} />
              </span>
            </Link>

            {/* Card 2: Confidential Reporting */}
            <Link href="/student/report" className={`${styles.featureCard} ${styles.cardGreen}`}>
              <div>
                <div className={`${styles.cardIconBox} ${styles.iconGreen}`}>
                  <MessageSquare size={24} />
                </div>
                <h3 className={styles.cardTitle}>Confidential Reporting</h3>
                <p className={styles.cardDesc}>
                  Report safety concerns, harassment or any issues confidentially. Strict encryption and student privacy isolation.
                </p>
              </div>
              <span className={`${styles.cardLink} ${styles.linkGreen}`}>
                Know More <ArrowRight size={16} />
              </span>
            </Link>

            {/* Card 3: Live Safety Support */}
            <Link href="/staff" className={`${styles.featureCard} ${styles.cardBlue}`}>
              <div>
                <div className={`${styles.cardIconBox} ${styles.iconBlue}`}>
                  <Users size={24} />
                </div>
                <h3 className={styles.cardTitle}>Live Safety Support</h3>
                <p className={styles.cardDesc}>
                  Stay connected with your campus safety and support team. Seamless escalation to mentors, HODs, and wardens.
                </p>
              </div>
              <span className={`${styles.cardLink} ${styles.linkBlue}`}>
                Know More <ArrowRight size={16} />
              </span>
            </Link>
          </div>

          {/* Trust Highlights Bar below the 3 cards */}
          <div className={styles.trustBar}>
            <div className={styles.trustCol}>
              <Shield className={styles.trustColIcon} size={28} />
              <div>
                <div className={styles.trustColTitle}>24/7</div>
                <div className={styles.trustColSub}>Safety Support</div>
              </div>
            </div>

            <div className={styles.trustCol}>
              <Users className={styles.trustColIcon} size={28} />
              <div>
                <div className={styles.trustColTitle}>Safer</div>
                <div className={styles.trustColSub}>Campus Community</div>
              </div>
            </div>

            <div className={styles.trustCol}>
              <GraduationCap className={styles.trustColIcon} size={28} />
              <div>
                <div className={styles.trustColTitle}>Student</div>
                <div className={styles.trustColSub}>Focused Platform</div>
              </div>
            </div>

            <div className={styles.trustCol}>
              <Building2 className={styles.trustColIcon} size={28} />
              <div>
                <div className={styles.trustColTitle}>Multiple</div>
                <div className={styles.trustColSub}>Institutions Connected</div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Tailored Institutional Portals */}
      <section className={styles.portalsSection} id="how-it-works">
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Tailored Institutional Portals</h2>
          <p className={styles.sectionSub}>
            Every campus stakeholder accesses a dedicated, role-authorized workspace designed strictly for their safety responsibilities.
          </p>
        </div>

        <div className={styles.portalsGrid}>
          {roles.map((role, idx) => (
            <motion.div 
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.08 }}
              viewport={{ once: true }}
              className={styles.portalCard}
            >
              <div>
                <span className={styles.portalBadge}>{role.badge}</span>
                <h3 className={styles.portalTitle}>{role.title}</h3>
                <p className={styles.portalDesc}>{role.desc}</p>
              </div>
              <Link href={role.href} className={styles.portalLink}>
                <span>Enter {role.cta}</span>
                <ArrowRight size={16} />
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Comprehensive Security Capabilities */}
      <section style={{ padding: '80px 24px', background: '#060913', borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
        <div style={{ maxWidth: '1240px', margin: '0 auto' }}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Comprehensive Security Capabilities</h2>
            <p className={styles.sectionSub}>
              Engineered with zero compromises on student privacy, cryptographic data integrity, and rapid emergency dispatch.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
            {features.map((f, i) => (
              <motion.div 
                key={i} 
                initial={{ opacity: 0, y: 20 }} 
                whileInView={{ opacity: 1, y: 0 }} 
                transition={{ delay: i * 0.06 }} 
                viewport={{ once: true }} 
                style={{ 
                  padding: '30px',
                  borderRadius: '16px',
                  background: 'rgba(15, 23, 42, 0.55)',
                  border: '1px solid rgba(255, 255, 255, 0.07)',
                  backdropFilter: 'blur(10px)'
                }}
              >
                <div style={{ 
                  background: 'rgba(255, 255, 255, 0.06)', 
                  padding: '12px', 
                  borderRadius: '12px', 
                  display: 'inline-flex', 
                  marginBottom: '18px',
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                  {f.icon}
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '8px', color: '#fff' }}>{f.title}</h3>
                <p style={{ color: '#94a3b8', lineHeight: 1.6, fontSize: '0.94rem', margin: 0 }}>{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer matching Image 1 */}
      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <div className={styles.footerBrand}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'rgba(34, 211, 238, 0.2)',
              border: '1px solid rgba(34, 211, 238, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Shield size={18} color="#22d3ee" />
            </div>
            <span style={{ color: '#ffffff', fontWeight: 700, fontSize: '1.1rem' }}>
              Kavach<span style={{ color: '#22d3ee' }}>Campus</span>
            </span>
            <span style={{ fontSize: '0.88rem', color: '#64748b', marginLeft: '8px' }}>
              Safety in One Tap.
            </span>
          </div>

          <div className={styles.footerLinks}>
            <Link href="/privacy" className={styles.footerLink}>Privacy</Link>
            <Link href="/contact" className={styles.footerLink}>Help</Link>
            <Link href="/student/sos" className={styles.footerLink}>Emergency Resources</Link>
            <span style={{ fontSize: '0.82rem', color: '#475569' }}>
              Multi-College Institutional Safety Platform
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}

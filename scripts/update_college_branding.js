const fs = require('fs');
let content = fs.readFileSync('src/lib/college-branding.ts', 'utf-8');

const oldPageKey = `export type PageKey =
  | 'login'
  | 'register'
  | 'verify_otp'
  | 'student_dashboard'
  | 'identity_verification'
  | 'file_report'
  | 'voice_report'
  | 'sos'
  | 'safe_walk'
  | 'my_cases'
  | 'trusted_contacts'
  | 'settings'
  | 'staff_dashboard'
  | 'admin_dashboard'
  | 'management_dashboard';`;

const newPageKey = `export type PageKey =
  | 'login'
  | 'register'
  | 'verify_otp'
  | 'student_dashboard'
  | 'identity_verification'
  | 'file_report'
  | 'voice_report'
  | 'safe_box'
  | 'student_profile'
  | 'sos'
  | 'safe_walk'
  | 'my_cases'
  | 'trusted_contacts'
  | 'settings'
  | 'staff_dashboard'
  | 'admin_dashboard'
  | 'management_dashboard'
  | 'super_admin'
  | 'landing'
  | 'about'
  | 'features'
  | 'contact'
  | 'privacy';`;

content = content.replace(/\r\n/g, '\n');
content = content.replace(oldPageKey, newPageKey);

// Add missing keys to SRKR_BACKGROUNDS
const srkrAdd = `  safe_box: {
    imageUrl: '/images/desktop_hero_banner.jpg',
    overlay: 'linear-gradient(180deg, rgba(15, 23, 42, 0.55) 0%, rgba(10, 15, 30, 0.85) 100%)',
    caption: 'SRKR Confidential Vault & Encrypted Student Locker'
  },
  student_profile: {
    imageUrl: '/images/auth_campus_bg.jpg',
    overlay: 'linear-gradient(180deg, rgba(20, 20, 35, 0.45) 0%, rgba(10, 15, 30, 0.70) 100%)',
    caption: 'SRKR Student Identity & Verified Credentials'
  },
  super_admin: {
    imageUrl: '/images/staff_admin_bg.jpg',
    overlay: 'linear-gradient(180deg, rgba(15, 23, 42, 0.50) 0%, rgba(8, 12, 24, 0.80) 100%)',
    caption: 'Kavach Campus Multi-Institutional Command Infrastructure'
  },
  landing: {
    imageUrl: '/images/campus_hero_bg.jpg',
    overlay: 'linear-gradient(180deg, rgba(10, 15, 30, 0.40) 0%, rgba(8, 13, 26, 0.85) 100%)',
    caption: 'SRKR Engineering College — Campus Gateway'
  },
  about: {
    imageUrl: '/images/desktop_hero_banner.jpg',
    overlay: 'linear-gradient(180deg, rgba(10, 15, 30, 0.45) 0%, rgba(8, 13, 26, 0.85) 100%)',
    caption: 'SRKR Engineering Excellence & Student Dignity Network'
  },
  features: {
    imageUrl: '/images/campus_hero_bg.jpg',
    overlay: 'linear-gradient(180deg, rgba(10, 15, 30, 0.45) 0%, rgba(8, 13, 26, 0.85) 100%)',
    caption: 'SRKR Smart Campus Security & Rapid Telemetry Suite'
  },
  contact: {
    imageUrl: '/images/auth_campus_bg.jpg',
    overlay: 'linear-gradient(180deg, rgba(10, 15, 30, 0.45) 0%, rgba(8, 13, 26, 0.85) 100%)',
    caption: 'SRKR Emergency Helpdesk & Campus Dispatch Desk'
  },
  privacy: {
    imageUrl: '/images/desktop_hero_banner.jpg',
    overlay: 'linear-gradient(180deg, rgba(10, 15, 30, 0.55) 0%, rgba(8, 13, 26, 0.90) 100%)',
    caption: 'SRKR Institutional Privacy & Data Protection Standard'
  },
  management_dashboard:`;

content = content.replace('  management_dashboard:', srkrAdd);

// Add missing keys to VISHNU_BACKGROUNDS
const vishnuAdd = `  safe_box: {
    imageUrl: '/images/desktop_hero_banner.jpg',
    overlay: 'linear-gradient(180deg, rgba(15, 23, 42, 0.55) 0%, rgba(4, 20, 13, 0.85) 100%)',
    caption: 'Vishnu Encrypted Student Safe Box & Document Vault'
  },
  student_profile: {
    imageUrl: '/images/auth_campus_bg.jpg',
    overlay: 'linear-gradient(180deg, rgba(20, 20, 35, 0.45) 0%, rgba(4, 20, 13, 0.70) 100%)',
    caption: 'Vishnu Student Credentials & Profile Verification'
  },
  super_admin: {
    imageUrl: '/images/staff_admin_bg.jpg',
    overlay: 'linear-gradient(180deg, rgba(15, 23, 42, 0.50) 0%, rgba(8, 12, 24, 0.80) 100%)',
    caption: 'Kavach Campus Multi-Institutional Command Infrastructure'
  },
  landing: {
    imageUrl: '/images/campus_hero_bg.jpg',
    overlay: 'linear-gradient(180deg, rgba(10, 15, 30, 0.40) 0%, rgba(4, 20, 13, 0.85) 100%)',
    caption: 'Vishnu Institute of Technology — Main Gateway'
  },
  about: {
    imageUrl: '/images/desktop_hero_banner.jpg',
    overlay: 'linear-gradient(180deg, rgba(10, 15, 30, 0.45) 0%, rgba(4, 20, 13, 0.85) 100%)',
    caption: 'Vishnu Institute of Technology — Academic Excellence'
  },
  features: {
    imageUrl: '/images/campus_hero_bg.jpg',
    overlay: 'linear-gradient(180deg, rgba(10, 15, 30, 0.45) 0%, rgba(4, 20, 13, 0.85) 100%)',
    caption: 'Vishnu Safety Systems & Real-Time Incident Response'
  },
  contact: {
    imageUrl: '/images/auth_campus_bg.jpg',
    overlay: 'linear-gradient(180deg, rgba(10, 15, 30, 0.45) 0%, rgba(4, 20, 13, 0.85) 100%)',
    caption: 'Vishnu Security Office & Student Assistance'
  },
  privacy: {
    imageUrl: '/images/desktop_hero_banner.jpg',
    overlay: 'linear-gradient(180deg, rgba(10, 15, 30, 0.55) 0%, rgba(4, 20, 13, 0.90) 100%)',
    caption: 'Vishnu Student Privacy Charter & Security Guardrails'
  },
  management_dashboard:`;

const firstIdx = content.indexOf('management_dashboard:');
const secondIdx = content.indexOf('management_dashboard:', firstIdx + 1);
content = content.slice(0, secondIdx) + vishnuAdd + content.slice(secondIdx + 'management_dashboard:'.length);

// Add missing keys to DEFAULT_FALLBACK_BACKGROUNDS
const defaultAdd = `  safe_box: {
    imageUrl: '/images/desktop_hero_banner.jpg',
    overlay: 'linear-gradient(180deg, rgba(15, 23, 42, 0.55) 0%, rgba(10, 15, 30, 0.85) 100%)',
    caption: 'Confidential Safe Box & Encrypted Evidence Vault'
  },
  student_profile: {
    imageUrl: '/images/auth_campus_bg.jpg',
    overlay: 'linear-gradient(180deg, rgba(17, 24, 39, 0.45) 0%, rgba(10, 15, 30, 0.70) 100%)',
    caption: 'Student Profile & Campus Accreditation'
  },
  super_admin: {
    imageUrl: '/images/staff_admin_bg.jpg',
    overlay: 'linear-gradient(180deg, rgba(15, 23, 42, 0.50) 0%, rgba(8, 12, 24, 0.80) 100%)',
    caption: 'Kavach Campus Multi-Campus System Governance'
  },
  landing: {
    imageUrl: '/images/campus_hero_bg.jpg',
    overlay: 'linear-gradient(180deg, rgba(10, 15, 30, 0.40) 0%, rgba(8, 13, 26, 0.85) 100%)',
    caption: 'Kavach Campus — Smart Student Safety Platform'
  },
  about: {
    imageUrl: '/images/desktop_hero_banner.jpg',
    overlay: 'linear-gradient(180deg, rgba(10, 15, 30, 0.45) 0%, rgba(8, 13, 26, 0.85) 100%)',
    caption: 'About Kavach Campus Safety Network'
  },
  features: {
    imageUrl: '/images/campus_hero_bg.jpg',
    overlay: 'linear-gradient(180deg, rgba(10, 15, 30, 0.45) 0%, rgba(8, 13, 26, 0.85) 100%)',
    caption: 'Kavach Campus Advanced Safety Capabilities'
  },
  contact: {
    imageUrl: '/images/auth_campus_bg.jpg',
    overlay: 'linear-gradient(180deg, rgba(10, 15, 30, 0.45) 0%, rgba(8, 13, 26, 0.85) 100%)',
    caption: 'Campus Helpdesk & Technical Support'
  },
  privacy: {
    imageUrl: '/images/desktop_hero_banner.jpg',
    overlay: 'linear-gradient(180deg, rgba(10, 15, 30, 0.55) 0%, rgba(8, 13, 26, 0.90) 100%)',
    caption: 'Kavach Campus Privacy & Security Policy'
  },
  management_dashboard:`;

const thirdIdx = content.indexOf('management_dashboard:', secondIdx + vishnuAdd.length);
content = content.slice(0, thirdIdx) + defaultAdd + content.slice(thirdIdx + 'management_dashboard:'.length);

fs.writeFileSync('src/lib/college-branding.ts', content, 'utf-8');
console.log('Successfully updated src/lib/college-branding.ts');


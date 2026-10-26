"use client";
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, 
  ShieldAlert, 
  FileText, 
  CheckCircle, 
  Phone, 
  Building2, 
  Droplet, 
  Users, 
  MessageSquare, 
  Bell, 
  X, 
  Loader2, 
  ChevronRight,
  AlertTriangle,
  Mic,
  MapPin,
  Settings,
  ShieldCheck,
  CreditCard,
  ArrowRight
} from 'lucide-react';
import Link from 'next/link';
import { getCollegeById, CollegeTenant } from '@/lib/colleges';
import { getUnassignedCollegeTenant } from '@/lib/college-branding';

interface BloodDonor {
  id: string;
  name: string;
  bloodGroup: string;
  department: string;
  year: string;
  hostelBlock: string;
  contactPhone: string | null;
  isVerified: boolean;
}

export default function StudentDashboard() {
  const [activeTenant, setActiveTenant] = useState<CollegeTenant>(getUnassignedCollegeTenant);
  const [verificationStatus, setVerificationStatus] = useState<string>('PENDING_UPLOAD');
  const [studentId, setStudentId] = useState<string>('');
  const [accommodationStatus, setAccommodationStatus] = useState<string | null>(null);

  // Blood Group Finder Modal state
  const [showBloodModal, setShowBloodModal] = useState(false);
  const [selectedBloodGroup, setSelectedBloodGroup] = useState('O+');
  const [searchingBlood, setSearchingBlood] = useState(false);
  const [donors, setDonors] = useState<BloodDonor[]>([]);
  const [searchedGroup, setSearchedGroup] = useState<string | null>(null);

  // Suggestion Modal state
  const [showSuggestionModal, setShowSuggestionModal] = useState(false);
  const [suggestionText, setSuggestionText] = useState('');
  const [suggestionSubmitted, setSuggestionSubmitted] = useState(false);

  useEffect(() => {
    // Fetch profile and ID verification status
    fetch('/api/student/verify-id')
      .then(res => res.json())
      .then(data => {
        if (data.studentProfile?.verification_status) {
          setVerificationStatus(data.studentProfile.verification_status);
        }
        if (data.profile?.student_id) {
          setStudentId(data.profile.student_id);
        }
        if (
          data.studentProfile?.verification_status === 'VERIFIED' &&
          data.profile?.college_id &&
          data.profile.college_id !== 'PENDING_CAMPUS_VERIFICATION'
        ) {
          const matched = getCollegeById(data.profile.college_id);
          if (matched) {
            setActiveTenant(matched);
          }
        }
      })
      .catch(() => {});

    // Fetch accommodation status
    fetch('/api/student/profile')
      .then(res => res.json())
      .then(pData => {
        if (pData?.success) {
          const rawType = pData.residence?.residence_type 
            || (pData.studentProfile?.hostel_room?.toLowerCase().includes('day scholar') 
              ? 'DAY_SCHOLAR' 
              : (pData.studentProfile?.hostel_room?.toLowerCase().includes('pg') ? 'PRIVATE_HOSTEL' : (pData.studentProfile?.hostel_room ? 'COLLEGE_HOSTEL' : null)));
          setAccommodationStatus(rawType);
        }
      })
      .catch(() => {});
  }, []);

  const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

  const handleSearchBlood = async (group: string) => {
    setSelectedBloodGroup(group);
    setSearchingBlood(true);
    setSearchedGroup(group);
    try {
      const res = await fetch(`/api/student/blood-search?bloodGroup=${encodeURIComponent(group)}`);
      const data = await res.json();
      setDonors(data.donors || []);
    } catch {
      setDonors([]);
    } finally {
      setSearchingBlood(false);
    }
  };

  const emergencyStations = [
    { 
      name: `${activeTenant.city} Police Station`, 
      phone: activeTenant.emergencyHelpline, 
      location: 'City Jurisdiction & Emergency Desk' 
    },
    { 
      name: `${activeTenant.shortName} Security Control Room`, 
      phone: activeTenant.securityControlRoom, 
      location: 'Administrative Block & Quick Response Wing' 
    },
    { 
      name: `${activeTenant.shortName} Women's Safety Cell`, 
      phone: activeTenant.womensCellHelpline, 
      location: 'Specialized Internal Grievance Desk' 
    },
    { 
      name: 'Campus Health Clinic & First Aid', 
      phone: activeTenant.ambulanceContact, 
      location: 'Student Health & Medical Center' 
    },
  ];

  const campusEvents = [
    {
      title: 'Anti-Ragging & Campus Safety Briefing',
      description: `Mandatory session by ${activeTenant.shortName} Proctorial Board on safety standards and reporting channels.`,
      time: 'Today • 2:00 PM - 4:00 PM',
      tag: 'SAFETY'
    },
    {
      title: 'Annual Technology Symposium & Project Expo',
      description: 'Showcasing innovations, robotics, and safety solutions at the Central Auditorium.',
      time: 'Friday • 10:00 AM',
      tag: 'TECH EXPO'
    }
  ];

  const isVerified = verificationStatus === 'VERIFIED';

  return (
    <div style={{ maxWidth: '1050px', margin: '0 auto', padding: '8px 4px' }}>
      
      {/* 1. Prominent Dynamic College Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          textAlign: 'center',
          marginBottom: '28px',
          padding: '24px 20px',
          borderRadius: '20px',
          background: 'rgba(15, 23, 42, 0.75)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(12px)'
        }}
      >
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 16px',
          borderRadius: '20px',
          background: 'linear-gradient(90deg, rgba(124, 58, 237, 0.2) 0%, rgba(59, 130, 246, 0.2) 100%)',
          border: '1px solid rgba(124, 58, 237, 0.35)',
          marginBottom: '12px',
          fontSize: '0.82rem',
          fontWeight: 700,
          color: '#c084fc',
          textTransform: 'uppercase',
          letterSpacing: '0.08em'
        }}>
          <ShieldCheck size={16} /> Verified Campus Safety Tenant
        </div>

        {/* Dynamic Main Heading */}
        <h1 style={{ 
          fontSize: '2.5rem', 
          fontWeight: 800, 
          margin: '0 0 8px 0', 
          letterSpacing: '-0.02em',
          background: 'linear-gradient(135deg, #ffffff 0%, #93c5fd 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          lineHeight: 1.2
        }}>
          {activeTenant.name.toUpperCase()}
        </h1>

        <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', margin: '0 0 16px 0', maxWidth: '720px', marginInline: 'auto' }}>
          Student Safety, Incident Response &amp; Emergency Telemetry Network &bull; {activeTenant.city}, {activeTenant.state} (PIN: {activeTenant.pincode})
        </p>

        {/* Student Verification Status Bar */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          padding: '10px 20px',
          borderRadius: '12px',
          background: isVerified ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)',
          border: `1px solid ${isVerified ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
          flexWrap: 'wrap'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <CheckCircle size={18} color={isVerified ? 'var(--accent-green)' : '#f59e0b'} />
            <span style={{ fontSize: '0.9rem', color: '#fff' }}>
              Student Identity Verification: <strong style={{ color: isVerified ? 'var(--accent-green)' : '#f59e0b' }}>{isVerified ? 'Approved & Active' : 'Pending Upload'}</strong>
              {studentId && <span style={{ marginLeft: '8px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>({studentId})</span>}
              {accommodationStatus && (
                <span style={{ marginLeft: '10px', padding: '2px 8px', borderRadius: '6px', background: 'rgba(124, 58, 237, 0.25)', fontSize: '0.78rem', color: '#c4b5fd' }}>
                  {accommodationStatus === 'COLLEGE_HOSTEL' ? '🏠 College Hostel' : (accommodationStatus === 'PRIVATE_HOSTEL' ? '🏢 Private PG' : '🚲 Day Scholar')}
                </span>
              )}
            </span>
          </div>
          <Link href="/student/verification-status" style={{ fontSize: '0.85rem', color: 'var(--accent-blue)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
            {isVerified ? 'View Credentials' : 'Verify Student ID'} <ArrowRight size={14} />
          </Link>
        </div>

        {/* Accommodation Status Bar */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          padding: '10px 20px',
          borderRadius: '12px',
          background: accommodationStatus ? 'rgba(59, 130, 246, 0.12)' : 'rgba(245, 158, 11, 0.12)',
          border: `1px solid ${accommodationStatus ? 'rgba(59, 130, 246, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
          flexWrap: 'wrap',
          marginTop: '10px'
        }} data-testid="accommodation-status-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Shield size={18} color={accommodationStatus ? 'var(--accent-blue)' : '#f59e0b'} />
            <span style={{ fontSize: '0.9rem', color: '#fff' }}>
              Accommodation Status: <strong style={{ color: accommodationStatus ? 'var(--accent-blue)' : '#f59e0b' }}>
                {accommodationStatus === 'COLLEGE_HOSTEL' ? 'College Hostel Resident' :
                 accommodationStatus === 'PRIVATE_HOSTEL' ? 'Private Hostel / PG' :
                 accommodationStatus === 'DAY_SCHOLAR' ? 'Day Scholar' : 'Pending Selection'}
              </strong>
            </span>
          </div>
          <Link href="/student/profile" style={{ fontSize: '0.85rem', color: 'var(--accent-blue)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
            {accommodationStatus ? 'Update Status' : 'Select Accommodation'} <ArrowRight size={14} />
          </Link>
        </div>
      </motion.div>

      {/* 2. Top Emergency Banner: SafeAlert */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          background: 'linear-gradient(135deg, #065f46 0%, #047857 100%)',
          borderRadius: '20px',
          padding: '24px 28px',
          marginBottom: '28px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '20px',
          boxShadow: '0 10px 30px rgba(6, 95, 70, 0.25)',
          color: 'white'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ 
            background: 'rgba(255, 255, 255, 0.2)', 
            padding: '16px', 
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Bell size={32} color="#fbbf24" />
          </div>
          <div>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 700, margin: '0 0 6px 0' }}>
              Send a SafeAlert to {activeTenant.shortName}?
            </h2>
            <p style={{ margin: 0, opacity: 0.9, fontSize: '0.95rem', maxWidth: '480px' }}>
              Instant campus security dispatch, GPS telemetry acquisition, and automated trusted contact notifications.
            </p>
          </div>
        </div>

        <Link href="/student/sos" style={{ textDecoration: 'none' }}>
          <motion.button 
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.98 }}
            style={{
              background: '#fbbf24',
              color: '#0f172a',
              border: 'none',
              padding: '14px 28px',
              borderRadius: '12px',
              fontWeight: 700,
              fontSize: '1.05rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              boxShadow: '0 4px 12px rgba(251, 191, 36, 0.35)'
            }}
          >
            <ShieldAlert size={20} /> Trigger SafeAlert
          </motion.button>
        </Link>
      </motion.div>

      {/* 3. Essential Quick Actions Grid: 8 Functional Navigation Buttons */}
      <div style={{ marginBottom: '32px' }}>
        <h3 style={{ fontSize: '1.35rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Shield size={20} color="var(--accent-purple)" /> Safety Services &amp; Navigation
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '16px' }}>
          {/* Button 1: SOS Emergency */}
          <Link href="/student/sos" style={{ textDecoration: 'none' }}>
            <div 
              className="glass-panel" 
              style={{ 
                padding: '20px', 
                borderRadius: '16px', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '14px',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.12) 0%, rgba(15, 23, 42, 0.6) 100%)',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              <div style={{ padding: '12px', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.2)', color: 'var(--accent-red)' }}>
                <ShieldAlert size={24} />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#fff' }}>SOS Emergency</h4>
                <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)' }}>Live GPS dispatch</span>
              </div>
            </div>
          </Link>

          {/* Button 2: File Report */}
          <Link href="/student/report" style={{ textDecoration: 'none' }}>
            <div 
              className="glass-panel" 
              style={{ 
                padding: '20px', 
                borderRadius: '16px', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '14px',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.12) 0%, rgba(15, 23, 42, 0.6) 100%)',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              <div style={{ padding: '12px', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.2)', color: 'var(--accent-blue)' }}>
                <FileText size={24} />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#fff' }}>File Incident Report</h4>
                <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)' }}>Photo &amp; video logging</span>
              </div>
            </div>
          </Link>

          {/* Button 3: Voice Report */}
          <Link href="/student/voice-report" style={{ textDecoration: 'none' }}>
            <div 
              className="glass-panel" 
              style={{ 
                padding: '20px', 
                borderRadius: '16px', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '14px',
                border: '1px solid rgba(139, 92, 246, 0.3)',
                background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.12) 0%, rgba(15, 23, 42, 0.6) 100%)',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              <div style={{ padding: '12px', borderRadius: '12px', background: 'rgba(139, 92, 246, 0.2)', color: 'var(--accent-purple)' }}>
                <Mic size={24} />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#fff' }}>Voice Report</h4>
                <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)' }}>Audio microphone intake</span>
              </div>
            </div>
          </Link>

          {/* Button 4: Safe Walk */}
          <Link href="/student/safe-walk" style={{ textDecoration: 'none' }}>
            <div 
              className="glass-panel" 
              style={{ 
                padding: '20px', 
                borderRadius: '16px', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '14px',
                border: '1px solid rgba(13, 148, 136, 0.3)',
                background: 'linear-gradient(135deg, rgba(13, 148, 136, 0.12) 0%, rgba(15, 23, 42, 0.6) 100%)',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              <div style={{ padding: '12px', borderRadius: '12px', background: 'rgba(13, 148, 136, 0.2)', color: '#2dd4bf' }}>
                <MapPin size={24} />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#fff' }}>Safe Walk</h4>
                <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)' }}>Live route monitoring</span>
              </div>
            </div>
          </Link>

          {/* Button 5: My Cases */}
          <Link href="/student/cases" style={{ textDecoration: 'none' }}>
            <div 
              className="glass-panel" 
              style={{ 
                padding: '20px', 
                borderRadius: '16px', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '14px',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              <div style={{ padding: '12px', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.15)', color: 'var(--accent-blue)' }}>
                <FileText size={24} />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#fff' }}>My Cases</h4>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Status &amp; timeline</span>
              </div>
            </div>
          </Link>

          {/* Button 6: Trusted Contacts */}
          <Link href="/student/trusted-contacts" style={{ textDecoration: 'none' }}>
            <div 
              className="glass-panel" 
              style={{ 
                padding: '20px', 
                borderRadius: '16px', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '14px',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              <div style={{ padding: '12px', borderRadius: '12px', background: 'rgba(139, 92, 246, 0.15)', color: 'var(--accent-purple)' }}>
                <Users size={24} />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#fff' }}>Trusted Contacts</h4>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Emergency SMS circle</span>
              </div>
            </div>
          </Link>

          {/* Button 7: Profile & ID */}
          <Link href="/student/profile" style={{ textDecoration: 'none' }}>
            <div 
              className="glass-panel" 
              style={{ 
                padding: '20px', 
                borderRadius: '16px', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '14px',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              <div style={{ padding: '12px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.15)', color: 'var(--accent-green)' }}>
                <CreditCard size={24} />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#fff' }}>Profile &amp; ID Card</h4>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Medical &amp; digital ID</span>
              </div>
            </div>
          </Link>

          {/* Button 8: Settings */}
          <Link href="/student/settings" style={{ textDecoration: 'none' }}>
            <div 
              className="glass-panel" 
              style={{ 
                padding: '20px', 
                borderRadius: '16px', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '14px',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              <div style={{ padding: '12px', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.1)', color: '#fff' }}>
                <Settings size={24} />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#fff' }}>Security Settings</h4>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Location &amp; privacy</span>
              </div>
            </div>
          </Link>
        </div>
      </div>

      {/* 4. Responders & Campus Notice Board Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px', marginBottom: '32px' }}>
        
        {/* Nearest Thana / Police Stations */}
        <div className="glass-panel" style={{ padding: '24px', borderRadius: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
            <Building2 size={22} color="var(--accent-blue)" />
            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>Emergency Contacts — {activeTenant.shortName}</h3>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {emergencyStations.map((station, i) => (
              <div 
                key={i} 
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '14px 16px',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '12px'
                }}
              >
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 600 }}>{station.name}</h4>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    {station.location} &bull; <strong style={{ color: 'var(--accent-blue)' }}>{station.phone}</strong>
                  </p>
                </div>
                <a 
                  href={`tel:${station.phone}`}
                  style={{
                    background: 'rgba(16, 185, 129, 0.15)',
                    color: 'var(--accent-green)',
                    padding: '10px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textDecoration: 'none'
                  }}
                  title={`Call ${station.name}`}
                >
                  <Phone size={18} />
                </a>
              </div>
            ))}
          </div>

          {/* Quick Action Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '20px' }}>
            <Link href="/student/report?anonymous=true" style={{ textDecoration: 'none' }}>
              <button 
                className="btn-secondary" 
                style={{ 
                  width: '100%', 
                  padding: '12px', 
                  borderRadius: '10px',
                  fontWeight: 600,
                  fontSize: '0.95rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                <Shield size={18} color="var(--accent-purple)" /> Complain Anonymously
              </button>
            </Link>
            <button 
              className="btn-secondary" 
              onClick={() => { setShowSuggestionModal(true); setSuggestionSubmitted(false); }}
              style={{ 
                width: '100%', 
                padding: '12px', 
                borderRadius: '10px',
                fontWeight: 500,
                fontSize: '0.95rem'
              }}
            >
              Give Campus Safety Suggestion
            </button>
          </div>
        </div>

        {/* Notice / Event Board */}
        <div className="glass-panel" style={{ padding: '24px', borderRadius: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
            <FileText size={22} color="var(--accent-purple)" />
            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>Campus Safety Bulletin</h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {campusEvents.map((ev, i) => (
              <div 
                key={i} 
                style={{
                  padding: '16px',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '12px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600 }}>{ev.title}</h4>
                  <span style={{
                    fontSize: '0.72rem',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    background: 'rgba(59, 130, 246, 0.15)',
                    color: 'var(--accent-blue)',
                    fontWeight: 600
                  }}>
                    {ev.tag}
                  </span>
                </div>
                <p style={{ margin: '0 0 8px 0', fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  {ev.description}
                </p>
                <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)' }}>
                  {ev.time}
                </span>
              </div>
            ))}
          </div>

          {/* Blood Group Finder Card */}
          <div 
            onClick={() => { setShowBloodModal(true); handleSearchBlood('O+'); }}
            style={{
              marginTop: '18px',
              padding: '16px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.12) 0%, rgba(139, 92, 246, 0.12) 100%)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ padding: '8px', background: 'rgba(239, 68, 68, 0.2)', borderRadius: '8px', color: 'var(--accent-red)' }}>
                <Droplet size={20} />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: '#fff' }}>Emergency Blood Donors</h4>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Find campus volunteers by blood type</span>
              </div>
            </div>
            <ChevronRight size={18} color="var(--text-secondary)" />
          </div>
        </div>
      </div>

      {/* Blood Group Finder Modal */}
      <AnimatePresence>
        {showBloodModal && (
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}>
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-panel"
              style={{
                width: '100%',
                maxWidth: '620px',
                borderRadius: '20px',
                padding: '28px',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                maxHeight: '85vh',
                overflowY: 'auto'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Droplet size={24} color="var(--accent-red)" />
                  <h3 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 700 }}>Blood Group Finder — {activeTenant.shortName}</h3>
                </div>
                <button 
                  onClick={() => setShowBloodModal(false)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                >
                  <X size={20} />
                </button>
              </div>

              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '16px' }}>
                Quickly locate registered campus volunteers and students with matching blood types for emergency transfusion.
              </p>

              {/* Blood group selector pills */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '24px' }}>
                {bloodGroups.map((bg) => (
                  <button
                    key={bg}
                    onClick={() => handleSearchBlood(bg)}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '999px',
                      border: selectedBloodGroup === bg ? '2px solid var(--accent-red)' : '1px solid rgba(255,255,255,0.1)',
                      background: selectedBloodGroup === bg ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255,255,255,0.03)',
                      color: selectedBloodGroup === bg ? 'var(--accent-red)' : 'white',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    {bg}
                  </button>
                ))}
              </div>

              {/* Results */}
              {searchingBlood ? (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '40px 0', gap: '10px', color: 'var(--text-secondary)' }}>
                  <Loader2 size={20} className="animate-spin" />
                  <span>Searching campus donor registry...</span>
                </div>
              ) : donors.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-secondary)' }}>
                  <AlertTriangle size={28} color="var(--accent-yellow)" style={{ margin: '0 auto 12px auto' }} />
                  <p style={{ margin: 0 }}>No verified {searchedGroup} donors currently available on campus registry.</p>
                  <p style={{ fontSize: '0.85rem', marginTop: '6px' }}>Contact campus dispensary at {activeTenant.ambulanceContact}.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {donors.map((d) => (
                    <div 
                      key={d.id} 
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '14px 16px',
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.06)',
                        borderRadius: '12px'
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>{d.name}</h4>
                          <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '4px', background: 'rgba(239, 68, 68, 0.2)', color: 'var(--accent-red)', fontWeight: 700 }}>
                            {d.bloodGroup}
                          </span>
                        </div>
                        <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                          {d.department} &bull; {d.hostelBlock}
                        </p>
                      </div>

                      {d.contactPhone && (
                        <a 
                          href={`tel:${d.contactPhone}`}
                          className="btn-secondary"
                          style={{ padding: '6px 12px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px', textDecoration: 'none' }}
                        >
                          <Phone size={14} /> Call
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Suggestion Modal */}
      <AnimatePresence>
        {showSuggestionModal && (
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}>
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-panel"
              style={{
                width: '100%',
                maxWidth: '520px',
                borderRadius: '20px',
                padding: '28px',
                border: '1px solid rgba(59, 130, 246, 0.3)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <MessageSquare size={20} color="var(--accent-blue)" />
                  <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>Campus Safety Suggestion</h3>
                </div>
                <button 
                  onClick={() => setShowSuggestionModal(false)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                >
                  <X size={20} />
                </button>
              </div>

              {!suggestionSubmitted ? (
                <div>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '14px' }}>
                    Have suggestions on lighting, security patrols, or gate timings at {activeTenant?.shortName || 'your campus'}?
                  </p>
                  <textarea 
                    className="input-field"
                    style={{ width: '100%', minHeight: '120px', resize: 'vertical', marginBottom: '16px' }}
                    placeholder="Enter your constructive safety suggestions..."
                    value={suggestionText}
                    onChange={(e) => setSuggestionText(e.target.value)}
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                    <button className="btn-secondary" onClick={() => setShowSuggestionModal(false)}>Cancel</button>
                    <button 
                      className="btn-primary" 
                      onClick={() => {
                        if (suggestionText.trim()) {
                          setSuggestionSubmitted(true);
                          setSuggestionText('');
                        }
                      }}
                      disabled={!suggestionText.trim()}
                    >
                      Submit Suggestion
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '24px 0' }}>
                  <CheckCircle size={40} color="var(--accent-green)" style={{ margin: '0 auto 12px auto' }} />
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '1.15rem' }}>Thank You!</h4>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: '0 0 20px 0' }}>
                    Your feedback has been logged for review by {activeTenant?.shortName || 'Campus'} Safety Committee.
                  </p>
                  <button className="btn-secondary" onClick={() => setShowSuggestionModal(false)}>Close</button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

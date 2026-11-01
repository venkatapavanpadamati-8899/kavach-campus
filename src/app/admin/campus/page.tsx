"use client";

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Navigation,
  Shield,
  MapPin,
  Radio,
  Sliders,
  PhoneCall,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Compass,
} from 'lucide-react';
import { INDIAN_ENGINEERING_COLLEGES, CollegeTenant } from '@/lib/colleges';

interface SafetyZone {
  id: string;
  name: string;
  category: 'HOSTEL' | 'ACADEMIC' | 'ADMIN' | 'SPORTS' | 'PERIMETER';
  radiusMeters: number;
  status: 'ACTIVE' | 'HIGH_PATROL' | 'RESTRICTED_NIGHT';
  patrolFrequencyMinutes: number;
}

export default function AdminCampusPage() {
  const [selectedCollegeId, setSelectedCollegeId] = useState<string>(INDIAN_ENGINEERING_COLLEGES[0]?.id || 'srkr-bhimavaram');
  const selectedCollege = useMemo<CollegeTenant>(() => {
    return INDIAN_ENGINEERING_COLLEGES.find(c => c.id === selectedCollegeId) || INDIAN_ENGINEERING_COLLEGES[0];
  }, [selectedCollegeId]);

  const [geofenceRadius, setGeofenceRadius] = useState<number>(selectedCollege.geofenceRadiusMeters || 800);
  const [activeTab, setActiveTab] = useState<'MAP' | 'ZONES' | 'WAYPOINTS' | 'CONTACTS'>('MAP');
  const [selectedBuilding, setSelectedBuilding] = useState<string | null>(null);
  const [showAddZoneModal, setShowAddZoneModal] = useState<boolean>(false);
  const [newZoneName, setNewZoneName] = useState<string>('');
  const [newZoneCategory, setNewZoneCategory] = useState<SafetyZone['category']>('ACADEMIC');
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);

  // Initialize safety zones based on campus
  const [safetyZones, setSafetyZones] = useState<SafetyZone[]>([
    {
      id: 'z-1',
      name: 'North Girls Hostel Complex & Perimeter',
      category: 'HOSTEL',
      radiusMeters: 350,
      status: 'HIGH_PATROL',
      patrolFrequencyMinutes: 10,
    },
    {
      id: 'z-2',
      name: 'Main Academic & Computing Corridor',
      category: 'ACADEMIC',
      radiusMeters: 500,
      status: 'ACTIVE',
      patrolFrequencyMinutes: 20,
    },
    {
      id: 'z-3',
      name: 'Central Library, Plaza & Auditorium',
      category: 'ADMIN',
      radiusMeters: 400,
      status: 'ACTIVE',
      patrolFrequencyMinutes: 25,
    },
    {
      id: 'z-4',
      name: 'Boys Hostel Complex & Sports Pavilion',
      category: 'HOSTEL',
      radiusMeters: 450,
      status: 'ACTIVE',
      patrolFrequencyMinutes: 30,
    },
    {
      id: 'z-5',
      name: 'South Gate & Outer Perimeter Access Road',
      category: 'PERIMETER',
      radiusMeters: 300,
      status: 'RESTRICTED_NIGHT',
      patrolFrequencyMinutes: 15,
    },
  ]);

  // Handle college change
  const handleCollegeChange = (id: string) => {
    setSelectedCollegeId(id);
    const col = INDIAN_ENGINEERING_COLLEGES.find(c => c.id === id);
    if (col) {
      setGeofenceRadius(col.geofenceRadiusMeters || 800);
    }
  };

  const handleToggleZoneStatus = (id: string) => {
    setSafetyZones(prev => prev.map(z => {
      if (z.id !== id) return z;
      const nextStatus = z.status === 'ACTIVE'
        ? 'HIGH_PATROL'
        : z.status === 'HIGH_PATROL'
        ? 'RESTRICTED_NIGHT'
        : 'ACTIVE';
      return { ...z, status: nextStatus };
    }));
  };

  const handleAddZone = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newZoneName.trim()) return;

    const newZone: SafetyZone = {
      id: `z-${Date.now()}`,
      name: newZoneName.trim(),
      category: newZoneCategory,
      radiusMeters: 300,
      status: 'ACTIVE',
      patrolFrequencyMinutes: 20,
    };
    setSafetyZones(prev => [newZone, ...prev]);
    setNewZoneName('');
    setShowAddZoneModal(false);
    setSaveFeedback('Safety zone created and registered to active campus boundary.');
    setTimeout(() => setSaveFeedback(null), 3500);
  };

  const handleSaveGeofence = () => {
    setSaveFeedback(`Geofence radius saved: ${geofenceRadius}m with active GPS boundary triggers.`);
    setTimeout(() => setSaveFeedback(null), 3500);
  };

  // Building coordinates calculated relative to center for SVG visualization
  const buildings = useMemo(() => {
    const list = selectedCollege.campusBuildings || [];
    const count = list.length;
    return list.map((bName, index) => {
      const angle = (index / count) * (2 * Math.PI) - Math.PI / 2;
      const distRatio = 0.35 + ((index % 3) * 0.18);
      const x = 250 + Math.cos(angle) * (180 * distRatio);
      const y = 250 + Math.sin(angle) * (180 * distRatio);
      return {
        id: `bld-${index}`,
        name: bName,
        x,
        y,
        isHostel: bName.toLowerCase().includes('hostel'),
        isLibrary: bName.toLowerCase().includes('library'),
        isSports: bName.toLowerCase().includes('sports') || bName.toLowerCase().includes('gym'),
      };
    });
  }, [selectedCollege]);

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px 16px' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '28px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <div style={{ padding: '8px', background: 'rgba(124, 58, 237, 0.15)', borderRadius: '10px' }}>
              <Navigation size={22} color="var(--accent-purple, #7c3aed)" />
            </div>
            <h1 style={{ fontSize: '2.2rem', margin: 0, fontWeight: 700 }}>Campus Geometry & Geofence</h1>
          </div>
          <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.95rem' }}>
            Manage campus perimeters, building nodes, Safe Walk patrol corridors, and emergency dispatch coordinates.
          </p>
        </div>

        {/* Campus Tenant Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(255, 255, 255, 0.05)', padding: '10px 16px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
          <Building2 size={18} color="var(--accent-purple, #7c3aed)" />
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Active Campus
            </label>
            <select
              value={selectedCollegeId}
              onChange={(e) => handleCollegeChange(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'inherit',
                fontSize: '0.95rem',
                fontWeight: 600,
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              {INDIAN_ENGINEERING_COLLEGES.map(col => (
                <option key={col.id} value={col.id} style={{ background: '#18181b', color: '#fff' }}>
                  {col.shortName} ({col.city})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Save Notification */}
      <AnimatePresence>
        {saveFeedback && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            style={{
              padding: '12px 18px',
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '10px',
              color: '#34d399',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '0.9rem',
              fontWeight: 500,
            }}
          >
            <CheckCircle2 size={18} />
            {saveFeedback}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick Tabs */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '24px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px' }}>
        {[
          { id: 'MAP', label: 'Interactive Geometry Map', icon: Compass },
          { id: 'ZONES', label: `Safety Zones (${safetyZones.length})`, icon: Shield },
          { id: 'WAYPOINTS', label: 'Safe Walk Waypoints', icon: MapPin },
          { id: 'CONTACTS', label: 'Emergency Dispatch Coordinates', icon: PhoneCall },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 18px',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === tab.id ? 'rgba(124, 58, 237, 0.2)' : 'transparent',
              color: activeTab === tab.id ? '#c084fc' : 'var(--text-secondary)',
              fontWeight: activeTab === tab.id ? 600 : 500,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main Content Layout */}
      {activeTab === 'MAP' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '24px' }}>
          {/* Interactive SVG Radar Map */}
          <div
            className="glass-panel"
            style={{
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              position: 'relative',
              minHeight: '560px',
              overflow: 'hidden',
              background: 'radial-gradient(circle at center, rgba(124, 58, 237, 0.05) 0%, rgba(10, 10, 15, 0.8) 100%)',
              border: '1px solid rgba(124, 58, 237, 0.2)',
            }}
          >
            {/* Map Header Controls */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', zIndex: 2 }}>
              <div>
                <span style={{ fontSize: '0.8rem', color: '#a78bfa', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  GPS Perimeter Monitor
                </span>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>
                  {selectedCollege.shortName}
                </h3>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(0,0,0,0.4)', padding: '6px 12px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)' }}>
                <Radio size={14} color="#34d399" />
                <span style={{ fontSize: '0.8rem', color: '#34d399', fontWeight: 600 }}>Real-Time Geofence Live</span>
              </div>
            </div>

            {/* SVG Visualizer */}
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
              <svg width="500" height="500" viewBox="0 0 500 500" style={{ maxWidth: '100%', height: 'auto' }}>
                <defs>
                  <radialGradient id="geofenceGlow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.05" />
                    <stop offset="80%" stopColor="#7c3aed" stopOpacity="0.12" />
                    <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.3" />
                  </radialGradient>
                  <linearGradient id="safeRouteGlow" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#818cf8" stopOpacity="0.8" />
                  </linearGradient>
                </defs>

                {/* Radar grid lines */}
                <circle cx="250" cy="250" r="70" fill="none" stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
                <circle cx="250" cy="250" r="130" fill="none" stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />
                <circle cx="250" cy="250" r="190" fill="none" stroke="rgba(255,255,255,0.1)" strokeDasharray="4 4" />
                <line x1="60" y1="250" x2="440" y2="250" stroke="rgba(255,255,255,0.06)" />
                <line x1="250" y1="60" x2="250" y2="440" stroke="rgba(255,255,255,0.06)" />

                {/* Outer Geofence Radius Circle */}
                <circle
                  cx="250"
                  cy="250"
                  r={Math.min(220, Math.max(90, (geofenceRadius / 1500) * 190))}
                  fill="url(#geofenceGlow)"
                  stroke="#7c3aed"
                  strokeWidth="2"
                  strokeDasharray="6 4"
                />

                {/* Safe Walk Patrol Route Path (Connecting buildings) */}
                {buildings.length > 2 && (
                  <path
                    d={`M ${buildings[0].x} ${buildings[0].y} ` +
                      buildings.slice(1).map(b => `L ${b.x} ${b.y}`).join(' ') +
                      ` Z`}
                    fill="none"
                    stroke="url(#safeRouteGlow)"
                    strokeWidth="2.5"
                    strokeDasharray="5 5"
                    opacity="0.6"
                  />
                )}

                {/* Center Campus Base Coordinate */}
                <circle cx="250" cy="250" r="12" fill="#7c3aed" opacity="0.25" />
                <circle cx="250" cy="250" r="6" fill="#a78bfa" />
                <text x="250" y="274" textAnchor="middle" fill="#c4b5fd" fontSize="10" fontWeight="600">
                  CAMPUS CENTER
                </text>

                {/* Building Nodes */}
                {buildings.map((b) => {
                  const isSelected = selectedBuilding === b.name;
                  const nodeColor = b.isHostel ? '#f43f5e' : b.isLibrary ? '#38bdf8' : '#10b981';

                  return (
                    <g
                      key={b.id}
                      onClick={() => setSelectedBuilding(b.name)}
                      style={{ cursor: 'pointer' }}
                    >
                      {/* Node halo on selection */}
                      {isSelected && (
                        <circle cx={b.x} cy={b.y} r="20" fill={nodeColor} opacity="0.3" />
                      )}
                      <circle
                        cx={b.x}
                        cy={b.y}
                        r={isSelected ? '10' : '7'}
                        fill={nodeColor}
                        stroke="#fff"
                        strokeWidth="1.5"
                      />
                      <text
                        x={b.x}
                        y={b.y - 12}
                        textAnchor="middle"
                        fill="#f3f4f6"
                        fontSize="9.5"
                        fontWeight="500"
                        style={{
                          textShadow: '0 1px 3px rgba(0,0,0,0.8)',
                          pointerEvents: 'none',
                        }}
                      >
                        {b.name.length > 20 ? b.name.slice(0, 18) + '...' : b.name}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* Map Legend */}
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center', marginTop: '12px', zIndex: 2 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f43f5e' }} /> Hostel Zone
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} /> Academic / Labs
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#38bdf8' }} /> Library / Admin
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                <span style={{ width: '14px', height: '2px', background: '#38bdf8', borderStyle: 'dashed' }} /> Safe Walk Patrol Route
              </div>
            </div>
          </div>

          {/* Right Panel: Geofence Controls & Node Inspector */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Geofence Tuning Box */}
            <div className="glass-panel" style={{ padding: '20px' }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sliders size={18} color="var(--accent-purple, #7c3aed)" /> Geofence Boundary Controls
              </h3>

              <div style={{ marginBottom: '18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Coverage Radius:</span>
                  <span style={{ fontWeight: 700, color: '#c084fc' }}>{geofenceRadius} meters</span>
                </div>
                <input
                  type="range"
                  min="400"
                  max="2500"
                  step="50"
                  value={geofenceRadius}
                  onChange={(e) => setGeofenceRadius(Number(e.target.value))}
                  style={{ width: '100%', accentColor: '#7c3aed', cursor: 'pointer' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  <span>400m (Compact)</span>
                  <span>2500m (Broad)</span>
                </div>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>GPS Center Latitude:</span>
                  <span style={{ fontFamily: 'monospace' }}>{selectedCollege.coordinates.lat.toFixed(4)}° N</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>GPS Center Longitude:</span>
                  <span style={{ fontFamily: 'monospace' }}>{selectedCollege.coordinates.lng.toFixed(4)}° E</span>
                </div>
              </div>

              <button
                onClick={handleSaveGeofence}
                className="btn-primary"
                style={{ width: '100%', padding: '10px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                <CheckCircle2 size={16} /> Save Geofence Radius
              </button>
            </div>

            {/* Selected Building Detail Inspector */}
            <div className="glass-panel" style={{ padding: '20px', flex: 1 }}>
              <h3 style={{ margin: '0 0 14px 0', fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Building2 size={18} color="#38bdf8" /> Building Inspector
              </h3>

              {selectedBuilding ? (
                <div>
                  <div style={{ padding: '12px', background: 'rgba(56, 189, 248, 0.1)', borderRadius: '8px', border: '1px solid rgba(56, 189, 248, 0.25)', marginBottom: '14px' }}>
                    <div style={{ fontSize: '0.75rem', color: '#38bdf8', fontWeight: 600, textTransform: 'uppercase' }}>Selected Node</div>
                    <div style={{ fontSize: '1rem', fontWeight: 600, marginTop: '2px' }}>{selectedBuilding}</div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.85rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Emergency Access:</span>
                      <span style={{ color: '#34d399', fontWeight: 600 }}>Unrestricted 24/7</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Safe Walk Stop:</span>
                      <span style={{ color: '#a78bfa', fontWeight: 600 }}>Waypoint Node Active</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Security Call Station:</span>
                      <span>Within 50 meters</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '28px 12px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  <MapPin size={32} style={{ margin: '0 auto 10px', opacity: 0.4 }} />
                  Click any building node on the radar map to inspect its security details and waypoint properties.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Safety Zones Tab */}
      {activeTab === 'ZONES' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h2 style={{ fontSize: '1.4rem', margin: 0, fontWeight: 600 }}>Configured Safety Zones</h2>
              <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.85rem' }}>
                Defined micro-zones with dedicated patrol frequency and security posture.
              </p>
            </div>
            <button
              onClick={() => setShowAddZoneModal(true)}
              className="btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}
            >
              <Plus size={16} /> Add Safety Zone
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
            {safetyZones.map((zone) => {
              const statusColor = zone.status === 'HIGH_PATROL'
                ? '#f43f5e'
                : zone.status === 'RESTRICTED_NIGHT'
                ? '#fbbf24'
                : '#10b981';

              return (
                <div key={zone.id} className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                      <span style={{ fontSize: '0.75rem', padding: '4px 8px', borderRadius: '4px', background: 'rgba(255,255,255,0.08)', fontWeight: 600 }}>
                        {zone.category}
                      </span>
                      <button
                        onClick={() => handleToggleZoneStatus(zone.id)}
                        style={{
                          fontSize: '0.75rem',
                          padding: '4px 10px',
                          borderRadius: '12px',
                          border: `1px solid ${statusColor}`,
                          background: `${statusColor}15`,
                          color: statusColor,
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        {zone.status.replace('_', ' ')}
                      </button>
                    </div>

                    <h3 style={{ fontSize: '1.1rem', margin: '0 0 8px 0', fontWeight: 600 }}>{zone.name}</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>
                      Radius: <strong>{zone.radiusMeters}m</strong> | Patrol Cadence: <strong>Every {zone.patrolFrequencyMinutes} mins</strong>
                    </p>
                  </div>

                  <div style={{ marginTop: '18px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Click badge to cycle status</span>
                    <button
                      onClick={() => handleToggleZoneStatus(zone.id)}
                      className="btn-secondary"
                      style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                    >
                      Cycle Status
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Safe Walk Waypoints Tab */}
      {activeTab === 'WAYPOINTS' && (
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '1.3rem', margin: '0 0 8px 0', fontWeight: 600 }}>Safe Walk Routing & Waypoint Corridor</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '0.9rem' }}>
            Active waypoints tracked by the student Safe Walk GPS companion. When students initiate Safe Walk, proximity to these nodes verifies on-campus transit safety.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            {(selectedCollege.campusBuildings || []).map((bld, idx) => (
              <div key={idx} style={{ padding: '16px', background: 'rgba(255,255,255,0.04)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <MapPin size={16} color="#c084fc" />
                  <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>Waypoint #{idx + 1}</span>
                </div>
                <div style={{ fontSize: '0.9rem', marginBottom: '8px', color: '#e2e8f0' }}>{bld}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                  Offset: {(0.0012 * (idx + 1)).toFixed(4)}° / Radius: 60m check-in
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Emergency Dispatch Contacts Tab */}
      {activeTab === 'CONTACTS' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '10px', color: '#f43f5e' }}>
              <PhoneCall size={20} /> Campus Emergency Helpline
            </h3>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '6px' }}>
              {selectedCollege.emergencyHelpline || '+91-8816-223332'}
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>
              Primary 24/7 hotline routed during instant Student SOS activation.
            </p>
          </div>

          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '10px', color: '#c084fc' }}>
              <Shield size={20} /> Women's Safety Cell
            </h3>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '6px' }}>
              {selectedCollege.womensCellHelpline || '+91-8816-223334'}
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>
              Confidential internal complaints committee & anti-harassment quick dispatch.
            </p>
          </div>

          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '10px', color: '#38bdf8' }}>
              <Radio size={20} /> Security Control Room
            </h3>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '6px' }}>
              {selectedCollege.securityControlRoom || '+91-8816-223330'}
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>
              Direct line to on-duty security supervisors and physical gate checkpoint staff.
            </p>
          </div>

          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '10px', color: '#10b981' }}>
              <AlertTriangle size={20} /> Campus Medical & Ambulance
            </h3>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '6px' }}>
              {selectedCollege.ambulanceContact || '+91-8816-223339'}
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>
              First-response medical center and on-campus ambulance transit.
            </p>
          </div>
        </div>
      )}

      {/* Add Zone Modal */}
      <AnimatePresence>
        {showAddZoneModal && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 100,
              padding: '16px',
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="glass-panel"
              style={{ maxWidth: '480px', width: '100%', padding: '28px', background: '#18181b', border: '1px solid rgba(255,255,255,0.15)' }}
            >
              <h3 style={{ fontSize: '1.3rem', margin: '0 0 16px 0', fontWeight: 600 }}>Create New Safety Zone</h3>
              <form onSubmit={handleAddZone} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px', color: 'var(--text-secondary)' }}>
                    Zone Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={newZoneName}
                    onChange={(e) => setNewZoneName(e.target.value)}
                    placeholder="e.g. Mechanical Workshop Rear Corridor"
                    className="input-field"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px', color: 'var(--text-secondary)' }}>
                    Zone Category
                  </label>
                  <select
                    value={newZoneCategory}
                    onChange={(e) => setNewZoneCategory(e.target.value as SafetyZone['category'])}
                    className="input-field"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', background: '#27272a', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                  >
                    <option value="ACADEMIC">Academic / Labs</option>
                    <option value="HOSTEL">Hostel Complex</option>
                    <option value="ADMIN">Administrative & Library</option>
                    <option value="SPORTS">Sports & Grounds</option>
                    <option value="PERIMETER">Outer Perimeter / Gate</option>
                  </select>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
                  <button
                    type="button"
                    onClick={() => setShowAddZoneModal(false)}
                    className="btn-secondary"
                    style={{ padding: '8px 16px' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                    style={{ padding: '8px 20px' }}
                  >
                    Save Zone
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

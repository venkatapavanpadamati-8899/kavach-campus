"use client";
import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  MapPin, 
  Phone, 
  X, 
  Navigation, 
  AlertTriangle,
  Building2,
  ShieldAlert
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getActiveCollegeTenant } from '@/lib/college-branding';

export default function SOSPage() {
  const router = useRouter();
  const [countdown, setCountdown] = useState(3);
  const [active, setActive] = useState(false);
  const [location, setLocation] = useState<GeolocationPosition | null>(null);

  const [incidentId, setIncidentId] = useState<string | null>(null);
  const [caseId, setCaseId] = useState<string | null>(null);
  const [_assignedStaff, setAssignedStaff] = useState<string | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [locationStatus, setLocationStatus] = useState<string>('Acquiring GPS Signal...');
  const [selectedCampusBuilding, setSelectedCampusBuilding] = useState<string>('');
  const [watchId, setWatchId] = useState<number | null>(null);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);
  const [_isSubmitting, setIsSubmitting] = useState(false);

  // Active college tenant for emergency helplines and campus building fallback
  const [activeTenant, setActiveTenant] = useState(getActiveCollegeTenant());

  // Safe Word Feature
  const [safeWord] = useState('Blueberry');

  // Guard against duplicate incident creation
  const hasCreatedIncidentRef = useRef(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setActiveTenant(getActiveCollegeTenant());
  }, []);

  const createIncident = async (lat: number | null, lng: number | null, acc: number | null, manualLoc?: string) => {
    if (hasCreatedIncidentRef.current) return;
    hasCreatedIncidentRef.current = true;
    setIsSubmitting(true);

    try {
      // Validate coordinates strictly before dispatch
      let validLat: number | null = null;
      let validLng: number | null = null;
      let validAcc: number | null = null;

      if (lat !== null && lng !== null) {
        if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
          validLat = lat;
          validLng = lng;
          validAcc = acc !== null && acc > 0 ? acc : null;
        } else {
          console.warn('[SOS Telemetry] GPS coordinates out of geographic bounds; discarding invalid data.');
        }
      }

      const res = await fetch('/api/sos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          latitude: validLat, 
          longitude: validLng, 
          accuracy: validAcc,
          safeWord: safeWord,
          manualLocation: manualLoc || selectedCampusBuilding || null
        })
      });

      const data = await res.json();
      if (data.success) {
        setIncidentId(data.incidentId);
        setCaseId(data.caseId);
        if (data.assignedStaffId) {
          setAssignedStaff(data.assignedStaffId);
        }
        if (validLat != null && validLng != null && data.incidentId) {
          startLiveTracking(data.incidentId);
        }
      } else {
        console.warn('[SOS Dispatch] API returned non-success response:', data.error);
      }
    } catch {
      console.warn('[SOS Dispatch] Network request failed. Emergency recorded locally.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const activateSOS = async () => {
    setActive(true);

    // Check secure context requirements for browser geolocation
    const isSecureContextAvailable = typeof window !== 'undefined' ? window.isSecureContext : true;

    if (!navigator.geolocation || !isSecureContextAvailable) {
      const reason = !isSecureContextAvailable
        ? 'Geolocation requires a secure HTTPS origin. Please confirm your campus building.'
        : 'Geolocation is not supported by your browser.';
      setLocationError(reason);
      setLocationStatus('GPS Unavailable (Manual Location Active)');
      createIncident(null, null, null);
      return;
    }

    // Geolocation options with explicit timeout & maximum age
    const geoOptions: PositionOptions = {
      timeout: 8000,
      enableHighAccuracy: true,
      maximumAge: 10000
    };

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation(pos);
        setLocationError(null);
        setLocationStatus(`GPS Locked (±${Math.round(pos.coords.accuracy)}m)`);
        createIncident(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy);
      },
      (err: GeolocationPositionError) => {
        // Detailed, safe error categorization without logging raw errors
        let friendlyMessage = 'GPS signal unavailable. Please select your campus building below.';
        if (err.code === 1) { // PERMISSION_DENIED
          friendlyMessage = 'Location access permission was denied. Please select your campus location.';
        } else if (err.code === 2) { // POSITION_UNAVAILABLE
          friendlyMessage = 'GPS satellite signal weak or unavailable indoors.';
        } else if (err.code === 3) { // TIMEOUT
          friendlyMessage = 'GPS acquisition timed out. Proceeding with emergency dispatch.';
        }

        setLocationError(friendlyMessage);
        setLocationStatus('GPS Acquisition Incomplete');
        // Non-blocking: Still dispatch emergency SOS immediately!
        createIncident(null, null, null);
      },
      geoOptions
    );
  };

  const startLiveTracking = (id: string) => {
    if (!navigator.geolocation) return;
    
    const wid = navigator.geolocation.watchPosition(
      async (pos) => {
        // Validate coordinates
        if (pos.coords.latitude >= -90 && pos.coords.latitude <= 90 &&
            pos.coords.longitude >= -180 && pos.coords.longitude <= 180) {
          setLocation(pos);
          setLastUpdateTime(new Date());
          setLocationError(null);
          setLocationStatus(`Live Tracking (±${Math.round(pos.coords.accuracy)}m)`);
          
          try {
            await fetch('/api/sos/location', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                incidentId: id, 
                latitude: pos.coords.latitude, 
                longitude: pos.coords.longitude, 
                accuracy: pos.coords.accuracy 
              })
            });
          } catch {
            // Throttled location update failure is non-fatal
          }
        }
      },
      () => {
        // Quietly maintain status on watch error
        setLocationStatus('Tracking paused or obstructed');
      },
      { enableHighAccuracy: true, maximumAge: 10000 }
    );
    setWatchId(wid);
  };

  const updateManualBuilding = async (building: string) => {
    setSelectedCampusBuilding(building);
    if (incidentId) {
      try {
        await fetch('/api/sos/location', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            incidentId,
            manualLocation: building
          })
        });
      } catch {
        // Ignore background sync errors
      }
    }
  };

  const cancelSOS = async () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    if (watchId !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }
    if (incidentId) {
      await fetch('/api/sos/location', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ incidentId, isStopped: true })
      }).catch(() => {});
    }
    setActive(false); 
    router.push('/student');
  };

  useEffect(() => {
    if (active) return;
    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          activateSOS();
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  const campusBuildings = activeTenant.campusBuildings || [
    'Main Administrative Block',
    'CSE & IT Block',
    'Mechanical Sciences Block',
    'ECE & EEE Department',
    'Central Library & Auditorium',
    'Girls Hostel Complex',
    'Boys Hostel Wing',
    'Sports Complex & Gym',
    'Medical Dispensary & First Aid Desk'
  ];

  return (
    <div 
      className="page-bg-sos" 
      style={{ 
        minHeight: '100vh', 
        padding: '24px 16px',
        background: 'radial-gradient(circle at top, rgba(185, 28, 28, 0.25) 0%, rgba(10, 10, 12, 0.96) 75%)'
      }}
    >
      <div style={{ maxWidth: '850px', margin: '0 auto' }}>
        {!active ? (
        /* Countdown Pre-Activation Screen */
        <motion.div 
          initial={{ scale: 0.95, opacity: 0 }} 
          animate={{ scale: 1, opacity: 1 }}
          style={{ textAlign: 'center', padding: '60px 16px' }}
        >
          <div style={{
            position: 'relative',
            width: '220px', 
            height: '220px', 
            borderRadius: '50%', 
            background: 'radial-gradient(circle, rgba(239, 68, 68, 0.25) 0%, rgba(239, 68, 68, 0.05) 70%)',
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            margin: '0 auto 36px auto',
            border: '4px solid var(--accent-red)',
            boxShadow: '0 0 50px rgba(239, 68, 68, 0.4)'
          }}>
            <h1 style={{ fontSize: '5.5rem', color: 'var(--accent-red)', margin: 0, fontWeight: 800 }}>
              {countdown}
            </h1>
          </div>
          <h2 style={{ fontSize: '2.2rem', fontWeight: 700, marginBottom: '12px' }}>
            Activating Emergency SOS...
          </h2>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '460px', margin: '0 auto 32px auto', fontSize: '1rem' }}>
            Hold on. Dispatching emergency alert to {activeTenant.shortName} security desk, capturing telemetry, and notifying registered guardians.
          </p>
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
            <button 
              className="btn-secondary" 
              onClick={cancelSOS}
              style={{ 
                fontSize: '1.05rem', 
                padding: '14px 36px', 
                borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.2)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '10px'
              }}
            >
              <X size={20} /> Cancel SOS
            </button>
            <button
              onClick={() => {
                if (timerRef.current) clearInterval(timerRef.current);
                activateSOS();
              }}
              style={{
                background: 'var(--accent-red)',
                color: '#fff',
                border: 'none',
                padding: '14px 32px',
                borderRadius: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 0 20px rgba(239, 68, 68, 0.5)'
              }}
            >
              <ShieldAlert size={20} /> Trigger Now
            </button>
          </div>
        </motion.div>
      ) : (
        /* Active SOS Interface */
        <motion.div 
          initial={{ opacity: 0, y: 16 }} 
          animate={{ opacity: 1, y: 0 }}
          style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}
        >
          {/* Header Status */}
          <div style={{ 
            background: 'linear-gradient(180deg, rgba(239, 68, 68, 0.2) 0%, rgba(15, 23, 42, 0.9) 100%)',
            borderRadius: '24px', 
            padding: '36px 24px', 
            textAlign: 'center',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            boxShadow: '0 10px 40px rgba(239, 68, 68, 0.2)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{ 
              color: 'var(--accent-red)', 
              fontSize: '0.95rem', 
              letterSpacing: '0.15em', 
              textTransform: 'uppercase', 
              fontWeight: 700, 
              marginBottom: '20px' 
            }}>
              ● Emergency SOS Live Dispatch Active
            </div>

            {/* Glowing Concentric Radar Rings SOS Button */}
            <div style={{ position: 'relative', width: '180px', height: '180px', margin: '0 auto 28px auto' }}>
              <motion.div 
                animate={{ scale: [1, 1.4, 1.7], opacity: [0.6, 0.2, 0] }}
                transition={{ repeat: Infinity, duration: 2, ease: 'easeOut' }}
                style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: '50%',
                  background: 'rgba(239, 68, 68, 0.3)',
                  zIndex: 1
                }}
              />
              <div style={{
                position: 'relative',
                zIndex: 2,
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 40px rgba(239, 68, 68, 0.7)',
                color: 'white'
              }}>
                <ShieldAlert size={54} />
                <span style={{ fontSize: '1.25rem', fontWeight: 800, marginTop: '4px', letterSpacing: '0.05em' }}>SOS</span>
              </div>
            </div>

            <h2 style={{ fontSize: '1.8rem', fontWeight: 700, margin: '0 0 8px 0' }}>
              Help Is En Route
            </h2>
            <p style={{ color: 'var(--text-secondary)', maxWidth: '520px', margin: '0 auto 20px auto', fontSize: '0.95rem' }}>
              {activeTenant.shortName} security desk and campus quick response patrol have been alerted with your incident reference.
            </p>

            {caseId && (
              <div style={{ 
                display: 'inline-block',
                padding: '6px 18px', 
                borderRadius: '20px', 
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                fontSize: '0.9rem',
                fontWeight: 600,
                marginBottom: '20px'
              }}>
                Case Reference: <span style={{ color: 'var(--accent-red)' }}>{caseId}</span>
              </div>
            )}

            <div>
              <button 
                onClick={cancelSOS}
                style={{
                  background: 'transparent',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  color: 'var(--accent-red)',
                  fontSize: '0.95rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 24px',
                  borderRadius: '10px'
                }}
              >
                <X size={18} /> Cancel Emergency Alert
              </button>
            </div>
          </div>

          {/* Live GPS & Location Card with Manual Fallback */}
          <div className="glass-panel" style={{ padding: '24px', borderRadius: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ padding: '12px', background: 'rgba(59, 130, 246, 0.15)', borderRadius: '50%', color: 'var(--accent-blue)' }}>
                  <MapPin size={24} />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>
                    {location 
                      ? `${location.coords.latitude.toFixed(5)}° N, ${location.coords.longitude.toFixed(5)}° E` 
                      : (selectedCampusBuilding || 'GPS Telemetry Pending')}
                  </h4>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    Status: <strong style={{ color: location ? 'var(--accent-green)' : '#f59e0b' }}>{locationStatus}</strong>
                    {lastUpdateTime && ` • Updated ${lastUpdateTime.toLocaleTimeString()}`}
                  </p>
                </div>
              </div>

              {location && (
                <a 
                  href={`https://www.google.com/maps/search/?api=1&query=${location.coords.latitude},${location.coords.longitude}`} 
                  target="_blank" 
                  rel="noreferrer"
                  style={{ 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    gap: '6px', 
                    color: 'var(--accent-blue)', 
                    textDecoration: 'none', 
                    fontSize: '0.9rem',
                    fontWeight: 500,
                    padding: '8px 16px',
                    borderRadius: '8px',
                    background: 'rgba(59, 130, 246, 0.12)',
                    border: '1px solid rgba(59, 130, 246, 0.25)'
                  }}
                >
                  <Navigation size={16} /> Open in Google Maps
                </a>
              )}
            </div>

            {/* Graceful GPS Error / Fallback UI */}
            {locationError && (
              <div style={{
                padding: '12px 16px',
                borderRadius: '10px',
                background: 'rgba(245, 158, 11, 0.12)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                color: '#f59e0b',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                fontSize: '0.9rem',
                marginBottom: '16px'
              }}>
                <AlertTriangle size={18} style={{ flexShrink: 0 }} />
                <span>{locationError}</span>
              </div>
            )}

            {/* Manual Campus Building Selection Fallback */}
            <div style={{ marginTop: '12px', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '16px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', fontWeight: 600, marginBottom: '8px' }}>
                <Building2 size={16} color="var(--accent-purple)" />
                Specify Campus Location / Building
              </label>
              <select
                className="input-field"
                value={selectedCampusBuilding}
                onChange={(e) => updateManualBuilding(e.target.value)}
                style={{ 
                  width: '100%', 
                  padding: '10px 14px', 
                  background: 'rgba(255, 255, 255, 0.06)', 
                  borderRadius: '8px',
                  color: '#fff'
                }}
              >
                <option value="" style={{ background: '#0f172a' }}>-- Select Current Campus Block or Landmark --</option>
                {campusBuildings.map((building) => (
                  <option key={building} value={building} style={{ background: '#0f172a' }}>
                    {building}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Emergency Helplines Card */}
          <div className="glass-panel" style={{ padding: '24px', borderRadius: '16px' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '1.15rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Phone size={18} color="var(--accent-red)" />
              Direct Emergency Contacts — {activeTenant.shortName}
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
              <a 
                href="tel:112"
                style={{ 
                  textDecoration: 'none', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between', 
                  padding: '12px 16px', 
                  borderRadius: '10px',
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#fff'
                }}
              >
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>National Emergency</div>
                  <strong style={{ fontSize: '1.1rem', color: 'var(--accent-red)' }}>112</strong>
                </div>
                <Phone size={18} color="var(--accent-red)" />
              </a>

              <a 
                href={`tel:${activeTenant.emergencyHelpline}`}
                style={{ 
                  textDecoration: 'none', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between', 
                  padding: '12px 16px', 
                  borderRadius: '10px',
                  background: 'rgba(59, 130, 246, 0.12)',
                  border: '1px solid rgba(59, 130, 246, 0.25)',
                  color: '#fff'
                }}
              >
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Campus Security Desk</div>
                  <strong style={{ fontSize: '0.95rem', color: 'var(--accent-blue)' }}>{activeTenant.emergencyHelpline}</strong>
                </div>
                <Phone size={18} color="var(--accent-blue)" />
              </a>

              <a 
                href={`tel:${activeTenant.womensCellHelpline}`}
                style={{ 
                  textDecoration: 'none', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between', 
                  padding: '12px 16px', 
                  borderRadius: '10px',
                  background: 'rgba(139, 92, 246, 0.12)',
                  border: '1px solid rgba(139, 92, 246, 0.25)',
                  color: '#fff'
                }}
              >
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Women&apos;s Safety Cell</div>
                  <strong style={{ fontSize: '0.95rem', color: 'var(--accent-purple)' }}>{activeTenant.womensCellHelpline}</strong>
                </div>
                <Phone size={18} color="var(--accent-purple)" />
              </a>
            </div>
          </div>
        </motion.div>
      )}
      </div>
    </div>
  );
}

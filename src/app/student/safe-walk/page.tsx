"use client";
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MapPin, 
  Navigation, 
  Shield, 
  Users, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Phone
} from 'lucide-react';
import Link from 'next/link';

interface Contact {
  id: string;
  name: string;
  relationship: string;
  phone: string;
}

export default function SafeWalkPage() {
  const [active, setActive] = useState(false);
  const [destination, setDestination] = useState('');
  const [durationMins, setDurationMins] = useState(30);
  const [consentGranted, setConsentGranted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [walkId, setWalkId] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);

  // Dynamic contacts
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(true);

  // Geolocation tracking
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [lastPingTime, setLastPingTime] = useState<string | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Load verified trusted contacts
  useEffect(() => {
    let ignore = false;
    fetch('/api/student/trusted-contacts')
      .then(res => res.json())
      .then(data => {
        if (!ignore) {
          setContacts(data.contacts || []);
          setLoadingContacts(false);
        }
      })
      .catch(() => {
        if (!ignore) setLoadingContacts(false);
      });
    return () => { ignore = true; };
  }, []);

  // Countdown timer during active safe walk
  useEffect(() => {
    if (!active || !expiresAt) return;

    const updateTimer = () => {
      const now = new Date().getTime();
      const exp = new Date(expiresAt).getTime();
      const diffSecs = Math.max(0, Math.floor((exp - now) / 1000));
      setRemainingSeconds(diffSecs);
    };

    updateTimer();
    timerRef.current = setInterval(updateTimer, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [active, expiresAt]);

  const startSafeWalk = async () => {
    if (!destination.trim()) {
      setError('Please enter your destination campus location.');
      return;
    }

    if (!consentGranted) {
      setError('Explicit consent is required to share encrypted GPS telemetry during Safe Walk.');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      let startLat: number | null = null;
      let startLng: number | null = null;
      
      if (navigator.geolocation) {
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 3500, enableHighAccuracy: true });
          });
          startLat = pos.coords.latitude;
          startLng = pos.coords.longitude;
          setCurrentCoords({ lat: startLat, lng: startLng });
        } catch {
          console.warn('GPS initial lock unavailable; proceeding with destination log.');
        }
      }

      const res = await fetch('/api/safe-walk/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destination: destination.trim(),
          expectedDurationMins: durationMins,
          startLatitude: startLat,
          startLongitude: startLng
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to start safe walk');
      }

      setWalkId(data.walkId);
      setExpiresAt(data.expiresAt);
      setActive(true);

      // Start periodic location updates
      if (navigator.geolocation && data.walkId) {
        const wid = navigator.geolocation.watchPosition(
          async (pos) => {
            setCurrentCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
            setLastPingTime(new Date().toLocaleTimeString());
            await fetch('/api/safe-walk/location', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                walkId: data.walkId,
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude
              })
            }).catch(() => {});
          },
          () => {},
          { enableHighAccuracy: true, maximumAge: 10000 }
        );
        watchIdRef.current = wid;
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred while starting Safe Walk');
    } finally {
      setLoading(false);
    }
  };

  const endSafeWalk = async () => {
    if (!walkId) return;

    setLoading(true);
    setError(null);

    try {
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

      const res = await fetch('/api/safe-walk/end', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walkId })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to end safe walk');
      }

      setWalkId(null);
      setExpiresAt(null);
      setActive(false);
      setDestination('');
      setCurrentCoords(null);
      setLastPingTime(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred while ending Safe Walk');
    } finally {
      setLoading(false);
    }
  };

  const formatRemainingTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="page-bg-safewalk" style={{ minHeight: '100vh', padding: '24px 16px' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '28px' }}>
          <div>
            <h1 style={{ fontSize: '2.4rem', fontWeight: 700, margin: '0 0 8px 0', letterSpacing: '-0.02em' }}>
            Safe Walk Companion
          </h1>
          <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.95rem' }}>
            Real-time telemetry, automated station check-ins, and emergency auto-escalation.
          </p>
        </div>

        {active && (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '10px', 
            background: 'rgba(16, 185, 129, 0.15)', 
            color: 'var(--accent-green)', 
            padding: '10px 20px', 
            borderRadius: '999px', 
            border: '1px solid rgba(16, 185, 129, 0.3)' 
          }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--accent-green)', animation: 'pulse 1.8s infinite' }} />
            <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>
              Tracking Active • ID: {walkId?.split('-')[0]}
            </span>
          </div>
        )}
      </div>

      <AnimatePresence>
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            style={{ 
              marginBottom: '24px', 
              padding: '14px 18px', 
              borderRadius: '10px', 
              background: 'rgba(239, 68, 68, 0.1)', 
              border: '1px solid var(--accent-red)', 
              color: 'var(--accent-red)',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              fontSize: '0.95rem'
            }}
          >
            <AlertCircle size={20} />
            <span>{error}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
        
        {/* Destination & Location Telemetry Card */}
        <div className="glass-panel" style={{ padding: '28px', borderRadius: '18px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, marginBottom: '8px' }}>
              Destination / Walk Route *
            </label>
            <div style={{ position: 'relative' }}>
              <MapPin size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--accent-blue)' }} />
              <input 
                type="text" 
                placeholder="e.g., North Campus Hostel Block B" 
                className="input-field" 
                style={{ paddingLeft: '42px', width: '100%' }}
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                disabled={active}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, marginBottom: '8px' }}>
              Expected Duration (Minutes)
            </label>
            <select 
              className="input-field" 
              style={{ width: '100%' }}
              value={durationMins}
              onChange={(e) => setDurationMins(Number(e.target.value))}
              disabled={active}
            >
              <option value="15">15 Minutes (Nearby Quad / Library)</option>
              <option value="30">30 Minutes (Standard Walk across campus)</option>
              <option value="45">45 Minutes (Perimeter / Sports Complex)</option>
              <option value="60">60 Minutes (Extended Transit)</option>
            </select>
          </div>

          {/* Active Walk Telemetry Box */}
          {active && (
            <div style={{
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(6, 95, 70, 0.1) 100%)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '14px',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-green)', fontWeight: 600, fontSize: '0.9rem' }}>
                  <Clock size={18} />
                  <span>Remaining Arrival Window</span>
                </div>
                <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent-green)', fontFamily: 'monospace' }}>
                  {formatRemainingTime(remainingSeconds)}
                </span>
              </div>

              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                GPS Ping: {currentCoords ? `${currentCoords.lat.toFixed(5)}, ${currentCoords.lng.toFixed(5)}` : 'Connecting...'}
                {lastPingTime && <span> • Updated {lastPingTime}</span>}
              </div>

              {remainingSeconds === 0 && (
                <div style={{ color: 'var(--accent-red)', fontSize: '0.82rem', fontWeight: 600 }}>
                  Arrival window overdue. Automated safety dispatch initiated if not marked completed.
                </div>
              )}
            </div>
          )}

          {/* Consent Checkbox */}
          {!active && (
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
              padding: '16px',
              background: 'rgba(255,255,255,0.02)',
              borderRadius: '12px',
              border: '1px solid rgba(255,255,255,0.06)'
            }}>
              <input 
                type="checkbox" 
                id="consent" 
                checked={consentGranted}
                onChange={(e) => setConsentGranted(e.target.checked)}
                style={{ width: '18px', height: '18px', marginTop: '2px', cursor: 'pointer' }}
              />
              <label htmlFor="consent" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', cursor: 'pointer', lineHeight: 1.4 }}>
                <strong>Location Consent:</strong> I agree to transmit encrypted periodic GPS coordinates to campus security responders and designated emergency contacts until I click &quot;End Walk Safely&quot;.
              </label>
            </div>
          )}

          {/* Main Action Button */}
          {!active ? (
            <button 
              className="btn-primary" 
              style={{ padding: '14px', fontSize: '1.05rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}
              onClick={startSafeWalk}
              disabled={loading || !destination.trim() || !consentGranted}
            >
              {loading ? <Loader2 size={20} className="animate-spin" /> : <Navigation size={20} />}
              {loading ? 'Starting Safe Walk...' : 'Start Safe Walk'}
            </button>
          ) : (
            <button 
              className="btn-secondary" 
              style={{ 
                padding: '14px', 
                fontSize: '1.05rem', 
                background: 'rgba(16, 185, 129, 0.15)', 
                color: 'var(--accent-green)', 
                border: '1px solid var(--accent-green)', 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                gap: '10px' 
              }}
              onClick={endSafeWalk}
              disabled={loading}
            >
              {loading ? <Loader2 size={20} className="animate-spin" /> : <CheckCircle2 size={20} />}
              {loading ? 'Ending Walk...' : 'I Have Arrived (End Walk Safely)'}
            </button>
          )}
        </div>

        {/* Sharing Details & Security Policy Card */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Trusted Contacts Sharing */}
          <div className="glass-panel" style={{ padding: '24px', borderRadius: '18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Users size={18} color="var(--accent-purple)" />
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>Notified Contacts</h3>
              </div>
              <Link href="/student/trusted-contacts" style={{ fontSize: '0.8rem', color: 'var(--accent-blue)', textDecoration: 'none' }}>
                Manage
              </Link>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Shield size={16} color="var(--accent-blue)" />
                  <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>Campus Security Central</span>
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--accent-green)', fontWeight: 600 }}>ACTIVE</span>
              </div>

              {loadingContacts ? (
                <div style={{ padding: '12px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  Loading trusted circle...
                </div>
              ) : contacts.length === 0 ? (
                <div style={{ padding: '12px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  No personal trusted contacts added.{' '}
                  <Link href="/student/trusted-contacts" style={{ color: 'var(--accent-blue)' }}>Add now</Link>
                </div>
              ) : (
                contacts.map((c) => (
                  <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px' }}>
                    <div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 500 }}>{c.name}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{c.relationship}</div>
                    </div>
                    <a href={`tel:${c.phone}`} style={{ color: 'var(--accent-blue)' }} title="Call contact">
                      <Phone size={14} />
                    </a>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Auto-SOS Safety Safeguard */}
          <div className="glass-panel" style={{ padding: '24px', borderRadius: '18px', background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', color: 'var(--accent-blue)' }}>
              <Shield size={18} />
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600 }}>Autonomous Safety Rules</h3>
            </div>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              If your Safe Walk exceeds the scheduled arrival duration without explicit termination, the backend cron worker automatically escalates a <strong>HIGH-severity safety incident</strong> to on-duty campus responders.
            </p>
          </div>

        </div>

      </div>
    </div>
    </div>
  );
}

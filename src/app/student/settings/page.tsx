"use client";
import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  Lock, 
  CheckCircle2, 
  Building2, 
  Key, 
  Save, 
  LogOut, 
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getActiveCollegeTenant } from '@/lib/college-branding';
import { createClient } from '@/lib/supabase/client';

export default function StudentSettingsPage() {
  const router = useRouter();
  const [activeTenant, setActiveTenant] = useState(getActiveCollegeTenant());

  // Settings state
  const [campusAlerts, setCampusAlerts] = useState(true);
  const [incidentUpdates, setIncidentUpdates] = useState(true);
  const [safeWalkReminders, setSafeWalkReminders] = useState(true);
  const [incognitoDefault, setIncognitoDefault] = useState(false);
  const [locationTelemetry, setLocationTelemetry] = useState(true);
  const [safeWord, setSafeWord] = useState('Blueberry');
  const [highContrast, setHighContrast] = useState(false);

  const [saving, setSaving] = useState(false);
  const [savedFeedback, setSavedFeedback] = useState<string | null>(null);

  useEffect(() => {
    setActiveTenant(getActiveCollegeTenant());
    if (typeof window !== 'undefined') {
      try {
        const storedWord = localStorage.getItem('kavach_safe_word');
        if (storedWord) setSafeWord(storedWord);

        const storedSettings = localStorage.getItem('kavach_user_settings');
        if (storedSettings) {
          const parsed = JSON.parse(storedSettings);
          if (parsed.campusAlerts !== undefined) setCampusAlerts(parsed.campusAlerts);
          if (parsed.incidentUpdates !== undefined) setIncidentUpdates(parsed.incidentUpdates);
          if (parsed.safeWalkReminders !== undefined) setSafeWalkReminders(parsed.safeWalkReminders);
          if (parsed.incognitoDefault !== undefined) setIncognitoDefault(parsed.incognitoDefault);
          if (parsed.locationTelemetry !== undefined) setLocationTelemetry(parsed.locationTelemetry);
          if (parsed.highContrast !== undefined) setHighContrast(parsed.highContrast);
        }
      } catch {
        // Ignore localStorage read errors
      }
    }
  }, []);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedFeedback(null);

    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('kavach_safe_word', safeWord.trim() || 'Blueberry');
        localStorage.setItem(
          'kavach_user_settings',
          JSON.stringify({
            campusAlerts,
            incidentUpdates,
            safeWalkReminders,
            incognitoDefault,
            locationTelemetry,
            highContrast
          })
        );
      }
      setSavedFeedback('Your security & notification preferences have been saved successfully.');
    } catch {
      setSavedFeedback('Could not save settings to local cache.');
    } finally {
      setSaving(false);
      setTimeout(() => setSavedFeedback(null), 4000);
    }
  };

  const handleLogout = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch {
      // Ignore network errors
    }
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // Ignore
    }
    document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    if (typeof window !== 'undefined') {
      sessionStorage.clear();
    }
    router.push('/login');
  };

  return (
    <div style={{ maxWidth: '850px', margin: '0 auto', padding: '16px' }}>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '2.4rem', fontWeight: 700, margin: '0 0 8px 0', letterSpacing: '-0.02em' }}>
          Security &amp; Account Settings
        </h1>
        <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '1rem' }}>
          Manage your personal safety telemetry, emergency trigger phrases, and notifications for {activeTenant.shortName}.
        </p>
      </div>

      {savedFeedback && (
        <div style={{
          padding: '14px 18px',
          borderRadius: '12px',
          background: 'rgba(16, 185, 129, 0.15)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          color: 'var(--accent-green)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          marginBottom: '24px',
          fontSize: '0.95rem'
        }}>
          <CheckCircle2 size={20} />
          <span>{savedFeedback}</span>
        </div>
      )}

      <form onSubmit={handleSaveSettings} style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
        
        {/* Active Campus Tenant Information Card */}
        <div className="glass-panel" style={{ padding: '28px', borderRadius: '16px' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.25rem', margin: '0 0 16px 0' }}>
            <Building2 size={22} color="var(--accent-purple)" />
            Active Campus Institution
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Registered Campus Tenant</div>
              <strong style={{ fontSize: '1.05rem', color: '#fff' }}>{activeTenant.name}</strong>
              <div style={{ fontSize: '0.82rem', color: 'var(--accent-blue)', marginTop: '2px' }}>
                {activeTenant.city}, {activeTenant.state} (PIN: {activeTenant.pincode})
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Security Control Room Helpline</div>
              <strong style={{ fontSize: '1.05rem', color: 'var(--accent-green)' }}>{activeTenant.securityControlRoom}</strong>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Geofence Radius: {activeTenant.geofenceRadiusMeters} meters
              </div>
            </div>
          </div>
        </div>

        {/* SOS Safe Word Configuration Card */}
        <div className="glass-panel" style={{ padding: '28px', borderRadius: '16px' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.25rem', margin: '0 0 16px 0' }}>
            <Key size={22} color="var(--accent-yellow)" />
            Emergency SOS Safe Word
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '16px' }}>
            Your safe word confirms emergency distress discreetly to campus security responders even if coerced to speak.
          </p>
          <div style={{ maxWidth: '380px' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px', fontWeight: 600 }}>
              Personal Safe Word
            </label>
            <input
              type="text"
              className="input-field"
              value={safeWord}
              onChange={(e) => setSafeWord(e.target.value)}
              placeholder="e.g. Blueberry, Phoenix, Starlight"
              required
            />
          </div>
        </div>

        {/* Notifications Card */}
        <div className="glass-panel" style={{ padding: '28px', borderRadius: '16px' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.25rem', margin: '0 0 20px 0' }}>
            <Bell size={22} color="var(--accent-blue)" /> Notification Preferences
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
              <div>
                <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>Campus Security &amp; Safety Alerts</span>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Urgent campus alerts broadcast by security officials.</p>
              </div>
              <input 
                type="checkbox" 
                checked={campusAlerts} 
                onChange={(e) => setCampusAlerts(e.target.checked)} 
                style={{ width: '20px', height: '20px', cursor: 'pointer' }} 
              />
            </label>

            <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
              <div>
                <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>Incident Updates &amp; Case Progress</span>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Status changes and responder notes on your filed reports.</p>
              </div>
              <input 
                type="checkbox" 
                checked={incidentUpdates} 
                onChange={(e) => setIncidentUpdates(e.target.checked)} 
                style={{ width: '20px', height: '20px', cursor: 'pointer' }} 
              />
            </label>

            <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
              <div>
                <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>Safe Walk Check-in Reminders</span>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Automated arrival check-in pings during active evening walks.</p>
              </div>
              <input 
                type="checkbox" 
                checked={safeWalkReminders} 
                onChange={(e) => setSafeWalkReminders(e.target.checked)} 
                style={{ width: '20px', height: '20px', cursor: 'pointer' }} 
              />
            </label>
          </div>
        </div>

        {/* Privacy & Location Telemetry Card */}
        <div className="glass-panel" style={{ padding: '28px', borderRadius: '16px' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.25rem', margin: '0 0 20px 0' }}>
            <Lock size={22} color="var(--accent-purple)" /> Privacy &amp; Location Telemetry
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
              <div>
                <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>GPS Telemetry during Active SOS</span>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Transmit live satellite coordinates strictly when SOS or Safe Walk is triggered.</p>
              </div>
              <input 
                type="checkbox" 
                checked={locationTelemetry} 
                onChange={(e) => setLocationTelemetry(e.target.checked)} 
                style={{ width: '20px', height: '20px', cursor: 'pointer' }} 
              />
            </label>

            <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
              <div>
                <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>Default New Reports to Anonymous</span>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Pre-select &quot;Submit Anonymously&quot; on all new complaint forms.</p>
              </div>
              <input 
                type="checkbox" 
                checked={incognitoDefault} 
                onChange={(e) => setIncognitoDefault(e.target.checked)} 
                style={{ width: '20px', height: '20px', cursor: 'pointer' }} 
              />
            </label>
          </div>
        </div>

        {/* Save Changes Button */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <button 
            type="submit" 
            className="btn-primary" 
            disabled={saving}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 28px', fontSize: '1rem', borderRadius: '10px' }}
          >
            <Save size={18} />
            {saving ? 'Saving...' : 'Save All Preferences'}
          </button>

          <button
            type="button"
            onClick={handleLogout}
            style={{
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: 'var(--accent-red)',
              padding: '10px 20px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </form>
    </div>
  );
}

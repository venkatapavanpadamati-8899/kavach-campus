"use client";

import React, { useState, useEffect } from 'react';
import { Brain, Settings, ShieldCheck, AlertCircle, Save, Loader2, Sparkles, CheckCircle2 } from 'lucide-react';

interface AiConfig {
  enabled: boolean;
  model: string;
  modelVersion: string;
  status: 'OPERATIONAL' | 'FALLBACK_RULES';
  statusLabel: string;
  criticalThreatScore: number;
  spamThreshold: number;
  fallbackEnabled: boolean;
  humanReviewMandatory: boolean;
  advisoryMode: boolean;
  lastUpdated?: string | null;
}

export default function AdminAIPage() {
  const [config, setConfig] = useState<AiConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [threatScore, setThreatScore] = useState<number>(80);
  const [spamScore, setSpamScore] = useState<number>(95);
  const [aiEnabled, setAiEnabled] = useState<boolean>(true);
  const [fallbackEnabled, setFallbackEnabled] = useState<boolean>(true);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadConfig() {
      try {
        setLoading(true);
        const res = await fetch('/api/admin/ai');
        if (res.ok) {
          const data = await res.json();
          if (data.configuration) {
            setConfig(data.configuration);
            setThreatScore(data.configuration.criticalThreatScore ?? 80);
            setSpamScore(data.configuration.spamThreshold ?? 95);
            setAiEnabled(data.configuration.enabled ?? true);
            setFallbackEnabled(data.configuration.fallbackEnabled ?? true);
          }
        } else if (res.status === 403 || res.status === 401) {
          setErrorMessage('Access denied. Administrator privileges required to access AI control.');
        } else {
          setErrorMessage('Failed to load current AI configuration.');
        }
      } catch (err) {
        console.error('Fetch AI configuration error:', err);
        setErrorMessage('Network error while connecting to AI administration.');
      } finally {
        setLoading(false);
      }
    }

    loadConfig();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage(null);
    setErrorMessage(null);

    // Validate bounds
    if (threatScore < 50 || threatScore > 100) {
      setErrorMessage('Critical Threat Score must be between 50 and 100.');
      return;
    }

    try {
      setSaving(true);
      const res = await fetch('/api/admin/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled: aiEnabled,
          criticalThreatScore: threatScore,
          spamThreshold: spamScore,
          fallbackEnabled,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setSuccessMessage('AI safety parameters updated and persisted successfully.');
        if (data.configuration) {
          setConfig((prev) => prev ? { ...prev, ...data.configuration } : data.configuration);
        }
      } else {
        setErrorMessage(data.error || 'Failed to update configuration.');
      }
    } catch (err) {
      console.error('Save AI configuration error:', err);
      setErrorMessage('Network error while saving AI configuration.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '40px 20px', textAlign: 'center' }}>
        <Loader2 size={36} color="#34d399" style={{ animation: 'spin 1s linear infinite', margin: '0 auto 16px auto' }} />
        <p style={{ color: 'var(--text-secondary)' }}>Loading Gemini AI Configuration & Diagnostics...</p>
      </div>
    );
  }

  const isOperational = config?.status === 'OPERATIONAL';

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '16px 20px' }}>
      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
          <div style={{ background: 'rgba(16, 185, 129, 0.15)', padding: '8px', borderRadius: '8px', display: 'flex' }}>
            <Brain size={26} color="#34d399" />
          </div>
          <h1 style={{ fontSize: '2.1rem', fontWeight: 800, margin: 0, color: '#ecfdf5' }}>
            Gemini AI Safety Control
          </h1>
        </div>
        <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.95rem' }}>
          Configure Google GenAI threat detection, multi-tier automated risk classification, and safety routing parameters.
        </p>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div style={{
          padding: '12px 16px',
          borderRadius: '10px',
          background: 'rgba(16, 185, 129, 0.18)',
          border: '1px solid rgba(16, 185, 129, 0.45)',
          color: '#a7f3d0',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          marginBottom: '20px',
          fontSize: '0.92rem'
        }}>
          <CheckCircle2 size={18} color="#34d399" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div style={{
          padding: '12px 16px',
          borderRadius: '10px',
          background: 'rgba(239, 68, 68, 0.18)',
          border: '1px solid rgba(239, 68, 68, 0.45)',
          color: '#fca5a5',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          marginBottom: '20px',
          fontSize: '0.92rem'
        }}>
          <AlertCircle size={18} color="#f87171" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSave} style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
        {/* Card 1: Live Engine Status */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', gap: '20px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div style={{ background: 'rgba(16, 185, 129, 0.12)', padding: '14px', borderRadius: '12px' }}>
            <Sparkles size={28} color="#34d399" />
          </div>
          <div style={{ flex: 1, minWidth: '260px' }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '14px', color: '#fff' }}>
              AI Engine Status & Diagnostics
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
              <div>
                <span style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.82rem', marginBottom: '4px' }}>Model Version</span>
                <span style={{ fontWeight: 600, color: '#ecfdf5', fontSize: '0.95rem' }}>
                  {config?.modelVersion || 'Gemini Flash Lite (v2.28)'}
                </span>
              </div>
              <div>
                <span style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.82rem', marginBottom: '4px' }}>Operational Status</span>
                <span style={{
                  color: isOperational ? '#34d399' : '#fbbf24',
                  fontWeight: 600,
                  fontSize: '0.95rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: isOperational ? '#34d399' : '#fbbf24' }} />
                  {config?.statusLabel || (isOperational ? 'Operational' : 'Deterministic Rules Fallback')}
                </span>
              </div>
              <div>
                <span style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.82rem', marginBottom: '4px' }}>Governance Mode</span>
                <span style={{ color: '#a7f3d0', fontWeight: 600, fontSize: '0.95rem', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                  <ShieldCheck size={16} color="#34d399" />
                  Advisory with Human Override
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Escalation Thresholds */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', color: '#fff' }}>
            <Settings size={22} color="#34d399" />
            Auto-Escalation & Safety Thresholds
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '18px' }}>
            {/* Critical Threat Score Setting */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '16px 18px',
              background: 'rgba(255,255,255,0.03)',
              borderRadius: '10px',
              border: '1px solid rgba(255,255,255,0.07)',
              flexWrap: 'wrap',
              gap: '12px'
            }}>
              <div style={{ maxWidth: '600px' }}>
                <h4 style={{ margin: '0 0 4px 0', fontSize: '1rem', color: '#fff' }}>
                  Critical Threat Score Threshold ({threatScore}%)
                </h4>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  Automatically triggers rapid priority security staff notification when the Gemini risk score reaches or exceeds this percentage.
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <input
                  type="range"
                  min="50"
                  max="100"
                  value={threatScore}
                  onChange={(e) => setThreatScore(Number(e.target.value))}
                  style={{ width: '120px', accentColor: '#10b981' }}
                />
                <input
                  type="number"
                  min="50"
                  max="100"
                  value={threatScore}
                  onChange={(e) => setThreatScore(Number(e.target.value))}
                  className="input-field"
                  style={{ width: '70px', textAlign: 'center', padding: '6px 8px', fontSize: '0.92rem' }}
                />
              </div>
            </div>

            {/* Spam Detection Threshold */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '16px 18px',
              background: 'rgba(255,255,255,0.03)',
              borderRadius: '10px',
              border: '1px solid rgba(255,255,255,0.07)',
              flexWrap: 'wrap',
              gap: '12px'
            }}>
              <div style={{ maxWidth: '600px' }}>
                <h4 style={{ margin: '0 0 4px 0', fontSize: '1rem', color: '#fff' }}>
                  Spam Flagging Confidence ({spamScore}%)
                </h4>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  Flag submissions with high spam confidence for staff review. (Mandatory Policy: Complaints are NEVER automatically deleted).
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <input
                  type="number"
                  min="50"
                  max="100"
                  value={spamScore}
                  disabled
                  title="Spam filter is strictly advisory with human verification"
                  className="input-field"
                  style={{ width: '70px', textAlign: 'center', padding: '6px 8px', fontSize: '0.92rem', opacity: 0.8 }}
                />
              </div>
            </div>

            {/* Fallback Guardrail */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '16px 18px',
              background: 'rgba(255,255,255,0.03)',
              borderRadius: '10px',
              border: '1px solid rgba(255,255,255,0.07)',
              flexWrap: 'wrap',
              gap: '12px'
            }}>
              <div style={{ maxWidth: '600px' }}>
                <h4 style={{ margin: '0 0 4px 0', fontSize: '1rem', color: '#fff' }}>
                  Deterministic Safety Rules Fallback
                </h4>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  If the Gemini API encounters timeouts or quota constraints, automatically fail-safe to local deterministic keyword and emergency routing rules.
                </p>
              </div>
              <div>
                <input
                  type="checkbox"
                  checked={fallbackEnabled}
                  onChange={(e) => setFallbackEnabled(e.target.checked)}
                  style={{ width: '20px', height: '20px', accentColor: '#10b981', cursor: 'pointer' }}
                />
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button
              type="submit"
              disabled={saving}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 22px',
                borderRadius: '8px',
                background: '#059669',
                border: 'none',
                color: '#ffffff',
                fontWeight: 600,
                fontSize: '0.92rem',
                cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.7 : 1,
                transition: 'all 0.2s'
              }}
            >
              {saving ? (
                <>
                  <Loader2 size={17} style={{ animation: 'spin 1s linear infinite' }} />
                  <span>Saving Configuration...</span>
                </>
              ) : (
                <>
                  <Save size={17} />
                  <span>Save AI Configuration</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

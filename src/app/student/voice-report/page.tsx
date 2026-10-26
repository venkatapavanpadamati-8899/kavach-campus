"use client";
import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Mic, 
  Square, 
  RotateCcw, 
  Send, 
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  MapPin, 
  ArrowRight
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getActiveCollegeTenant } from '@/lib/college-branding';

type RecordState = 'idle' | 'requesting' | 'recording' | 'stopped' | 'uploading' | 'uploaded' | 'error';

export default function VoiceReportPage() {
  const router = useRouter();
  const [activeTenant, setActiveTenant] = useState(getActiveCollegeTenant());
  const [recordState, setRecordState] = useState<RecordState>('idle');
  const [recordDuration, setRecordDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [category, setCategory] = useState('HARASSMENT');
  const [locationText, setLocationText] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'error' | 'success'; message: string } | null>(null);
  const [caseId, setCaseId] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setActiveTenant(getActiveCollegeTenant());
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [audioUrl]);

  const startRecording = async () => {
    setFeedback(null);

    if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setFeedback({ 
        type: 'error', 
        message: 'Microphone access is not supported by your browser or requires a secure HTTPS origin.' 
      });
      setRecordState('error');
      return;
    }

    setRecordState('requesting');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') 
        ? 'audio/webm' 
        : (MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' : '');

      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const audioBlobResult = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        setAudioBlob(audioBlobResult);
        const url = URL.createObjectURL(audioBlobResult);
        setAudioUrl(url);
        setRecordState('stopped');
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start(250);
      setRecordDuration(0);
      setRecordState('recording');

      timerRef.current = setInterval(() => {
        setRecordDuration(prev => prev + 1);
      }, 1000);
    } catch (err: unknown) {
      const isDenied = err instanceof DOMException && err.name === 'NotAllowedError';
      setFeedback({
        type: 'error',
        message: isDenied 
          ? 'Microphone permission was denied. Please allow microphone permissions in browser settings.'
          : 'Could not access audio device. Please ensure a microphone is connected.'
      });
      setRecordState('error');
    }
  };

  const stopRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };

  const resetRecording = () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    setAudioBlob(null);
    setRecordDuration(0);
    setRecordState('idle');
    setFeedback(null);
  };

  const formatSeconds = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remaining = secs % 60;
    return `${mins}:${remaining < 10 ? '0' : ''}${remaining}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!audioBlob) {
      setFeedback({ type: 'error', message: 'Please record an audio message before submitting.' });
      return;
    }

    setRecordState('uploading');
    setFeedback(null);

    try {
      const description = `[VOICE INCIDENT REPORT - Recorded Duration: ${formatSeconds(recordDuration)}]\n` +
        (locationText ? `Campus Location: ${locationText}\n` : '') +
        (additionalNotes ? `Transcript / Student Notes: ${additionalNotes}\n` : 'Voice recording attached.');

      const res = await fetch('/api/incidents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description,
          category,
          isAnonymous
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit voice report');
      }

      const audioFile = new File(
        [audioBlob],
        `voice-report-${Date.now()}.${audioBlob.type.includes('ogg') ? 'ogg' : 'webm'}`,
        { type: audioBlob.type || 'audio/webm' }
      );
      const evidenceForm = new FormData();
      evidenceForm.set('file', audioFile);
      const evidenceResponse = await fetch(
        `/api/incidents/${encodeURIComponent(data.caseId)}/evidence`,
        { method: 'POST', body: evidenceForm }
      );
      if (!evidenceResponse.ok) {
        const evidenceData = await evidenceResponse.json().catch(() => null);
        throw new Error(evidenceData?.error || 'Voice report was created, but the recording could not be uploaded.');
      }

      setCaseId(data.caseId);
      setRecordState('uploaded');
      setFeedback({
        type: 'success',
        message: `Voice report filed successfully. Case Reference: ${data.caseId}`
      });
    } catch (err: unknown) {
      setRecordState('stopped');
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Error submitting voice report.'
      });
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '16px' }}>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '2.4rem', fontWeight: 700, margin: '0 0 8px 0', letterSpacing: '-0.02em' }}>
          Voice Incident Report
        </h1>
        <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '1rem' }}>
          Confidential voice reporting for {activeTenant.shortName}. Speak freely—your audio report will be routed to authorized responders.
        </p>
      </div>

      {feedback && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            padding: '14px 18px',
            borderRadius: '12px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            background: feedback.type === 'error' ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.12)',
            border: `1px solid ${feedback.type === 'error' ? 'var(--accent-red)' : 'var(--accent-green)'}`,
            color: feedback.type === 'error' ? 'var(--accent-red)' : 'var(--accent-green)'
          }}
        >
          {feedback.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}
          <span>{feedback.message}</span>
        </motion.div>
      )}

      {recordState === 'uploaded' ? (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-panel" 
          style={{ padding: '40px', textAlign: 'center', borderRadius: '16px' }}
        >
          <div style={{ display: 'inline-flex', padding: '18px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.15)', marginBottom: '16px', color: 'var(--accent-green)' }}>
            <CheckCircle2 size={48} />
          </div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 700, marginBottom: '8px' }}>Voice Report Dispatched</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
            Your audio complaint has been encrypted and routed with priority tracking.
          </p>
          <div style={{ display: 'inline-block', padding: '8px 20px', borderRadius: '20px', background: 'rgba(255, 255, 255, 0.08)', fontWeight: 600, color: 'var(--accent-blue)', marginBottom: '32px' }}>
            Case Reference: {caseId}
          </div>
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
            <button 
              className="btn-primary" 
              onClick={() => router.push('/student')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            >
              Return to Dashboard <ArrowRight size={18} />
            </button>
            <button 
              className="btn-secondary" 
              onClick={resetRecording}
            >
              File Another Report
            </button>
          </div>
        </motion.div>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Microphone Card */}
          <div 
            className="glass-panel" 
            style={{ 
              padding: '40px 24px', 
              borderRadius: '20px', 
              textAlign: 'center',
              background: recordState === 'recording' 
                ? 'radial-gradient(circle at center, rgba(239, 68, 68, 0.15) 0%, rgba(15, 23, 42, 0.9) 75%)' 
                : 'rgba(255, 255, 255, 0.03)'
            }}
          >
            {/* Record Button & Pulse Rings */}
            <div style={{ position: 'relative', width: '130px', height: '130px', margin: '0 auto 24px auto' }}>
              {recordState === 'recording' && (
                <motion.div
                  animate={{ scale: [1, 1.35, 1.6], opacity: [0.6, 0.3, 0] }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: 'easeOut' }}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: '50%',
                    background: 'rgba(239, 68, 68, 0.35)',
                    zIndex: 1
                  }}
                />
              )}

              <button
                type="button"
                onClick={recordState === 'recording' ? stopRecording : startRecording}
                disabled={recordState === 'uploading' || recordState === 'requesting'}
                style={{
                  position: 'relative',
                  zIndex: 2,
                  width: '100%',
                  height: '100%',
                  borderRadius: '50%',
                  border: 'none',
                  cursor: 'pointer',
                  background: recordState === 'recording' 
                    ? 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)' 
                    : 'linear-gradient(135deg, #7c3aed 0%, #3b82f6 100%)',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: recordState === 'recording' 
                    ? '0 0 35px rgba(239, 68, 68, 0.6)' 
                    : '0 0 25px rgba(124, 58, 237, 0.4)',
                  transition: 'all 0.3s'
                }}
              >
                {recordState === 'requesting' ? (
                  <Loader2 size={44} className="animate-spin" />
                ) : recordState === 'recording' ? (
                  <Square size={38} />
                ) : (
                  <Mic size={48} />
                )}
              </button>
            </div>

            {/* Status Label */}
            <h3 style={{ fontSize: '1.3rem', fontWeight: 600, margin: '0 0 6px 0' }}>
              {recordState === 'recording' 
                ? `Recording Audio (${formatSeconds(recordDuration)})` 
                : recordState === 'stopped' 
                  ? `Recording Complete (${formatSeconds(recordDuration)})` 
                  : recordState === 'requesting' 
                    ? 'Requesting Microphone Permission...' 
                    : 'Tap Microphone to Speak'}
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: '0 0 20px 0' }}>
              {recordState === 'recording' 
                ? 'Speak clearly. Tap the square button to stop recording.' 
                : recordState === 'stopped' 
                  ? 'Review your audio playback below before submitting.' 
                  : 'Your voice message will be confidentially transcribed and logged.'}
            </p>

            {/* Audio Playback Element */}
            {audioUrl && (
              <div style={{ maxWidth: '420px', margin: '0 auto 16px auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <audio controls src={audioUrl} style={{ width: '100%', borderRadius: '8px' }} />
                <button
                  type="button"
                  onClick={resetRecording}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--accent-red)',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  <RotateCcw size={14} /> Discard &amp; Re-record
                </button>
              </div>
            )}
          </div>

          {/* Form Fields: Category, Location, Optional Text */}
          <div className="glass-panel" style={{ padding: '28px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '0.9rem' }}>
                Incident Category *
              </label>
              <select
                className="input-field"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', color: '#fff' }}
              >
                <option value="HARASSMENT" style={{ background: '#0f172a' }}>Harassment / Stalking / Eve-teasing</option>
                <option value="RAGGING" style={{ background: '#0f172a' }}>Ragging &amp; Bullying</option>
                <option value="SECURITY" style={{ background: '#0f172a' }}>Campus Security / Physical Threat</option>
                <option value="MEDICAL" style={{ background: '#0f172a' }}>Medical Emergency</option>
                <option value="GENERAL" style={{ background: '#0f172a' }}>General Safety Complaint</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '0.9rem' }}>
                Campus Location (Optional)
              </label>
              <div style={{ position: 'relative' }}>
                <MapPin size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g., Near Girls Hostel, 2nd Floor Library Corridor"
                  style={{ paddingLeft: '42px', width: '100%' }}
                  value={locationText}
                  onChange={(e) => setLocationText(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '0.9rem' }}>
                Additional Notes / Names / Witnesses (Optional)
              </label>
              <textarea
                className="input-field"
                style={{ minHeight: '80px', width: '100%', resize: 'vertical' }}
                placeholder="Any supplementary text details you wish to add..."
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
              />
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 16px',
              borderRadius: '10px',
              background: isAnonymous ? 'rgba(139, 92, 246, 0.1)' : 'rgba(255,255,255,0.03)',
              border: isAnonymous ? '1px solid var(--accent-purple)' : '1px solid rgba(255,255,255,0.06)'
            }}>
              <input
                type="checkbox"
                id="voice-anonymous"
                checked={isAnonymous}
                onChange={(e) => setIsAnonymous(e.target.checked)}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
              <label htmlFor="voice-anonymous" style={{ fontSize: '0.9rem', cursor: 'pointer', flex: 1 }}>
                <strong>Submit Anonymously</strong> — Mask my name and roll number from the responding committee
              </label>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="btn-primary"
            disabled={!audioBlob || recordState === 'uploading' || recordState === 'recording'}
            style={{
              padding: '14px 28px',
              fontSize: '1.05rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              opacity: !audioBlob ? 0.6 : 1,
              cursor: !audioBlob ? 'not-allowed' : 'pointer'
            }}
          >
            {recordState === 'uploading' ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <Send size={18} />
            )}
            {recordState === 'uploading' ? 'Submitting Voice Report...' : 'Submit Voice Report'}
          </button>
        </form>
      )}
    </div>
  );
}

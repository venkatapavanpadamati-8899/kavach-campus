"use client";
import React, { useState, Suspense, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Camera, 
  Video, 
  Upload, 
  MapPin, 
  Send, 
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  X, 
  Navigation,
  Calendar,
  Building2,
  Mic,
  ArrowRight
} from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { getActiveCollegeTenant } from '@/lib/college-branding';

function FileReportForm() {
  const searchParams = useSearchParams();
  const photoInputRef = useRef<HTMLInputElement>(null);
  const photoCaptureRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const [activeTenant, setActiveTenant] = useState(getActiveCollegeTenant());
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(searchParams.get('category')?.toUpperCase() || 'HARASSMENT');
  const [locationBuilding, setLocationBuilding] = useState('');
  const [locationText, setLocationText] = useState('');
  const [incidentDateTime, setIncidentDateTime] = useState('');
  const [coords, setCoords] = useState<{ lat: number | null; lng: number | null }>({ lat: null, lng: null });
  const [locating, setLocating] = useState(false);
  const isAnonInitial = searchParams.get('anonymous') === 'true';
  const [isAnonymous, setIsAnonymous] = useState(isAnonInitial);

  // Attachment state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileType, setFileType] = useState<'image' | 'video' | 'doc' | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'error' | 'success'; message: string; caseId?: string } | null>(null);

  useEffect(() => {
    setActiveTenant(getActiveCollegeTenant());
  }, []);

  const detectLocation = () => {
    if (!navigator.geolocation) {
      setFeedback({ type: 'error', message: 'Geolocation is not supported by your browser' });
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        // Validate coordinates
        if (pos.coords.latitude >= -90 && pos.coords.latitude <= 90 &&
            pos.coords.longitude >= -180 && pos.coords.longitude <= 180) {
          setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          if (!locationText) {
            setLocationText(`GPS: ${pos.coords.latitude.toFixed(4)}° N, ${pos.coords.longitude.toFixed(4)}° E (Campus Area)`);
          }
        }
        setLocating(false);
      },
      () => {
        setLocating(false);
        setFeedback({ type: 'error', message: 'Unable to acquire GPS automatically. Please select your campus building manually.' });
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  const handleFile = (file: File) => {
    if (file.size > 25 * 1024 * 1024) {
      setFeedback({ type: 'error', message: 'File is too large. Maximum allowed attachment size is 25MB.' });
      return;
    }

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    if (file.type.startsWith('image/')) {
      setFileType('image');
    } else if (file.type.startsWith('video/')) {
      setFileType('video');
    } else {
      setFileType('doc');
    }
    setFeedback(null);
  };

  const removeFile = () => {
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setFileType(null);
    if (photoInputRef.current) photoInputRef.current.value = '';
    if (photoCaptureRef.current) photoCaptureRef.current.value = '';
    if (videoInputRef.current) videoInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      setFeedback({ type: 'error', message: 'Please describe the incident in detail.' });
      return;
    }

    setSubmitting(true);
    setFeedback(null);

    try {
      const locationParts: string[] = [];
      if (locationBuilding) locationParts.push(`Building/Block: ${locationBuilding}`);
      if (locationText) locationParts.push(`Details: ${locationText}`);
      if (incidentDateTime) locationParts.push(`Incident Date/Time: ${new Date(incidentDateTime).toLocaleString()}`);
      if (selectedFile) locationParts.push(`Attachment: ${selectedFile.name} (${(selectedFile.size / 1024).toFixed(0)} KB)`);

      const fullDescription = locationParts.length > 0
        ? `[Incident Metadata:\n${locationParts.join('\n')}]\n\n${description.trim()}`
        : description.trim();

      const res = await fetch('/api/incidents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          description: fullDescription,
          category,
          locationLat: coords.lat !== null ? coords.lat : null, 
          locationLng: coords.lng !== null ? coords.lng : null, 
          isAnonymous 
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit report');
      }

      if (selectedFile) {
        const evidenceForm = new FormData();
        evidenceForm.set('file', selectedFile);
        const evidenceResponse = await fetch(
          `/api/incidents/${encodeURIComponent(data.caseId)}/evidence`,
          { method: 'POST', body: evidenceForm }
        );
        if (!evidenceResponse.ok) {
          const evidenceData = await evidenceResponse.json().catch(() => null);
          throw new Error(evidenceData?.error || 'Incident was created, but the attachment could not be uploaded.');
        }
      }

      setFeedback({ 
        type: 'success', 
        message: `Incident recorded successfully. Registered with ${activeTenant.shortName} safety desk.`,
        caseId: data.caseId
      });
    } catch (err: unknown) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'An unexpected error occurred while filing the report.'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const campusBuildings = activeTenant.campusBuildings || [
    'Main Administrative Block',
    'CSE & IT Block',
    'Mechanical Sciences Block',
    'ECE & EEE Department',
    'Central Library & Auditorium',
    'Girls Hostel Complex',
    'Boys Hostel Wing',
    'Sports Complex & Gym'
  ];

  return (
    <div style={{ maxWidth: '850px', margin: '0 auto', padding: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '2.4rem', fontWeight: 700, margin: '0 0 8px 0', letterSpacing: '-0.02em' }}>
            File an Incident Report
          </h1>
          <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '1rem' }}>
            {activeTenant.shortName} Safety Redressal Portal. Complete text-based incident reporting with photo, video, and GPS logging.
          </p>
        </div>
        <Link href="/student/voice-report">
          <button className="btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 18px', borderRadius: '10px' }}>
            <Mic size={18} color="var(--accent-purple)" /> Voice Report
          </button>
        </Link>
      </div>

      {feedback && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            padding: '16px 20px',
            borderRadius: '12px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            background: feedback.type === 'error' ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.12)',
            border: `1px solid ${feedback.type === 'error' ? 'var(--accent-red)' : 'var(--accent-green)'}`,
            color: feedback.type === 'error' ? 'var(--accent-red)' : 'var(--accent-green)'
          }}
        >
          {feedback.type === 'error' ? <AlertCircle size={22} style={{ flexShrink: 0, marginTop: '2px' }} /> : <CheckCircle2 size={22} style={{ flexShrink: 0, marginTop: '2px' }} />}
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: '1rem' }}>{feedback.message}</div>
            {feedback.caseId && (
              <div style={{ marginTop: '8px', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ padding: '4px 12px', background: 'rgba(255,255,255,0.08)', borderRadius: '6px', fontWeight: 700, color: '#fff' }}>
                  Case ID: {feedback.caseId}
                </span>
                <Link href="/student/cases" style={{ color: 'var(--accent-blue)', textDecoration: 'underline', fontSize: '0.9rem' }}>
                  View in My Cases &rarr;
                </Link>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {feedback?.caseId ? (
        <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', borderRadius: '16px' }}>
          <CheckCircle2 size={54} color="var(--accent-green)" style={{ margin: '0 auto 16px auto' }} />
          <h2 style={{ fontSize: '1.8rem', fontWeight: 700, marginBottom: '8px' }}>Report Successfully Submitted</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', maxWidth: '440px', margin: '0 auto 24px auto' }}>
            Your case reference is <strong>{feedback.caseId}</strong>. Authorized responders have been alerted. You can track this case in real-time.
          </p>
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
            <Link href="/student/cases">
              <button className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                Track in My Cases <ArrowRight size={18} />
              </button>
            </Link>
            <button 
              className="btn-secondary" 
              onClick={() => {
                setDescription('');
                setLocationBuilding('');
                setLocationText('');
                removeFile();
                setFeedback(null);
              }}
            >
              Submit Another Report
            </button>
          </div>
        </div>
      ) : (
        <motion.div 
          initial={{ opacity: 0, y: 15 }} 
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel" 
          style={{ padding: '32px', borderRadius: '16px' }}
        >
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* Category and Date/Time Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '0.9rem' }}>
                  Incident Category *
                </label>
                <select
                  className="input-field"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.06)', borderRadius: '8px', color: '#fff' }}
                >
                  <option value="HARASSMENT" style={{ background: '#0f172a' }}>Harassment / Stalking / Eve-teasing</option>
                  <option value="RAGGING" style={{ background: '#0f172a' }}>Ragging &amp; Bullying</option>
                  <option value="SECURITY" style={{ background: '#0f172a' }}>Campus Security / Physical Threat</option>
                  <option value="THEFT" style={{ background: '#0f172a' }}>Theft / Property Loss</option>
                  <option value="MEDICAL" style={{ background: '#0f172a' }}>Medical Emergency / Health</option>
                  <option value="GENERAL" style={{ background: '#0f172a' }}>General Safety Complaint / Hazard</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '0.9rem' }}>
                  Approximate Date &amp; Time (Optional)
                </label>
                <div style={{ position: 'relative' }}>
                  <Calendar size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                  <input
                    type="datetime-local"
                    className="input-field"
                    value={incidentDateTime}
                    onChange={(e) => setIncidentDateTime(e.target.value)}
                    style={{ paddingLeft: '42px', width: '100%', color: '#fff' }}
                  />
                </div>
              </div>
            </div>

            {/* Description Area */}
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '0.9rem' }}>
                Incident Description *
              </label>
              <textarea 
                className="input-field" 
                style={{ minHeight: '140px', resize: 'vertical', width: '100%', lineHeight: '1.6' }}
                placeholder="Describe what occurred in detail: what happened, names or descriptions of persons involved, witnesses, and any immediate safety hazards..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </div>

            {/* Location Section */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '0.9rem' }}>
                  Campus Block / Building
                </label>
                <div style={{ position: 'relative' }}>
                  <Building2 size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                  <select
                    className="input-field"
                    value={locationBuilding}
                    onChange={(e) => setLocationBuilding(e.target.value)}
                    style={{ paddingLeft: '42px', width: '100%', background: 'rgba(255,255,255,0.06)', borderRadius: '8px', color: '#fff' }}
                  >
                    <option value="" style={{ background: '#0f172a' }}>-- Select Campus Building --</option>
                    {campusBuildings.map((b) => (
                      <option key={b} value={b} style={{ background: '#0f172a' }}>{b}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ fontWeight: 600, fontSize: '0.9rem' }}>Specific Spot / Room</label>
                  <button
                    type="button"
                    onClick={detectLocation}
                    disabled={locating}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--accent-blue)',
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontWeight: 600
                    }}
                  >
                    {locating ? <Loader2 size={14} className="animate-spin" /> : <Navigation size={14} />}
                    {locating ? 'Acquiring GPS...' : 'Auto-detect GPS'}
                  </button>
                </div>
                <div style={{ position: 'relative' }}>
                  <MapPin size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                  <input 
                    type="text" 
                    className="input-field" 
                    placeholder="e.g. 2nd Floor Corridor near Lab 4" 
                    style={{ paddingLeft: '42px', width: '100%' }}
                    value={locationText}
                    onChange={(e) => setLocationText(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Photo / Video Capture & Upload Section */}
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '0.9rem' }}>
                Photo or Video Evidence (Optional — Text-only report is welcome)
              </label>

              {/* Hidden file inputs */}
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
              <input
                ref={photoCaptureRef}
                type="file"
                accept="image/*"
                capture="environment"
                style={{ display: 'none' }}
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
              <input
                ref={videoInputRef}
                type="file"
                accept="video/*"
                capture="environment"
                style={{ display: 'none' }}
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />

              {!selectedFile ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                  <button
                    type="button"
                    onClick={() => photoCaptureRef.current?.click()}
                    className="btn-secondary"
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px' }}
                  >
                    <Camera size={18} color="var(--accent-purple)" /> Take Camera Photo
                  </button>

                  <button
                    type="button"
                    onClick={() => photoInputRef.current?.click()}
                    className="btn-secondary"
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px' }}
                  >
                    <Upload size={18} color="var(--accent-blue)" /> Upload Photo
                  </button>

                  <button
                    type="button"
                    onClick={() => videoInputRef.current?.click()}
                    className="btn-secondary"
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px' }}
                  >
                    <Video size={18} color="var(--accent-green)" /> Record / Upload Video
                  </button>
                </div>
              ) : (
                <div style={{
                  padding: '16px',
                  borderRadius: '12px',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                      {fileType === 'image' && <Camera size={20} color="var(--accent-purple)" />}
                      {fileType === 'video' && <Video size={20} color="var(--accent-green)" />}
                      {fileType === 'doc' && <Upload size={20} color="var(--accent-blue)" />}
                      <span style={{ fontSize: '0.9rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '300px' }}>
                        {selectedFile.name} ({(selectedFile.size / 1024).toFixed(0)} KB)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={removeFile}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--accent-red)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '0.85rem'
                      }}
                    >
                      <X size={16} /> Remove
                    </button>
                  </div>

                  {/* Visual Preview */}
                  {previewUrl && fileType === 'image' && (
                    <div style={{ maxWidth: '320px', borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={previewUrl} alt="Evidence Preview" style={{ width: '100%', maxHeight: '200px', objectFit: 'cover' }} />
                    </div>
                  )}

                  {previewUrl && fileType === 'video' && (
                    <div style={{ maxWidth: '360px', borderRadius: '8px', overflow: 'hidden' }}>
                      <video controls src={previewUrl} style={{ width: '100%', maxHeight: '220px', borderRadius: '8px' }} />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Anonymous Reporting Checkbox */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'flex-start', 
              gap: '12px', 
              padding: '16px', 
              background: isAnonymous ? 'rgba(139, 92, 246, 0.08)' : 'rgba(255,255,255,0.02)', 
              borderRadius: '12px', 
              border: isAnonymous ? '1px solid var(--accent-purple)' : '1px solid rgba(255,255,255,0.06)' 
            }}>
              <input 
                type="checkbox" 
                id="anonymous" 
                checked={isAnonymous} 
                onChange={(e) => setIsAnonymous(e.target.checked)} 
                style={{ width: '20px', height: '20px', marginTop: '2px', cursor: 'pointer' }} 
              />
              <label htmlFor="anonymous" style={{ flex: 1, cursor: 'pointer' }}>
                <div style={{ fontWeight: 600, color: isAnonymous ? 'var(--accent-purple)' : 'inherit' }}>
                  Submit Anonymously
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Your name and identity will be masked. Responders will only see the incident details and campus location.
                </div>
              </label>
            </div>

            {/* Submit Button */}
            <button 
              type="submit" 
              className="btn-primary" 
              disabled={submitting}
              style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', height: '48px', fontSize: '1.05rem', fontWeight: 600 }}
            >
              {submitting ? <Loader2 size={20} className="animate-spin" /> : <Send size={18} />}
              {submitting ? 'Encrypting & Routing Report...' : 'Submit Incident Report'}
            </button>
          </form>
        </motion.div>
      )}
    </div>
  );
}

export default function FileReportPage() {
  return (
    <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center', color: 'white' }}>Loading Incident Form...</div>}>
      <FileReportForm />
    </Suspense>
  );
}

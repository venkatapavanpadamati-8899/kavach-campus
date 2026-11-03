"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, 
  Lock, 
  Camera, 
  Video, 
  Mic, 
  Upload, 
  FileText, 
  Download, 
  Trash2, 
  Eye, 
  Plus, 
  Search, 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  ArrowRight,
  X
} from 'lucide-react';
import Link from 'next/link';
import { getActiveCollegeTenant } from '@/lib/college-branding';

interface SafeBoxItem {
  id: string;
  caseId: string | null;
  fileName: string;
  fileSize: number;
  mimeType: string;
  type?: string;
  notes?: string | null;
  uploadedBy: string;
  createdAt: string;
  signedUrl: string | null;
}

export default function SafeBoxPage() {
  const [activeTenant, setActiveTenant] = useState(getActiveCollegeTenant());
  const [items, setItems] = useState<SafeBoxItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'error' | 'success'; message: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'IMAGE' | 'VIDEO' | 'AUDIO' | 'DOCUMENT'>('ALL');
  
  // Upload State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [caseReference, setCaseReference] = useState('');
  const [privateNotes, setPrivateNotes] = useState('');
  const [previewModalItem, setPreviewModalItem] = useState<SafeBoxItem | null>(null);

  // Hidden File Inputs
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setActiveTenant(getActiveCollegeTenant());
    fetchSafeBoxItems();
    return () => {
      if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
    };
  }, [filePreviewUrl]);

  const fetchSafeBoxItems = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/student/safe-box');
      const data = await res.json();
      if (res.ok && data.success) {
        setItems(data.items || []);
      } else {
        setFeedback({ type: 'error', message: data.error || 'Unable to load Safe Box records.' });
      }
    } catch {
      setFeedback({ type: 'error', message: 'Network connection failure while accessing Safe Box.' });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectFile = (file: File) => {
    if (file.size > 25 * 1024 * 1024) {
      setFeedback({ type: 'error', message: 'Attachment exceeds the 25MB safety limit.' });
      return;
    }
    if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);

    setSelectedFile(file);
    if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
      setFilePreviewUrl(URL.createObjectURL(file));
    } else {
      setFilePreviewUrl(null);
    }
    setFeedback(null);
  };

  const clearSelection = () => {
    if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
    setSelectedFile(null);
    setFilePreviewUrl(null);
    setCaseReference('');
    setPrivateNotes('');
    if (cameraInputRef.current) cameraInputRef.current.value = '';
    if (photoInputRef.current) photoInputRef.current.value = '';
    if (videoInputRef.current) videoInputRef.current.value = '';
    if (audioInputRef.current) audioInputRef.current.value = '';
    if (docInputRef.current) docInputRef.current.value = '';
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setFeedback({ type: 'error', message: 'Please select or capture a file first.' });
      return;
    }

    setUploading(true);
    setFeedback(null);

    try {
      const formData = new FormData();
      formData.set('file', selectedFile);
      if (caseReference.trim()) {
        formData.set('caseId', caseReference.trim());
      }
      if (privateNotes.trim()) {
        formData.set('notes', privateNotes.trim());
      }

      const res = await fetch('/api/student/safe-box', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to upload evidence to Safe Box.');
      }

      setFeedback({
        type: 'success',
        message: 'Evidence successfully secured in your private Safe Box.',
      });
      clearSelection();
      await fetchSafeBoxItems();
    } catch (err: unknown) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Error uploading evidence.',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to permanently delete this evidence item from your Safe Box?')) {
      return;
    }

    try {
      const res = await fetch(`/api/student/safe-box?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setItems(prev => prev.filter(item => item.id !== id));
        setFeedback({ type: 'success', message: 'Evidence item deleted.' });
      } else {
        setFeedback({ type: 'error', message: data.error || 'Failed to delete evidence.' });
      }
    } catch {
      setFeedback({ type: 'error', message: 'Network error while deleting item.' });
    }
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = 
      !searchQuery.trim() ||
      item.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.caseId && item.caseId.toLowerCase().includes(searchQuery.toLowerCase()));

    let matchesType = true;
    if (filterType === 'IMAGE') matchesType = item.mimeType.startsWith('image/');
    else if (filterType === 'VIDEO') matchesType = item.mimeType.startsWith('video/');
    else if (filterType === 'AUDIO') matchesType = item.mimeType.startsWith('audio/');
    else if (filterType === 'DOCUMENT') matchesType = item.mimeType.includes('pdf') || (!item.mimeType.startsWith('image/') && !item.mimeType.startsWith('video/') && !item.mimeType.startsWith('audio/'));

    return matchesSearch && matchesType;
  });

  return (
    <div style={{ maxWidth: '950px', margin: '0 auto', padding: '16px' }}>
      
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '4px 12px', borderRadius: '16px', background: 'rgba(124, 58, 237, 0.2)', border: '1px solid rgba(124, 58, 237, 0.4)', color: '#c084fc', fontSize: '0.8rem', fontWeight: 700, marginBottom: '8px' }}>
            <Lock size={14} /> Confidential Evidence Vault
          </div>
          <h1 style={{ fontSize: '2.4rem', fontWeight: 800, margin: '0 0 6px 0', letterSpacing: '-0.02em', background: 'linear-gradient(135deg, #fff 0%, #cbd5e1 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Safe Box
          </h1>
          <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.98rem' }}>
            Store and manage private evidence securely for {activeTenant.shortName}. Only you can access or download these items.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <Link href="/student/report">
            <button className="btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 18px', borderRadius: '10px' }}>
              <FileText size={18} color="var(--accent-blue)" /> File Report
            </button>
          </Link>
          <Link href="/student/cases">
            <button className="btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 18px', borderRadius: '10px' }}>
              My Cases <ArrowRight size={16} />
            </button>
          </Link>
        </div>
      </div>

      {/* Alert Banner */}
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
            color: feedback.type === 'error' ? 'var(--accent-red)' : 'var(--accent-green)',
            fontSize: '0.95rem'
          }}
        >
          {feedback.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle size={20} />}
          <span style={{ flex: 1 }}>{feedback.message}</span>
          <button onClick={() => setFeedback(null)} style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer' }}>
            <X size={16} />
          </button>
        </motion.div>
      )}

      {/* Upload & Secure Card */}
      <div className="glass-panel" style={{ padding: '24px', borderRadius: '16px', marginBottom: '32px' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '1.2rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Upload size={20} color="var(--accent-purple)" /> Add Evidence to Safe Box
        </h3>

        {/* Hidden inputs */}
        <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={(e) => e.target.files?.[0] && handleSelectFile(e.target.files[0])} />
        <input ref={photoInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => e.target.files?.[0] && handleSelectFile(e.target.files[0])} />
        <input ref={videoInputRef} type="file" accept="video/*" style={{ display: 'none' }} onChange={(e) => e.target.files?.[0] && handleSelectFile(e.target.files[0])} />
        <input ref={audioInputRef} type="file" accept="audio/*" style={{ display: 'none' }} onChange={(e) => e.target.files?.[0] && handleSelectFile(e.target.files[0])} />
        <input ref={docInputRef} type="file" accept="application/pdf,image/*,video/*,audio/*" style={{ display: 'none' }} onChange={(e) => e.target.files?.[0] && handleSelectFile(e.target.files[0])} />

        {!selectedFile ? (
          <div>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Select evidence source: Photos, videos, voice memos, or document screenshots are encrypted in private storage.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '12px' }}>
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="btn-secondary"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', borderRadius: '10px' }}
              >
                <Camera size={18} color="var(--accent-purple)" /> Camera Photo
              </button>

              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                className="btn-secondary"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', borderRadius: '10px' }}
              >
                <Upload size={18} color="var(--accent-blue)" /> Choose Photo
              </button>

              <button
                type="button"
                onClick={() => videoInputRef.current?.click()}
                className="btn-secondary"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', borderRadius: '10px' }}
              >
                <Video size={18} color="var(--accent-green)" /> Video File
              </button>

              <button
                type="button"
                onClick={() => audioInputRef.current?.click()}
                className="btn-secondary"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', borderRadius: '10px' }}
              >
                <Mic size={18} color="#f59e0b" /> Voice Note
              </button>

              <button
                type="button"
                onClick={() => docInputRef.current?.click()}
                className="btn-secondary"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', borderRadius: '10px' }}
              >
                <FileText size={18} color="#06b6d4" /> PDF / Document
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleUpload}>
            <div style={{
              padding: '16px',
              borderRadius: '12px',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              marginBottom: '16px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {selectedFile.type.startsWith('image/') && <Camera size={22} color="var(--accent-purple)" />}
                  {selectedFile.type.startsWith('video/') && <Video size={22} color="var(--accent-green)" />}
                  {selectedFile.type.startsWith('audio/') && <Mic size={22} color="#f59e0b)" />}
                  {selectedFile.type.includes('pdf') && <FileText size={22} color="#06b6d4" />}
                  <div>
                    <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600 }}>{selectedFile.name}</h4>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      {Math.round(selectedFile.size / 1024)} KB &bull; {selectedFile.type || 'Binary Data'}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={clearSelection}
                  style={{ background: 'transparent', border: 'none', color: 'var(--accent-red)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem' }}
                >
                  <X size={16} /> Cancel
                </button>
              </div>

              {/* Visual Preview */}
              {filePreviewUrl && selectedFile.type.startsWith('image/') && (
                <div style={{ maxWidth: '320px', borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', marginBottom: '12px' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={filePreviewUrl} alt="Preview" style={{ width: '100%', maxHeight: '180px', objectFit: 'cover' }} />
                </div>
              )}
              {filePreviewUrl && selectedFile.type.startsWith('video/') && (
                <div style={{ maxWidth: '360px', borderRadius: '8px', overflow: 'hidden', marginBottom: '12px' }}>
                  <video controls src={filePreviewUrl} style={{ width: '100%', maxHeight: '200px', borderRadius: '8px' }} />
                </div>
              )}

              {/* Optional Fields */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px', marginTop: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    Case ID Reference (Optional)
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="e.g. KC-2026-XXXXX (Leave blank for personal vault)"
                    value={caseReference}
                    onChange={(e) => setCaseReference(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', fontSize: '0.85rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    Private Note / Context (Optional)
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="e.g. Taken near main library steps at 4:30 PM"
                    value={privateNotes}
                    maxLength={2000}
                    onChange={(e) => setPrivateNotes(e.target.value)}
                    aria-label="Private Note / Context (Optional)"
                    style={{ width: '100%', padding: '8px 12px', fontSize: '0.85rem' }}
                  />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="submit"
                disabled={uploading}
                className="btn-primary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 24px', borderRadius: '10px', fontWeight: 700 }}
              >
                {uploading ? <Loader2 size={18} className="animate-spin" /> : <Lock size={18} />}
                {uploading ? 'Securing Evidence...' : 'Encrypt & Store in Safe Box'}
              </button>
              <button
                type="button"
                onClick={clearSelection}
                className="btn-secondary"
                style={{ padding: '12px 18px', borderRadius: '10px' }}
              >
                Clear
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Vault Inventory & Filter Controls */}
      <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Shield size={20} color="var(--accent-blue)" /> Secured Items ({filteredItems.length})
        </h3>

        {/* Search */}
        <div style={{ position: 'relative', minWidth: '220px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="input-field"
            placeholder="Search items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: '36px', width: '100%', fontSize: '0.85rem', padding: '6px 12px 6px 36px', borderRadius: '20px' }}
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', overflowX: 'auto', paddingBottom: '4px' }}>
        {(['ALL', 'IMAGE', 'VIDEO', 'AUDIO', 'DOCUMENT'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setFilterType(tab)}
            style={{
              padding: '6px 16px',
              borderRadius: '20px',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer',
              border: filterType === tab ? '1px solid var(--accent-purple)' : '1px solid rgba(255,255,255,0.08)',
              background: filterType === tab ? 'rgba(124, 58, 237, 0.25)' : 'rgba(255,255,255,0.03)',
              color: filterType === tab ? '#c084fc' : 'var(--text-secondary)',
              transition: 'all 0.2s'
            }}
          >
            {tab === 'ALL' ? 'All Files' : tab === 'IMAGE' ? '📷 Photos' : tab === 'VIDEO' ? '🎥 Videos' : tab === 'AUDIO' ? '🎙️ Audio' : '📄 Documents'}
          </button>
        ))}
      </div>

      {/* Evidence Items Grid */}
      {loading ? (
        <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto 12px auto' }} />
          <p>Unlocking Safe Box...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="glass-panel" style={{ padding: '60px 24px', textAlign: 'center', borderRadius: '16px' }}>
          <Lock size={48} color="var(--text-muted)" style={{ margin: '0 auto 16px auto', opacity: 0.6 }} />
          <h4 style={{ fontSize: '1.2rem', marginBottom: '8px' }}>Safe Box is Empty</h4>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '420px', margin: '0 auto 20px auto', fontSize: '0.9rem' }}>
            {searchQuery || filterType !== 'ALL'
              ? 'No secured evidence matches your search filters.'
              : 'You have not uploaded any private evidence yet. You can store photos, videos, and audio notes here before or after filing reports.'}
          </p>
          <button onClick={() => photoInputRef.current?.click()} className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '10px' }}>
            <Plus size={16} /> Add First Evidence
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
          {filteredItems.map(item => {
            const isImg = item.mimeType.startsWith('image/');
            const isVid = item.mimeType.startsWith('video/');
            const isAud = item.mimeType.startsWith('audio/');

            return (
              <div
                key={item.id}
                className="glass-panel"
                style={{
                  padding: '16px',
                  borderRadius: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '12px',
                  border: '1px solid rgba(255,255,255,0.08)'
                }}
              >
                <div>
                  {/* Thumbnail / Media Container */}
                  <div style={{
                    width: '100%',
                    height: '140px',
                    borderRadius: '8px',
                    background: 'rgba(0,0,0,0.3)',
                    marginBottom: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    position: 'relative'
                  }}>
                    {isImg && item.signedUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.signedUrl} alt={item.fileName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : isVid && item.signedUrl ? (
                      <video src={item.signedUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : isAud ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', color: '#f59e0b' }}>
                        <Mic size={36} />
                        <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>Audio Note</span>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', color: '#06b6d4' }}>
                        <FileText size={36} />
                        <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>PDF Document</span>
                      </div>
                    )}

                    {/* Preview overlay button */}
                    {item.signedUrl && (
                      <button
                        onClick={() => setPreviewModalItem(item)}
                        style={{
                          position: 'absolute',
                          top: '8px',
                          right: '8px',
                          background: 'rgba(15, 23, 42, 0.75)',
                          border: '1px solid rgba(255,255,255,0.2)',
                          color: '#fff',
                          borderRadius: '6px',
                          padding: '6px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                        title="Preview"
                      >
                        <Eye size={14} />
                      </button>
                    )}
                  </div>

                  {/* Metadata */}
                  <h4 style={{ margin: '0 0 4px 0', fontSize: '0.95rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.fileName}>
                    {item.fileName}
                  </h4>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                    <span>{Math.round(item.fileSize / 1024)} KB</span>
                    <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                  </div>
                  {item.notes && (
                    <p style={{ margin: '10px 0 0', fontSize: '0.82rem', color: 'var(--text-secondary)', overflowWrap: 'anywhere' }}>
                      Private note: {item.notes}
                    </p>
                  )}

                  {item.caseId && (
                    <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: '4px', background: 'rgba(59, 130, 246, 0.15)', color: 'var(--accent-blue)', fontSize: '0.75rem', fontWeight: 600 }}>
                      Case: {item.caseId}
                    </span>
                  )}
                </div>

                {/* Card Action Buttons */}
                <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '10px' }}>
                  {item.signedUrl ? (
                    <a
                      href={item.signedUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      download={item.fileName}
                      style={{
                        flex: 1,
                        background: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: '#fff',
                        padding: '8px',
                        borderRadius: '6px',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        textDecoration: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                      }}
                    >
                      <Download size={14} /> Download
                    </a>
                  ) : null}

                  <Link href={`/student/report?evidenceId=${encodeURIComponent(item.id)}`} style={{ textDecoration: 'none' }}>
                    <button
                      className="btn-secondary"
                      style={{ padding: '8px 12px', fontSize: '0.82rem', borderRadius: '6px' }}
                      title="File Report using this evidence"
                    >
                      File Report
                    </button>
                  </Link>

                  <button
                    onClick={() => handleDelete(item.id)}
                    style={{
                      background: 'rgba(239, 68, 68, 0.12)',
                      border: '1px solid rgba(239, 68, 68, 0.25)',
                      color: 'var(--accent-red)',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    title="Delete item"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Preview Modal */}
      <AnimatePresence>
        {previewModalItem && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.85)',
              backdropFilter: 'blur(8px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px',
              zIndex: 9999
            }}
            onClick={() => setPreviewModalItem(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-panel"
              style={{
                maxWidth: '750px',
                width: '100%',
                maxHeight: '90vh',
                overflowY: 'auto',
                padding: '24px',
                borderRadius: '16px',
                position: 'relative'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>{previewModalItem.fileName}</h3>
                <button
                  onClick={() => setPreviewModalItem(null)}
                  style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}
                >
                  <X size={20} />
                </button>
              </div>

              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                {previewModalItem.mimeType.startsWith('image/') && previewModalItem.signedUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={previewModalItem.signedUrl} alt={previewModalItem.fileName} style={{ maxWidth: '100%', maxHeight: '450px', borderRadius: '8px' }} />
                )}
                {previewModalItem.mimeType.startsWith('video/') && previewModalItem.signedUrl && (
                  <video controls autoPlay src={previewModalItem.signedUrl} style={{ width: '100%', maxHeight: '450px', borderRadius: '8px' }} />
                )}
                {previewModalItem.mimeType.startsWith('audio/') && previewModalItem.signedUrl && (
                  <audio controls autoPlay src={previewModalItem.signedUrl} style={{ width: '100%', marginTop: '20px' }} />
                )}
                {previewModalItem.mimeType.includes('pdf') && previewModalItem.signedUrl && (
                  <iframe src={previewModalItem.signedUrl} style={{ width: '100%', height: '450px', borderRadius: '8px', border: 'none' }} />
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  {Math.round(previewModalItem.fileSize / 1024)} KB &bull; {previewModalItem.mimeType}
                </span>
                {previewModalItem.signedUrl && (
                  <a
                    href={previewModalItem.signedUrl}
                    target="_blank"
                    rel="noreferrer"
                    download={previewModalItem.fileName}
                    className="btn-primary"
                    style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 18px', borderRadius: '8px', fontSize: '0.9rem' }}
                  >
                    <Download size={16} /> Download
                  </a>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

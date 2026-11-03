"use client";
import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, Building2, Check, X, PlusCircle, AlertCircle, Loader2 } from 'lucide-react';
import { CollegeTenant } from '@/lib/colleges';

interface CollegeSearchInputProps {
  selectedCollege: CollegeTenant | null;
  onSelectCollege: (college: CollegeTenant | null) => void;
  required?: boolean;
  label?: string;
  error?: string;
}

export function CollegeSearchInput({
  selectedCollege,
  onSelectCollege,
  required = false,
  label = "College / Institution",
  error
}: CollegeSearchInputProps) {
  const [searchMode, setSearchMode] = useState<'NAME' | 'PINCODE'>('NAME');
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<CollegeTenant[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [newCollegeForm, setNewCollegeForm] = useState({
    name: '',
    city: '',
    state: '',
    pincode: '',
    domain: '',
    notes: ''
  });
  const [requestSubmitted, setRequestSubmitted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced college lookup
  useEffect(() => {
    if (!searchTerm.trim()) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const param = /^\d{3,6}$/.test(searchTerm.trim())
          ? `pincode=${encodeURIComponent(searchTerm.trim())}`
          : `query=${encodeURIComponent(searchTerm.trim())}`;

        const res = await fetch(`/api/colleges/search?${param}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data.colleges || []);
          setIsOpen(true);
        }
      } catch (err) {
        console.error('College search error:', err);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const handleSelect = (college: CollegeTenant) => {
    onSelectCollege(college);
    setSearchTerm('');
    setIsOpen(false);
  };

  const handleClear = () => {
    onSelectCollege(null);
    setSearchTerm('');
  };

  const handleRequestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setRequestSubmitted(true);
    setTimeout(() => {
      setShowRequestModal(false);
      setRequestSubmitted(false);
      setNewCollegeForm({ name: '', city: '', state: '', pincode: '', domain: '', notes: '' });
    }, 2000);
  };

  return (
    <div ref={containerRef} style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#ecfdf5', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Building2 size={16} color="#34d399" />
          <span>{label} {required && <span style={{ color: '#f87171' }}>*</span>}</span>
        </label>

        <div style={{ display: 'flex', gap: '4px', background: 'rgba(16, 185, 129, 0.1)', padding: '2px', borderRadius: '6px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
          <button
            type="button"
            onClick={() => { setSearchMode('NAME'); setSearchTerm(''); }}
            style={{
              fontSize: '0.72rem',
              padding: '3px 8px',
              borderRadius: '4px',
              border: 'none',
              background: searchMode === 'NAME' ? '#059669' : 'transparent',
              color: searchMode === 'NAME' ? '#ffffff' : '#a7f3d0',
              cursor: 'pointer',
              fontWeight: searchMode === 'NAME' ? 700 : 500,
              transition: 'all 0.2s'
            }}
          >
            Name Search
          </button>
          <button
            type="button"
            onClick={() => { setSearchMode('PINCODE'); setSearchTerm(''); }}
            style={{
              fontSize: '0.72rem',
              padding: '3px 8px',
              borderRadius: '4px',
              border: 'none',
              background: searchMode === 'PINCODE' ? '#059669' : 'transparent',
              color: searchMode === 'PINCODE' ? '#ffffff' : '#a7f3d0',
              cursor: 'pointer',
              fontWeight: searchMode === 'PINCODE' ? 700 : 500,
              transition: 'all 0.2s'
            }}
          >
            PIN Code Search
          </button>
        </div>
      </div>

      {selectedCollege ? (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 14px',
          borderRadius: '10px',
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(5, 150, 105, 0.10) 100%)',
          border: '1px solid rgba(16, 185, 129, 0.40)',
          color: '#ffffff'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Building2 size={18} color="#ffffff" />
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#ecfdf5', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {selectedCollege.name}
              </div>
              <div style={{ fontSize: '0.74rem', color: '#a7f3d0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <MapPin size={12} />
                <span>{selectedCollege.city}, {selectedCollege.state} — PIN {selectedCollege.pincode}</span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClear}
            style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '6px',
              padding: '6px',
              color: '#f87171',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title="Clear selection"
          >
            <X size={15} />
          </button>
        </div>
      ) : (
        <div style={{ position: 'relative' }}>
          <div style={{ position: 'relative' }}>
            {searchMode === 'PINCODE' ? (
              <MapPin size={18} style={{ position: 'absolute', top: '14px', left: '14px', color: '#34d399' }} />
            ) : (
              <Search size={18} style={{ position: 'absolute', top: '14px', left: '14px', color: '#34d399' }} />
            )}

            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onFocus={() => { if (results.length > 0) setIsOpen(true); }}
              placeholder={searchMode === 'PINCODE' ? "Enter 6-digit Indian PIN code (e.g. 534204, 534202)..." : "Type college name, city or abbreviation (e.g. SRKR, Vishnu, IIT)..."}
              className="input-field"
              style={{
                paddingLeft: '44px',
                paddingRight: loading ? '40px' : '16px',
                background: 'rgba(16, 185, 129, 0.06)',
                border: error ? '1px solid #ef4444' : '1px solid rgba(16, 185, 129, 0.35)',
                color: '#ffffff',
                fontSize: '0.92rem'
              }}
              maxLength={searchMode === 'PINCODE' ? 6 : 100}
            />

            {loading && (
              <Loader2 size={16} style={{ position: 'absolute', top: '15px', right: '14px', color: '#34d399', animation: 'spin 1s linear infinite' }} />
            )}
          </div>

          {/* Results Dropdown */}
          {isOpen && (
            <div style={{
              position: 'absolute',
              top: 'calc(100% + 6px)',
              left: 0,
              right: 0,
              background: '#041f16',
              border: '1px solid rgba(16, 185, 129, 0.35)',
              borderRadius: '10px',
              boxShadow: '0 12px 36px rgba(0, 0, 0, 0.65)',
              zIndex: 60,
              maxHeight: '260px',
              overflowY: 'auto',
              padding: '6px'
            }}>
              {results.length > 0 ? (
                results.map((col) => (
                  <div
                    key={col.id}
                    onClick={() => handleSelect(col)}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '3px',
                      borderBottom: '1px solid rgba(16, 185, 129, 0.1)',
                      transition: 'background 0.15s'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(16, 185, 129, 0.18)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#ecfdf5' }}>
                      {col.name}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.74rem', color: '#a7f3d0' }}>
                      <span>{col.city}, {col.state}</span>
                      <span style={{ padding: '1px 6px', borderRadius: '4px', background: 'rgba(52, 211, 153, 0.15)', color: '#34d399', fontWeight: 700 }}>
                        PIN {col.pincode}
                      </span>
                      {col.isAutonomous && (
                        <span style={{ padding: '1px 6px', borderRadius: '4px', background: 'rgba(99, 102, 241, 0.2)', color: '#a5b4fc', fontSize: '0.68rem' }}>
                          Autonomous
                        </span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ padding: '14px', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
                  <AlertCircle size={20} color="#fbbf24" style={{ margin: '0 auto 6px auto', display: 'block' }} />
                  <div>No institutions found matching &ldquo;{searchTerm}&rdquo;</div>
                  <button
                    type="button"
                    onClick={() => setShowRequestModal(true)}
                    style={{
                      marginTop: '8px',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      background: 'rgba(16, 185, 129, 0.2)',
                      border: '1px solid rgba(16, 185, 129, 0.4)',
                      color: '#34d399',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}
                  >
                    <PlusCircle size={14} />
                    <span>Request New College Addition</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {error && (
        <span style={{ fontSize: '0.76rem', color: '#f87171', paddingLeft: '4px' }}>
          {error}
        </span>
      )}

      {/* Modal for Requesting a New College */}
      {showRequestModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(6px)',
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px'
        }}>
          <div style={{
            background: '#041f16',
            border: '1px solid rgba(16, 185, 129, 0.35)',
            borderRadius: '16px',
            padding: '24px',
            width: '100%',
            maxWidth: '480px',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.8)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#ecfdf5', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <PlusCircle size={20} color="#34d399" />
                <span>Request College Addition</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowRequestModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {requestSubmitted ? (
              <div style={{ padding: '24px 0', textAlign: 'center' }}>
                <Check size={40} color="#34d399" style={{ margin: '0 auto 12px auto' }} />
                <h4 style={{ color: '#ecfdf5', fontSize: '1rem', fontWeight: 700 }}>Request Submitted!</h4>
                <p style={{ color: '#a7f3d0', fontSize: '0.82rem', marginTop: '6px' }}>
                  Our administrative verification team will review your institution details and onboard it shortly.
                </p>
              </div>
            ) : (
              <form onSubmit={handleRequestSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <p style={{ fontSize: '0.8rem', color: '#a7f3d0', margin: 0 }}>
                  If your college is not listed in our verified registry, enter its official details below for verification:
                </p>

                <input
                  type="text"
                  placeholder="Full College Name *"
                  className="input-field"
                  value={newCollegeForm.name}
                  onChange={(e) => setNewCollegeForm({ ...newCollegeForm, name: e.target.value })}
                  required
                />

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <input
                    type="text"
                    placeholder="City / Town *"
                    className="input-field"
                    value={newCollegeForm.city}
                    onChange={(e) => setNewCollegeForm({ ...newCollegeForm, city: e.target.value })}
                    required
                  />
                  <input
                    type="text"
                    placeholder="6-Digit PIN Code *"
                    className="input-field"
                    value={newCollegeForm.pincode}
                    onChange={(e) => setNewCollegeForm({ ...newCollegeForm, pincode: e.target.value })}
                    maxLength={6}
                    pattern="[0-9]{6}"
                    required
                  />
                </div>

                <input
                  type="text"
                  placeholder="State *"
                  className="input-field"
                  value={newCollegeForm.state}
                  onChange={(e) => setNewCollegeForm({ ...newCollegeForm, state: e.target.value })}
                  required
                />

                <input
                  type="text"
                  placeholder="Official Website / Email Domain (e.g. college.edu.in)"
                  className="input-field"
                  value={newCollegeForm.domain}
                  onChange={(e) => setNewCollegeForm({ ...newCollegeForm, domain: e.target.value })}
                />

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setShowRequestModal(false)}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '8px',
                      background: 'rgba(255, 255, 255, 0.08)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      color: '#ffffff',
                      fontSize: '0.85rem',
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                    style={{ padding: '8px 18px', fontSize: '0.85rem' }}
                  >
                    Submit for Verification
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

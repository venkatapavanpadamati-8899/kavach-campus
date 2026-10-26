"use client";
import React, { useState, useEffect } from 'react';
import { Search, MapPin, CheckCircle2, ShieldCheck, Hash } from 'lucide-react';
import { CollegeTenant, searchColleges } from '@/lib/colleges';

interface CollegeSelectorProps {
  onSelect?: (college: CollegeTenant) => void;
  selectedCollegeId?: string;
  className?: string;
}

export default function CollegeSelector({
  onSelect,
  selectedCollegeId,
  className = ''
}: CollegeSelectorProps) {
  const [pincode, setPincode] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [colleges, setColleges] = useState<CollegeTenant[]>([]);
  const [selected, setSelected] = useState<CollegeTenant | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    const results = searchColleges({
      pincode: pincode.trim(),
      query: searchQuery.trim()
    });
    setColleges(results);
  }, [pincode, searchQuery]);

  useEffect(() => {
    if (selectedCollegeId) {
      const match = colleges.find((c) => c.id === selectedCollegeId);
      if (match) setSelected(match);
    }
  }, [selectedCollegeId, colleges]);

  const handleSelect = (college: CollegeTenant) => {
    setSelected(college);
    setShowDropdown(false);
    if (onSelect) {
      onSelect(college);
    }
  };

  return (
    <div className={`college-selector-container ${className}`} style={{ width: '100%' }}>
      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, marginBottom: '8px', color: 'var(--text-primary)' }}>
          Select Engineering College (Campus Tenant)
        </label>
        
        {/* Search Inputs Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr auto', gap: '8px', marginBottom: '12px' }}>
          {/* Pincode Search */}
          <div style={{ position: 'relative' }}>
            <Hash size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
            <input
              type="text"
              placeholder="PIN Code"
              maxLength={6}
              value={pincode}
              onFocus={() => setShowDropdown(true)}
              onChange={(e) => {
                setPincode(e.target.value.replace(/[^0-9]/g, ''));
                setShowDropdown(true);
              }}
              style={{
                width: '100%',
                padding: '10px 10px 10px 32px',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#fff',
                fontSize: '0.9rem'
              }}
            />
          </div>

          {/* Name / City Search */}
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
            <input
              type="text"
              placeholder="Search by college name, city (e.g. Bhimavaram)..."
              value={searchQuery}
              onFocus={() => setShowDropdown(true)}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowDropdown(true);
              }}
              style={{
                width: '100%',
                padding: '10px 12px 10px 36px',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#fff',
                fontSize: '0.9rem'
              }}
            />
          </div>

          {/* Toggle List Button */}
          <button
            type="button"
            onClick={() => setShowDropdown(!showDropdown)}
            style={{
              padding: '10px 14px',
              borderRadius: '8px',
              background: showDropdown ? 'rgba(124, 58, 237, 0.3)' : 'rgba(255, 255, 255, 0.08)',
              border: showDropdown ? '1px solid var(--accent-purple)' : '1px solid rgba(255, 255, 255, 0.15)',
              color: '#fff',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.2s'
            }}
          >
            {showDropdown ? 'Hide List' : 'Browse List'}
          </button>
        </div>

        {/* The selected tenant ID is kept in registration state. Its name is
            intentionally not displayed before authentication/verification. */}
        {selected && <div
          style={{
            padding: '14px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.15), rgba(59, 130, 246, 0.15))',
            border: '1px solid rgba(124, 58, 237, 0.3)',
            marginBottom: '12px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: 'var(--accent-purple)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>
                <ShieldCheck size={14} /> Active Campus Tenant
              </div>
              <h4 style={{ margin: '0 0 4px 0', fontSize: '1rem', color: '#fff' }}>Campus selected</h4>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.82rem', color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <MapPin size={12} /> Your selection will be verified after registration.
                </span>
              </div>
            </div>
            <span
              style={{
                fontSize: '0.75rem',
                padding: '3px 8px',
                borderRadius: '12px',
                background: 'rgba(16, 185, 129, 0.2)',
                color: '#34d399',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                fontWeight: 600
              }}
            >
              Pending verification
            </span>
          </div>

        </div>}

        {/* Results List (if searching, filtering, or browsing) */}
        {(showDropdown || pincode || searchQuery) && (
          <div
            style={{
              maxHeight: '220px',
              overflowY: 'auto',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              background: 'rgba(15, 23, 42, 0.95)',
              padding: '6px'
            }}
          >
            {colleges.length === 0 ? (
              <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                No engineering colleges found for this search. Try entering another pincode or college name.
              </div>
            ) : (
              colleges.map((col) => {
                const isItemSel = col.id === selected?.id;
                return (
                  <button
                    key={col.id}
                    type="button"
                    onClick={() => handleSelect(col)}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '10px 12px',
                      borderRadius: '6px',
                      background: isItemSel ? 'rgba(124, 58, 237, 0.25)' : 'transparent',
                      border: isItemSel ? '1px solid var(--accent-purple)' : '1px solid transparent',
                      color: '#fff',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '4px',
                      transition: 'background 0.2s ease'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{col.name}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        {col.city}, {col.state} • PIN: <strong style={{ color: '#fff' }}>{col.pincode}</strong>
                      </div>
                    </div>
                    {isItemSel && <CheckCircle2 size={16} color="var(--accent-purple)" />}
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}

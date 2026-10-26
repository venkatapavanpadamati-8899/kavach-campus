"use client";
import React, { useState, useEffect } from 'react';
import { Users, Phone, UserPlus, Trash2, AlertCircle, CheckCircle2, Loader2, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface TrustedContact {
  id: string;
  name: string;
  phone: string;
  relationship: string;
  is_verified?: boolean;
}

export default function TrustedContactsPage() {
  const [contacts, setContacts] = useState<TrustedContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [relationship, setRelationship] = useState('Parent');

  const fetchContacts = React.useCallback(async () => {
    try {
      const res = await fetch('/api/student/trusted-contacts');
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to load trusted contacts');
      }
      const data = await res.json();
      setContacts(data.contacts || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not fetch contacts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    fetch('/api/student/trusted-contacts')
      .then(res => res.json())
      .then(data => {
        if (!ignore) {
          setContacts(data.contacts || []);
          setLoading(false);
        }
      })
      .catch(err => {
        if (!ignore) {
          setError(err instanceof Error ? err.message : 'Could not fetch contacts');
          setLoading(false);
        }
      });
    return () => {
      ignore = true;
    };
  }, []);

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      setError('Please provide both contact name and phone number');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const res = await fetch('/api/student/trusted-contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, relationship })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to add contact');
      }

      setSuccess('Trusted contact added successfully.');
      setName('');
      setPhone('');
      setRelationship('Parent');
      setShowAdd(false);
      await fetchContacts();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save contact');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteContact = async (id: string, contactName: string) => {
    if (!window.confirm(`Are you sure you want to remove ${contactName} from your trusted contacts?`)) {
      return;
    }

    try {
      setError(null);
      const res = await fetch(`/api/student/trusted-contacts?id=${encodeURIComponent(id)}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to remove contact');
      }
      setSuccess(`${contactName} was removed from your trusted contacts.`);
      setContacts(prev => prev.filter(c => c.id !== id));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete contact');
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '2.4rem', fontWeight: 700, margin: '0 0 8px 0', letterSpacing: '-0.02em' }}>
            Trusted Contacts
          </h1>
          <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '1rem' }}>
            Manage who receives automated SMS alerts, live GPS location, and SOS notifications during emergencies.
          </p>
        </div>
        <button 
          className="btn-primary" 
          onClick={() => { setShowAdd(!showAdd); setError(null); }} 
          style={{ display: 'flex', gap: '8px', alignItems: 'center', padding: '10px 20px', borderRadius: '12px' }}
        >
          <UserPlus size={18} /> {showAdd ? 'Close' : 'Add Contact'}
        </button>
      </div>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            style={{
              padding: '14px 16px',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid var(--accent-red)',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '20px',
              color: 'var(--accent-red)',
              fontSize: '0.95rem'
            }}
          >
            <AlertCircle size={20} />
            <span>{error}</span>
          </motion.div>
        )}

        {success && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            style={{
              padding: '14px 16px',
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid var(--accent-green)',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '20px',
              color: 'var(--accent-green)',
              fontSize: '0.95rem'
            }}
          >
            <CheckCircle2 size={20} />
            <span>{success}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Contact Modal / Section */}
      <AnimatePresence>
        {showAdd && (
          <motion.div 
            initial={{ opacity: 0, y: -12 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: -12 }}
            className="glass-panel" 
            style={{ padding: '24px', marginBottom: '32px', border: '1px solid var(--accent-purple)', borderRadius: '16px' }}
          >
            <h3 style={{ margin: '0 0 16px 0', fontSize: '1.25rem' }}>Add Emergency Contact</h3>
            <form onSubmit={handleAddContact}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Full Name *</label>
                  <input 
                    type="text" 
                    placeholder="e.g., Jane Doe" 
                    className="input-field" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Relationship *</label>
                  <select 
                    className="input-field"
                    value={relationship}
                    onChange={(e) => setRelationship(e.target.value)}
                  >
                    <option value="Parent">Parent / Guardian</option>
                    <option value="Sibling">Sibling</option>
                    <option value="Roommate">Roommate</option>
                    <option value="Friend">Friend</option>
                    <option value="Faculty Mentor">Faculty Mentor</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Phone Number *</label>
                  <input 
                    type="tel" 
                    placeholder="+91 98765 43210" 
                    className="input-field" 
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button 
                  type="button" 
                  className="btn-secondary" 
                  onClick={() => setShowAdd(false)}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn-primary" 
                  disabled={saving}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                  {saving ? 'Saving...' : 'Save Contact'}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Contacts List */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '60px 0', gap: '12px', color: 'var(--text-secondary)' }}>
          <Loader2 size={24} className="animate-spin" />
          <span>Loading verified trusted contacts...</span>
        </div>
      ) : contacts.length === 0 ? (
        <div className="glass-panel" style={{ padding: '48px 24px', textAlign: 'center', borderRadius: '16px' }}>
          <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(139, 92, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto', color: 'var(--accent-purple)' }}>
            <Users size={28} />
          </div>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '1.25rem' }}>No Trusted Contacts Added Yet</h3>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '440px', margin: '0 auto 24px auto', fontSize: '0.95rem' }}>
            Add roommates, family members, or campus friends who should be immediately alerted if you trigger an SOS.
          </p>
          <button className="btn-primary" onClick={() => setShowAdd(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <UserPlus size={18} /> Add Your First Contact
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {contacts.map((c) => (
            <motion.div 
              key={c.id} 
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-panel" 
              style={{ 
                padding: '20px 24px', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                borderRadius: '14px',
                border: '1px solid rgba(255,255,255,0.06)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ 
                  padding: '12px', 
                  background: 'rgba(139, 92, 246, 0.15)', 
                  borderRadius: '50%', 
                  color: 'var(--accent-purple)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Users size={22} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 600 }}>{c.name}</h3>
                    {c.is_verified && (
                      <span title="Verified Emergency Contact" style={{ display: 'inline-flex', alignItems: 'center', color: 'var(--accent-green)' }}>
                        <ShieldCheck size={16} />
                      </span>
                    )}
                  </div>
                  <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
                    {c.relationship}
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                <a 
                  href={`tel:${c.phone}`}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px', 
                    color: 'var(--accent-blue)', 
                    textDecoration: 'none',
                    fontWeight: 500,
                    fontSize: '0.95rem'
                  }}
                >
                  <Phone size={16} /> {c.phone}
                </a>
                <button 
                  onClick={() => handleDeleteContact(c.id, c.name)}
                  aria-label="Remove contact"
                  style={{ 
                    background: 'rgba(239, 68, 68, 0.1)', 
                    border: 'none', 
                    color: 'var(--accent-red)', 
                    cursor: 'pointer', 
                    padding: '8px',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

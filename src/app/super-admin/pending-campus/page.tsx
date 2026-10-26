"use client";

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle, Loader2, RefreshCw, ShieldCheck } from 'lucide-react';
import { INDIAN_ENGINEERING_COLLEGES } from '@/lib/colleges';

interface PendingCampusAccount {
  id: string;
  full_name: string | null;
  college_email: string;
  role: string;
  college_id: string;
  created_at: string | null;
}

interface ReviewInput {
  collegeId: string;
  reviewNote: string;
  campusVerified: boolean;
}

export default function PendingCampusPage() {
  const [accounts, setAccounts] = useState<PendingCampusAccount[]>([]);
  const [reviewInputs, setReviewInputs] = useState<Record<string, ReviewInput>>({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [hasMore, setHasMore] = useState(false);

  const loadAccounts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/super-admin/pending-campus', { cache: 'no-store' });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Unable to load pending accounts.');
      }
      setAccounts(result.accounts || []);
      setHasMore(result.hasMore === true);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load pending accounts.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAccounts();
  }, [loadAccounts]);

  const updateReviewInput = (accountId: string, changes: Partial<ReviewInput>) => {
    const current = reviewInputs[accountId] || { collegeId: '', reviewNote: '', campusVerified: false };
    setReviewInputs(previous => ({
      ...previous,
      [accountId]: {
        ...current,
        ...changes,
      },
    }));
  };

  const assignCampus = async (account: PendingCampusAccount) => {
    const review = reviewInputs[account.id];
    if (!review?.collegeId || !review.campusVerified || review.reviewNote.trim().length < 10) {
      setError('Select a campus, confirm independent verification, and provide a note of at least 10 characters.');
      return;
    }

    setBusyId(account.id);
    setError('');
    setNotice('');
    try {
      const response = await fetch('/api/super-admin/pending-campus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUserId: account.id,
          collegeId: review.collegeId,
          campusVerified: review.campusVerified,
          reviewNote: review.reviewNote,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Campus assignment failed.');
      }
      setAccounts(previous => previous.filter(item => item.id !== account.id));
      setReviewInputs(previous => {
        const next = { ...previous };
        delete next[account.id];
        return next;
      });
      setNotice(result.message);
    } catch (assignmentError) {
      setError(assignmentError instanceof Error ? assignmentError.message : 'Campus assignment failed.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <main style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 20px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: '2rem', margin: 0 }}>Pending Campus Verification</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: 8 }}>
            Assign a registered campus only after independent institutional verification. Assignment does not approve the account.
          </p>
        </div>
        <button type="button" className="btn-secondary" onClick={() => void loadAccounts()} disabled={loading}>
          <RefreshCw size={16} /> Refresh
        </button>
      </header>

      {notice && (
        <div role="status" style={{ padding: 14, marginBottom: 16, borderRadius: 10, background: 'rgba(16,185,129,.12)', color: 'var(--accent-green)' }}>
          <CheckCircle size={16} style={{ verticalAlign: 'middle', marginRight: 8 }} />{notice}
        </div>
      )}
      {error && (
        <div role="alert" style={{ padding: 14, marginBottom: 16, borderRadius: 10, background: 'rgba(239,68,68,.12)', color: 'var(--accent-red)' }}>
          <AlertTriangle size={16} style={{ verticalAlign: 'middle', marginRight: 8 }} />{error}
        </div>
      )}

      {loading ? (
        <div role="status" className="glass-panel" style={{ padding: 32, textAlign: 'center' }}>
          <Loader2 size={22} /> Loading pending accounts…
        </div>
      ) : accounts.length === 0 ? (
        <div className="glass-panel" style={{ padding: 32, textAlign: 'center', color: 'var(--text-secondary)' }}>
          No unapproved accounts are awaiting campus assignment.
        </div>
      ) : (
        <>
          {hasMore && (
            <p role="status" style={{ color: '#f59e0b', marginBottom: 12 }}>
              Showing the first 100 accounts. Process this queue and refresh to load the next set.
            </p>
          )}
          <section aria-label="Accounts awaiting campus assignment" style={{ display: 'grid', gap: 16 }}>
            {accounts.map(account => {
              const review = reviewInputs[account.id] || { collegeId: '', reviewNote: '', campusVerified: false };
              return (
                <article key={account.id} className="glass-panel" style={{ padding: 20 }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
                    <div>
                      <h2 style={{ fontSize: '1.1rem', margin: 0 }}>{account.full_name || 'Name not provided'}</h2>
                      <div style={{ color: 'var(--text-secondary)', marginTop: 4 }}>{account.college_email}</div>
                    </div>
                    <div style={{ color: '#f59e0b', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <ShieldCheck size={16} /> {account.role} · unapproved
                    </div>
                  </div>

                  <div style={{ display: 'grid', gap: 12 }}>
                    <label>
                      Campus
                      <select
                        value={review.collegeId}
                        onChange={event => updateReviewInput(account.id, { collegeId: event.target.value })}
                        style={{ display: 'block', width: '100%', marginTop: 6, padding: 10 }}
                      >
                        <option value="">Select verified campus</option>
                        {INDIAN_ENGINEERING_COLLEGES.map(college => (
                          <option key={college.id} value={college.id}>{college.name}</option>
                        ))}
                      </select>
                    </label>

                    <label>
                      Verification note (10–500 characters)
                      <textarea
                        value={review.reviewNote}
                        maxLength={500}
                        rows={3}
                        onChange={event => updateReviewInput(account.id, { reviewNote: event.target.value })}
                        style={{ display: 'block', width: '100%', marginTop: 6, padding: 10 }}
                        placeholder="Record the authorized source used to verify campus affiliation."
                      />
                    </label>

                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                      <input
                        type="checkbox"
                        checked={review.campusVerified}
                        onChange={event => updateReviewInput(account.id, { campusVerified: event.target.checked })}
                      />
                      <span>I independently verified this applicant’s campus affiliation using an authorized institutional source.</span>
                    </label>

                    <div>
                      <button
                        type="button"
                        className="btn-primary"
                        disabled={busyId === account.id}
                        onClick={() => void assignCampus(account)}
                      >
                        {busyId === account.id ? 'Assigning…' : 'Assign campus'}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        </>
      )}
    </main>
  );
}

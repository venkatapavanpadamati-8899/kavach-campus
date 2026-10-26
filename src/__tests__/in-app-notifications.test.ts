import { describe, it, expect, vi } from 'vitest';
import { insertInAppNotification } from '@/lib/notifications/in-app';

describe('In-App Notification Schema Resilience (src/lib/notifications/in-app.ts)', () => {
  it('dispatches canonical payload with UUID id, boolean read: false, and incident_id', async () => {
    let capturedPayload: Record<string, unknown> | null = null;
    const mockSupabase = {
      from: vi.fn((table: string) => {
        expect(table).toBe('notifications');
        return {
          insert: vi.fn((payload: Record<string, unknown>) => {
            capturedPayload = payload;
            return Promise.resolve({ error: null });
          }),
        };
      }),
    };

    const res = await insertInAppNotification(mockSupabase, {
      userId: 'user-uuid-1',
      incidentId: 'inc-uuid-1',
      caseId: 'KC-2026-0001',
      title: 'Alert Title',
      message: 'Alert Message',
      type: 'EMERGENCY',
    });

    expect(res.success).toBe(true);
    expect(capturedPayload).not.toBeNull();
    const payload = capturedPayload as unknown as Record<string, unknown>;
    expect(payload.user_id).toBe('user-uuid-1');
    expect(payload.incident_id).toBe('inc-uuid-1');
    expect(payload.case_id).toBe('KC-2026-0001');
    expect(payload.title).toBe('Alert Title');
    expect(payload.message).toBe('Alert Message');
    expect(payload.type).toBe('EMERGENCY');
    expect(payload.read).toBe(false);
    expect(payload.id).toEqual(expect.any(String));
  });

  it('retries gracefully without case_id when case_id column does not exist on remote schema', async () => {
    let attempts = 0;
    const capturedPayloads: Record<string, unknown>[] = [];
    const mockSupabase = {
      from: vi.fn(() => ({
        insert: vi.fn((payload: Record<string, unknown>) => {
          attempts++;
          capturedPayloads.push(payload);
          if (attempts === 1) {
            return Promise.resolve({
              error: { code: 'PGRST204', message: "Could not find the 'case_id' column of 'notifications'" },
            });
          }
          return Promise.resolve({ error: null });
        }),
      })),
    };

    const res = await insertInAppNotification(mockSupabase, {
      userId: 'user-uuid-2',
      incidentId: 'inc-uuid-2',
      caseId: 'KC-2026-0002',
      title: 'Fallback Alert',
      message: 'Testing case_id removal',
    });

    expect(res.success).toBe(true);
    expect(attempts).toBe(2);
    expect(capturedPayloads[0].case_id).toBe('KC-2026-0002');
    expect(capturedPayloads[1].case_id).toBeUndefined();
    expect(capturedPayloads[1].incident_id).toBe('inc-uuid-2');
  });

  it('retries gracefully with is_read: false when read column is absent on remote schema', async () => {
    let attempts = 0;
    const capturedPayloads: Record<string, unknown>[] = [];
    const mockSupabase = {
      from: vi.fn(() => ({
        insert: vi.fn((payload: Record<string, unknown>) => {
          attempts++;
          capturedPayloads.push(payload);
          if (attempts === 1) {
            return Promise.resolve({
              error: { code: 'PGRST204', message: "Could not find the 'read' column of 'notifications'" },
            });
          }
          return Promise.resolve({ error: null });
        }),
      })),
    };

    const res = await insertInAppNotification(mockSupabase, {
      userId: 'user-uuid-3',
      title: 'Boolean Column Fallback',
      message: 'Testing is_read fallback',
    });

    expect(res.success).toBe(true);
    expect(attempts).toBe(2);
    expect(capturedPayloads[0].read).toBe(false);
    expect(capturedPayloads[1].is_read).toBe(false);
    expect(capturedPayloads[1].read).toBeUndefined();
  });

  it('never throws unhandled exceptions when database insert fails completely', async () => {
    const mockSupabase = {
      from: vi.fn(() => ({
        insert: vi.fn().mockRejectedValue(new Error('Network connection dropped')),
      })),
    };

    const res = await insertInAppNotification(mockSupabase, {
      userId: 'user-uuid-4',
      title: 'Network Failure Test',
      message: 'Should not crash caller',
    });

    expect(res.success).toBe(false);
    expect(res.error).toContain('Network connection dropped');
  });
});

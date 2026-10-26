/**
 * In-App Notification Database Helper
 * Handles schema variations across remote database revisions gracefully.
 * Canonical schema: id (UUID), user_id (UUID), incident_id (UUID), title (TEXT), message (TEXT), type (TEXT), read (BOOLEAN), created_at (TIMESTAMPTZ)
 */

export interface InAppNotificationParams {
  userId: string;
  title: string;
  message: string;
  type?: string;
  incidentId?: string;
  caseId?: string;
}

export async function insertInAppNotification(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  params: InAppNotificationParams
): Promise<{ success: boolean; error?: string }> {
  const notifId = crypto.randomUUID();

  // Canonical PostgreSQL payload: boolean 'read: false', UUID 'incident_id'
  const payload: Record<string, unknown> = {
    id: notifId,
    user_id: params.userId,
    title: params.title,
    message: params.message,
    type: params.type || 'SYSTEM',
    read: false,
  };

  if (params.incidentId) {
    payload.incident_id = params.incidentId;
  }
  if (params.caseId) {
    payload.case_id = params.caseId;
  }

  try {
    let { error } = await supabase.from('notifications').insert(payload);

    const errMsg = (error?.message || '').toLowerCase();

    // If 'case_id' does not exist on remote PostgreSQL schema
    if (error && (errMsg.includes('case_id') || errMsg.includes("'case_id'"))) {
      const withoutCaseId: Record<string, unknown> = { ...payload };
      delete withoutCaseId.case_id;
      const res = await supabase.from('notifications').insert(withoutCaseId);
      error = res.error;
    }

    // If 'incident_id' does not exist on remote schema
    if (error && (errMsg.includes('incident_id') || errMsg.includes("'incident_id'"))) {
      const withoutIncidentId: Record<string, unknown> = { ...payload };
      delete withoutIncidentId.incident_id;
      const res = await supabase.from('notifications').insert(withoutIncidentId);
      error = res.error;
    }

    // If 'read' column is absent on remote schema but 'is_read' exists
    if (error && (errMsg.includes("'read'") || errMsg.includes('column read of') || (errMsg.includes('read') && !errMsg.includes('is_read')))) {
      const withIsRead: Record<string, unknown> = { ...payload, is_read: false };
      delete withIsRead.read;
      const res = await supabase.from('notifications').insert(withIsRead);
      error = res.error;
    }

    if (error) {
      console.warn('[InAppNotification] Database insert warning (non-fatal):', error.message || error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.warn('[InAppNotification] Unexpected insert error (non-fatal):', err);
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

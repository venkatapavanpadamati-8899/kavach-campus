export interface Incident {
  id: string;
  case_id: string;
  student_id: string;
  assigned_to?: string | null;
  status: 'RECEIVED' | 'ACKNOWLEDGED' | 'ASSIGNED' | 'IN_PROGRESS' | 'ESCALATED' | 'ACTION_TAKEN' | 'RESOLVED' | 'CLOSED' | 'FALSE_ALARM';
  category: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  urgency?: string;
  description?: string;
  latitude?: number | null;
  longitude?: number | null;
  location_accuracy?: number | null;
  campus_zone_id?: string | null;
  building_id?: string | null;
  is_tracking_active?: boolean;
  is_anonymous?: boolean;
  created_at: string;
  updated_at: string;
  resolved_at?: string | null;
}

export interface LocationRecord {
  id: string;
  incident_id: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  recorded_at: string;
}

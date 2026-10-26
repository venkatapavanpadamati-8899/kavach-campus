import { describe, it, expect } from 'vitest';
import {
  calculateHaversineDistance,
  isCoordinateFresh,
  selectOptimalResponder,
  evaluateEscalation,
  ResponderCandidate,
} from '@/lib/routing/assignment';

describe('Mentor Routing, Haversine Distance & Automatic Escalation Engine', () => {
  describe('Haversine Distance Calculation', () => {
    it('calculates accurate distance between known campus points', () => {
      // Point A: Campus Main Gate (17.4450, 78.3480)
      // Point B: Student Hostel Block (17.4470, 78.3500)
      const dist = calculateHaversineDistance(17.445, 78.348, 17.447, 78.35);
      // Distance is approximately 312 meters
      expect(dist).toBeGreaterThan(250);
      expect(dist).toBeLessThan(400);
    });

    it('returns 0 for identical coordinates', () => {
      const dist = calculateHaversineDistance(17.445, 78.348, 17.445, 78.348);
      expect(dist).toBe(0);
    });

    it('returns NaN for invalid coordinates', () => {
      expect(calculateHaversineDistance(100, 78.348, 17.445, 78.348)).toBeNaN();
      expect(calculateHaversineDistance(17.445, 200, 17.445, 78.348)).toBeNaN();
      expect(calculateHaversineDistance(NaN, 78, 17, 78)).toBeNaN();
    });
  });

  describe('Coordinate Freshness Validation', () => {
    it('returns true for coordinates updated 2 minutes ago', () => {
      const twoMinsAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
      expect(isCoordinateFresh(twoMinsAgo, 15)).toBe(true);
    });

    it('returns false for coordinates updated 30 minutes ago (> 15m threshold)', () => {
      const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
      expect(isCoordinateFresh(thirtyMinsAgo, 15)).toBe(false);
    });

    it('returns false for missing or invalid timestamps', () => {
      expect(isCoordinateFresh(undefined)).toBe(false);
      expect(isCoordinateFresh('not-a-date')).toBe(false);
    });
  });

  describe('selectOptimalResponder', () => {
    const mockCandidates: ResponderCandidate[] = [
      {
        id: 'mentor-far',
        name: 'Dr. Ramesh (Far)',
        role: 'MENTOR',
        isApproved: true,
        isOnDuty: true,
        isLocationSharingEnabled: true,
        lastLocation: {
          latitude: 17.455,
          longitude: 78.36,
          timestamp: new Date().toISOString(),
        },
      },
      {
        id: 'mentor-near',
        name: 'Prof. Ananya (Near)',
        role: 'MENTOR',
        isApproved: true,
        isOnDuty: true,
        isLocationSharingEnabled: true,
        lastLocation: {
          latitude: 17.4452,
          longitude: 78.3482,
          timestamp: new Date().toISOString(),
        },
      },
      {
        id: 'security-guard',
        name: 'Chief Officer Rajesh',
        role: 'SECURITY',
        isApproved: true,
        isOnDuty: true,
        isLocationSharingEnabled: true,
        lastLocation: {
          latitude: 17.4451,
          longitude: 78.3481,
          timestamp: new Date().toISOString(),
        },
      },
      {
        id: 'mentor-no-consent',
        name: 'Prof. Suresh (No Consent)',
        role: 'MENTOR',
        isApproved: true,
        isOnDuty: true,
        isLocationSharingEnabled: false,
        lastLocation: {
          latitude: 17.4451,
          longitude: 78.3481,
          timestamp: new Date().toISOString(),
        },
      },
      {
        id: 'mentor-stale',
        name: 'Prof. Lakshmi (Stale)',
        role: 'MENTOR',
        isApproved: true,
        isOnDuty: true,
        isLocationSharingEnabled: true,
        lastLocation: {
          latitude: 17.4451,
          longitude: 78.3481,
          timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
        },
      },
      {
        id: 'mentor-off-duty',
        name: 'Prof. Kiran (Off Duty)',
        role: 'MENTOR',
        isApproved: true,
        isOnDuty: false,
        isLocationSharingEnabled: true,
        lastLocation: {
          latitude: 17.4451,
          longitude: 78.3481,
          timestamp: new Date().toISOString(),
        },
      },
    ];

    it('selects nearest consented on-duty mentor for LOW severity incidents', () => {
      const decision = selectOptimalResponder({
        severity: 'LOW',
        incidentLocation: { latitude: 17.445, longitude: 78.348 },
        candidates: mockCandidates,
      });

      expect(decision.routingMethod).toBe('NEAREST_GPS');
      expect(decision.selectedResponderId).toBe('mentor-near');
      expect(decision.distanceMeters).toBeLessThan(100);
    });

    it('routes CRITICAL incident to nearest SECURITY personnel, not MENTOR', () => {
      const decision = selectOptimalResponder({
        severity: 'CRITICAL',
        incidentLocation: { latitude: 17.445, longitude: 78.348 },
        candidates: mockCandidates,
      });

      expect(decision.selectedResponderId).toBe('security-guard');
      expect(decision.assignedRole).toBe('SECURITY');
    });

    it('excludes mentors with disabled location sharing or stale coordinates from GPS selection', () => {
      const candidatesWithoutNear = mockCandidates.filter(c => c.id !== 'mentor-near');
      const decision = selectOptimalResponder({
        severity: 'LOW',
        incidentLocation: { latitude: 17.445, longitude: 78.348 },
        candidates: candidatesWithoutNear,
      });

      // Should select mentor-far rather than stale or no-consent mentors
      expect(decision.selectedResponderId).toBe('mentor-far');
    });

    it('falls back safely without fabricating coordinates when incident location is null', () => {
      const decision = selectOptimalResponder({
        severity: 'LOW',
        incidentLocation: null,
        candidates: mockCandidates,
      });

      expect(decision.routingMethod).toBe('DEPARTMENTAL_FALLBACK');
      expect(decision.fallbackReason).toBe('INCIDENT_COORDINATES_UNAVAILABLE');
      expect(decision.distanceMeters).toBeNull();
      expect(decision.selectedResponderId).toBeDefined();
    });

    it('escalates to admin when zero eligible responders are on duty', () => {
      const decision = selectOptimalResponder({
        severity: 'LOW',
        candidates: [],
      });

      expect(decision.selectedResponderId).toBeNull();
      expect(decision.routingMethod).toBe('ESCALATED_ADMIN');
      expect(decision.fallbackReason).toBe('NO_ELIGIBLE_ON_DUTY_RESPONDERS');
    });
  });

  describe('evaluateEscalation', () => {
    const candidates: ResponderCandidate[] = [
      {
        id: 'mentor-1',
        name: 'Mentor 1',
        role: 'MENTOR',
        isApproved: true,
        isOnDuty: true,
        isLocationSharingEnabled: true,
        lastLocation: { latitude: 17.445, longitude: 78.348, timestamp: new Date().toISOString() },
      },
      {
        id: 'mentor-2',
        name: 'Mentor 2',
        role: 'MENTOR',
        isApproved: true,
        isOnDuty: true,
        isLocationSharingEnabled: true,
        lastLocation: { latitude: 17.446, longitude: 78.349, timestamp: new Date().toISOString() },
      },
    ];

    it('does not escalate if assignment is within deadline (e.g. 2 minutes into 5 min window)', () => {
      const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
      const result = evaluateEscalation({
        incidentId: 'inc-1',
        severity: 'LOW',
        currentAssigneeId: 'mentor-1',
        assignedAt: twoMinutesAgo,
        ackDeadlineMinutes: 5,
        allCandidates: candidates,
        alreadyAttemptedIds: [],
      });

      expect(result.shouldEscalate).toBe(false);
    });

    it('escalates to next eligible responder if deadline expired (e.g. 6 minutes ago)', () => {
      const sixMinutesAgo = new Date(Date.now() - 6 * 60 * 1000).toISOString();
      const result = evaluateEscalation({
        incidentId: 'inc-1',
        severity: 'LOW',
        currentAssigneeId: 'mentor-1',
        assignedAt: sixMinutesAgo,
        ackDeadlineMinutes: 5,
        allCandidates: candidates,
        alreadyAttemptedIds: ['mentor-1'],
      });

      expect(result.shouldEscalate).toBe(true);
      expect(result.nextResponderId).toBe('mentor-2');
      expect(result.escalationReason).toContain('ACKNOWLEDGEMENT_TIMEOUT');
    });

    it('escalates to Campus Security / Admin when all responders have timed out', () => {
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      const result = evaluateEscalation({
        incidentId: 'inc-1',
        severity: 'LOW',
        currentAssigneeId: 'mentor-2',
        assignedAt: tenMinutesAgo,
        ackDeadlineMinutes: 5,
        allCandidates: candidates,
        alreadyAttemptedIds: ['mentor-1', 'mentor-2'],
      });

      expect(result.shouldEscalate).toBe(true);
      expect(result.nextResponderId).toBeNull();
      expect(result.escalationReason).toBe('ALL_RESPONDERS_EXHAUSTED');
      expect(result.toLevel).toBe('ADMIN');
    });
  });
});

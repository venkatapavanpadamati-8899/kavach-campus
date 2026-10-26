# KAVACH CAMPUS — LIVE DEMONSTRATION & USER TESTING GUIDE
**Project:** Kavach Campus — “Safety in One Tap”  
**Workspace:** `D:\Kavach Campus`  
**Local Live URL:** `http://localhost:3000`  
**Server Status:** **ACTIVE (PERSISTENT DAEMON)** — Process PID 27816

---

## 1. Quick Start Demonstration Sequence

The Next.js development server is currently running in the background. You can open any desktop or mobile browser and follow this sequence:

### Screen 1: Landing Page (`http://localhost:3000`)
- **What to look for:**
  - Modern hero header: **Kavach Campus — Safety in One Tap**.
  - Emergency helpline banner.
  - Primary Action: "Emergency SOS" and navigation buttons ("Features", "About", "Login", "Register").

### Screen 2: Student Registration (`http://localhost:3000/register`)
- **What to look for:**
  - Dedicated registration form.
  - Choose Role: `STUDENT` or `STAFF`.
  - Try submitting with empty fields to observe client validation.

### Screen 3: User Login (`http://localhost:3000/login`)
- **What to look for:**
  - Clean authentication card.
  - Links to "Forgot Password" and "Register".
  - Redirect protection: Navigating directly to `http://localhost:3000/student` while logged out will immediately redirect you back here!

### Screen 4: Student Emergency SOS (`http://localhost:3000/student/sos`)
- **What to look for:**
  - Giant, accessible Red SOS button with tactile ripple animation.
  - Live GPS coordinate display (or safe fallback if GPS is denied).
  - Quick emergency tips (Stay calm, keep phone on, emergency broadcast triggered).

### Screen 5: Harassment & Complaint Reporting (`http://localhost:3000/student/report`)
- **What to look for:**
  - Incident narrative field.
  - Category selector (Harassment, Stalking, Ragging, Theft, General).
  - Evidence attachment uploader.
  - Anonymous reporting toggle.

### Screen 6: Safe Walk Companion (`http://localhost:3000/student/safe-walk`)
- **What to look for:**
  - Destination input (e.g., "Library to Girls Hostel Block B").
  - Duration slider (10 min to 60 min).
  - Live guardian countdown clock.
  - "I Have Arrived Safely" button.

### Screen 7: Staff & Responder Workstation (`http://localhost:3000/staff`)
- **What to look for:**
  - Active incoming emergency alerts.
  - Incident triage table.
  - One-click "Claim / Acknowledge" case button.

### Screen 8: Admin Safety Operations Center (`http://localhost:3000/admin`)
- **What to look for:**
  - Live campus safety counters (Active SOS, Open Complaints, Mean Resolution Time).
  - Campus Zone / Geofence alert feed.
  - Emergency responder team status.

### Screen 9: System Security Audit (`http://localhost:3000/admin/system-audit`)
- **What to look for:**
  - Real-time PostgreSQL Row Level Security (RLS) health status.
  - Immutable audit trail entries (Actor, Action, Entity, Timestamp).
  - Gemini AI and deterministic safety engine status.

---

## 2. Server Persistence Notice
The application process is daemonized and will remain running throughout your testing session. You do not need to restart or run any build commands to browse the live pages.

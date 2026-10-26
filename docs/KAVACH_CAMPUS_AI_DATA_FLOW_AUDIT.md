# KAVACH CAMPUS - AI DATA FLOW AUDIT

## 1. Trace Overview
Traced the complete lifecycle of an incident submitted by a student through the AI Analysis pipeline.

## 2. Steps Traced
1. **Frontend**: Student submits incident description + GPS coordinates.
2. **API Endpoint (`/api/incidents/route.ts`)**: Receives payload.
3. **AI Generation (`src/lib/ai.ts`)**: Submits payload to Gemini-2.5-pro via `GoogleGenAI`.
4. **Deterministic Evaluation**: Intercepts AI response. Checks description text against lists of critical and high keywords. Modifies priority/urgency if necessary.
5. **Database Insert (`incidents`)**: Stores the incident record with the determined (AI or overriden) severity.
6. **Database Insert (`ai_analyses`)**: Stores the raw AI breakdown, appending `[OVERRIDDEN: REASON]` to the summary if deterministic rules applied.

## 3. Data Integrity
- Coordinates are passed cleanly.
- RLS rules on `incidents` ensure students only see their own incidents.
- Mapping between Gemini's string response and Supabase DB Enums is handled (L1->LOW, L4->CRITICAL).

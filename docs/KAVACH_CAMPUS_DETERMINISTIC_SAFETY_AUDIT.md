# KAVACH CAMPUS - DETERMINISTIC SAFETY AUDIT

## 1. Overview
This document outlines the deterministic safety fallbacks implemented to override AI model predictions during incident categorization. The AI model, while accurate, is not infallible. Deterministic rules serve as a safety net.

## 2. Implemented Logic (in `/api/incidents/route.ts`)
The server logic processes the incident description submitted by the student and compares it against pre-defined critical keywords before finalizing the severity level.

### Critical Overrides (Mapped to `CRITICAL` Severity)
If any of these keywords are present, the incident is immediately flagged as `CRITICAL`:
- `gun`, `knife`, `blood`, `fire`, `kidnap`, `attack`, `kill`, `suicide`, `die`, `weapon`, `shoot`

### High Overrides (Mapped to `HIGH` Severity)
If the AI scores the incident as `LOW` or `MEDIUM`, but the following keywords are detected, the system overrides it to `HIGH`:
- `fight`, `punch`, `stolen`, `thief`, `robbery`, `harass`, `creep`

## 3. Database Recording
- The `incidents` table records the overridden severity.
- The `ai_analyses` table preserves the fact that an override occurred by prepending `[OVERRIDDEN: REASON]` to the summary column, allowing system administrators to audit how often the AI is overridden.

## 4. Testing
Simulated tests confirm that even if the AI miscategorizes "Someone has a gun" as `L1` (LOW), the deterministic rule intercepts this and sets it to `CRITICAL`.

# KAVACH CAMPUS - AI FAILURE TESTS

## 1. Scenario: Gemini API Down (Timeout/500)
- **Expected Behavior**: System should catch the error and return a fallback payload.
- **Actual Behavior**: Confirmed via code inspection in `src/lib/ai.ts`. A `try/catch` block surrounds the `generateContent` call. If it fails, it returns:
  ```json
  {
    "category": "UNCLASSIFIED",
    "severity": "L1",
    "urgency": "LOW",
    "confidence": 0,
    "summary": "AI analysis failed. Requires human review."
  }
  ```
- **Deterministic Check Integration**: Because this fallback passes through the deterministic keyword rules in `api/incidents/route.ts`, if the description contains "gun", the severity is still forcefully upgraded to `CRITICAL` even if the AI failed and initially returned `L1`. This perfectly fulfills the fail-safe requirement.

## 2. Scenario: API Returns Malformed JSON
- **Expected Behavior**: Should not crash the application.
- **Actual Behavior**: `JSON.parse(text)` is wrapped in the `try/catch` block. If the AI hallucinates a non-JSON response, the catch block intercepts the parsing error and returns the safe fallback.

## 3. Conclusion
AI failures are isolated and do not prevent an incident from being created. They correctly default to human review while maintaining deterministic keyword safety overrides.

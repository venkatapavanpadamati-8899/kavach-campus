# KAVACH CAMPUS - FINAL EVIDENCE & PRIVACY AUDIT

## 1. Storage Integrity
- Supabase storage buckets exist for incident evidence (images, videos).
- **Security:** RLS restricts downloads via bucket policies.

## 2. Location Privacy
- Location is only broadcast when a Safe Walk is ACTIVE or an SOS is triggered.
- GPS permission is asked explicitly.
- **Vulnerability:** Background tracking relies on browser capabilities, which can easily be killed or backgrounded in mobile web browsers. Mobile apps (React Native/Swift) are much better suited for continuous background tracking.

**STATUS:** **PARTIAL** (Storage secure; mobile web tracking unreliable)

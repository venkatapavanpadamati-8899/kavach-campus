# KAVACH CAMPUS - FINAL API AUDIT

## 1. Inventory of Handlers
| Route Path | Method | Purpose | Authentication |
|---|---|---|---|
| `/api/auth/login` | POST | Authenticate user via email/password | Public |
| `/api/auth/register` | POST | Create new account | Public |
| `/api/auth/verify-otp` | POST | Verify registration OTP | Public |
| `/api/auth/google` | GET | Initiates OAuth | Public |
| `/api/auth/callback` | GET | Handles OAuth return | Public |
| `/api/incidents` | POST, GET | Create/List standard incidents | Valid User Session |
| `/api/incidents/[id]` | GET | Fetch incident details | Valid User Session |
| `/api/sos` | POST | Create CRITICAL emergency incident | Valid User Session |
| `/api/sos/location` | POST | Stream location updates | Valid User Session |
| `/api/system/health` | GET | Healthcheck | Public |

## 2. API Security Evaluation
- **Authentication Source**: Validated via `await supabase.auth.getUser()`. Client-side payloads claiming identity are discarded in favor of server-verified tokens.
- **Incident Privacy**: `incidents` fetching logic relies on Supabase RLS. The server leverages the authenticated client instance to query, meaning the DB handles restriction inherently.
- **Location Updates**: Restricted to authenticated users updating their own incidents.

## 3. Vulnerability Check
- **IDOR**: Protected via RLS policies.
- **Role Spoofing**: Registration API defaults to `STUDENT`. Privileged roles must be set via Admin console/Direct DB access.

## 4. Conclusion
APIs are structured securely, correctly leveraging Supabase SSR features for token verification.

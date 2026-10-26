# KAVACH CAMPUS ARCHITECTURE & DEPENDENCY AUDIT

## 1. Dependencies in `package.json`

**Production Dependencies:**
- `@google/genai (^2.28.0)`: Used for Gemini AI integration in `src/lib/ai.ts`. Necessary for AI features.
- `@supabase/ssr (^0.12.7)` & `@supabase/supabase-js (^2.117.3)`: Core database and auth SDKs for Next.js 16 SSR. Necessary.
- `framer-motion (^14.0.0)`: Used for premium UI animations.
- `lucide-react (^1.53.0)`: Icon library.
- `next (^16.4.0)`: The core framework (App Router + Turbopack).
- `react (^19.3.0)` & `react-dom (^19.3.0)`: Core UI libraries.

**Legacy / Questionable Dependencies:**
- `bcryptjs`, `jsonwebtoken`, `jose`: Formerly used for custom JWT auth. Should be evaluated against Supabase Auth. Supabase Auth makes these largely obsolete for session management.
- `google-auth-library`: Potentially redundant if Supabase Google OAuth is used.
- `nodemailer`: Used for OTP emails. Supabase Auth has built-in OTP/Email magic links, making this potentially redundant.
- `socket.io` & `socket.io-client`: Used for legacy WebSockets. Next.js/Supabase typically use Supabase Realtime for live tracking. Redundant.

## 2. Next.js 16 Configuration
- `cacheComponents: true` is enabled in `next.config.ts`.
- Experimental features like `partialPrefetching` are active.

## 3. Route Segment Config Audit
All instances of `export const dynamic = 'force-dynamic'` were found to break the build due to `cacheComponents` static-shell validation requiring non-blocking pages. 
- `export const instant = false;` is currently used as a valid Next 16 workaround in `/admin/users`, `/admin/incidents`, `/management/incidents`, `/staff/incidents`, `/student/incidents`.
- **Recommended Action:** Wrap the data-fetching boundaries in `<Suspense>` to provide loading states and remove the `instant = false` override.

## 4. Overall Architecture Viability
The architecture correctly targets the requested Next.js 16 + Supabase + Gemini AI stack. However, the presence of legacy custom auth libraries (JWT, Nodemailer) suggests that the migration to Supabase Auth might be incomplete or duplicated.

**Conclusion:** The architecture baseline is solid, but dependency cleanup and Suspense implementation are required for true production readiness.

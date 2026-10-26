# Kavach Campus - Project Audit

## Current Architecture
- The existing codebase is primarily a **Vanilla HTML/CSS/JavaScript + Express/Node.js** architecture located in the `backend`, `pages`, `css`, and `js` folders.
- There is a partial/scaffolded Next.js structure (`src/app/api`) but the root lacks the full Next.js framework configuration (no `next` in `package.json`, no `tsconfig.json`).
- Database: Currently seems to use SQLite (`kavach.db`, `temp_backup.db`) and PostgreSQL (`pg` in `package.json`). Mongoose is not currently installed.

## Duplicate Architectures Found
- Yes, a partial Next.js structure exists alongside the full Express structure. This confirms the project is split between two paradigms.

## Working Features
- Express backend is present.
- Basic frontend UI pages exist in `pages/` (HTML).
- Playwright tests are configured (`playwright.config.js`).

## Broken Features / Missing Features
- Full Next.js + TypeScript + MongoDB/Mongoose + Gemini AI integration is not complete as the primary app.
- Next.js root configuration is missing.
- Role-Based Access Control (RBAC) and Admin dashboards are not fully implemented in a unified Next.js environment.
- Evidence Locker with proper secure storage and audit logging.
- Live Location using WebSockets within the Next.js app.

## Security Issues
- Exposing two servers/APIs simultaneously can lead to route conflicts and security loopholes.
- Lack of centralized authentication middleware in the Next.js stack.
- Potential hardcoded keys or SQLite DB files checked into version control.

## Final Recommended Architecture
As per project requirements:
- **Framework**: Next.js (App Router) + TypeScript
- **Database**: MongoDB (Mongoose)
- **AI**: Gemini AI
- **Styling**: Premium Frontend (Vanilla CSS, no Tailwind per user guidelines unless explicitly requested, but since Next.js supports CSS Modules, we will use that or global CSS).

## Next Steps
1. Move the legacy Express + Vanilla implementation to `nextjs_backup/`.
2. Initialize Next.js, Mongoose, and required dependencies at the root.
3. Port existing business logic and schemas.
4. Implement all minimum 30 web pages requested.

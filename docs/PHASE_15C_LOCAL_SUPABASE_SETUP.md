# KAVACH CAMPUS — PHASE 15C: LOCAL SUPABASE SETUP MANUAL

**Project:** Kavach Campus (`D:\kavach-campus`)  
**Scope:** Local Isolated Staging Environment for Migrations 015, 016, 017 & Authenticated RLS Testing  
**Audit Date:** November 4, 2026  
**Document:** Local Docker & Supabase CLI Setup Procedure  
**Safety Status:** **STRICT LOCAL ISOLATION — ZERO PRODUCTION CONNECTION**

---

## 1. Prerequisites & Tool Availability

| Tool / Dependency | Detected Version | Availability Status | Notes |
|---|---|---|---|
| **Node.js** | `v24.19.0` | **AVAILABLE** | Native Node 24 with native `--env-file` support |
| **npm** | `11.17.0` | **AVAILABLE** | Package manager ready |
| **Supabase CLI** | `v2.121.0` (via `npx supabase`) | **AVAILABLE** | Pre-cached and matches `supabase/config.toml` |
| **Docker Client** | `29.8.2` | **AVAILABLE** | `docker.exe` present on system PATH |
| **Docker Daemon** | — | **STOPPED (Action Required)** | Docker Desktop engine is not running |
| **Local Config** | `supabase/config.toml` | **CONFIGURED** | Local ports: API 54321, DB 54322 |

---

## 2. Owner Action: Starting Local Docker Engine

To enable the local Supabase environment without touching production:
1. Open the **Docker Desktop** application from the Windows Start Menu or System Tray.
2. Wait until the Docker icon indicates **`Engine Running`** (green status).
3. Verify connectivity in a terminal:
   ```powershell
   docker ps
   ```
   *Expected:* Outputs container headers (`CONTAINER ID`, `IMAGE`, `COMMAND`, etc.) without daemon connection errors.

---

## 3. Local Supabase Startup & Initialization Procedure

Once Docker Desktop is running, initialize the isolated local stack:

### Step 3.1: Start Local Containers
Execute in project root (`D:\kavach-campus`):
```powershell
npx supabase start
```
*What this creates locally (on Docker):*
- PostgreSQL 17 database (`localhost:54322`)
- GoTrue Auth server (`localhost:54321/auth/v1`)
- Storage engine (`localhost:54321/storage/v1`)
- Supabase Studio local dashboard (`http://localhost:54323`)
- Local anon and service-role keys (printed in terminal; isolated to localhost).

---

### Step 3.2: Apply Base Migrations (001 to 014) Locally
Run the base migrations to bring local schema to the exact current production baseline:
```powershell
# Apply base schema migrations 001 through 014 to local database only:
Get-ChildItem supabase\migrations\0*.sql | Where-Object { $_.Name -match "^0(0[1-9]|1[0-4])_" } | ForEach-Object {
    Get-Content $_.FullName | npx supabase db execute --local
}
```

---

### Step 3.3: Seed Synthetic Multi-Tenant Personas
Run the seed script to create test colleges and accounts on local Supabase:
```powershell
# Run synthetic seed against localhost:54322 ONLY
npx tsx scripts/seed_local_staging_personas.ts
```

#### Synthetic Local Personas Created:
| Role | Local Test Email | College | Temporary Password |
|---|---|---|---|
| **Student A** | `student_a_srkr@test.local` | `srkr` | `TestPass123!` |
| **Student B (Peer)** | `student_b_srkr@test.local` | `srkr` | `TestPass123!` |
| **Student C (Cross-College)**| `student_c_vitb@test.local` | `vitb` | `TestPass123!` |
| **Staff Responder** | `staff_srkr@test.local` | `srkr` | `TestPass123!` |
| **HOD (CSE)** | `hod_cse_srkr@test.local` | `srkr` | `TestPass123!` |
| **Principal** | `principal_srkr@test.local` | `srkr` | `TestPass123!` |
| **Campus Admin (SRKR)** | `admin_srkr@test.local` | `srkr` | `TestPass123!` |
| **Campus Admin (VITB)** | `admin_vitb@test.local` | `vitb` | `TestPass123!` |
| **Super Admin** | `super_admin@test.local` | `srkr` | `TestPass123!` |

---

## 4. Sequential Local Migration Validation

Execute and test the three pending migrations one at a time on local PostgreSQL:

### Sequence 1: Test Migration 015
```powershell
npx supabase db execute --local -f supabase/migrations/015_college_scoped_student_id_uniqueness.sql
```
*Validation:* Verify that `student_a` (SRKR) and `student_c` (VITB) can both register with identical student ID `24B91A0501` without collision, while attempting to duplicate `24B91A0501` within SRKR is blocked with `23505 duplicate key value`.

### Sequence 2: Test Migration 016
```powershell
npx supabase db execute --local -f supabase/migrations/016_safe_box_private_notes.sql
```
*Validation:* Authenticate as Student A JWT and insert a private note. Verify that Student B JWT and Staff JWT receive `0 rows returned` when querying Student A's private note.

### Sequence 3: Test Migration 017
```powershell
npx supabase db execute --local -f supabase/migrations/017_student_college_claims.sql
```
*Validation:* Verify bucket `kavach-profile-photos` is created. Test that direct client-side upload without service role is blocked, while server-mediated upload succeeds and enforces folder isolation.

---

## 5. Local Teardown & Reset

When testing is complete:
```powershell
npx supabase stop
```
To purge all local test data and reset containers:
```powershell
npx supabase stop --no-backup
```
*Guarantee:* Teardown operates strictly on local Docker containers. **Zero effect on production Supabase.**


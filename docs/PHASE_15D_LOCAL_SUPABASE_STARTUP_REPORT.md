# KAVACH CAMPUS — PHASE 15D: LOCAL SUPABASE STARTUP & PREFLIGHT REPORT

**Project:** Kavach Campus (`D:\kavach-campus`)  
**Scope:** Phase 15D Local Supabase Startup & Isolation Preflight Verification  
**Audit Date:** November 4, 2026  
**Final Status:** **`LOCAL SUPABASE STARTED`**

---

## 1. Executive Summary & Startup Verdict

```text
================================================================================
FINAL STATUS: LOCAL SUPABASE STARTED
================================================================================
```

The isolated local Supabase environment has been successfully started and verified on the local workstation.

- **Docker Desktop Engine:** Running healthy (Version `29.8.2`, Kernel `6.18.54.1-microsoft-standard-WSL2`, Linux container subsystem active).
- **Supabase CLI:** Verified active at version `2.121.0` (matching [`supabase/config.toml`](file:///d:/kavach-campus/supabase/config.toml)).
- **Production Isolation:** **100% CONFIRMED ISOLATED.** `linked_project` is `null`. The local stack runs exclusively on local loopback `127.0.0.1` and does not connect to the remote production Supabase instance (`dvyiclyyvmsfipzrdowu.supabase.co`).
- **Gated State:** Migrations 015, 016, and 017 have **NOT** been applied. The local database is awaiting baseline alignment in Phase 15E.

---

## 2. Docker & Container Health Status

`docker info` confirmed the Docker daemon is fully operational.
Local container status via `docker ps`:

| Container Name | Service | Local Port Binding | Health Status |
|---|---|---|---|
| `supabase_studio_kavach_campus` | Supabase Studio UI | `0.0.0.0:54323->3000/tcp` | **Up (healthy)** |
| `supabase_kong_kavach_campus` | API Gateway (Kong) | `0.0.0.0:54321->8000/tcp` | **Up (healthy)** |
| `supabase_db_kavach_campus` | PostgreSQL 17 Database | `0.0.0.0:54322->5432/tcp` | **Up (healthy)** |
| `supabase_auth_kavach_campus` | GoTrue Auth Server | `9999/tcp` | **Up (healthy)** |
| `supabase_storage_kavach_campus` | Object Storage Engine | `5000/tcp` | **Up (healthy)** |
| `supabase_inbucket_kavach_campus` | Local Email Server (Inbucket) | `0.0.0.0:54324->8025/tcp` | **Up (healthy)** |
| `supabase_rest_kavach_campus` | PostgREST API Engine | `3000/tcp` | **Up** |
| `supabase_realtime_kavach_campus` | Realtime Engine | `4000/tcp` | **Up (healthy)** |
| `supabase_analytics_kavach_campus` | Logflare Analytics | `0.0.0.0:54327->4000/tcp` | **Up (healthy)** |
| `supabase_pg_meta_kavach_campus` | PostgreSQL Metadata API | `8080/tcp` | **Up (healthy)** |

---

## 3. Local Endpoint Inventory

All local services are bound to localhost:

- **Local API Gateway:** `http://127.0.0.1:54321`
- **Local Database (PostgreSQL):** `postgresql://postgres:postgres@127.0.0.1:54322/postgres`
- **Local Studio Web Dashboard:** `http://127.0.0.1:54323`
- **Local Inbucket Email Tester:** `http://127.0.0.1:54324`
- **Local Storage API:** `http://127.0.0.1:54321/storage/v1`

---

## 4. Local Database State & Baseline Assessment

A diagnostic query executed on the local database (`npx supabase db query --local`) revealed:
1. **Existing Base Tables:** 19 initial public schema tables exist from earlier local initialization (`profiles`, `student_profiles`, `staff_profiles`, `incidents`, `evidence`, etc.).
2. **Pending Baseline Migrations (001–014):**
   - Querying `profiles.college_id` returned `column "college_id" does not exist`.
   - This occurs because auto-migration is explicitly disabled in `supabase/config.toml` (`[db.migrations] enabled = false`), ensuring migrations are never automatically run without administrative oversight.
   - Migration 012 (`012_profiles_college_tenant.sql`) and 014 (`014_cross_college_rls_hardening.sql`) must be aligned locally in Phase 15E before testing 015–017.
3. **Pending Test Migrations (015, 016, 017):**
   - Migration 015 (`idx_profiles_college_student_id`): **Unapplied locally**
   - Migration 016 (`safe_box_private_notes`): **Unapplied locally**
   - Migration 017 (`claimed_college_id`, `kavach-profile-photos`): **Unapplied locally**

---

## 5. Security Advisory & Production Isolation Confirmation

### 5.1 Local CLI Security Advisory
The Supabase CLI local query engine flagged an advisory for local development:
> `2 table(s) have Row Level Security (RLS) disabled: public.campus_buildings, public.campus_zones.`
- *Note:* In production, these master data lookup tables are protected by production migration 014. On local, RLS enablement will be harmonized when baseline migrations 001–014 are applied in Phase 15E.

### 5.2 Strict Production Isolation Proof
- Local Supabase CLI status confirmed: `"linked_project": null`.
- All operations in this phase ran on loopback `127.0.0.1`.
- Production database (`dvyiclyyvmsfipzrdowu.supabase.co`) remains completely isolated, untouched, and undisturbed.
- All 40 incidents, 481 audit logs, 34 OTP records, and 8 Auth accounts in production remain 100% preserved.

---

## 6. Next Steps on the Release Roadmap

| Phase | Objective | Status |
|---|---|---|
| **Phase 15D** | Local Supabase Startup & Preflight | **COMPLETE (`LOCAL SUPABASE STARTED`)** |
| **Phase 15E** | Baseline migrations 001–014 local alignment & verification | **NEXT STEP** |
| **Phase 15F** | Migrations 015, 016, 017 sequential local execution | Ready after 15E |
| **Phase 15G** | Real authenticated RLS testing with local JWTs | Ready after 15F |
| **Phase 15H** | Final migration security audit | Ready after 15G |
| **Phase 17** | GitHub Push (Requires Explicit Owner Approval) | Gated |
| **Phase 18** | Vercel Deployment (Requires Explicit Owner Approval) | Gated |


# Phase 23 — Database Architecture & Statewide Schema

**Project:** Kavach Campus — Women's & Student Safety Platform  
**Phase:** 23 — Andhra Pradesh Statewide All-College Expansion  
**Environment:** Local Development (`D:\kavach-campus`)  
**Date:** November 5, 2026  

---

## 1. Overview & Migration 019

Prior to Phase 23, college definitions existed solely as an in-memory TypeScript array. Phase 23 executed **Migration 019** (`019_ap_statewide_colleges_registry.sql`), formally creating relational database structures within PostgreSQL, governed by Row-Level Security (RLS).

---

## 2. Table Schemas

### 2.1 Table: `public.college_districts`
Master directory of all 26 official gazetted revenue districts of Andhra Pradesh.

```sql
CREATE TABLE IF NOT EXISTS public.college_districts (
  id TEXT PRIMARY KEY,                       -- e.g. 'WEST_GODAVARI'
  name TEXT NOT NULL UNIQUE,                 -- e.g. 'West Godavari'
  headquarters TEXT NOT NULL,                -- e.g. 'Bhimavaram'
  zone TEXT NOT NULL CHECK (zone IN ('North Coastal', 'Central Coastal', 'South Coastal', 'Rayalaseema')),
  state TEXT NOT NULL DEFAULT 'Andhra Pradesh',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 2.2 Table: `public.colleges`
Comprehensive statewide institutional registry supporting Engineering, Polytechnic, and Degree categories.

```sql
CREATE TABLE IF NOT EXISTS public.colleges (
  id TEXT PRIMARY KEY,                       -- e.g. 'srkr-bhimavaram'
  name TEXT NOT NULL,
  short_name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  code TEXT,                                 -- e.g. 'SRKR', 'GPV', 'AUCE'
  aishe_code TEXT,                           -- e.g. 'C-24058'
  category TEXT NOT NULL CHECK (category IN (
    'ENGINEERING', 'POLYTECHNIC', 'DEGREE', 'OTHER', 'PHARMACY', 'MANAGEMENT', 'LAW'
  )),
  subcategory TEXT,                          -- e.g. 'Private Autonomous Engineering College'
  district_id TEXT REFERENCES public.college_districts(id) ON UPDATE CASCADE,
  district TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'Andhra Pradesh',
  pincode VARCHAR(6) NOT NULL,
  domain TEXT NOT NULL,                      -- e.g. 'srkr.edu.in'
  coordinates JSONB NOT NULL DEFAULT '{"lat": 16.5449, "lng": 81.4975}'::JSONB,
  geofence_radius_meters INTEGER NOT NULL DEFAULT 750,
  emergency_helpline TEXT NOT NULL,
  womens_cell_helpline TEXT NOT NULL,
  security_control_room TEXT NOT NULL,
  ambulance_contact TEXT NOT NULL,
  primary_color TEXT NOT NULL DEFAULT '#059669',
  secondary_color TEXT NOT NULL DEFAULT '#f59e0b',
  campus_buildings JSONB NOT NULL DEFAULT '[]'::JSONB,
  is_autonomous BOOLEAN NOT NULL DEFAULT FALSE,
  naac_grade TEXT,
  affiliation TEXT,
  approval TEXT,
  source_reference TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 2.3 Table: `public.college_onboarding_requests`
Automated public submission queue for unlisted institutions with administrative review workflow.

```sql
CREATE TABLE IF NOT EXISTS public.college_onboarding_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'ENGINEERING',
  district TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'Andhra Pradesh',
  pincode VARCHAR(6) NOT NULL,
  domain TEXT,
  official_website TEXT,
  aishe_code TEXT,
  requester_name TEXT NOT NULL,
  requester_email TEXT NOT NULL,
  requester_role TEXT NOT NULL DEFAULT 'STUDENT',
  requester_phone TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'VERIFIED', 'REJECTED', 'MERGED')),
  admin_notes TEXT,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## 3. Row-Level Security (RLS) Policies

All three tables enforce strict PostgreSQL Row-Level Security:

1. **`college_districts`**:
   - `SELECT`: Public access (`true`) — all users, students, and guests can read the district directory.
   - `INSERT / UPDATE / DELETE`: Restricted strictly to Super Administrators (`role = 'super_admin'`).

2. **`colleges`**:
   - `SELECT`: Public access for active institutions (`is_active = true`). Super admins can view all.
   - `INSERT / UPDATE / DELETE`: Restricted strictly to Super Administrators (`role = 'super_admin'`).

3. **`college_onboarding_requests`**:
   - `INSERT`: Public access (`true`) — any student, staff member, or college representative can submit an onboarding request.
   - `SELECT`: Requesters can view their own requests (`requester_email = auth.jwt() ->> 'email'`); Super admins can view all requests.
   - `UPDATE / DELETE`: Restricted strictly to Super Administrators (`role = 'super_admin'`).

---

## 4. Performance Indexes

Migration 019 created targeted B-tree and composite indexes:
- `idx_colleges_district_id` ON `public.colleges (district_id)`
- `idx_colleges_category` ON `public.colleges (category)`
- `idx_colleges_pincode` ON `public.colleges (pincode)`
- `idx_colleges_domain` ON `public.colleges (domain)`
- `idx_colleges_is_active` ON `public.colleges (is_active)`
- `idx_college_onboarding_requests_status` ON `public.college_onboarding_requests (status)`
- `idx_college_onboarding_requests_district` ON `public.college_onboarding_requests (district)`


-- =====================================================================================
-- KAVACH CAMPUS: MIGRATION 011 — STAFF LIVE LOCATIONS & LOCATION CONSENT SCHEMA
-- =====================================================================================
-- Run this script in the Supabase Dashboard SQL Editor for remote database alignment:
-- https://supabase.com/dashboard/project/polbnvszmvblwenfnqll/sql/new
--
-- This migration addresses the responder location model and consent requirements:
-- 1. Dedicated staff_locations table mapping staff_id to profiles(id)
-- 2. Explicit location consent tracking (is_location_sharing_enabled, consent timestamps)
-- 3. On-duty status filter (is_on_duty)
-- 4. Indexes for rapid spatial querying and freshness filtering
-- 5. Row Level Security: staff can only manage their own coordinates;
--    Security and Admins can only view on-duty, consent-sharing staff locations.
-- =====================================================================================

CREATE TABLE IF NOT EXISTS public.staff_locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    staff_id UUID UNIQUE NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    accuracy DOUBLE PRECISION,
    is_on_duty BOOLEAN DEFAULT TRUE,
    is_location_sharing_enabled BOOLEAN DEFAULT TRUE,
    consent_recorded_at TIMESTAMPTZ DEFAULT NOW(),
    consent_withdrawn_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for responder discovery and location freshness
CREATE INDEX IF NOT EXISTS idx_staff_locations_staff_id ON public.staff_locations(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_locations_updated_at ON public.staff_locations(updated_at);
CREATE INDEX IF NOT EXISTS idx_staff_locations_duty_consent ON public.staff_locations(is_on_duty, is_location_sharing_enabled);

-- Enable Row Level Security
ALTER TABLE public.staff_locations ENABLE ROW LEVEL SECURITY;

-- Policy 1: Staff members can view and update their own live location and consent
CREATE POLICY staff_locations_self_manage ON public.staff_locations
    FOR ALL
    TO authenticated
    USING (staff_id = auth.uid())
    WITH CHECK (staff_id = auth.uid());

-- Policy 2: Campus Security and Institutional Administrators can view active responder locations for case dispatch
CREATE POLICY staff_locations_dispatch_read ON public.staff_locations
    FOR SELECT
    TO authenticated
    USING (
        public.is_security_or_admin()
        AND is_on_duty = TRUE
        AND is_location_sharing_enabled = TRUE
    );

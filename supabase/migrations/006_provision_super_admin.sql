-- ==============================================================================
-- KAVACH CAMPUS: MIGRATION 006 — SUPER ADMIN PROVISIONING SCRIPT
-- ==============================================================================
-- This script safely configures a verified Super Admin account for root oversight.
-- Run this in the Supabase Dashboard SQL Editor AFTER the user registers
-- or is created via Supabase Auth.
--
-- TARGET USER EMAIL: venkatapavanpadamati1@gmail.com
-- ROLE: SUPER_ADMIN
-- IS_APPROVED: TRUE
-- ==============================================================================

DO $$
DECLARE
    target_email TEXT := 'venkatapavanpadamati1@gmail.com';
    target_user_id UUID;
BEGIN
    -- 1. Find user in auth.users
    SELECT id INTO target_user_id
    FROM auth.users
    WHERE email = target_email;

    IF target_user_id IS NOT NULL THEN
        -- 2. Upsert / update profile in public.profiles
        INSERT INTO public.profiles (
            id,
            full_name,
            college_email,
            role,
            is_approved,
            department,
            student_id,
            created_at,
            updated_at
        )
        VALUES (
            target_user_id,
            'Super Administrator',
            target_email,
            'SUPER_ADMIN',
            TRUE,
            'Root Administration',
            'SUPER-ADMIN-01',
            NOW(),
            NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
            role = 'SUPER_ADMIN',
            is_approved = TRUE,
            updated_at = NOW();

        -- 3. Update auth metadata
        UPDATE auth.users
        SET raw_user_meta_data = jsonb_set(
            COALESCE(raw_user_meta_data, '{}'::jsonb),
            '{role}',
            '"SUPER_ADMIN"'
        )
        WHERE id = target_user_id;

        -- 4. Record audit log
        INSERT INTO public.audit_logs (
            actor_id,
            action,
            target_id,
            details,
            created_at
        )
        VALUES (
            target_user_id,
            'PROVISION_SUPER_ADMIN',
            target_user_id,
            jsonb_build_object('email', target_email, 'role', 'SUPER_ADMIN'),
            NOW()
        );

        RAISE NOTICE 'Successfully provisioned SUPER_ADMIN for: % (ID: %)', target_email, target_user_id;
    ELSE
        RAISE NOTICE 'Notice: User % has not registered in auth.users yet. Please register or create the user in Supabase Auth, then re-run this script.', target_email;
    END IF;
END $$;

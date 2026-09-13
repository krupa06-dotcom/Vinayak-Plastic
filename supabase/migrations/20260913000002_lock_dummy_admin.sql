-- ============================================================
-- SECURITY: disable the well-known dev/dummy admin password
-- ============================================================
-- The dummy admin created by 20260912010000_dummy_admin_user.sql uses
-- the password "Admin@123", which is committed to this repository and
-- therefore publicly known. Anyone could sign in to the admin panel
-- (once deployed) and read/modify data.
--
-- This migration replaces that password with an unguessable random
-- string so the known credential stops working. The account itself is
-- kept because is_admin() authorises admins by the
-- @vinayakplastics.com email domain — only the password is invalidated.
--
-- NEXT STEP (manual, one time): set a strong password for a real admin
--   Supabase Dashboard -> Authentication -> Users -> admin@vinayakplastics.com
--   -> "Reset password" (or delete this account and invite a real one).
-- Full checklist: supabase/SECURITY.md.
-- ============================================================

update auth.users
set encrypted_password = gen_random_uuid()::text,
    updated_at = now()
where email = 'admin@vinayakplastics.com';

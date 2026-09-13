-- ============================================================
-- Create the public "product-images" storage bucket
-- ============================================================
-- The storage RLS policies (20260911000000_admin_storage_rls.sql)
-- reference a bucket that was never created, so admin uploads / lists /
-- deletes failed with "Bucket not found".
--
-- This migration creates the bucket deterministically. Buckets created
-- via SQL do NOT receive the dashboard's auto-generated public-read
-- policy, so that policy is added explicitly below.
--
-- Safe to re-run: the bucket upsert is idempotent and the policy is
-- dropped/recreated.
-- ============================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  5242880, -- 5 MB (matches supabase/STORAGE_SETUP.md)
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Public read access. Public bucket URLs work without this, but the
-- Storage API (list / download) needs it to behave like a
-- dashboard-created public bucket.
drop policy if exists "Public read product-images" on storage.objects;

create policy "Public read product-images"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'product-images');

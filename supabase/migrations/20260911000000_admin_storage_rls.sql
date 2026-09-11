-- ============================================================
-- Storage RLS — admin access to the "product-images" bucket
-- ============================================================
-- The bucket itself is public (content is served over its public
-- URL), but every operation through the Supabase Storage API is
-- subject to RLS on storage.objects. Without these policies, admin
-- uploads / lists / deletes would be blocked.
-- ------------------------------------------------------------

drop policy if exists "Admin full access to product-images" on storage.objects;

create policy "Admin full access to product-images"
  on storage.objects
  for all
  to authenticated
  using (
    bucket_id = 'product-images'
    and public.is_admin()
  )
  with check (
    bucket_id = 'product-images'
    and public.is_admin()
  );
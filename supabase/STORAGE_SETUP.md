# Supabase Storage Configuration

## Product Images Bucket

This document describes how to configure Supabase Storage for product images.

## Recommended: apply the migration

The bucket and its policies are created by a migration:

```bash
supabase link --project-ref your-project-ref
supabase db push
```

or paste `migrations/20260913000000_create_product_images_bucket.sql`
into the Supabase SQL Editor (Dashboard → SQL Editor).

This creates the `product-images` bucket (public, 5 MB, image MIME types),
plus a public-read policy. Admin full-access policies were already added by
`20260911000000_admin_storage_rls.sql`.

## Manual Setup (Supabase Dashboard)

Only if you prefer the dashboard:

1. Go to your Supabase project dashboard
2. Navigate to **Storage** in the left sidebar
3. Click **New bucket**
4. Configure the bucket:
   - **Name**: `product-images`
   - **Public bucket**: ✅ Checked (for public read access)
   - **File size limit**: 5 MB
   - **Allowed MIME types**:
     - `image/jpeg`
     - `image/png`
     - `image/webp`
     - `image/gif`
5. Click **Create bucket**

## Storage Policies

The migration (`20260913000000_create_product_images_bucket.sql`) creates:

#### Public read access
```sql
CREATE POLICY "Public read product-images"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-images');
```

#### Admin full access (from `20260911000000_admin_storage_rls.sql`)
```sql
CREATE POLICY "Admin full access to product-images"
ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'product-images' AND public.is_admin())
WITH CHECK (bucket_id = 'product-images' AND public.is_admin());
```

## Product images served from the site bundle

The built site's product pages use **web-path images** shipped with the repo
under `public/images/products/*` and stored in `product_images.image_url` as
`/images/products/<name>` (e.g. `/images/products/plastic-crates.webp`).
These are served from the static site, not from Storage, and are seeded by
`20260913000001_fix_content_images.sql`.

The admin panel treats a root-relative `/...` path as a static asset
(base-prefixed) and anything else as a Storage object path.

## Storage-backed images (used by admin uploads)

When an admin uploads an image in the admin panel, the file is stored as a
Storage object and `product_images.image_url` holds the Storage path, e.g.:

```
https://{ref}.supabase.co/storage/v1/object/public/product-images/products/plastic-crates.webp
```

`getProductImageUrl()` / the admin `publicUrl()` helper build this from a
storage path, so both storage-backed and static web-path images are
supported.

### Recommended File Structure

```
product-images/
├── products/          <-- admin image uploads land here
├── categories/
└── general/
```
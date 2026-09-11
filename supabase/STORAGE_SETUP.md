# Supabase Storage Configuration

## Product Images Bucket

This document describes how to configure Supabase Storage for product images.

### Manual Setup (Supabase Dashboard)

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

### CLI Setup (Alternative)

If you have the Supabase CLI installed:

```bash
# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Create the storage bucket
supabase storage create-bucket product-images --public
```

### Storage Policies

After creating the bucket, set up these storage policies:

#### Public Read Access
```sql
-- Allow public read access to product images
CREATE POLICY "Public can view product images"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-images');
```

#### Admin Upload Access
```sql
-- Allow authenticated admins to upload product images
CREATE POLICY "Admins can upload product images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'product-images' AND
  auth.role() = 'authenticated' AND
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
    AND email LIKE '%@vinayakplastics.com'
  )
);
```

#### Admin Delete Access
```sql
-- Allow authenticated admins to delete product images
CREATE POLICY "Admins can delete product images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'product-images' AND
  auth.role() = 'authenticated' AND
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
    AND email LIKE '%@vinayakplastics.com'
  )
);
```

### Image URL Structure

Once uploaded, product images will be accessible at:

```
https://your-project-ref.supabase.co/storage/v1/object/public/product-images/{path}
```

Example:
```
https://abc123.supabase.co/storage/v1/object/public/product-images/products/plastic-crates.webp
```

### Recommended File Structure

Organize product images in the storage bucket:

```
product-images/
├── products/
│   ├── plastic-crates.webp
│   ├── plastic-pallets.webp
│   ├── waste-bins.webp
│   └── hand-pallet-trucks.webp
├── categories/
│   ├── plastic-crates.webp
│   └── ...
└── general/
    ├── warehouse-interior.webp
    └── ...
```

### Integration with Database

In the `product_images` table, store the storage path:

```sql
INSERT INTO product_images (product_id, image_url, alt_text, display_order)
VALUES (
  'product-uuid',
  'products/plastic-crates.webp',  -- Storage path
  'Plastic crates stacked in warehouse',
  1
);
```

Then use the `getProductImageUrl()` helper to get the full URL:

```typescript
import { getProductImageUrl } from '../lib/db';

const imageUrl = getProductImageUrl('products/plastic-crates.webp');
// Returns: https://abc123.supabase.co/storage/v1/object/public/product-images/products/plastic-crates.webp
```

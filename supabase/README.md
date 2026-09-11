# Vinayak Plastics - Supabase Backend Setup

## Overview

This document describes the Supabase backend setup for Vinayak Plastics, providing a scalable foundation for the B2B product catalogue and future admin panel.

## Architecture

### Database Schema

The database consists of the following tables:

#### Core Tables

1. **categories** - Product categories (e.g., Plastic Crates, Plastic Pallets)
2. **sub_categories** - Sub-categories within each category
3. **products** - Individual products with details and specifications
4. **product_images** - Multiple images per product
5. **product_specifications** - Flexible key-value specifications per product

#### Supporting Tables

6. **industries** - Target industries for products
7. **product_industries** - Many-to-many relationship between products and industries
8. **enquiries** - Customer enquiries and quote requests
9. **site_settings** - Key-value store for site configuration

### Relationships

```
categories → sub_categories → products → product_images
                                   ↓
                              product_specifications
                                   ↓
                              product_industries → industries
                                   ↓
                              enquiries
```

## Setup Instructions

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click "New Project"
3. Enter project details:
   - **Name**: vinayak-plastics
   - **Database Password**: (generate a strong password)
   - **Region**: Choose closest to your users (e.g., Mumbai for India)
4. Click "Create new project"

### 2. Get Project Credentials

1. Go to **Settings** → **API Keys**
2. Copy the following:
   - **Project URL** (e.g., `https://abc123.supabase.co`)
   - **Publishable key** (starts with `sb_publishable_...`) — this replaces the legacy `anon` key

### 3. Configure Environment Variables

1. Create `.env` file in project root:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` with your credentials:
   ```
   SUPABASE_URL=https://abc123.supabase.co
   SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxxxxxxxxxxx
   ```

### 4. Run Database Migrations

#### Option A: Via Supabase Dashboard

1. Go to **SQL Editor** in your Supabase dashboard
2. Open `supabase/migrations/20260910000000_initial_schema.sql`
3. Copy and paste the entire SQL
4. Click "Run" to execute
5. Repeat for `20260910000001_sample_data.sql`

#### Option B: Via Supabase CLI (Recommended)

1. Install Supabase CLI:
   ```bash
   npm install -g supabase
   ```

2. Login to Supabase:
   ```bash
   supabase login
   ```

3. Link to your project:
   ```bash
   supabase link --project-ref abc123
   ```

4. Push database migrations:
   ```bash
   supabase db push
   ```

### 5. Configure Storage Bucket

1. Go to **Storage** in your Supabase dashboard
2. Click **New bucket**
3. Configure:
   - **Name**: `product-images`
   - **Public bucket**: ✅ Checked
   - **File size limit**: 5 MB
   - **Allowed MIME types**: `image/jpeg, image/png, image/webp, image/gif`
4. Click **Create bucket**

For detailed storage setup, see `supabase/STORAGE_SETUP.md`

### 6. Verify Setup

1. Go to **Table Editor** in Supabase dashboard
2. Verify all tables are created
3. Check that sample data is inserted
4. Go to **Storage** and verify the `product-images` bucket exists

## Row Level Security (RLS)

### Public Access (Read)

- **categories**: Read active categories only
- **sub_categories**: Read active sub-categories only
- **products**: Read active products only
- **product_images**: Read all images
- **product_specifications**: Read all specifications
- **industries**: Read active industries
- **product_industries**: Read all relationships
- **site_settings**: Read all settings
- **enquiries**: Insert only (public can submit)

### Admin Access (Full)

Authenticated users with `@vinayakplastics.com` email can:
- Insert, update, delete all tables
- Upload and delete product images
- Manage enquiries (read, update, delete)

## Usage in Astro

### Fetching Data at Build Time

```typescript
import { getCategories, getProductBySlug } from '../lib/db';

// In Astro frontmatter
const categories = await getCategories();
const product = await getProductBySlug('plastic-crates');
```

### Using the Supabase Client

```typescript
import { supabase } from '../lib/supabase';

// Direct query
const { data, error } = await supabase
  .from('products')
  .select('*')
  .eq('is_active', true);
```

### Client-Side Submission (Enquiry Form)

```typescript
// Submit enquiry via REST API (RLS allows public insert)
// Note: publishable keys go on the apikey header only (not Authorization)
const response = await fetch(`${SUPABASE_URL}/rest/v1/enquiries`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_PUBLISHABLE_KEY
  },
  body: JSON.stringify({
    name: 'John Doe',
    phone: '+91 98765 43210',
    message: 'Interested in plastic crates'
  })
});
```

## File Structure

```
Vinayak-Plastics/
├── src/
│   └── lib/
│       ├── supabase.ts          # Supabase client initialization
│       ├── database.types.ts    # TypeScript types for database
│       ├── db.ts                # Database query helpers
│       └── auth.ts              # Authentication helpers (for future admin)
├── supabase/
│   ├── migrations/
│   │   ├── 20260910000000_initial_schema.sql
│   │   └── 20260910000001_sample_data.sql
│   └── STORAGE_SETUP.md
├── .env.example                 # Environment variables template
└── .env                         # Your environment variables (git-ignored)
```

## Next Steps (Phase 4: Admin Panel)

1. **Authentication**: Set up admin login with Supabase Auth
2. **Admin Dashboard**: Build CRUD interface for products
3. **Image Upload**: Implement image upload to Supabase Storage
4. **Enquiry Management**: Build enquiry dashboard with status tracking

## Troubleshooting

### "Missing Supabase environment variables"

- Ensure `.env` file exists with `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`
- Restart the dev server after adding environment variables

### "relation does not exist"

- Run the database migrations in the correct order
- Check that migrations executed successfully in SQL Editor

### "new row violates row-level security policy"

- For public inserts (enquiries), ensure RLS policy allows it
- For admin operations, ensure user is authenticated with correct email

### Images not loading

- Verify `product-images` bucket exists and is public
- Check that image paths in database match uploaded file paths

## Support

For issues or questions:
- Check Supabase documentation: [supabase.com/docs](https://supabase.com/docs)
- Review RLS policies in Supabase dashboard
- Check browser console for error messages

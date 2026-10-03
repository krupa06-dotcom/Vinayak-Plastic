# Admin Interface Setup

## Issues Fixed

### 1. Missing Product Images
- Added missing product images to `public/images/products/`:
  - `plastic-crates.webp` (copied from `src/assets/images/stack-crates.jpeg`)
  - `plastic-pallets.webp` (copied from `src/assets/images/plastic-pallets.jpeg`)

### 2. API Route 404 Errors
- **Problem**: Static export (`output: 'export'`) doesn't support API routes
- **Solution**: Removed static export configuration to enable server-side functionality

## Deployment Options

### Option 1: Server-Side Deployment (Recommended for Admin)
Use the current configuration with `npm run build` for full functionality including:
- Admin interface with live updates
- API routes for revalidation
- Dynamic content management

### Option 2: Static Export (Public Site Only)
Use `npm run build:static` for static deployment without admin functionality:
- Static files only
- No API routes
- No live admin updates
- Suitable for CDN deployment

## Current Configuration

- **Development**: `npm run dev` (runs on http://localhost:3000 or 3001 if 3000 is busy)
- **Production Build**: `npm run build` (enables full functionality)
- **Static Build**: `npm run build:static` (static files only)

## Vercel Deployment

The `vercel.json` configuration now includes:
- Clean URLs enabled
- API function timeout configuration for revalidation endpoint

## Admin Access

1. Start the development server: `npm run dev`
2. Navigate to `/admin` 
3. The revalidation API should now work correctly
4. Image uploads and site changes should trigger rebuilds properly

## Notes

- Make sure your Supabase environment variables are configured in `.env`
- The admin interface requires server-side rendering to function properly
- Static export is available but disables admin functionality
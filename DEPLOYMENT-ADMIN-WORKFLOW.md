# Deployment & Admin Workflow

## Current Setup

The Vinayak Plastics website uses **Static Export** deployment to Vercel. This means the site is pre-built as static HTML files for optimal performance and SEO.

## How Admin Changes Work

### Database Updates
- Admin panel changes (categories, series, products) are saved to Supabase immediately
- These changes are stored in the database but **do not automatically appear on the website**

### Website Updates
For changes to appear on the live website, a **rebuild is required** because the site is statically generated.

## Deployment Options

### Option 1: Automatic Rebuilds (Recommended)

Set up automatic rebuilds by configuring a Vercel Deploy Hook:

1. **In Vercel Dashboard:**
   - Go to Project Settings → Git → Deploy Hooks
   - Create a new deploy hook named "Admin Panel Rebuild"
   - Copy the webhook URL

2. **Add Environment Variable:**
   ```
   VERCEL_DEPLOY_HOOK_URL=https://api.vercel.com/v1/integrations/deploy/...
   ```

3. **How it Works:**
   - Admin makes changes → clicks save
   - System automatically triggers Vercel rebuild
   - Website updates in 2-3 minutes

### Option 2: Manual Deployment

If automatic rebuilds aren't configured:

1. Admin makes changes in the admin panel
2. Changes are saved to database
3. **Manual step:** Go to Vercel dashboard and trigger a new deployment
4. Website updates once deployment completes

## Current Behavior

- ✅ Admin changes save to database immediately
- ⚠️ Website requires rebuild to show changes
- 📱 Admin panel shows appropriate messages about rebuild status

## Technical Details

### Static Export Configuration
```javascript
// next.config.mjs
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  // ...
};
```

### Build Process
1. Fetches data from Supabase during build
2. Generates static HTML for all 100+ product pages
3. Deploys to Vercel's global CDN

### Admin Panel Integration
- Uses Supabase for real-time database updates
- Calls `/api/revalidate` endpoint after changes
- Shows appropriate messaging based on rebuild capability

## Troubleshooting

### If Changes Don't Appear
1. Check if VERCEL_DEPLOY_HOOK_URL is configured
2. Verify admin panel shows successful save message
3. Wait 2-3 minutes for rebuild to complete
4. Hard refresh the browser (Ctrl+F5)

### If Admin Panel Errors
1. Check network connectivity
2. Verify Supabase connection
3. Check browser console for errors
4. Ensure admin user has proper permissions

## Environment Variables Required

```env
# Supabase (required)
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...

# Deploy Hook (optional but recommended)
VERCEL_DEPLOY_HOOK_URL=https://api.vercel.com/v1/integrations/deploy/...

# Revalidation Secret (optional)
REVALIDATE_SECRET=your-secret-key
```

## Performance Benefits

- ⚡ **Fast Loading**: Static files served from CDN
- 🔍 **SEO Optimized**: Fully crawlable HTML pages
- 💰 **Cost Effective**: No server compute costs
- 🛡️ **Secure**: No server-side vulnerabilities

The tradeoff is that changes require rebuilds, but for a catalog website, this is usually acceptable since product updates are infrequent.
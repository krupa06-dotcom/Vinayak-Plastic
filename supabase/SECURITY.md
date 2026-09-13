# Security Checklist — Admin Access & Deployment

## 1. Account hygiene

The repo ships a **dev/dummy admin account** for local development:

- email: `admin@vinayakplastics.com` / password: `Admin@123`
  (created by `migrations/20260912010000_dummy_admin_user.sql`)

That password is **committed to the repository and is publicly known**.
Anyone who knows the email domain rule can sign in to the admin panel
once it is deployed. Do the following **before/at go-live**:

1. Apply the lock migration (`20260913000002_lock_dummy_admin.sql`) —
   it replaces the stored password with an unguessable random string so
   `Admin@123` stops working.
2. Then set a real password in the Supabase Dashboard:
   **Authentication → Users → `admin@vinayakplastics.com` → Reset password**
   (or delete the account and invite a real `@vinayakplastics.com` admin).
3. Never commit passwords, password hashes, or the service-role key.

## 2. Admin access model

- Admin = any authenticated user whose email ends in `@vinayakplastics.com`
  (enforced client-side and by `public.is_admin()` in RLS).
- The admin UI ships as **static HTML**; real protection is Supabase RLS.
  Do not treat the admin page as a security boundary on its own.

## 3. Enquiries

- Public email-insert policy uses `WITH CHECK (true)`: fields are not
  validated and `status` can be set to anything. Expected future
  hardening: server-side validation (edge function), rate limiting,
  honeypot, and a status whitelist.

## 4. Secrets

- Only `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` are used by the app.
  These are publishable by design (shipped in HTML).
- **Never** set `SUPABASE_SECRET_KEY` / service-role in the frontend or in
  GitHub Action build vars.

## 5. Deploying (GitHub Actions)

1. Repo **Settings → Pages → Source: GitHub Actions**.
2. Add repo **Variables** (Settings → Secrets and variables → Actions →
   Variables):
   - `SUPABASE_URL`
   - `SUPABASE_PUBLISHABLE_KEY`
3. Push to `main` (or run the *Build & Deploy to GitHub Pages* workflow
   manually) → the latest `dist/` is published.

## 6. Go-live checklist

- [ ] Storage bucket `product-images` exists (`20260913000000_create_product_images_bucket.sql`)
- [ ] Product images seeded (`20260913000001_fix_content_images.sql`)
- [ ] Dummy admin password locked + real password set (`20260913000002_lock_dummy_admin.sql` + Dashboard)
- [ ] Live site shows real contact (not `+91 XXXXX-XXXXX` placeholders)
- [ ] `/admin/` return of the live build is reachable by you and (correctly) blocked from crawlers
- [ ] Enquiry form works end-to-end (test with a throwaway submission, then delete it)
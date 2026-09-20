import '@/styles/admin.css';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';

const config = {
  url: supabaseUrl,
  key: supabasePublishableKey,
  base: '/',
  configured: Boolean(
    supabaseUrl &&
    supabasePublishableKey &&
    !supabaseUrl.includes('your-project-ref') &&
    !supabasePublishableKey.includes('sb_publishable_xxxxx')
  )
};

export const metadata = {
  title: {
    template: '%s | Vinayak Plastics Admin',
    default: 'Vinayak Plastics Admin'
  },
  robots: { index: false, follow: false }
};

const BOOTSTRAP_JS = `window.__VP_SUPABASE__ = ${JSON.stringify(config)};document.documentElement.classList.add('admin');`;

// Admin route layout. Pushes `admin` onto <html> (the root layout owns the
// <html> tag) and publishes the Supabase runtime config to window BEFORE any
// deferred module bundle runs — the client admin pages read this at import
// time to build the supabase client.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: BOOTSTRAP_JS }} />
      {children}
    </>
  );
}
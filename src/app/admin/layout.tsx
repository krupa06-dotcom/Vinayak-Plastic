import '@/styles/admin.css';

export const metadata = {
  title: {
    template: '%s | Vinayak Plastics Admin',
    default: 'Vinayak Plastics Admin'
  },
  robots: { index: false, follow: false }
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  // The .admin wrapper is the scope for every rule in admin.css — it carries the
  // element resets (box-sizing, link/button/input fonts) so they cannot leak into
  // the public site. Keep it in place.
  return <div className="admin">{children}</div>;
}
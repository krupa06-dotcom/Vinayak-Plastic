import '@/styles/admin.css';

export const metadata = {
  title: {
    template: '%s | Vinayak Plastics Admin',
    default: 'Vinayak Plastics Admin'
  },
  robots: { index: false, follow: false }
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
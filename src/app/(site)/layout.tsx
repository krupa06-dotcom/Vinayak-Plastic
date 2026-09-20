import './../../styles/style.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import SiteScripts from '@/components/SiteScripts';
import { SITE_URL } from '@/lib/site';

const organizationSchema = `{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Vinayak Plastics",
  "url": "${SITE_URL}",
  "logo": "${SITE_URL}${'/'}images/vp-logo.png",
  "description": "Business house supplying material handling and packaging products — plastic crates, pallets, waste bins and hand pallet trucks.",
  "contactPoint": {
    "@type": "ContactPoint",
    "contactType": "sales",
    "telephone": "+91-95587-47862"
  }
}`;

export default function SiteLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: organizationSchema }}
      />
      <Header />
      {children}
      <Footer />
      <SiteScripts />
    </>
  );
}
import vpLogo from '@/assets/images/vp-logo.webp';
import { CONTACT, normalizedNumber } from '@/lib/contact';
import { getSiteSetting } from '@/lib/db';

export default async function Footer() {
  const contactSetting = (await getSiteSetting('contact')) as Record<string, string> | null;
  const display = {
    phone: contactSetting?.phone || CONTACT.phoneDisplay,
    email: contactSetting?.email || CONTACT.email,
    address: contactSetting?.address || CONTACT.address
  };
  const phoneHref = `tel:+${normalizedNumber(contactSetting?.phone || CONTACT.phone)}`;
  const whatsappHref = `https://wa.me/${normalizedNumber(contactSetting?.whatsapp || CONTACT.phone)}`;

  const socialSetting = (await getSiteSetting('social')) as Record<string, string> | null;
  const social = [
    socialSetting?.facebook && { label: 'Facebook', href: socialSetting.facebook },
    socialSetting?.linkedin && { label: 'LinkedIn', href: socialSetting.linkedin },
    socialSetting?.instagram && { label: 'Instagram', href: socialSetting.instagram },
    socialSetting?.youtube && { label: 'YouTube', href: socialSetting.youtube }
  ].filter((x): x is { label: string; href: string } => Boolean(x));

  return (
    <footer className="site-footer" id="contact">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            <a href="/" className="nav-logo">
              <img src={vpLogo.src} alt="Vinayak Plastics" className="logo-img" width={120} height={92} loading="lazy" />
            </a>
            <p>Business House Engaged In Supply of All Type of Material Handling & Packaging Products — Crates, Dustbin, Ice Box, Storage Bins, Racking System, Hand Pallet Truck Etc.</p>
          </div>

          <div className="footer-col">
            <h3>Products</h3>
            <a href="/products/plastic-crates">Plastic Crates</a>
            <a href="/products/plastic-pallets">Plastic Pallets</a>
            <a href="/products/waste-bins">Waste Bins / Dustbins</a>
            <a href="/products/hand-pallet-trucks">Hand Pallet Trucks</a>
            <a href="/products">Full Product Range</a>
          </div>

          <div className="footer-col">
            <h3>Contact</h3>
            <p>Phone: <a href={phoneHref}>{display.phone}</a></p>
            <p>WhatsApp: <a href={whatsappHref} target="_blank" rel="noopener">{display.phone}</a></p>
            <p>Email: <a href={`mailto:${display.email}`}>{display.email}</a></p>
            <p>Address: {display.address}</p>
            {social.length > 0 && (
              <div className="footer-social">
                {social.map((s) => (
                  <a key={s.label} href={s.href} target="_blank" rel="noopener" style={{ display: 'inline-block', marginRight: 14 }}>
                    {s.label}
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <div className="container">
          <p>&copy; 2026 Vinayak Plastics. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
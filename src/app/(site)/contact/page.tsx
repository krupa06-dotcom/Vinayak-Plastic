import type { Metadata } from 'next';
import BackButton from '@/components/BackButton';
import EnquiryForm from '@/components/EnquiryForm';
import { CONTACT, normalizedNumber } from '@/lib/contact';
import { getSiteSetting } from '@/lib/db';

export const metadata: Metadata = {
  title: { absolute: 'Contact Vinayak Plastics | Quote for Crates, Pallets & Waste Bins' },
  description:
    'Contact Vinayak Plastics by phone or WhatsApp for pricing, product specs and dispatch timelines on plastic crates, pallets, waste bins and hand pallet trucks.'
};

export default async function ContactPage() {
  const contactSetting = await getSiteSetting('contact') as Record<string, string> | null;
  const phone = contactSetting?.phone || CONTACT.phoneDisplay;
  const email = contactSetting?.email || CONTACT.email;
  const address = contactSetting?.address || CONTACT.address;
  const whatsapp = contactSetting?.whatsapp || CONTACT.phone;
  const phoneHref = `tel:+${normalizedNumber(contactSetting?.phone || CONTACT.phone)}`;
  const whatsappHref = `https://wa.me/${normalizedNumber(contactSetting?.whatsapp || CONTACT.phone)}`;
  const emailHref = `mailto:${contactSetting?.email || CONTACT.email}`;

  return (
    <main id="main">
      {/* ===== PAGE HERO ===== */}
      <section className="page-hero">
        <div className="container">
          <div className="hero-top">
            <p className="breadcrumb"><a href="/">Home</a> / Contact Us</p>
            <BackButton href="/" />
          </div>
          <h1 className="display-800">Get in Touch</h1>
          <p>Call, WhatsApp, or email us directly for pricing, product specifications, and dispatch information.</p>
        </div>
      </section>

      {/* ===== CONTACT ===== */}
      <section className="section">
        <div className="container">
          <div className="contact-grid">

            <div className="contact-info-card reveal">
              <h2>Contact Information</h2>

              <div className="contact-item">
                <div className="ci-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/>
                  </svg>
                </div>
                <div>
                  <h3>Phone</h3>
                  <a href={phoneHref}>{phone}</a>
                </div>
              </div>

              <div className="contact-item">
                <div className="ci-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/>
                  </svg>
                </div>
                <div>
                  <h3>WhatsApp</h3>
                  <a href={whatsappHref} target="_blank" rel="noopener">{whatsapp}</a>
                </div>
              </div>

              <div className="contact-item">
                <div className="ci-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                    <polyline points="22,6 12,13 2,6"/>
                  </svg>
                </div>
                <div>
                  <h3>Email</h3>
                  <a href={emailHref}>{email}</a>
                </div>
              </div>

              <div className="contact-item">
                <div className="ci-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
                    <circle cx="12" cy="10" r="3"/>
                  </svg>
                </div>
                <div>
                  <h3>Address</h3>
                  <p>{address}</p>
                </div>
              </div>

            </div>

            <div className="contact-form-card reveal">
              <h2>Send a Message</h2>
              <p style={{ color: 'var(--steel)', fontSize: '0.9rem', marginBottom: 20 }}>Fill in the form below and we&apos;ll get back to you with product information and pricing.</p>
              <EnquiryForm />
            </div>

          </div>
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section className="cta-banner" aria-label="Call to action">
        <div className="container reveal">
          <h2 className="display-700">Prefer to Talk Directly?</h2>
          <p>We&apos;re available on phone and WhatsApp for quick responses on pricing and product availability.</p>
          <div className="cta-buttons">
            <a href={phoneHref} className="btn btn-primary">Call {phone}</a>
            <a href={whatsappHref} className="btn btn-secondary" target="_blank" rel="noopener">WhatsApp Us</a>
          </div>
        </div>
      </section>
    </main>
  );
}
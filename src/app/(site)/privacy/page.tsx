import type { Metadata } from 'next';
import BackButton from '@/components/BackButton';
import { CONTACT } from '@/lib/contact';

export const metadata: Metadata = {
  title: { absolute: 'Privacy Policy | Vinayak Plastics' },
  description:
    'How Vinayak Plastics collects, uses and protects the information you share through product enquiries, quotes and this website.',
  alternates: { canonical: '/privacy' }
};

const LAST_UPDATED = '30 October 2026';

export default function PrivacyPage() {
  return (
    <main id="main">
      <section className="page-hero">
        <div className="container">
          <div className="hero-top">
            <p className="breadcrumb"><a href="/">Home</a> / Privacy Policy</p>
            <BackButton href="/" />
          </div>
          <h1 className="display-800">Privacy Policy</h1>
          <p>What we collect when you contact us or browse this website, why we need it, and the choices you have.</p>
        </div>
      </section>

      <section className="section">
        <div className="container-sm">
          <div className="legal reveal">
            <p className="legal__meta">Last updated: {LAST_UPDATED}</p>
            <p className="legal__lead">
              Vinayak Plastics respects your privacy. This policy explains how we handle personal
              information shared through this website, by phone, WhatsApp or email. By using the site
              or sending an enquiry, you agree to the practices described here.
            </p>

            <h2>1. Information we collect</h2>
            <p>We only ask for what we need to answer your enquiry and supply products:</p>
            <ul>
              <li><strong>Enquiry details</strong> — your name, phone number, email address, company name, product interest, quantity and any message you send.</li>
              <li><strong>Technical information</strong> — standard server logs such as IP address, browser type, device type, referring page and the pages you visit. These logs help us keep the site secure and working correctly.</li>
            </ul>
            <p>
              We do not create customer accounts on this website and we do not knowingly collect
              information from children under 18.
            </p>

            <h2>2. How we use your information</h2>
            <ul>
              <li>Respond to enquiries and provide quotes, specifications and availability.</li>
              <li>Process and coordinate orders, dispatch and after-sales support.</li>
              <li>Improve our product information and the performance of this website.</li>
              <li>Meet legal, tax and accounting obligations.</li>
            </ul>
            <p>
              We do not sell your personal information, and we do not use it for unrelated marketing
              without your consent.
            </p>

            <h2>3. Cookies and analytics</h2>
            <p>
              This website does not use advertising cookies or third-party analytics trackers. Any
              cookies or local storage used are strictly necessary for the site to function, such as
              remembering a preference during your visit.
            </p>

            <h2>4. Who we share information with</h2>
            <p>
              We share information only with service providers who help us operate the website and
              respond to enquiries — for example hosting, database and email delivery providers. These
              providers process data on our instructions and are expected to protect it. We may also
              disclose information where required by law or to protect our legal rights.
            </p>

            <h2>5. How long we keep information</h2>
            <p>
              Enquiry records are kept for as long as needed to respond, follow up on a potential
              order, and maintain business records. Order and accounting records are retained for the
              period required by applicable Indian law. When information is no longer needed, we delete
              or anonymise it.
            </p>

            <h2>6. Keeping information secure</h2>
            <p>
              We use reasonable technical and organisational measures to protect the information we
              hold. No method of transmission over the internet is completely secure, so please avoid
              sending sensitive documents through the website enquiry form.
            </p>

            <h2>7. Your choices and rights</h2>
            <p>You may ask us to:</p>
            <ul>
              <li>Confirm what personal information we hold about you.</li>
              <li>Correct information that is inaccurate or out of date.</li>
              <li>Delete information we no longer need, where the law allows.</li>
              <li>Stop sending you follow-up messages.</li>
            </ul>
            <p>
              To make a request, contact us using the details below. We may need to verify your
              identity before acting on it.
            </p>

            <h2>8. Links to other websites</h2>
            <p>
              This site may link to third-party websites such as WhatsApp or social media pages. We are
              not responsible for their privacy practices; please review their policies separately.
            </p>

            <h2>9. Changes to this policy</h2>
            <p>
              We may update this policy from time to time. The revised version will be posted on this
              page with a new “last updated” date.
            </p>

            <h2>10. Contact us</h2>
            <p>Questions about this policy or your information can be sent to:</p>
            <ul>
              <li><strong>Email:</strong> <a href={CONTACT.emailHref}>{CONTACT.email}</a></li>
              <li><strong>Phone / WhatsApp:</strong> <a href={CONTACT.phoneHref}>{CONTACT.phoneDisplay}</a></li>
              <li><strong>Address:</strong> {CONTACT.address}</li>
            </ul>
          </div>
        </div>
      </section>
    </main>
  );
}

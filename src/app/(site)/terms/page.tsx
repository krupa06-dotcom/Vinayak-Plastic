import type { Metadata } from 'next';
import BackButton from '@/components/BackButton';
import { CONTACT } from '@/lib/contact';

export const metadata: Metadata = {
  title: { absolute: 'Terms & Conditions | Vinayak Plastics' },
  description:
    'Terms governing the use of the Vinayak Plastics website, product information, quotes, orders and delivery.',
  alternates: { canonical: '/terms' }
};

const LAST_UPDATED = '30 October 2026';

export default function TermsPage() {
  return (
    <main id="main">
      <section className="page-hero">
        <div className="container">
          <div className="hero-top">
            <p className="breadcrumb"><a href="/">Home</a> / Terms &amp; Conditions</p>
            <BackButton href="/" />
          </div>
          <h1 className="display-800">Terms &amp; Conditions</h1>
          <p>The basis on which we publish product information and handle quotes, orders and delivery.</p>
        </div>
      </section>

      <section className="section">
        <div className="container-sm">
          <div className="legal reveal">
            <p className="legal__meta">Last updated: {LAST_UPDATED}</p>
            <p className="legal__lead">
              These terms apply to your use of the Vinayak Plastics website and to enquiries and orders
              placed through it. By using the site you accept these terms. Please read them before
              sending an enquiry.
            </p>

            <h2>1. About us</h2>
            <p>
              Vinayak Plastics is a business house supplying material handling and packaging products,
              including plastic crates, pallets, waste bins, hand pallet trucks, ice boxes, storage bins
              and racking systems. Our contact details appear at the end of this page.
            </p>

            <h2>2. Product information</h2>
            <p>
              We take care to describe our products accurately. Dimensions, weights, load capacities,
              colours and photographs are indicative and may vary slightly between batches and
              manufacturers. Product images are for illustration; the delivered item may differ in
              shade or finish. Where a specification is critical to your application, confirm the
              current drawing or specification sheet with our team before ordering.
            </p>

            <h2>3. Quotes and orders</h2>
            <ul>
              <li>Prices and availability are quoted for the quantity, specification and delivery location stated in your enquiry.</li>
              <li>A quote is not a binding offer until we confirm your order in writing.</li>
              <li>Quotes may be withdrawn or revised if material costs, taxes, freight or specifications change before confirmation.</li>
              <li>Orders are accepted subject to stock, manufacturing lead times and our confirmation of dispatch details.</li>
            </ul>

            <h2>4. Pricing, taxes and payment</h2>
            <p>
              Prices are exclusive of GST and other applicable taxes unless stated otherwise. Freight,
              loading, unloading and insurance are charged separately unless included in the quote.
              Payment terms are confirmed with each order. We may suspend dispatch where payment is
              overdue.
            </p>

            <h2>5. Delivery</h2>
            <p>
              Delivery timelines are estimates and depend on stock, production and the transport
              network. Risk in the goods passes to the buyer on dispatch or delivery as agreed in the
              order. Please inspect goods on arrival and report shortages or transit damage promptly,
              with photographs where possible.
            </p>

            <h2>6. Returns, replacements and warranty</h2>
            <p>
              Products are supplied for their intended industrial use. We will replace or credit goods
              that are materially defective in manufacture or differ from the confirmed specification,
              provided the issue is reported within a reasonable time and the goods have not been
              misused, modified or damaged in transit or storage. Consumable wear, colour variation and
              damage caused by overloading are not manufacturing defects. Returns require our prior
              approval.
            </p>

            <h2>7. Acceptable use of this website</h2>
            <p>
              You agree not to misuse the site, attempt to gain unauthorised access, interfere with its
              operation, scrape it at scale, or submit false, unlawful or misleading enquiries. We may
              restrict access where we reasonably believe these terms have been breached.
            </p>

            <h2>8. Intellectual property</h2>
            <p>
              The content on this website — including text, layout, photographs, logos and product
              descriptions — belongs to Vinayak Plastics or is used with permission. You may view and
              print pages for your own purchasing decisions, but may not copy or republish them for
              commercial use without our written consent.
            </p>

            <h2>9. Third-party links</h2>
            <p>
              Links to WhatsApp, social media or other third-party sites are provided for convenience.
              We do not control those sites and are not responsible for their content or practices.
            </p>

            <h2>10. Limitation of liability</h2>
            <p>
              To the extent permitted by law, Vinayak Plastics is not liable for indirect or
              consequential loss, loss of profit or business interruption arising from use of this
              website or from reliance on indicative product information. Nothing in these terms
              excludes liability that cannot be excluded under applicable law.
            </p>

            <h2>11. Governing law</h2>
            <p>
              These terms are governed by the laws of India. Disputes are subject to the exclusive
              jurisdiction of the courts at Vadodara, Gujarat.
            </p>

            <h2>12. Changes to these terms</h2>
            <p>
              We may update these terms from time to time. The current version is always published on
              this page with the date shown above.
            </p>

            <h2>13. Contact us</h2>
            <p>For questions about these terms, quotes or orders:</p>
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

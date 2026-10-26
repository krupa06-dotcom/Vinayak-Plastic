import type { Metadata } from 'next';
import '@/styles/style.css';
import BackButton from '@/components/BackButton';
import HeaderWrapper from '@/components/HeaderWrapper';
import Footer from '@/components/Footer';
import SiteScripts from '@/components/SiteScripts';

export const metadata: Metadata = {
  title: 'Page not found',
  robots: { index: false, follow: false }
};

export default function NotFound() {
  return (
    <>
      <a href="#main" className="skip-link">
        Skip to main content
      </a>
      <HeaderWrapper />
      <main id="main">
        <section className="page-hero">
          <div className="container">
            <div className="hero-top">
              <p className="breadcrumb">
                <a href="/">Home</a> / Not Found
              </p>
              <BackButton href="/" />
            </div>
            <h1 className="display-800">Page not found</h1>
            <p>The page you are looking for does not exist or may have been moved.</p>
          </div>
        </section>
        <section className="section">
          <div className="container">
            <div className="empty-state">
              <h3>404 — Nothing here</h3>
              <p>
                Try browsing the <a href="/products">product range</a>, returning to the{' '}
                <a href="/">homepage</a>, or <a href="/contact">contact us</a> if you expected
                to find something specific.
              </p>
            </div>
          </div>
        </section>
      </main>
      <Footer />
      <SiteScripts />
    </>
  );
}

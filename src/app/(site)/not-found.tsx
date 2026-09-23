import BackButton from '@/components/BackButton';

export default function SiteNotFound() {
  return (
    <main id="main">
      <section className="page-hero">
        <div className="container">
          <div className="hero-top">
            <p className="breadcrumb"><a href="/">Home</a> / Not Found</p>
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
  );
}
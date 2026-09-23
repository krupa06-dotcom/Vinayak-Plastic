export interface CategoryRailItem {
  slug: string;
  name: string;
  description: string | null;
  image: string | null;
  count: number;
}

type CategoryRailProps = {
  categories: CategoryRailItem[];
  currentSlug: string;
};

// Cross-category navigation: prev/next arrows between ranges plus quick cards
// for every other family. Keeps visitors flowing through the catalogue the way
// the header mega-menu does, but in page context — no need to scroll back up.
export default function CategoryRail({ categories, currentSlug }: CategoryRailProps) {
  const index = categories.findIndex((c) => c.slug === currentSlug);
  const prev = index > 0 ? categories[index - 1] : null;
  const next = index >= 0 && index < categories.length - 1 ? categories[index + 1] : null;
  const others = categories.filter((c) => c.slug !== currentSlug);

  return (
    <section className="section" id="explore" aria-label="Browse other product ranges">
      <div className="container">
        <header className="section-header reveal">
          <p className="sec-index">Keep exploring</p>
          <h2 className="display-700">Browse other product ranges</h2>
          <p>Jump between families — every range has its own sizes, colours and available models.</p>
        </header>

        <div className="cat-rail__pager reveal">
          {prev ? (
            <a href={`/categories/${prev.slug}`} className="cat-rail__pager-link cat-rail__pager-link--prev">
              <span aria-hidden="true">←</span> {prev.name}
            </a>
          ) : (
            <span aria-hidden="true"></span>
          )}
          <a href="/products" className="btn btn-secondary">All Ranges</a>
          {next ? (
            <a href={`/categories/${next.slug}`} className="cat-rail__pager-link cat-rail__pager-link--next">
              {next.name} <span aria-hidden="true">→</span>
            </a>
          ) : (
            <span aria-hidden="true"></span>
          )}
        </div>

        <div className="cat-rail__grid reveal">
          {others.map((c) => (
            <a href={`/categories/${c.slug}`} className="cat-rail__card" key={c.slug}>
              <span className="cat-rail__thumb">
                {c.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.image} alt={`${c.name} — Vinayak Plastics`} width="112" height="88" loading="lazy" decoding="async" />
                ) : (
                  <span className="cat-rail__thumb-empty">{c.name}</span>
                )}
              </span>
              <span className="cat-rail__body">
                <span className="cat-rail__name">{c.name}</span>
                <span className="cat-rail__count">
                  {c.count > 0 ? `${c.count} ${c.count === 1 ? 'model' : 'models'}` : 'Explore'}
                </span>
              </span>
              <span className="cat-rail__arrow" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5l7 7-7 7"/></svg>
              </span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
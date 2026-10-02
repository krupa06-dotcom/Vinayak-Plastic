'use client';

import { useEffect } from 'react';
import AdminShell from '@/components/admin/AdminShell';
import {
  gate,
  supabase,
  esc,
  activeBadge,
  showError,
  showEmpty,
  confirmDialog,
  toast,
  publicUrl,
  deleteFile,
  publishSite
} from '@/scripts/admin/core';

// Series list — the complete 4-level hierarchy:
// Category → Product Type (Sub-category) → Series (Footprint) → Sizes & Model Variants.
export default function Series() {
  useEffect(() => {
    let disposed = false;
    let searchInput: HTMLInputElement | null = null;
    let catFilterSelect: HTMLSelectElement | null = null;

    void (async () => {
      if (!(await gate())) return;
      if (disposed) return;

      const BASE: string = (window as any).__VP_SUPABASE__?.base ?? '/';
      const href = (p: string) => `${BASE.replace(/\/$/, '')}/${p.replace(/^\//, '')}`.replace(/\/+/g, '/');

      interface CatRow { id: string; name: string; slug: string; image_url?: string | null }
      interface SubCatRow { id: string; category_id: string; name: string; slug: string; image_url?: string | null }
      interface SeriesRow {
        id: string; category_id: string; sub_category_id: string | null; name: string; slug: string;
        base_length: number | null; base_width: number | null;
        is_active: boolean; image_url?: string | null;
      }

      let cats: CatRow[] = [];
      let subs: SubCatRow[] = [];
      let series: SeriesRow[] = [];

      async function load() {
        const listEl = document.getElementById('series-list');
        if (!listEl) return;

        const [catsRes, subsRes, seriesRes, sizesRes, versionsRes] = await Promise.all([
          supabase.from('categories').select('id, name, slug, image_url').order('display_order'),
          supabase.from('sub_categories').select('id, category_id, name, slug, image_url').order('display_order'),
          supabase.from('series').select('id, category_id, sub_category_id, name, slug, base_length, base_width, is_active, image_url').order('display_order'),
          supabase.from('size_variants').select('id, series_id, is_active').limit(5000),
          supabase.from('product_variants').select('size_variant_id').limit(10000)
        ]);

        if (catsRes.error) { showError(listEl, catsRes.error.message); return; }
        if (subsRes.error) { showError(listEl, subsRes.error.message); return; }
        if (seriesRes.error) { showError(listEl, seriesRes.error.message); return; }
        if (sizesRes.error) { showError(listEl, sizesRes.error.message); return; }
        if (versionsRes.error) { showError(listEl, versionsRes.error.message); return; }

        cats = (catsRes.data || []) as CatRow[];
        subs = (subsRes.data || []) as SubCatRow[];
        series = (seriesRes.data || []) as SeriesRow[];
        const allSizes = (sizesRes.data || []) as Array<{ id: string; series_id: string; is_active: boolean }>;
        const allVersions = (versionsRes.data || []) as Array<{ size_variant_id: string }>;

        // Populate Category Filter dropdown
        if (catFilterSelect) {
          const cur = catFilterSelect.value;
          catFilterSelect.innerHTML = `<option value="">All Categories (${cats.length})</option>` +
            cats.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('');
          catFilterSelect.value = cur;
        }

        const sizeBySeries = new Map<string, { total: number; active: number }>();
        for (const s of allSizes) {
          const cur = sizeBySeries.get(s.series_id) || { total: 0, active: 0 };
          cur.total++;
          if (s.is_active) cur.active++;
          sizeBySeries.set(s.series_id, cur);
        }
        const versionsBySize = new Map<string, number>();
        for (const v of allVersions) versionsBySize.set(v.size_variant_id, (versionsBySize.get(v.size_variant_id) || 0) + 1);
        const versionsBySeries = new Map<string, number>();
        for (const s of allSizes) {
          versionsBySeries.set(s.series_id, (versionsBySeries.get(s.series_id) || 0) + (versionsBySize.get(s.id) || 0));
        }

        const countEl = document.getElementById('series-count');
        if (countEl) countEl.textContent = `${series.length} series total`;

        if (!cats.length) {
          showEmpty(listEl, 'No categories yet', 'Create your first product category before adding series.',
            `<a href="${href('admin/categories/')}" class="a-btn a-btn-primary">+ Create Category</a>`);
          return;
        }

        // Build tree rows: Category -> Product Types / Direct -> Series
        listEl.innerHTML = `
          <div class="a-table-wrap">
            <table class="a-table">
              <thead><tr>
                <th style="min-width:280px">Category / Product Type / Series</th>
                <th style="width:130px">Footprint</th>
                <th style="width:100px">Sizes</th>
                <th style="width:110px">Models</th>
                <th style="width:90px">Status</th>
                <th style="width:170px">Actions</th>
              </tr></thead>
              <tbody>
                ${cats.map((cat) => {
                  const catSubs = subs.filter(sb => sb.category_id === cat.id);
                  const catSeries = series.filter(s => s.category_id === cat.id);
                  const directSeries = catSeries.filter(s => !s.sub_category_id);
                  const rows: string[] = [];

                  // Level 1: Category Header Row
                  rows.push(`
                    <tr class="a-tree-parent" id="cat-${cat.id}" data-cat-id="${cat.id}">
                      <td>
                        <button type="button" class="a-tree-toggle" data-toggle-cat="${cat.id}" aria-label="Toggle category" style="margin-right:8px;">−</button>
                        <strong style="font-size:0.95rem;color:var(--a-navy);">${esc(cat.name)}</strong>
                        <span class="a-chip a-chip-ok" style="margin-left:6px;">${catSeries.length} series</span>
                        ${catSubs.length ? `<span class="a-chip" style="margin-left:4px;">${catSubs.length} types</span>` : ''}
                      </td>
                      <td></td><td></td><td></td>
                      <td><span class="a-chip">—</span></td>
                      <td class="a-actions">
                        <a href="${href('admin/series/edit/?series=new&category=' + cat.id)}" class="a-btn a-btn-sm a-btn-primary">+ Series</a>
                        <a href="${href('admin/categories/')}" class="a-btn a-btn-sm">+ Type</a>
                      </td>
                    </tr>`);

                  // Level 2: Sub-categories (Product Types)
                  catSubs.forEach(sub => {
                    const subSeries = catSeries.filter(s => s.sub_category_id === sub.id);
                    rows.push(`
                      <tr class="is-child a-tree-parent" data-cat="${cat.id}" data-sub-id="${sub.id}" style="background:#faf8f3;">
                        <td>
                          <div style="display:flex;align-items:center;padding-left:22px;">
                            <button type="button" class="a-tree-toggle" data-toggle-sub="${sub.id}" aria-label="Toggle product type series" style="margin-right:8px;">−</button>
                            <span style="color:var(--a-orange);margin-right:6px;font-weight:700;">↳</span>
                            <strong style="font-size:0.88rem;color:var(--a-ink);">${esc(sub.name)}</strong>
                            <span class="a-chip" style="margin-left:6px;font-size:0.75rem;">${subSeries.length} series</span>
                          </div>
                        </td>
                        <td></td><td></td><td></td>
                        <td><span class="a-chip">—</span></td>
                        <td class="a-actions">
                          <a href="${href('admin/series/edit/?series=new&category=' + cat.id + '&sub_category=' + sub.id)}" class="a-btn a-btn-sm">+ Series</a>
                        </td>
                      </tr>`);

                    // Level 3: Series under this Product Type
                    subSeries.forEach(s => {
                      const sizes = sizeBySeries.get(s.id) || { total: 0, active: 0 };
                      const versions = versionsBySeries.get(s.id) || 0;
                      rows.push(`
                        <tr class="is-child" data-cat="${cat.id}" data-parent-sub="${sub.id}">
                          <td>
                            <div style="display:flex;align-items:center;gap:10px;padding-left:52px;">
                              ${s.image_url ? `<img src="${esc(publicUrl(s.image_url, 100))}" alt="" class="a-thumb" style="width:38px;height:30px;border-radius:4px;flex-shrink:0;" loading="lazy" />` : '<div style="width:38px;height:30px;border-radius:4px;background:var(--a-border);display:flex;align-items:center;justify-content:center;font-size:0.6rem;color:var(--a-faint);flex-shrink:0;">No img</div>'}
                              <div>
                                <a href="${href('admin/series/edit/?series=' + s.id)}" style="font-weight:600;color:var(--a-navy);text-decoration:underline;text-underline-offset:2px;">${esc(s.name)}</a>
                                <div style="font-size:0.72rem;color:var(--a-faint);">${esc(s.slug)}</div>
                              </div>
                            </div>
                          </td>
                          <td>${s.base_length != null && s.base_width != null ? `<span style="font-weight:600;">${s.base_length} × ${s.base_width}</span>` : '<span class="a-chip a-chip-warn">—</span>'}</td>
                          <td><span class="a-chip ${sizes.total ? 'a-chip-ok' : ''}">${sizes.total} heights</span></td>
                          <td><span class="a-chip ${versions ? 'a-chip-ok' : ''}">${versions} models</span></td>
                          <td>${activeBadge(s.is_active)}</td>
                          <td class="a-actions">
                            <a href="${href('admin/series/edit/?series=' + s.id)}" class="a-btn a-btn-sm">Edit</a>
                            <button type="button" class="a-btn a-btn-sm a-btn-danger" data-delete-series="${s.id}" data-name="${esc(s.name)}">Delete</button>
                          </td>
                        </tr>`);
                    });
                  });

                  // Direct Series under Category (no subcategory assigned)
                  if (directSeries.length) {
                    if (catSubs.length) {
                      rows.push(`
                        <tr class="is-child a-tree-parent" data-cat="${cat.id}" data-sub-id="direct-${cat.id}" style="background:#faf8f3;">
                          <td>
                            <div style="display:flex;align-items:center;padding-left:22px;">
                              <button type="button" class="a-tree-toggle" data-toggle-sub="direct-${cat.id}" aria-label="Toggle direct series" style="margin-right:8px;">−</button>
                              <span style="color:var(--a-muted);margin-right:6px;font-weight:600;">↳</span>
                              <span style="font-size:0.86rem;font-style:italic;color:var(--a-muted);">Direct Series (General)</span>
                              <span class="a-chip" style="margin-left:6px;font-size:0.75rem;">${directSeries.length}</span>
                            </div>
                          </td>
                          <td></td><td></td><td></td>
                          <td><span class="a-chip">—</span></td>
                          <td class="a-actions">
                            <a href="${href('admin/series/edit/?series=new&category=' + cat.id)}" class="a-btn a-btn-sm">+ Series</a>
                          </td>
                        </tr>`);
                    }

                    directSeries.forEach(s => {
                      const sizes = sizeBySeries.get(s.id) || { total: 0, active: 0 };
                      const versions = versionsBySeries.get(s.id) || 0;
                      const padLeft = catSubs.length ? 52 : 32;
                      rows.push(`
                        <tr class="is-child" data-cat="${cat.id}" data-parent-sub="direct-${cat.id}">
                          <td>
                            <div style="display:flex;align-items:center;gap:10px;padding-left:${padLeft}px;">
                              ${s.image_url ? `<img src="${esc(publicUrl(s.image_url, 100))}" alt="" class="a-thumb" style="width:38px;height:30px;border-radius:4px;flex-shrink:0;" loading="lazy" />` : '<div style="width:38px;height:30px;border-radius:4px;background:var(--a-border);display:flex;align-items:center;justify-content:center;font-size:0.6rem;color:var(--a-faint);flex-shrink:0;">No img</div>'}
                              <div>
                                <a href="${href('admin/series/edit/?series=' + s.id)}" style="font-weight:600;color:var(--a-navy);text-decoration:underline;text-underline-offset:2px;">${esc(s.name)}</a>
                                <div style="font-size:0.72rem;color:var(--a-faint);">${esc(s.slug)}</div>
                              </div>
                            </div>
                          </td>
                          <td>${s.base_length != null && s.base_width != null ? `<span style="font-weight:600;">${s.base_length} × ${s.base_width}</span>` : '<span class="a-chip a-chip-warn">—</span>'}</td>
                          <td><span class="a-chip ${sizes.total ? 'a-chip-ok' : ''}">${sizes.total} heights</span></td>
                          <td><span class="a-chip ${versions ? 'a-chip-ok' : ''}">${versions} models</span></td>
                          <td>${activeBadge(s.is_active)}</td>
                          <td class="a-actions">
                            <a href="${href('admin/series/edit/?series=' + s.id)}" class="a-btn a-btn-sm">Edit</a>
                            <button type="button" class="a-btn a-btn-sm a-btn-danger" data-delete-series="${s.id}" data-name="${esc(s.name)}">Delete</button>
                          </td>
                        </tr>`);
                    });
                  }

                  return rows.join('');
                }).join('')}
              </tbody>
            </table>
          </div>`;

        // Toggle category branch visibility
        listEl.querySelectorAll<HTMLButtonElement>('[data-toggle-cat]').forEach(btn => {
          btn.addEventListener('click', () => {
            const catId = btn.dataset.toggleCat!;
            const open = btn.textContent === '−';
            btn.textContent = open ? '+' : '−';
            listEl.querySelectorAll<HTMLElement>(`tr.is-child[data-cat="${catId}"]`).forEach(row => {
              row.style.display = open ? 'none' : '';
            });
          });
        });

        // Toggle product type branch visibility
        listEl.querySelectorAll<HTMLButtonElement>('[data-toggle-sub]').forEach(btn => {
          btn.addEventListener('click', () => {
            const subId = btn.dataset.toggleSub!;
            const open = btn.textContent === '−';
            btn.textContent = open ? '+' : '−';
            listEl.querySelectorAll<HTMLElement>(`tr[data-parent-sub="${subId}"]`).forEach(row => {
              row.style.display = open ? 'none' : '';
            });
          });
        });

        // Delete series
        listEl.querySelectorAll<HTMLButtonElement>('[data-delete-series]').forEach(btn => {
          btn.addEventListener('click', async () => {
            const id = btn.dataset.deleteSeries!;
            const name = btn.dataset.name || 'series';
            const ok = await confirmDialog(`Delete series "${name}"?`,
              'This permanently deletes this series and ALL of its sizes, model versions and photos. This cannot be undone.');
            if (!ok) return;
            const { data: row } = await supabase
              .from('series')
              .select('image_url, size_variants(product_variants(product_images(image_url)))')
              .eq('id', id)
              .single();
            const { error } = await supabase.from('series').delete().eq('id', id);
            if (error) { toast(error.message, 'error'); return; }
            const staleUrls: string[] = [];
            const sizesRows = (row as any)?.size_variants || [];
            for (const size of sizesRows) {
              for (const ver of (size.product_variants || []) as Array<{ product_images: Array<{ image_url: string }> }>) {
                for (const img of ver.product_images || []) staleUrls.push(img.image_url);
              }
            }
            if ((row as any)?.image_url) staleUrls.push((row as any).image_url);
            for (const url of staleUrls) await deleteFile(url);
            toast('Series deleted.', 'success');
            publishSite();
            await load();
          });
        });
      }

      function applyFilters() {
        const q = (searchInput?.value || '').trim().toLowerCase();
        const selectedCat = catFilterSelect?.value || '';
        const listEl = document.getElementById('series-list');
        if (!listEl) return;

        const catRows = listEl.querySelectorAll<HTMLElement>('tr.a-tree-parent[data-cat-id]');
        catRows.forEach(catRow => {
          const catId = catRow.dataset.catId!;
          const matchesCat = !selectedCat || catId === selectedCat;

          const childRows = listEl.querySelectorAll<HTMLElement>(`tr.is-child[data-cat="${catId}"]`);
          let hasVisibleChildren = false;

          childRows.forEach(childRow => {
            const textMatches = !q || (childRow.textContent || '').toLowerCase().includes(q);
            const shouldShow = matchesCat && textMatches;
            childRow.style.display = shouldShow ? '' : 'none';
            if (shouldShow) hasVisibleChildren = true;
          });

          const catMatchesText = !q || (catRow.textContent || '').toLowerCase().includes(q);
          const showCat = matchesCat && (catMatchesText || hasVisibleChildren);
          catRow.style.display = showCat ? '' : 'none';
        });
      }

      searchInput = document.getElementById('series-search') as HTMLInputElement | null;
      catFilterSelect = document.getElementById('series-cat-filter') as HTMLSelectElement | null;

      searchInput?.addEventListener('input', applyFilters);
      catFilterSelect?.addEventListener('change', applyFilters);

      await load();
    })();

    return () => {
      disposed = true;
    };
  }, []);

  return (
    <AdminShell title="Products & Series" current="series">
      <div className="a-page-head">
        <div>
          <h2>Products</h2>
          <p style={{ margin: '4px 0 0', fontSize: '0.88rem', color: 'var(--a-muted)' }}>
            Organize products by Category $\rightarrow$ Product Type (e.g. Roto Crates) $\rightarrow$ Models.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <a href="/admin/series/edit/?series=new" className="a-btn a-btn-primary">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
              <path d="M12 5v14" />
              <path d="M5 12h14" />
            </svg>
            + New Product
          </a>
          <a href="/admin/categories/" className="a-btn">
            Categories &amp; Types
          </a>
        </div>
      </div>

      <div className="a-card">
        <div className="a-toolbar" style={{ flexWrap: 'wrap', gap: 12 }}>
          <input type="search" id="series-search" className="a-input" placeholder="Search categories, types, series, footprints…" style={{ maxWidth: 320 }} />
          <select id="series-cat-filter" className="a-select" style={{ maxWidth: 220 }}>
            <option value="">All Categories</option>
          </select>
          <span style={{ flex: 1 }}></span>
          <span id="series-count" style={{ fontSize: '0.84rem', color: 'var(--a-muted)', fontWeight: 500 }}></span>
        </div>
        <div className="a-card-body" id="series-list" style={{ padding: '6px 0 0' }}>
          <div className="a-inline-loading" style={{ padding: 30 }}><div className="a-spinner"></div></div>
        </div>
      </div>
    </AdminShell>
  );
}
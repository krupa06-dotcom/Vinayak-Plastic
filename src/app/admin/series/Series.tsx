'use client';

import { useEffect } from 'react';
import AdminShell from '@/components/admin/AdminShell';
import { gate, supabase, esc, activeBadge, showError, showEmpty, confirmDialog, toast, publicUrl, publishSite } from '@/scripts/admin/core';

// Series list — the Phase 2 hierarchy (category → series → sizes → versions).
// Built as a collapsible tree so the admin always sees the level they are on.
export default function Series() {
  useEffect(() => {
    let disposed = false;
    let searchInput: HTMLInputElement | null = null;
    let onSearch: ((e: Event) => void) | null = null;

    void (async () => {
      if (!(await gate())) return;
      if (disposed) return;

      const BASE: string = (window as any).__VP_SUPABASE__?.base ?? '/';
      const href = (p: string) => `${BASE.replace(/\/$/, '')}/${p.replace(/^\//, '')}`.replace(/\/+/g, '/');

      interface CatRow { id: string; name: string; slug: string; image_url?: string | null }
      interface SeriesRow {
        id: string; category_id: string; name: string; slug: string;
        base_length: number | null; base_width: number | null;
        is_active: boolean; image_url?: string | null;
      }

      let cats: CatRow[] = [];
      let series: SeriesRow[] = [];

      async function load() {
        const listEl = document.getElementById('series-list');
        if (!listEl) return;

        const [catsRes, seriesRes, sizesRes, versionsRes] = await Promise.all([
          supabase.from('categories').select('id, name, slug, image_url').order('display_order'),
          supabase.from('series').select('id, category_id, name, slug, base_length, base_width, is_active, image_url').order('display_order'),
          supabase.from('size_variants').select('id, series_id, is_active').limit(4000),
          supabase.from('product_variants').select('size_variant_id').limit(8000)
        ]);

        if (catsRes.error) { showError(listEl, catsRes.error.message); return; }
        if (seriesRes.error) { showError(listEl, seriesRes.error.message); return; }
        if (sizesRes.error) { showError(listEl, sizesRes.error.message); return; }

        cats = (catsRes.data || []) as CatRow[];
        series = (seriesRes.data || []) as SeriesRow[];
        const allSizes = (sizesRes.data || []) as Array<{ id: string; series_id: string; is_active: boolean }>;
        const allVersions = (versionsRes.data || []) as Array<{ size_variant_id: string }>;

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
        if (countEl) countEl.textContent = `${series.length} series`;

        if (!series.length) {
          showEmpty(listEl, 'No series yet', 'Series are the base footprints sold under a category — e.g. "600 × 400 Series". Add a category first, then create series under it.',
            `<a href="${href('admin/categories/')}" class="a-btn">+ Category</a>`);
          return;
        }

        // Build tree rows: category parents with series children.
        listEl.innerHTML = `
          <div class="a-table-wrap">
            <table class="a-table">
              <thead><tr>
                <th>Category / Series</th><th style="width:120px">Footprint</th>
                <th style="width:100px">Sizes</th><th style="width:130px">Versions</th>
                <th style="width:100px">Status</th><th style="width:150px">Actions</th>
              </tr></thead>
              <tbody>
                ${cats.map((cat) => {
                  const catSeries = series.filter(s => s.category_id === cat.id);
                  const rows: string[] = [];
                  rows.push(`
                    <tr class="a-tree-parent" id="cat-${cat.id}">
                      <td>
                        ${catSeries.length ? `<button type="button" class="a-tree-toggle" data-toggle="${cat.id}" aria-label="Toggle series" style="margin-right:8px;">+</button>` : ''}
                        <span style="font-weight:700;">${esc(cat.name)}</span>
                        <span class="a-chip">${catSeries.length}</span>
                      </td>
                      <td></td><td></td><td></td>
                      <td><span class="a-chip">—</span></td>
                      <td class="a-actions">
                        <a href="${href('admin/series/edit/?series=new&category=' + cat.id)}" class="a-btn a-btn-sm">+ Series</a>
                      </td>
                    </tr>`);
                  catSeries.forEach(s => {
                    const sizes = sizeBySeries.get(s.id) || { total: 0, active: 0 };
                    const versions = versionsBySeries.get(s.id) || 0;
                    rows.push(`
                      <tr class="is-child" data-cat="${cat.id}" style="display:none;">
                        <td>
                          <div style="display:flex;align-items:center;gap:10px;padding-left:22px;">
                            ${s.image_url ? `<img src="${esc(publicUrl(s.image_url, 100))}" alt="" class="a-thumb" style="width:40px;height:32px;flex-shrink:0;" loading="lazy" />` : ''}
                            <div>
                              <a href="${href('admin/series/edit/?series=' + s.id)}" style="color:inherit;text-decoration:underline;text-underline-offset:2px;">${esc(s.name)}</a>
                              <div style="font-size:0.72rem;color:var(--a-faint);">${esc(s.slug)}</div>
                            </div>
                          </div>
                        </td>
                        <td>${s.base_length != null && s.base_width != null ? `${s.base_length} × ${s.base_width}` : '<span class="a-chip a-chip-warn">—</span>'}</td>
                        <td><span class="a-chip ${sizes.total ? 'a-chip-ok' : ''}">${sizes.total}</span></td>
                        <td><span class="a-chip ${versions ? 'a-chip-ok' : ''}">${versions}</span></td>
                        <td>${activeBadge(s.is_active)}</td>
                        <td class="a-actions">
                          <a href="${href('admin/series/edit/?series=' + s.id)}" class="a-btn a-btn-sm">Edit</a>
                          <button type="button" class="a-btn a-btn-sm a-btn-danger" data-delete-series="${s.id}" data-name="${esc(s.name)}">Delete</button>
                        </td>
                      </tr>`);
                  });
                  return rows.join('');
                }).join('')}
              </tbody>
            </table>
          </div>`;

        // Toggle category branch visibility.
        listEl.querySelectorAll<HTMLButtonElement>('[data-toggle]').forEach(btn => {
          btn.addEventListener('click', () => {
            const catId = btn.dataset.toggle!;
            const open = btn.textContent === '−';
            btn.textContent = open ? '+' : '−';
            listEl.querySelectorAll<HTMLElement>(`tr.is-child[data-cat="${catId}"]`).forEach(row => {
              row.style.display = open ? 'none' : '';
            });
          });
        });

        listEl.querySelectorAll<HTMLButtonElement>('[data-delete-series]').forEach(btn => {
          btn.addEventListener('click', async () => {
            const id = btn.dataset.deleteSeries!;
            const name = btn.dataset.name || 'series';
            const ok = await confirmDialog(`Delete series "${name}"?`,
              'This permanently deletes this series and ALL of its sizes, versions and version images. This cannot be undone.');
            if (!ok) return;
            const { error } = await supabase.from('series').delete().eq('id', id);
            if (error) { toast(error.message, 'error'); return; }
            toast('Series deleted.', 'success');
            publishSite();
            await load();
          });
        });
      }

      searchInput = document.getElementById('series-search') as HTMLInputElement | null;
      onSearch = (e: Event) => {
        const q = (e.target as HTMLInputElement).value.trim().toLowerCase();
        const listEl = document.getElementById('series-list');
        if (!listEl) return;
        // Simple text filter across visible tree text.
        const allRows = listEl.querySelectorAll<HTMLElement>('tbody tr');
        allRows.forEach((row) => {
          const matches = !q || (row.textContent || '').toLowerCase().includes(q);
          row.style.display = matches ? '' : 'none';
        });
      };
      searchInput?.addEventListener('input', onSearch);

      await load();
    })();

    return () => {
      disposed = true;
      if (searchInput && onSearch) searchInput.removeEventListener('input', onSearch);
    };
  }, []);

  return (
    <AdminShell title="Series" current="series">
      <div className="a-page-head">
        <h2>Series</h2>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <a href="/admin/series/edit/" className="a-btn a-btn-primary">+ Series</a>
          <a href="/admin/categories/" className="a-btn">+ Category</a>
        </div>
      </div>

      <div className="a-guide" style={{ marginBottom: 16 }}>
        <h4>Footprint = series</h4>
        <p style={{ margin: 0 }}>One series per base footprint (Length × Width, e.g. "600 × 400"). Each series has height sizes ("220 mm"), and each size can have several versions ("Ribbed Bottom"). Versions are the exact products customers buy.</p>
      </div>

      <div className="a-card">
        <div className="a-toolbar" style={{ flexWrap: 'wrap' }}>
          <input type="search" id="series-search" className="a-input" placeholder="Search categories and series…" />
          <span style={{ flex: 1 }}></span>
          <span id="series-count" style={{ fontSize: '0.84rem', color: 'var(--a-muted)' }}></span>
        </div>
        <div className="a-card-body" id="series-list" style={{ padding: '6px 0 0' }}>
          <div className="a-inline-loading" style={{ padding: 30 }}><div className="a-spinner"></div></div>
        </div>
      </div>
    </AdminShell>
  );
}
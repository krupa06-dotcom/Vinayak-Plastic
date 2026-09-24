'use client';

import { useEffect } from 'react';
import AdminShell from '@/components/admin/AdminShell';
import { gate, supabase, esc, activeBadge, showError, showEmpty, confirmDialog, toast, publicUrl, deleteFile, publishSite } from '@/scripts/admin/core';

// Product list — port of src/pages/admin/products/index.astro. The table is
// rendered into the DOM after gate() resolves, exactly like the Astro script.
export default function Products() {
  useEffect(() => {
    let disposed = false;
    let searchInput: HTMLInputElement | null = null;
    let onSearch: ((e: Event) => void) | null = null;

    void (async () => {
      if (!(await gate())) return;
      if (disposed) return;

      const BASE: string = (window as any).__VP_SUPABASE__?.base ?? '/';
      const href = (p: string) => `${BASE.replace(/\/$/, '')}/${p.replace(/^\//, '')}`.replace(/\/+/g, '/');

      interface CatRow { id: string; name: string }
      interface ProdRow { id: string; category_id: string; name: string; slug: string; is_active: boolean; image_url?: string | null }

      let products: ProdRow[] = [];
      let catName = new Map<string, string>();

      async function load() {
        const listEl = document.getElementById('prod-list');
        if (!listEl) return;

        const [catsRes, prodsRes, varsRes] = await Promise.all([
          supabase.from('categories').select('id, name').order('display_order'),
          supabase.from('sub_categories').select('id, category_id, name, slug, is_active, image_url').order('display_order'),
          supabase.from('sub_category_variants').select('sub_category_id, is_active')
        ]);

        if (catsRes.error) { showError(listEl, catsRes.error.message); return; }
        if (prodsRes.error) { showError(listEl, prodsRes.error.message); return; }
        if (varsRes.error) { showError(listEl, varsRes.error.message); return; }

        const cats = (catsRes.data || []) as CatRow[];
        catName = new Map(cats.map(c => [c.id, c.name]));
        products = (prodsRes.data || []) as ProdRow[];
        const vars = (varsRes.data || []) as Array<{ sub_category_id: string; is_active: boolean }>;
        
        const sizeCounts = new Map<string, number>();
        for (const v of vars) {
          if (v.is_active) {
            sizeCounts.set(v.sub_category_id, (sizeCounts.get(v.sub_category_id) || 0) + 1);
          }
        }
        const sizeCount = (id: string) => sizeCounts.get(id) || 0;

        if (!products.length) {
          showEmpty(listEl, 'No products yet', 'Products are the individual ranges sold under a category. Create a category first, then add products to it.',
            `<a href="${href('admin/categories/')}" class="a-btn a-btn-primary">+ New Category</a>
             <a href="${href('admin/products/edit/')}" class="a-btn">+ Product</a>`);
          return;
        }

        listEl.innerHTML = `
          <div class="a-table-wrap">
            <table class="a-table">
              <thead><tr>
                <th>Product</th><th>Category</th><th style="width:150px">Sizes &amp; Models</th><th style="width:110px">Status</th><th style="width:230px">Actions</th>
              </tr></thead>
              <tbody>
                ${products.map(p => `
                  <tr data-name="${esc((p.name + ' ' + p.slug + ' ' + (catName.get(p.category_id) || '')).toLowerCase())}">
                    <td>
                      <div style="display:flex;align-items:center;gap:10px;min-width:220px;">
                        ${p.image_url ? `<img src="${esc(publicUrl(p.image_url, 100))}" alt="" class="a-thumb" style="width:44px;height:36px;flex-shrink:0;" loading="lazy" />` : ''}
                        <div>
                          <strong>${esc(p.name)}</strong>
                          <div style="font-size:0.72rem;color:var(--a-faint);">${esc(p.slug)}</div>
                        </div>
                      </div>
                    </td>
                    <td>${p.category_id && catName.has(p.category_id)
                      ? `<a href="${href(`admin/categories/`)}" style="color:var(--a-link, inherit);">${esc(catName.get(p.category_id)!)}</a>`
                      : '<span class="a-chip a-chip-warn">No category</span>'}</td>
                    <td><span class="a-chip ${sizeCount(p.id) ? 'a-chip-ok' : ''}">${sizeCount(p.id)}</span></td>
                    <td>${activeBadge(p.is_active)}</td>
                    <td class="a-actions">
                      <a href="${href(`admin/products/edit/?product=${p.id}`)}" class="a-btn a-btn-sm">Edit</a>
                      <button type="button" class="a-btn a-btn-sm a-btn-danger" data-delete-prod="${p.id}">Delete</button>
                    </td>
                  </tr>`).join('')}
              </tbody>
            </table>
          </div>`;

        const countEl = document.getElementById('prod-count');
        if (countEl) countEl.textContent = `${products.length} product${products.length === 1 ? '' : 's'}`;

        listEl.querySelectorAll<HTMLButtonElement>('[data-delete-prod]').forEach(btn => {
          btn.addEventListener('click', async () => {
            const id = btn.dataset.deleteProd!;
            const prodRow = products.find(p => p.id === id);
            const ok = await confirmDialog(`Delete "${prodRow?.name ?? 'product'}"?`,
              'This permanently deletes the product and all of its sizes, specifications and images. This cannot be undone.');
            if (!ok) return;
            const { data: prodData } = await supabase
              .from('sub_categories')
              .select('image_url, sub_category_images(image_url)')
              .eq('id', id)
              .single();
            const { error } = await supabase.from('sub_categories').delete().eq('id', id);
            if (error) { toast(error.message, 'error'); return; }
            const staleUrls = [
              (prodData as any)?.image_url,
              ...(((prodData as any)?.sub_category_images || []) as Array<{ image_url: string }>).map(i => i.image_url)
            ].filter(Boolean) as string[];
            for (const url of staleUrls) await deleteFile(url);
            toast('Product deleted.', 'success');
            publishSite();
            await load();
          });
        });
      }

      searchInput = document.getElementById('prod-search') as HTMLInputElement | null;
      onSearch = (e: Event) => {
        const q = (e.target as HTMLInputElement).value.trim().toLowerCase();
        const listEl = document.getElementById('prod-list');
        if (!listEl) return;
        listEl.querySelectorAll('tbody tr[data-name]').forEach((row) => {
          const matches = !q || (row.getAttribute('data-name') || '').includes(q);
          (row as HTMLElement).style.display = matches ? '' : 'none';
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
    <AdminShell title="Products" current="products">
      <div className="a-page-head">
        <h2>Products</h2>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <a href="/admin/products/edit/" className="a-btn a-btn-primary">+ Product</a>
          <a href="/admin/categories/" className="a-btn">+ Category</a>
        </div>
      </div>

      <div className="a-card">
        <div className="a-toolbar" style={{ flexWrap: 'wrap' }}>
          <input type="search" id="prod-search" className="a-input" placeholder="Search products…" />
          <span style={{ flex: 1 }}></span>
          <span id="prod-count" style={{ fontSize: '0.84rem', color: 'var(--a-muted)' }}></span>
        </div>
        <div className="a-card-body" id="prod-list" style={{ padding: '6px 0 0' }}>
          <div className="a-inline-loading" style={{ padding: 30 }}><div className="a-spinner"></div></div>
        </div>
      </div>
    </AdminShell>
  );
}
'use client';

import { useEffect } from 'react';
import AdminShell from '@/components/admin/AdminShell';
import {
  gate,
  supabase,
  esc,
  slugify,
  activeBadge,
  showError,
  showEmpty,
  confirmDialog,
  toast,
  publicUrl,
  deleteFile,
  publishSite
} from '@/scripts/admin/core';
import { createImagePicker } from '@/scripts/admin/imagePicker';

export default function Categories() {
  useEffect(() => {
    let disposed = false;

    void (async () => {
      if (!(await gate())) return;
      if (disposed) return;

      const BASE: string = (window as any).__VP_SUPABASE__?.base ?? '/';
      const href = (p: string) => `${BASE.replace(/\/$/, '')}/${p.replace(/^\//, '')}`.replace(/\/+/g, '/');

      interface CatRow {
        id: string;
        name: string;
        slug: string;
        description: string | null;
        display_order: number;
        is_active: boolean;
        image_url?: string | null;
      }

      interface SubCatRow {
        id: string;
        category_id: string;
        name: string;
        slug: string;
        description: string | null;
        display_order: number;
        is_active: boolean;
        image_url?: string | null;
      }

      interface SeriesRow {
        id: string;
        category_id: string;
        sub_category_id: string | null;
        is_active: boolean;
      }

      // DOM Elements - Category Form
      const catFormEl = document.getElementById('cat-form') as HTMLFormElement;
      const catFormCardEl = document.getElementById('add-cat-form') as HTMLElement;
      const catFormTitleEl = document.getElementById('cat-form-title') as HTMLElement;
      const catToggleBtn = document.getElementById('add-cat-toggle') as HTMLButtonElement;
      const catIdEl = document.getElementById('cat-id') as HTMLInputElement;
      const catNameEl = document.getElementById('cat-name') as HTMLInputElement;
      const catSlugEl = document.getElementById('cat-slug') as HTMLInputElement;
      const catDescEl = document.getElementById('cat-description') as HTMLTextAreaElement;
      const catOrderEl = document.getElementById('cat-order') as HTMLInputElement;
      const catActiveEl = document.getElementById('cat-active') as HTMLInputElement;
      const catErrorEl = document.getElementById('cat-form-error');
      const catSubmitBtn = document.getElementById('cat-submit') as HTMLButtonElement;

      // DOM Elements - SubCategory (Product Type) Form
      const subFormEl = document.getElementById('sub-form') as HTMLFormElement;
      const subFormCardEl = document.getElementById('add-sub-form') as HTMLElement;
      const subFormTitleEl = document.getElementById('sub-form-title') as HTMLElement;
      const subIdEl = document.getElementById('sub-id') as HTMLInputElement;
      const subCatSelectEl = document.getElementById('sub-parent-cat') as HTMLSelectElement;
      const subNameEl = document.getElementById('sub-name') as HTMLInputElement;
      const subSlugEl = document.getElementById('sub-slug') as HTMLInputElement;
      const subDescEl = document.getElementById('sub-description') as HTMLTextAreaElement;
      const subOrderEl = document.getElementById('sub-order') as HTMLInputElement;
      const subActiveEl = document.getElementById('sub-active') as HTMLInputElement;
      const subErrorEl = document.getElementById('sub-form-error');
      const subSubmitBtn = document.getElementById('sub-submit') as HTMLButtonElement;

      let catsList: CatRow[] = [];
      let subsList: SubCatRow[] = [];
      let seriesList: SeriesRow[] = [];
      const expandedCats = new Set<string>();

      const catPicker = createImagePicker(document.getElementById('cat-image')!, {
        hint: 'Category cover shown across the website.'
      });

      const subPicker = createImagePicker(document.getElementById('sub-image')!, {
        hint: 'Product Type cover photo (e.g. for Roto Crates).'
      });

      function setCatError(msg: string) {
        if (!catErrorEl) return;
        catErrorEl.textContent = msg;
        catErrorEl.style.display = msg ? '' : 'none';
      }

      function setSubError(msg: string) {
        if (!subErrorEl) return;
        subErrorEl.textContent = msg;
        subErrorEl.style.display = msg ? '' : 'none';
      }

      function openCreateCatForm() {
        setCatError('');
        closeSubForm();
        catIdEl.value = '';
        catFormEl.reset();
        catSlugEl.removeAttribute('data-manual');
        catOrderEl.value = String(catsList.length * 10);
        catActiveEl.checked = true;
        catPicker.setValue({ existing: null, file: null });
        catFormTitleEl.textContent = 'New Category';
        catSubmitBtn.textContent = 'Add Category';
        catFormCardEl.style.display = '';
        catToggleBtn.style.display = 'none';
        catFormCardEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        catNameEl.focus();
      }

      function openEditCatForm(cat: CatRow) {
        setCatError('');
        closeSubForm();
        catIdEl.value = cat.id;
        catNameEl.value = cat.name;
        catSlugEl.value = cat.slug;
        catSlugEl.setAttribute('data-manual', '1');
        catDescEl.value = cat.description || '';
        catOrderEl.value = String(cat.display_order ?? 0);
        catActiveEl.checked = cat.is_active;
        catPicker.setValue({ existing: cat.image_url || null, file: null });
        catFormTitleEl.textContent = `Edit Category: ${cat.name}`;
        catSubmitBtn.textContent = 'Save Changes';
        catFormCardEl.style.display = '';
        catToggleBtn.style.display = 'none';
        catFormCardEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        catNameEl.focus();
      }

      function closeCatForm() {
        catFormCardEl.style.display = 'none';
        catToggleBtn.style.display = '';
        catFormEl.reset();
        catIdEl.value = '';
        catSlugEl.removeAttribute('data-manual');
        catOrderEl.value = '0';
        catActiveEl.checked = true;
        catPicker.setValue({ existing: null, file: null });
        setCatError('');
      }

      function openCreateSubForm(parentCatId?: string) {
        setSubError('');
        closeCatForm();
        subIdEl.value = '';
        subFormEl.reset();
        subSlugEl.removeAttribute('data-manual');
        if (parentCatId) subCatSelectEl.value = parentCatId;
        subOrderEl.value = '0';
        subActiveEl.checked = true;
        subPicker.setValue({ existing: null, file: null });
        subFormTitleEl.textContent = 'New Product Type / Sub-Category';
        subSubmitBtn.textContent = 'Add Product Type';
        subFormCardEl.style.display = '';
        subFormCardEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        subNameEl.focus();
      }

      function openEditSubForm(sub: SubCatRow) {
        setSubError('');
        closeCatForm();
        subIdEl.value = sub.id;
        subCatSelectEl.value = sub.category_id;
        subNameEl.value = sub.name;
        subSlugEl.value = sub.slug;
        subSlugEl.setAttribute('data-manual', '1');
        subDescEl.value = sub.description || '';
        subOrderEl.value = String(sub.display_order ?? 0);
        subActiveEl.checked = sub.is_active;
        subPicker.setValue({ existing: sub.image_url || null, file: null });
        subFormTitleEl.textContent = `Edit Product Type: ${sub.name}`;
        subSubmitBtn.textContent = 'Save Changes';
        subFormCardEl.style.display = '';
        subFormCardEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        subNameEl.focus();
      }

      function closeSubForm() {
        subFormCardEl.style.display = 'none';
        subFormEl.reset();
        subIdEl.value = '';
        subSlugEl.removeAttribute('data-manual');
        subOrderEl.value = '0';
        subActiveEl.checked = true;
        subPicker.setValue({ existing: null, file: null });
        setSubError('');
      }

      catToggleBtn.addEventListener('click', openCreateCatForm);
      document.getElementById('add-cat-close')?.addEventListener('click', closeCatForm);
      document.getElementById('add-cat-cancel')?.addEventListener('click', closeCatForm);
      document.getElementById('add-sub-close')?.addEventListener('click', closeSubForm);
      document.getElementById('add-sub-cancel')?.addEventListener('click', closeSubForm);

      catNameEl.addEventListener('input', () => {
        if (!catSlugEl.hasAttribute('data-manual')) catSlugEl.value = slugify(catNameEl.value);
      });
      catSlugEl.addEventListener('input', () => catSlugEl.setAttribute('data-manual', '1'));

      subNameEl.addEventListener('input', () => {
        if (!subSlugEl.hasAttribute('data-manual')) subSlugEl.value = slugify(subNameEl.value);
      });
      subSlugEl.addEventListener('input', () => subSlugEl.setAttribute('data-manual', '1'));

      async function load() {
        const listEl = document.getElementById('cat-list');
        if (!listEl) return;

        const [catsRes, subsRes, seriesRes] = await Promise.all([
          supabase.from('categories').select('id, name, slug, description, is_active, display_order, image_url').order('display_order'),
          supabase.from('sub_categories').select('id, category_id, name, slug, description, is_active, display_order, image_url').order('display_order'),
          supabase.from('series').select('id, category_id, sub_category_id, is_active')
        ]);

        if (catsRes.error) { showError(listEl, catsRes.error.message); return; }
        if (subsRes.error) { showError(listEl, subsRes.error.message); return; }
        if (seriesRes.error) { showError(listEl, seriesRes.error.message); return; }

        catsList = (catsRes.data || []) as CatRow[];
        subsList = (subsRes.data || []) as SubCatRow[];
        seriesList = (seriesRes.data || []) as SeriesRow[];

        // Update category select in sub-category form
        subCatSelectEl.innerHTML = catsList.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('');

        const seriesCountByCat = new Map<string, number>();
        const seriesCountBySub = new Map<string, number>();
        seriesList.forEach((s) => {
          seriesCountByCat.set(s.category_id, (seriesCountByCat.get(s.category_id) || 0) + 1);
          if (s.sub_category_id) {
            seriesCountBySub.set(s.sub_category_id, (seriesCountBySub.get(s.sub_category_id) || 0) + 1);
          }
        });

        if (!catsList.length) {
          showEmpty(
            listEl,
            'No categories yet',
            'Categories are the main product departments shown across the website. Create your first category to get started.'
          );
          return;
        }

        // Default expand categories that have product types
        if (expandedCats.size === 0) {
          catsList.forEach(c => {
            const hasSubs = subsList.some(s => s.category_id === c.id);
            if (hasSubs) expandedCats.add(c.id);
          });
        }

        listEl.innerHTML = `
          <div class="a-table-wrap">
            <table class="a-table">
              <thead>
                <tr>
                  <th style="min-width:280px">Category &amp; Product Types</th>
                  <th>Product Types</th>
                  <th>Total Series</th>
                  <th>Order</th>
                  <th>Status</th>
                  <th style="width:280px">Actions</th>
                </tr>
              </thead>
              <tbody>
                ${catsList.map((c) => {
                  const catSubs = subsList.filter(s => s.category_id === c.id);
                  const totalSeries = seriesCountByCat.get(c.id) || 0;
                  const isExpanded = expandedCats.has(c.id);

                  const catRowHtml = `
                    <tr class="a-tree-parent" data-cat-row="${c.id}">
                      <td>
                        <div style="display:flex;align-items:center;gap:10px;">
                          ${catSubs.length ? `
                            <button type="button" class="a-tree-toggle" data-toggle-cat="${c.id}" aria-label="Toggle product types" style="margin-right:2px;">
                              ${isExpanded ? '−' : '+'}
                            </button>
                          ` : '<span style="width:26px;display:inline-block;"></span>'}
                          ${c.image_url ? `<img src="${esc(publicUrl(c.image_url, 120))}" alt="" class="a-thumb" style="width:44px;height:36px;border-radius:6px;object-fit:cover;flex-shrink:0;" loading="lazy" />` : '<div style="width:44px;height:36px;border-radius:6px;background:var(--a-border);display:flex;align-items:center;justify-content:center;font-size:0.65rem;color:var(--a-faint);flex-shrink:0;">No img</div>'}
                          <div>
                            <strong style="font-size:0.95rem;color:var(--a-navy);">${esc(c.name)}</strong>
                            <div style="font-size:0.75rem;color:var(--a-faint);">${esc(c.slug)}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span class="a-chip ${catSubs.length ? 'a-chip-ok' : ''}">${catSubs.length} types</span>
                      </td>
                      <td>
                        <span class="a-chip ${totalSeries ? 'a-chip-ok' : ''}">${totalSeries} series</span>
                      </td>
                      <td><span class="a-chip">${c.display_order ?? 0}</span></td>
                      <td>${activeBadge(c.is_active)}</td>
                      <td class="a-actions">
                        <button type="button" class="a-btn a-btn-sm a-btn-primary" data-add-sub="${c.id}" title="Add Product Type (e.g. Roto Crates)">+ Product Type</button>
                        <button type="button" class="a-btn a-btn-sm" data-edit-cat="${c.id}">Edit</button>
                        <a href="${href('admin/series/edit/?series=new&category=' + c.id)}" class="a-btn a-btn-sm" title="Add series to this category">+ Series</a>
                        <button type="button" class="a-btn a-btn-sm a-btn-danger" data-delete-cat="${c.id}">Delete</button>
                      </td>
                    </tr>`;

                  const subRowsHtml = catSubs.map((sub) => {
                    const sCount = seriesCountBySub.get(sub.id) || 0;
                    return `
                      <tr class="is-child" data-parent-cat="${c.id}" style="${isExpanded ? '' : 'display:none;'}background:#fcfbf8;">
                        <td>
                          <div style="display:flex;align-items:center;gap:10px;padding-left:42px;">
                            <span style="color:var(--a-orange);font-weight:bold;font-size:1.1rem;line-height:1;">↳</span>
                            ${sub.image_url ? `<img src="${esc(publicUrl(sub.image_url, 100))}" alt="" class="a-thumb" style="width:36px;height:28px;border-radius:4px;object-fit:cover;flex-shrink:0;" loading="lazy" />` : '<div style="width:36px;height:28px;border-radius:4px;background:var(--a-border);display:flex;align-items:center;justify-content:center;font-size:0.6rem;color:var(--a-faint);flex-shrink:0;">Type</div>'}
                            <div>
                              <strong style="font-size:0.88rem;color:var(--a-ink);">${esc(sub.name)}</strong>
                              <div style="font-size:0.72rem;color:var(--a-faint);">${esc(sub.slug)}</div>
                            </div>
                          </div>
                        </td>
                        <td><span class="a-chip" style="font-size:0.75rem;">Type</span></td>
                        <td><span class="a-chip ${sCount ? 'a-chip-ok' : ''}">${sCount} series</span></td>
                        <td><span class="a-chip">${sub.display_order ?? 0}</span></td>
                        <td>${activeBadge(sub.is_active)}</td>
                        <td class="a-actions">
                          <button type="button" class="a-btn a-btn-sm" data-edit-sub="${sub.id}">Edit Type</button>
                          <a href="${href('admin/series/edit/?series=new&category=' + c.id + '&sub_category=' + sub.id)}" class="a-btn a-btn-sm" title="Add series to this product type">+ Series</a>
                          <button type="button" class="a-btn a-btn-sm a-btn-danger" data-delete-sub="${sub.id}">Delete</button>
                        </td>
                      </tr>`;
                  }).join('');

                  return catRowHtml + subRowsHtml;
                }).join('')}
              </tbody>
            </table>
          </div>`;

        // Toggle category accordion
        listEl.querySelectorAll<HTMLButtonElement>('[data-toggle-cat]').forEach((btn) => {
          btn.addEventListener('click', () => {
            const catId = btn.dataset.toggleCat!;
            const open = expandedCats.has(catId);
            if (open) {
              expandedCats.delete(catId);
              btn.textContent = '+';
              listEl.querySelectorAll<HTMLElement>(`tr[data-parent-cat="${catId}"]`).forEach(r => r.style.display = 'none');
            } else {
              expandedCats.add(catId);
              btn.textContent = '−';
              listEl.querySelectorAll<HTMLElement>(`tr[data-parent-cat="${catId}"]`).forEach(r => r.style.display = '');
            }
          });
        });

        // Add Product Type click
        listEl.querySelectorAll<HTMLButtonElement>('[data-add-sub]').forEach((btn) => {
          btn.addEventListener('click', () => {
            const catId = btn.dataset.addSub!;
            openCreateSubForm(catId);
          });
        });

        // Edit Category click
        listEl.querySelectorAll<HTMLButtonElement>('[data-edit-cat]').forEach((btn) => {
          btn.addEventListener('click', () => {
            const id = btn.dataset.editCat!;
            const cat = catsList.find((c) => c.id === id);
            if (cat) openEditCatForm(cat);
          });
        });

        // Edit Product Type click
        listEl.querySelectorAll<HTMLButtonElement>('[data-edit-sub]').forEach((btn) => {
          btn.addEventListener('click', () => {
            const id = btn.dataset.editSub!;
            const sub = subsList.find((s) => s.id === id);
            if (sub) openEditSubForm(sub);
          });
        });

        // Delete Category click
        listEl.querySelectorAll<HTMLButtonElement>('[data-delete-cat]').forEach((btn) => {
          btn.addEventListener('click', async () => {
            const id = btn.dataset.deleteCat!;
            const cat = catsList.find((c) => c.id === id);
            const ok = await confirmDialog(
              `Delete category "${cat?.name ?? 'category'}"?`,
              'This permanently deletes the category, all of its product types, series, sizes, model versions and images. This cannot be undone.'
            );
            if (!ok) return;

            const { data: seriesRows } = await supabase
              .from('series')
              .select('image_url, size_variants(product_variants(product_images(image_url)))')
              .eq('category_id', id);

            const { error } = await supabase.from('categories').delete().eq('id', id);
            if (error) { toast(error.message, 'error'); return; }

            const staleUrls: string[] = [];
            if (cat?.image_url) staleUrls.push(cat.image_url);

            for (const s of (seriesRows || []) as any[]) {
              if (s.image_url) staleUrls.push(s.image_url);
              for (const sz of s.size_variants || []) {
                for (const ver of sz.product_variants || []) {
                  for (const img of ver.product_images || []) {
                    if (img.image_url) staleUrls.push(img.image_url);
                  }
                }
              }
            }

            for (const url of staleUrls) await deleteFile(url);
            toast('Category deleted.', 'success');
            publishSite();
            await load();
          });
        });

        // Delete Product Type click
        listEl.querySelectorAll<HTMLButtonElement>('[data-delete-sub]').forEach((btn) => {
          btn.addEventListener('click', async () => {
            const id = btn.dataset.deleteSub!;
            const sub = subsList.find((s) => s.id === id);
            const ok = await confirmDialog(
              `Delete product type "${sub?.name ?? 'Product Type'}"?`,
              'Any series attached to this product type will remain in the parent category as direct series. Are you sure?'
            );
            if (!ok) return;

            const { error } = await supabase.from('sub_categories').delete().eq('id', id);
            if (error) { toast(error.message, 'error'); return; }

            if (sub?.image_url) await deleteFile(sub.image_url);
            toast('Product type deleted.', 'success');
            publishSite();
            await load();
          });
        });
      }

      // Save Category
      catFormEl.addEventListener('submit', async (e) => {
        e.preventDefault();
        setCatError('');
        const name = catNameEl.value.trim();
        if (!name) { setCatError('A name is required.'); return; }
        const slug = catSlugEl.value.trim() || slugify(name);
        const editId = catIdEl.value.trim();

        catSubmitBtn?.setAttribute('disabled', '');
        catSubmitBtn.textContent = 'Saving…';

        const pickerValue = catPicker.getValue();
        let imageUrl: string | null = pickerValue.existing;

        if (pickerValue.file) {
          const result = await catPicker.upload(`media/categories/${slug}-${Date.now()}`);
          if ('error' in result) {
            catSubmitBtn?.removeAttribute('disabled');
            catSubmitBtn.textContent = editId ? 'Save Changes' : 'Add Category';
            setCatError(result.error);
            return;
          }
          imageUrl = result.url;
        }

        const payload = {
          name,
          slug,
          description: catDescEl.value.trim() || null,
          image_url: imageUrl,
          display_order: Number(catOrderEl.value) || 0,
          is_active: catActiveEl.checked,
          updated_at: new Date().toISOString()
        };

        let err: any = null;
        if (editId) {
          const res = await supabase.from('categories').update(payload as never).eq('id', editId);
          err = res.error;
        } else {
          const res = await supabase.from('categories').insert({
            id: crypto.randomUUID(),
            ...payload
          } as never);
          err = res.error;
        }

        catSubmitBtn?.removeAttribute('disabled');
        catSubmitBtn.textContent = editId ? 'Save Changes' : 'Add Category';

        if (err) { setCatError(err.message); return; }
        toast(editId ? 'Category updated.' : 'Category created.', 'success');
        publishSite();
        closeCatForm();
        await load();
      });

      // Save Product Type / Sub-Category
      subFormEl.addEventListener('submit', async (e) => {
        e.preventDefault();
        setSubError('');
        const categoryId = subCatSelectEl.value;
        if (!categoryId) { setSubError('Please select a parent category.'); return; }
        const name = subNameEl.value.trim();
        if (!name) { setSubError('A product type name is required.'); return; }
        const slug = subSlugEl.value.trim() || slugify(name);
        const editId = subIdEl.value.trim();

        subSubmitBtn?.setAttribute('disabled', '');
        subSubmitBtn.textContent = 'Saving…';

        const pickerValue = subPicker.getValue();
        let imageUrl: string | null = pickerValue.existing;

        if (pickerValue.file) {
          const result = await subPicker.upload(`media/subcategories/${slug}-${Date.now()}`);
          if ('error' in result) {
            subSubmitBtn?.removeAttribute('disabled');
            subSubmitBtn.textContent = editId ? 'Save Changes' : 'Add Product Type';
            setSubError(result.error);
            return;
          }
          imageUrl = result.url;
        }

        const payload = {
          category_id: categoryId,
          name,
          slug,
          description: subDescEl.value.trim() || null,
          image_url: imageUrl,
          display_order: Number(subOrderEl.value) || 0,
          is_active: subActiveEl.checked,
          updated_at: new Date().toISOString()
        };

        let err: any = null;
        if (editId) {
          const res = await supabase.from('sub_categories').update(payload as never).eq('id', editId);
          err = res.error;
        } else {
          const res = await supabase.from('sub_categories').insert({
            id: crypto.randomUUID(),
            ...payload
          } as never);
          err = res.error;
        }

        subSubmitBtn?.removeAttribute('disabled');
        subSubmitBtn.textContent = editId ? 'Save Changes' : 'Add Product Type';

        if (err) { setSubError(err.message); return; }
        toast(editId ? 'Product type updated.' : 'Product type created.', 'success');
        publishSite();
        closeSubForm();
        expandedCats.add(categoryId);
        await load();
      });

      await load();
    })();

    return () => {
      disposed = true;
    };
  }, []);

  return (
    <AdminShell title="Categories & Product Types" current="categories">
      <div className="a-page-head">
        <div>
          <h2>Categories &amp; Product Types</h2>
          <p style={{ margin: '4px 0 0', fontSize: '0.88rem', color: 'var(--a-muted)' }}>
            Organize your 4 main categories (Crates, Pallets, Waste Bins, etc.) and their Product Types (e.g. Roto Crates, Jumbo Crates).
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <a href="/admin/series/" className="a-btn">
            View Products &amp; Series
          </a>
          <button type="button" className="a-btn a-btn-primary" id="add-cat-toggle">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
              <path d="M12 5v14" />
              <path d="M5 12h14" />
            </svg>
            + Add Category
          </button>
        </div>
      </div>

      {/* Category Create/Edit Card */}
      <div className="a-card" id="add-cat-form" style={{ display: 'none', marginBottom: 20 }}>
        <div className="a-card-head">
          <h2 id="cat-form-title">New Category</h2>
          <button type="button" className="a-btn a-btn-sm" id="add-cat-close">×</button>
        </div>
        <div className="a-card-body">
          <form id="cat-form" noValidate>
            <input type="hidden" id="cat-id" />
            <div className="a-form-grid">
              <div className="a-field">
                <label htmlFor="cat-name">Category Name <span style={{ color: 'var(--a-danger)' }}>*</span></label>
                <input id="cat-name" className="a-input" required autoComplete="off" placeholder="e.g. Plastic Crates" />
              </div>
              <div className="a-field">
                <label htmlFor="cat-slug">Slug</label>
                <input id="cat-slug" className="a-input" required autoComplete="off" placeholder="auto-generated from name" />
                <span className="a-hint">Leave blank to auto-generate.</span>
              </div>
              <div className="a-field a-field-full">
                <label>Category Cover Image</label>
                <div id="cat-image"></div>
              </div>
              <div className="a-field a-field-full">
                <label htmlFor="cat-description">Description</label>
                <textarea id="cat-description" className="a-textarea" rows={3} placeholder="What this product category is and where it is used"></textarea>
              </div>
              <div className="a-field">
                <label htmlFor="cat-order">Display order</label>
                <input id="cat-order" className="a-input" type="number" min={0} defaultValue="0" />
                <span className="a-hint">Lower numbers appear first.</span>
              </div>
              <div className="a-field">
                <label>{'\u00A0'}</label>
                <label className="a-check"><input type="checkbox" id="cat-active" defaultChecked /> Active on Website</label>
              </div>
            </div>
            <div id="cat-form-error" className="a-tip a-tip-error" style={{ marginTop: 12, display: 'none' }} role="alert"></div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
              <button type="button" className="a-btn" id="add-cat-cancel">Cancel</button>
              <button type="submit" className="a-btn a-btn-primary" id="cat-submit">Add Category</button>
            </div>
          </form>
        </div>
      </div>

      {/* Product Type / Sub-Category Create/Edit Card */}
      <div className="a-card" id="add-sub-form" style={{ display: 'none', marginBottom: 20, borderLeft: '3px solid var(--a-orange)' }}>
        <div className="a-card-head">
          <h2 id="sub-form-title">New Product Type / Sub-Category</h2>
          <button type="button" className="a-btn a-btn-sm" id="add-sub-close">×</button>
        </div>
        <div className="a-card-body">
          <form id="sub-form" noValidate>
            <input type="hidden" id="sub-id" />
            <div className="a-form-grid">
              <div className="a-field">
                <label htmlFor="sub-parent-cat">Parent Category <span style={{ color: 'var(--a-danger)' }}>*</span></label>
                <select id="sub-parent-cat" className="a-select" required></select>
              </div>
              <div className="a-field">
                <label htmlFor="sub-name">Product Type Name <span style={{ color: 'var(--a-danger)' }}>*</span></label>
                <input id="sub-name" className="a-input" required autoComplete="off" placeholder="e.g. Roto Crates, Jumbo Crates, Standard Crates" />
              </div>
              <div className="a-field">
                <label htmlFor="sub-slug">Slug</label>
                <input id="sub-slug" className="a-input" required autoComplete="off" placeholder="auto-generated from name" />
              </div>
              <div className="a-field">
                <label htmlFor="sub-order">Display order</label>
                <input id="sub-order" className="a-input" type="number" min={0} defaultValue="0" />
              </div>
              <div className="a-field a-field-full">
                <label>Product Type Cover Image</label>
                <div id="sub-image"></div>
              </div>
              <div className="a-field a-field-full">
                <label htmlFor="sub-description">Description</label>
                <textarea id="sub-description" className="a-textarea" rows={2} placeholder="Description of this product type range"></textarea>
              </div>
              <div className="a-field a-field-full">
                <label className="a-check"><input type="checkbox" id="sub-active" defaultChecked /> Active on Website</label>
              </div>
            </div>
            <div id="sub-form-error" className="a-tip a-tip-error" style={{ marginTop: 12, display: 'none' }} role="alert"></div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
              <button type="button" className="a-btn" id="add-sub-cancel">Cancel</button>
              <button type="submit" className="a-btn a-btn-primary" id="sub-submit">Save Product Type</button>
            </div>
          </form>
        </div>
      </div>

      <div className="a-card">
        <div className="a-card-body" id="cat-list" style={{ padding: '6px 0 0' }}>
          <div className="a-inline-loading" style={{ padding: 30 }}><div className="a-spinner"></div></div>
        </div>
      </div>
    </AdminShell>
  );
}
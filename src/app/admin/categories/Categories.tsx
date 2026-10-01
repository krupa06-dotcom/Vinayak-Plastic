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
    void (async () => {
      if (!(await gate())) return;

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
      interface SeriesRow {
        id: string;
        category_id: string;
        is_active: boolean;
      }

      const formEl = document.getElementById('cat-form') as HTMLFormElement;
      const formCardEl = document.getElementById('add-cat-form') as HTMLElement;
      const formTitleEl = document.getElementById('cat-form-title') as HTMLElement;
      const toggleBtn = document.getElementById('add-cat-toggle') as HTMLButtonElement;
      const idEl = document.getElementById('cat-id') as HTMLInputElement;
      const nameEl = document.getElementById('cat-name') as HTMLInputElement;
      const slugEl = document.getElementById('cat-slug') as HTMLInputElement;
      const descEl = document.getElementById('cat-description') as HTMLTextAreaElement;
      const orderEl = document.getElementById('cat-order') as HTMLInputElement;
      const activeEl = document.getElementById('cat-active') as HTMLInputElement;
      const errorEl = document.getElementById('cat-form-error');
      const submitBtn = document.getElementById('cat-submit') as HTMLButtonElement;

      let catsList: CatRow[] = [];

      const picker = createImagePicker(document.getElementById('cat-image')!, {
        hint: 'Choose a photo from your computer. This is the category cover shown across the website.'
      });

      function setError(msg: string) {
        if (!errorEl) return;
        errorEl.textContent = msg;
        errorEl.style.display = msg ? '' : 'none';
      }

      function openCreateForm() {
        setError('');
        idEl.value = '';
        formEl.reset();
        slugEl.removeAttribute('data-manual');
        orderEl.value = String(catsList.length * 10);
        activeEl.checked = true;
        picker.setValue({ existing: null, file: null });
        formTitleEl.textContent = 'New Category';
        submitBtn.textContent = 'Add Category';
        formCardEl.style.display = '';
        toggleBtn.style.display = 'none';
        formCardEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        nameEl.focus();
      }

      function openEditForm(cat: CatRow) {
        setError('');
        idEl.value = cat.id;
        nameEl.value = cat.name;
        slugEl.value = cat.slug;
        slugEl.setAttribute('data-manual', '1');
        descEl.value = cat.description || '';
        orderEl.value = String(cat.display_order ?? 0);
        activeEl.checked = cat.is_active;
        picker.setValue({ existing: cat.image_url || null, file: null });
        formTitleEl.textContent = `Edit Category: ${cat.name}`;
        submitBtn.textContent = 'Save Changes';
        formCardEl.style.display = '';
        toggleBtn.style.display = 'none';
        formCardEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        nameEl.focus();
      }

      function closeForm() {
        formCardEl.style.display = 'none';
        toggleBtn.style.display = '';
        formEl.reset();
        idEl.value = '';
        slugEl.removeAttribute('data-manual');
        orderEl.value = '0';
        activeEl.checked = true;
        picker.setValue({ existing: null, file: null });
        setError('');
      }

      toggleBtn.addEventListener('click', openCreateForm);
      document.getElementById('add-cat-close')?.addEventListener('click', closeForm);
      document.getElementById('add-cat-cancel')?.addEventListener('click', closeForm);

      nameEl.addEventListener('input', () => {
        if (!slugEl.hasAttribute('data-manual')) slugEl.value = slugify(nameEl.value);
      });
      slugEl.addEventListener('input', () => slugEl.setAttribute('data-manual', '1'));

      async function load() {
        const listEl = document.getElementById('cat-list');
        if (!listEl) return;

        const [catsRes, seriesRes] = await Promise.all([
          supabase.from('categories').select('id, name, slug, description, is_active, display_order, image_url').order('display_order'),
          supabase.from('series').select('id, category_id, is_active')
        ]);

        if (catsRes.error) { showError(listEl, catsRes.error.message); return; }
        if (seriesRes.error) { showError(listEl, seriesRes.error.message); return; }

        catsList = (catsRes.data || []) as CatRow[];
        const allSeries = (seriesRes.data || []) as SeriesRow[];

        const seriesCountByCat = new Map<string, number>();
        allSeries.forEach((s) => {
          seriesCountByCat.set(s.category_id, (seriesCountByCat.get(s.category_id) || 0) + 1);
        });

        if (!catsList.length) {
          showEmpty(
            listEl,
            'No categories yet',
            'Categories are the main product departments shown across the website. Create your first category to get started.'
          );
          return;
        }

        listEl.innerHTML = `
          <div class="a-table-wrap">
            <table class="a-table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Series Count</th>
                  <th>Order</th>
                  <th>Status</th>
                  <th style="width:200px">Actions</th>
                </tr>
              </thead>
              <tbody>
                ${catsList.map((c) => {
                  const sCount = seriesCountByCat.get(c.id) || 0;
                  return `
                    <tr data-name="${esc((c.name + ' ' + c.slug).toLowerCase())}">
                      <td>
                        <div style="display:flex;align-items:center;gap:12px;min-width:220px;">
                          ${c.image_url ? `<img src="${esc(publicUrl(c.image_url, 120))}" alt="" class="a-thumb" style="width:48px;height:38px;border-radius:6px;object-fit:cover;flex-shrink:0;" loading="lazy" />` : '<div style="width:48px;height:38px;border-radius:6px;background:var(--a-border);display:flex;align-items:center;justify-content:center;font-size:0.7rem;color:var(--a-faint);">No img</div>'}
                          <div>
                            <strong style="font-size:0.95rem;">${esc(c.name)}</strong>
                            <div style="font-size:0.75rem;color:var(--a-faint);">${esc(c.slug)}</div>
                          </div>
                        </div>
                      </td>
                      <td><span class="a-chip ${sCount ? 'a-chip-ok' : ''}">${sCount} series</span></td>
                      <td><span class="a-chip">${c.display_order ?? 0}</span></td>
                      <td>${activeBadge(c.is_active)}</td>
                      <td class="a-actions">
                        <button type="button" class="a-btn a-btn-sm" data-edit-cat="${c.id}">Edit</button>
                        <a href="${href('admin/series/edit/?series=new&category=' + c.id)}" class="a-btn a-btn-sm" title="Add series to this category">+ Series</a>
                        <button type="button" class="a-btn a-btn-sm a-btn-danger" data-delete-cat="${c.id}">Delete</button>
                      </td>
                    </tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>`;

        listEl.querySelectorAll<HTMLButtonElement>('[data-edit-cat]').forEach((btn) => {
          btn.addEventListener('click', () => {
            const id = btn.dataset.editCat!;
            const cat = catsList.find((c) => c.id === id);
            if (cat) openEditForm(cat);
          });
        });

        listEl.querySelectorAll<HTMLButtonElement>('[data-delete-cat]').forEach((btn) => {
          btn.addEventListener('click', async () => {
            const id = btn.dataset.deleteCat!;
            const cat = catsList.find((c) => c.id === id);
            const ok = await confirmDialog(
              `Delete category "${cat?.name ?? 'category'}"?`,
              'This permanently deletes the category and all of its series, sizes, model versions and images. This cannot be undone.'
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
      }

      formEl.addEventListener('submit', async (e) => {
        e.preventDefault();
        setError('');
        const name = nameEl.value.trim();
        if (!name) { setError('A name is required.'); return; }
        const slug = slugEl.value.trim() || slugify(name);
        const editId = idEl.value.trim();

        submitBtn?.setAttribute('disabled', '');
        submitBtn.textContent = 'Saving…';

        const pickerValue = picker.getValue();
        let imageUrl: string | null = pickerValue.existing;

        if (pickerValue.file) {
          const result = await picker.upload(`media/categories/${slug}-${Date.now()}`);
          if ('error' in result) {
            submitBtn?.removeAttribute('disabled');
            submitBtn.textContent = editId ? 'Save Changes' : 'Add Category';
            setError(result.error);
            return;
          }
          imageUrl = result.url;
        }

        const payload = {
          name,
          slug,
          description: descEl.value.trim() || null,
          image_url: imageUrl,
          display_order: Number(orderEl.value) || 0,
          is_active: activeEl.checked,
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

        submitBtn?.removeAttribute('disabled');
        submitBtn.textContent = editId ? 'Save Changes' : 'Add Category';

        if (err) { setError(err.message); return; }
        toast(editId ? 'Category updated.' : 'Category created.', 'success');
        publishSite();
        closeForm();
        await load();
      });

      await load();
    })();
  }, []);

  return (
    <AdminShell title="Categories" current="categories">
      <div className="a-page-head">
        <div>
          <h2>Product Categories</h2>
          <p style={{ margin: '4px 0 0', fontSize: '0.88rem', color: 'var(--a-muted)' }}>
            Main departments for your products (e.g. Plastic Crates, Plastic Pallets, Waste Bins).
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
                <label htmlFor="cat-name">Name <span style={{ color: 'var(--a-danger)' }}>*</span></label>
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

      <div className="a-card">
        <div className="a-card-body" id="cat-list" style={{ padding: '6px 0 0' }}>
          <div className="a-inline-loading" style={{ padding: 30 }}><div className="a-spinner"></div></div>
        </div>
      </div>
    </AdminShell>
  );
}
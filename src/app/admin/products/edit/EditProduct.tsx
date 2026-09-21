'use client';

import { useEffect } from 'react';
import AdminShell from '@/components/admin/AdminShell';
import { gate, supabase, esc, slugify, toast, publicUrl, uploadFile, deleteFile, publishSite } from '@/scripts/admin/core';
import { createImagePicker } from '@/scripts/admin/imagePicker';

// Edit product / category — port of src/pages/admin/products/edit.astro. The
// whole hand-rolled editing UI runs inside a gate'd effect, exactly like the
// Astro script (multi-mode state machine, tabs, apps, variants and save flow).
export default function EditProduct() {
  const cleanups: Array<() => void> = [];

  useEffect(() => {
    let disposed = false;

    void (async () => {
      if (!(await gate())) return;
      if (disposed) return;

      const BASE: string = (window as any).__VP_SUPABASE__?.base ?? '/';
      const href = (p: string) => `${BASE.replace(/\/$/, '')}/${p.replace(/^\//, '')}`.replace(/\/+/g, '/');
      const toBase64 = (file: File) => new Promise<string>((resolve, reject) => {
        const r = new FileReader(); r.onload = () => resolve(r.result as string); r.onerror = reject; r.readAsDataURL(file);
      });

      const COMMON_COLORS = ['Blue', 'Green', 'Red', 'Yellow', 'White', 'Black', 'Grey', 'Orange'];

      const params = new URLSearchParams(window.location.search);
      // Modes: category (edit/`new`) vs product (edit/`new`).
      const editCategory = params.get('category');
      const editProduct = params.get('product');
      const mode: 'category' | 'product' = editCategory !== null ? 'category' : 'product';
      const editId = mode === 'category' ? (editCategory !== 'new' ? editCategory : null) : (editProduct !== 'new' ? editProduct : null);
      const preCategory = mode === 'product' ? params.get('category') : null;

      const formEl = document.getElementById('pd-form') as HTMLFormElement;
      const loadingEl = document.getElementById('edit-loading')!;
      const titleEl = document.getElementById('page-title')!;
      const modeEl = document.getElementById('pd-mode') as HTMLInputElement;
      const idEl = document.getElementById('pd-id') as HTMLInputElement;
      const catEl = document.getElementById('pd-category') as HTMLSelectElement;
      const fieldCategory = document.getElementById('field-category') as HTMLElement;
      const fieldSku = document.getElementById('field-sku') as HTMLElement;
      const fieldShort = document.getElementById('field-short') as HTMLElement;
      const fieldFeatures = document.getElementById('field-features') as HTMLElement;
      const fieldApps = document.getElementById('field-apps') as HTMLElement;
      const fieldFeatured = document.getElementById('field-featured') as HTMLElement;
      const nameEl = document.getElementById('pd-name') as HTMLInputElement;
      const slugEl = document.getElementById('pd-slug') as HTMLInputElement;
      const skuEl = document.getElementById('pd-sku') as HTMLInputElement;
      const shortEl = document.getElementById('pd-short') as HTMLTextAreaElement;
      const descEl = document.getElementById('pd-description') as HTMLTextAreaElement;
      const featuresEl = document.getElementById('pd-features') as HTMLTextAreaElement;
      const orderEl = document.getElementById('pd-order') as HTMLInputElement;
      const activeEl = document.getElementById('pd-active') as HTMLInputElement;
      const featuredEl = document.getElementById('pd-featured') as HTMLInputElement;
      const appsEl = document.getElementById('apps-container')!;
      const variantsEl = document.getElementById('variants-container')!;
      const errorEl = document.getElementById('form-error');
      const submitBtn = document.getElementById('pd-submit') as HTMLButtonElement;
      const saveTopBtn = document.getElementById('pd-save-top') as HTMLButtonElement;

      const picker = createImagePicker(document.getElementById('pd-image-picker')!, {
        hint: 'Choose a photo from your computer. This is the main image shown across the website.'
      });

      modeEl.value = mode;

      if (mode === 'category') {
        titleEl.textContent = editId ? 'Edit Category' : 'New Category';
        if (editId) titleEl.textContent = 'Edit Category';
        document.getElementById('back-link')?.setAttribute('href', href('admin/categories/'));
        document.getElementById('cancel-link')?.setAttribute('href', href('admin/categories/'));
        fieldSku.hidden = true;
        fieldShort.hidden = true;
        fieldFeatures.hidden = true;
        fieldApps.hidden = true;
        fieldFeatured.hidden = true;
        fieldCategory.hidden = true;
        document.getElementById('category-hint')!.textContent = 'Categories are the main ranges shown first on the Products page.';
        document.getElementById('name-hint')!.textContent = 'e.g. Plastic Crates';
      } else {
        titleEl.textContent = editId ? 'Edit Product' : 'New Product';
        if (editId) titleEl.textContent = 'Edit Product';
      }

      function showError(msg: string) {
        if (errorEl) { errorEl.textContent = msg; errorEl.style.display = ''; errorEl.scrollIntoView({ behavior: 'smooth' }); }
      }

      // ---- Tabs ----
      const tabs = Array.from(document.querySelectorAll<HTMLButtonElement>('.a-tab'));
      const onTabClick = (e: Event) => {
        const tab = e.currentTarget as HTMLButtonElement;
        document.querySelectorAll('.a-tab').forEach(t => t.classList.remove('is-active'));
        document.querySelectorAll('.a-tab-panel').forEach(p => p.classList.remove('is-active'));
        tab.classList.add('is-active');
        document.getElementById(tab.dataset.tab!)?.classList.add('is-active');
      };
      tabs.forEach(tab => tab.addEventListener('click', onTabClick));
      cleanups.push(() => tabs.forEach(tab => tab.removeEventListener('click', onTabClick)));

      saveTopBtn?.addEventListener('click', () => formEl.requestSubmit());

      // Slug auto-gen
      const onNameInput = () => {
        if (!slugEl.hasAttribute('data-manual')) slugEl.value = slugify(nameEl.value);
      };
      const onSlugInput = () => { slugEl.setAttribute('data-manual', '1'); };
      nameEl?.addEventListener('input', onNameInput);
      slugEl?.addEventListener('input', onSlugInput);
      cleanups.push(() => {
        nameEl?.removeEventListener('input', onNameInput);
        slugEl?.removeEventListener('input', onSlugInput);
      });

      // ================= APPLICATIONS (product mode) =================
      interface AppRow { name: string; description: string }
      let appsState: AppRow[] = [];

      function renderApps() {
        if (!appsState.length) { appsEl.innerHTML = '<p style="color:var(--a-faint);font-size:0.85rem;margin:0;">No applications added.</p>'; return; }
        appsEl.innerHTML = appsState.map((a, i) => `
          <div class="a-app-row">
            <input class="a-input app-name" data-idx="${i}" value="${esc(a.name)}" placeholder="Application name" />
            <input class="a-input app-desc" data-idx="${i}" value="${esc(a.description)}" placeholder="Brief description" />
            <div class="a-row-tools">
              <button type="button" data-app-del="${i}" title="Remove">&times;</button>
            </div>
          </div>`).join('');
        appsEl.querySelectorAll('.app-name').forEach(el => el.addEventListener('change', (e) => { appsState[Number((e.target as HTMLElement).dataset.idx)].name = (e.target as HTMLInputElement).value; }));
        appsEl.querySelectorAll('.app-desc').forEach(el => el.addEventListener('change', (e) => { appsState[Number((e.target as HTMLElement).dataset.idx)].description = (e.target as HTMLInputElement).value; }));
        appsEl.querySelectorAll<HTMLButtonElement>('[data-app-del]').forEach(btn => btn.addEventListener('click', () => { appsState.splice(Number(btn.dataset.appDel), 1); renderApps(); }));
      }

      const addAppBtn = document.getElementById('add-app');
      const onAddApp = () => { appsState.push({ name: '', description: '' }); renderApps(); };
      addAppBtn?.addEventListener('click', onAddApp);
      cleanups.push(() => addAppBtn?.removeEventListener('click', onAddApp));

      // ================= VARIANTS (sizes, shapes, colours) =================
      interface VariantImage {
        id: string | null;
        url: string;
        alt: string;
        order: number;
        file?: File;
        preview?: string;
      }
      interface VariantRow {
        id: string | null;
        key: string;               // stable client key (== id once saved)
        name: string; size: string; shape: string; color: string;
        weight: string; capacity: string; material: string;
        is_active: boolean; order: number;
        image: VariantImage | null;
      }
      let variantsState: VariantRow[] = [];

      function renderVariants() {
        if (!variantsState.length) {
          variantsEl.innerHTML = '<p style="color:var(--a-faint);font-size:0.85rem;margin:0;">No sizes added yet. Click "+ Add size" to start.</p>';
          return;
        }
        variantsEl.innerHTML = variantsState.map((v, idx) => `
          <div class="a-var-card" data-idx="${idx}" data-variant-id="${v.id || ''}">
            <div class="a-var-top">
              <span class="a-var-label">Size #${idx + 1}</span>
              <div class="a-var-actions">
                <label class="a-check" style="font-size:0.78rem;"><input type="checkbox" data-active="${idx}" ${v.is_active ? 'checked' : ''} /> Active</label>
                <button type="button" class="a-btn a-btn-sm" data-moveup="${idx}" title="Move up">&uarr;</button>
                <button type="button" class="a-btn a-btn-sm a-btn-danger" data-remove="${idx}" title="Remove">&times;</button>
              </div>
            </div>
            <div class="a-var-grid">
              <div class="a-field a-field-full">
                <label>Model / name <span style="color:var(--a-danger)">*</span></label>
                <input class="a-input v-name" data-idx="${idx}" value="${esc(v.name)}" placeholder="e.g. VPC-400" />
              </div>
              <div class="a-field">
                <label>Size (L × W × H)</label>
                <input class="a-input v-size" data-idx="${idx}" value="${esc(v.size)}" placeholder="400 × 300 × 130 mm" />
              </div>
              <div class="a-field">
                <label>Shape</label>
                <input class="a-input v-shape" data-idx="${idx}" value="${esc(v.shape)}" placeholder="e.g. Rectangular / Nestable" />
              </div>
              <div class="a-field">
                <label>Weight</label>
                <input class="a-input v-weight" data-idx="${idx}" value="${esc(v.weight)}" placeholder="e.g. ~750 g" />
              </div>
              <div class="a-field">
                <label>Capacity / Load</label>
                <input class="a-input v-capacity" data-idx="${idx}" value="${esc(v.capacity)}" placeholder="e.g. 15 kg" />
              </div>
              <div class="a-field">
                <label>Material</label>
                <input class="a-input v-material" data-idx="${idx}" value="${esc(v.material)}" placeholder="e.g. PP / HDPE" />
              </div>
              <div class="a-field">
                <label>Colours</label>
                <div class="a-var-colors" style="display:flex;flex-wrap:wrap;gap:6px;">
                  ${COMMON_COLORS.map(c => {
                    const selected = v.color?.split(',').map(s => s.trim()).includes(c) || false;
                    return `<label class="a-color-check" style="display:flex;align-items:center;gap:4px;padding:4px 8px;border:1px solid var(--a-border);border-radius:4px;cursor:pointer;${selected ? 'background:var(--a-primary);color:white;border-color:var(--a-primary)' : ''}"><input type="checkbox" class="v-color-checkbox" data-idx="${idx}" value="${c}" ${selected ? 'checked' : ''} style="margin:0;" /> ${c}</label>`;
                  }).join('')}
                </div>
                <input type="hidden" class="v-color" data-idx="${idx}" value="${esc(v.color)}" />
              </div>
            </div>
            ${variantPhotoHtml(v, idx)}
          </div>`).join('');

        variantsEl.querySelectorAll<HTMLInputElement>('.v-name').forEach(el => el.addEventListener('input', (e) => { const i = Number((e.target as HTMLElement).dataset.idx); variantsState[i].name = (e.target as HTMLInputElement).value; }));
        variantsEl.querySelectorAll<HTMLInputElement>('.v-size').forEach(el => el.addEventListener('input', (e) => { const i = Number((e.target as HTMLElement).dataset.idx); variantsState[i].size = (e.target as HTMLInputElement).value; }));
        variantsEl.querySelectorAll<HTMLInputElement>('.v-shape').forEach(el => el.addEventListener('input', (e) => { const i = Number((e.target as HTMLElement).dataset.idx); variantsState[i].shape = (e.target as HTMLInputElement).value; }));
        variantsEl.querySelectorAll<HTMLInputElement>('.v-weight').forEach(el => el.addEventListener('input', (e) => { const i = Number((e.target as HTMLElement).dataset.idx); variantsState[i].weight = (e.target as HTMLInputElement).value; }));
        variantsEl.querySelectorAll<HTMLInputElement>('.v-capacity').forEach(el => el.addEventListener('input', (e) => { const i = Number((e.target as HTMLElement).dataset.idx); variantsState[i].capacity = (e.target as HTMLInputElement).value; }));
        variantsEl.querySelectorAll<HTMLInputElement>('.v-material').forEach(el => el.addEventListener('input', (e) => { const i = Number((e.target as HTMLElement).dataset.idx); variantsState[i].material = (e.target as HTMLInputElement).value; }));
        variantsEl.querySelectorAll<HTMLInputElement>('.v-color-checkbox').forEach(cb => cb.addEventListener('change', (e) => {
          const i = Number((e.target as HTMLElement).dataset.idx);
          const checkbox = e.target as HTMLInputElement;
          const card = variantsEl.querySelector(`.a-var-card[data-idx="${i}"]`);
          const hiddenInput = card?.querySelector<HTMLInputElement>('.v-color');
          const checkboxes = card?.querySelectorAll<HTMLInputElement>('.v-color-checkbox');
          const selectedColors: string[] = [];
          checkboxes?.forEach(c => { if (c.checked) selectedColors.push(c.value); });
          const colorValue = selectedColors.join(', ');
          if (hiddenInput) hiddenInput.value = colorValue;
          variantsState[i].color = colorValue;
          checkboxes?.forEach(c => {
            const label = c.closest('label');
            if (label) {
              if (c.checked) {
                label.style.background = 'var(--a-primary)';
                label.style.color = 'white';
                label.style.borderColor = 'var(--a-primary)';
              } else {
                label.style.background = '';
                label.style.color = '';
                label.style.borderColor = '';
              }
            }
          });
        }));

        variantsEl.querySelectorAll<HTMLInputElement>('[data-active]').forEach(cb => cb.addEventListener('change', (e) => {
          const i = Number((e.target as HTMLElement).dataset.active);
          variantsState[i].is_active = (e.target as HTMLInputElement).checked;
        }));

        variantsEl.querySelectorAll<HTMLButtonElement>('[data-moveup]').forEach(btn => btn.addEventListener('click', () => {
          const i = Number(btn.dataset.moveup);
          if (i > 0) { const tmp = variantsState[i]; variantsState[i] = variantsState[i-1]; variantsState[i-1] = tmp; renderVariants(); }
        }));
        variantsEl.querySelectorAll<HTMLButtonElement>('[data-remove]').forEach(btn => btn.addEventListener('click', () => {
          const i = Number(btn.dataset.remove);
          const img = variantsState[i].image;
          if (img && img.id) removedImages.push({ id: img.id, url: img.url });
          variantsState.splice(i, 1);
          renderVariants();
        }));

        variantsEl.querySelectorAll<HTMLButtonElement>('[data-photopick]').forEach(btn => btn.addEventListener('click', () => {
          const i = Number(btn.dataset.photopick);
          variantsEl.querySelector<HTMLInputElement>(`.a-var-card[data-idx="${i}"] .v-photo-input`)?.click();
        }));
        variantsEl.querySelectorAll<HTMLInputElement>('.v-photo-input').forEach(input => input.addEventListener('change', async () => {
          const i = Number(input.dataset.idx);
          const file = input.files?.[0];
          input.value = '';
          if (!file) return;
          if (!file.type.startsWith('image/')) { toast('Please choose an image file.', 'error'); return; }
          if (file.size > 10 * 1024 * 1024) { toast('Image must be 10 MB or smaller.', 'error'); return; }
          const preview = await toBase64(file);
          variantsState[i].image = { ...(variantsState[i].image || { id: null, url: '', alt: '', order: variantsState[i].order }), file, preview, order: variantsState[i].order };
          renderVariants();
        }));
        variantsEl.querySelectorAll<HTMLButtonElement>('[data-photoclear]').forEach(btn => btn.addEventListener('click', () => {
          const i = Number(btn.dataset.photoclear);
          const img = variantsState[i].image;
          if (img && img.id) removedImages.push({ id: img.id, url: img.url });
          variantsState[i].image = null;
          renderVariants();
        }));
        variantsEl.querySelectorAll<HTMLInputElement>('.v-photo-alt').forEach(el => el.addEventListener('input', (e) => {
          const i = Number((e.target as HTMLElement).dataset.idx);
          const img = variantsState[i].image;
          if (img) img.alt = (e.target as HTMLInputElement).value;
        }));
      }

      const removedImages: { id: string; url: string }[] = [];

      function variantPhotoHtml(v: VariantRow, idx: number): string {
        const img = v.image;
        const preview = img?.preview || (img?.url ? publicUrl(img.url) : '');
        const hasImage = Boolean(preview);
        return `
          <div class="a-var-photo">
            <label class="a-var-photo-label">Photo for this size</label>
            <div class="a-var-row">
              <div class="a-var-photo-box">
                ${hasImage
                  ? `<img src="${esc(preview)}" alt="" loading="lazy" />`
                  : `<span class="a-var-photo-empty">No photo</span>`}
              </div>
              <div class="a-var-photo-actions">
                <input type="file" class="a-input v-photo-input" data-idx="${idx}" accept="image/*" hidden />
                <button type="button" class="a-btn a-btn-sm" data-photopick="${idx}">${hasImage ? 'Change photo' : 'Add photo'}</button>
                ${hasImage
                  ? `<button type="button" class="a-btn a-btn-sm a-btn-danger" data-photoclear="${idx}">Remove</button>`
                  : ''}
                <input type="text" class="a-input v-photo-alt" data-idx="${idx}" value="${esc(img?.alt || '')}" placeholder="Alt text (optional)" />
              </div>
            </div>
            <p class="a-hint" style="margin-top:4px;">This photo appears with the ${esc(v.name || ('size ' + (idx + 1)))} row on the website.</p>
          </div>`;
      }

      const addVariantBtn = document.getElementById('add-variant');
      const onAddVariant = () => {
        variantsState.push({ id: null, key: crypto.randomUUID(), name: '', size: '', shape: '', color: '', weight: '', capacity: '', material: '', is_active: true, order: variantsState.length, image: null });
        renderVariants();
      };
      addVariantBtn?.addEventListener('click', onAddVariant);
      cleanups.push(() => addVariantBtn?.removeEventListener('click', onAddVariant));

      // ================= INIT =================
      void (async () => {
        if (!(await gate())) return;

        const { data: cats } = await supabase
          .from('categories')
          .select('id, name, slug')
          .order('display_order');

        if (cats?.length) {
          catEl.innerHTML = `<option value="">— Select category —</option>` +
            cats.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('');
        } else if (mode === 'product') {
          catEl.innerHTML = `<option value="">— No categories yet, create one first —</option>`;
        }

        if (editId) {
          if (mode === 'category') {
            const { data: cat, error } = await supabase
              .from('categories')
              .select('*, category_variants(*), category_images(*)')
              .eq('id', editId)
              .single();
            if (error || !cat) { showError(error?.message || 'Category not found'); loadingEl.remove(); formEl.style.display = ''; return; }

            idEl.value = cat.id;
            nameEl.value = cat.name;
            slugEl.value = cat.slug;
            slugEl.setAttribute('data-manual', '1');
            descEl.value = cat.description ?? '';
            orderEl.value = String(cat.display_order);
            activeEl.checked = cat.is_active;
            picker.setValue({ existing: cat.image_url ?? null, file: null });

            variantsState = ((cat as any).category_variants || []).map((v: any) => ({
              id: v.id, key: v.id, name: v.name ?? '', size: v.size ?? '', shape: v.shape ?? '', color: v.color ?? '',
              weight: v.weight ?? '', capacity: v.capacity ?? '', material: v.material ?? '',
              is_active: v.is_active, order: v.display_order,
              image: null
            })).sort((a: any, b: any) => a.order - b.order);
            for (const img of ((cat as any).category_images || []) as any[]) {
              const v = variantsState.find(x => x.id === img.category_variant_id);
              if (v) v.image = { id: img.id, url: img.image_url, alt: img.alt_text ?? '', order: img.display_order };
            }
            renderVariants();
          } else {
            const { data: prod, error } = await supabase
              .from('sub_categories')
              .select('*, sub_category_images(*), sub_category_variants(*)')
              .eq('id', editId)
              .single();
            if (error || !prod) { showError(error?.message || 'Product not found'); loadingEl.remove(); formEl.style.display = ''; return; }

            idEl.value = prod.id;
            catEl.value = prod.category_id;
            nameEl.value = prod.name;
            slugEl.value = prod.slug;
            slugEl.setAttribute('data-manual', '1');
            skuEl.value = (prod as any).product_code ?? '';
            shortEl.value = (prod as any).short_description ?? '';
            descEl.value = prod.description ?? '';
            featuresEl.value = (Array.isArray(prod.features) ? prod.features : []).join('\n');
            orderEl.value = String(prod.display_order);
            activeEl.checked = prod.is_active;
            featuredEl.checked = (prod as any).is_featured ?? false;
            picker.setValue({ existing: prod.image_url ?? null, file: null });

            variantsState = ((prod as any).sub_category_variants || []).map((v: any) => ({
              id: v.id, key: v.id, name: v.name ?? '', size: v.size ?? '', shape: v.shape ?? '', color: v.color ?? '',
              weight: v.weight ?? '', capacity: v.capacity ?? '', material: v.material ?? '',
              is_active: v.is_active, order: v.display_order,
              image: null
            })).sort((a: any, b: any) => a.order - b.order);
            for (const img of ((prod as any).sub_category_images || []) as any[]) {
              const v = variantsState.find(x => x.id === img.sub_category_variant_id);
              if (v) v.image = { id: img.id, url: img.image_url, alt: img.alt_text ?? '', order: img.display_order };
            }
            renderVariants();

            appsState = Array.isArray(prod.applications) ? [...(prod.applications as unknown as AppRow[])] : [];
            renderApps();
          }
        } else if (preCategory) {
          catEl.value = preCategory;
        }

        loadingEl.remove();
        formEl.style.display = '';
        saveTopBtn!.style.display = '';
      })();

      // ================= SAVE =================
      if (disposed) return;

      const onFormSubmit = async (e: SubmitEvent) => {
        e.preventDefault();
        if (errorEl) errorEl.style.display = 'none';

        const name = nameEl.value.trim();
        if (!name) { showError('A name is required.'); return; }
        let categoryId: string | null = null;
        if (mode === 'product') {
          categoryId = catEl.value;
          if (!categoryId) { showError('Please select a category.'); return; }
        }

        submitBtn?.setAttribute('disabled', '');
        submitBtn.textContent = 'Saving…';
        saveTopBtn?.setAttribute('disabled', '');

        const resetBtn = () => {
          submitBtn?.removeAttribute('disabled');
          submitBtn!.textContent = 'Save';
          saveTopBtn?.removeAttribute('disabled');
        };

        const slug = slugEl.value.trim() || slugify(name);
        const pickerValue = picker.getValue();
        let imageUrl: string | null = pickerValue.existing;
        const previousImage = pickerValue.existing;
        const id = editId || crypto.randomUUID();

        if (pickerValue.file) {
          const result = await picker.upload(`media/${mode === 'category' ? 'categories' : 'sub-categories'}/${slug}-${Date.now()}`);
          if ('error' in result) { resetBtn(); showError(result.error); return; }
          imageUrl = result.url;
        }

        // ---- Build the valid variant rows (with mapped ids for image linking) ----
        const validVariants: Record<string, unknown>[] = [];
        const variantIdByKey = new Map<string, string>();
        variantsState.forEach((v) => {
          if (!v.name.trim()) return;
          const vid = v.id || crypto.randomUUID();
          const shared = {
            id: vid,
            is_active: v.is_active,
            display_order: validVariants.length,
            name: v.name.trim(),
            size: v.size.trim() || null,
            shape: v.shape.trim() || null,
            color: v.color.trim() || null,
            weight: v.weight.trim() || null,
            capacity: v.capacity.trim() || null,
            material: v.material.trim() || null,
            updated_at: new Date().toISOString()
          };
          if (mode === 'category') {
            validVariants.push({ ...shared, category_id: id });
          } else {
            validVariants.push({ ...shared, sub_category_id: id });
          }
          variantIdByKey.set(v.key, vid);
        });

        // ---- Save the record ----
        let parentPayload: Record<string, unknown>;
        if (mode === 'category') {
          parentPayload = {
            id,
            name,
            slug,
            description: descEl.value.trim() || null,
            image_url: imageUrl,
            display_order: Number(orderEl.value) || 0,
            is_active: activeEl.checked,
            updated_at: new Date().toISOString()
          };
        } else {
          parentPayload = {
            id,
            category_id: categoryId,
            name,
            slug,
            product_code: skuEl.value.trim() || null,
            short_description: shortEl.value.trim() || null,
            description: descEl.value.trim() || null,
            image_url: imageUrl,
            features: featuresEl.value.split('\n').map(l => l.trim()).filter(Boolean),
            applications: appsState.filter(a => a.name.trim()),
            display_order: Number(orderEl.value) || 0,
            is_active: activeEl.checked,
            is_featured: featuredEl.checked,
            updated_at: new Date().toISOString()
          };
        }

        const { error: parentErr } = await supabase.from(mode === 'category' ? 'categories' : 'sub_categories').upsert(parentPayload as never, { onConflict: 'id' });
        if (parentErr) { resetBtn(); showError(parentErr.message); return; }
        if (previousImage && previousImage !== imageUrl) await deleteFile(previousImage);

        // ---- Variants ----
        const variantTable = mode === 'category' ? 'category_variants' : 'sub_category_variants';
        const parentCol = mode === 'category' ? 'category_id' : 'sub_category_id';
        const savedIds = validVariants.map(v => v.id as string);
        {
          const { data: existingVariants } = await supabase
            .from(variantTable as any)
            .select('id')
            .eq(parentCol as string, id);
          const toDelete = ((existingVariants as any[]) || []).map(r => r.id).filter((rid: string) => !savedIds.includes(rid));
          if (toDelete.length) {
            const { error: delVErr } = await supabase
              .from(variantTable as any)
              .delete()
              .in('id', toDelete);
            if (delVErr) { resetBtn(); showError(`Failed to update sizes: ${delVErr.message}`); return; }
          }
        }
        if (validVariants.length) {
          const { error: insVErr } = await (supabase.from(variantTable as any) as any).upsert(validVariants as never, { onConflict: 'id' });
          if (insVErr) { resetBtn(); showError(`Failed to save sizes: ${insVErr.message}`); return; }
        }

        // ---- Images (one per size) ----
        const imageTable = mode === 'category' ? 'category_images' : 'sub_category_images';
        const uploadErrors: string[] = [];
        const folderBase = mode === 'category' ? 'categories' : 'sub-categories';

        // Remove images that were detached (photo cleared or size row removed).
        for (const gone of removedImages) {
          if (gone.id) {
            const { error: delErr } = await supabase.from(imageTable).delete().eq('id', gone.id);
            if (delErr) uploadErrors.push(`Delete image error: ${delErr.message}`);
          }
          if (gone.url) await deleteFile(gone.url);
        }

        // Persist each size's photo against its variant id.
        for (let i = 0; i < validVariants.length; i++) {
          const vid = savedIds[i];
          const source = variantsState.find(v => variantIdByKey.get(v.key) === vid);
          const image = source?.image;
          if (!image) continue;

          let imageUrl = image.url;
          if (image.file) {
            const result = await uploadFile(image.file, `${folderBase}/${id}/${vid}-${Date.now()}`);
            if ('error' in result) { uploadErrors.push(`Upload failed (${image.file.name}): ${result.error}`); continue; }
            if (image.url && image.url !== result.path) await deleteFile(image.url);
            imageUrl = result.path;
          }

          if (!imageUrl) continue;

          const imgPayload: Record<string, unknown> = {
            image_url: imageUrl,
            alt_text: image.alt || null,
            display_order: i,
            [parentCol]: id
          };
          if (mode === 'category') imgPayload.category_variant_id = vid;
          else imgPayload.sub_category_variant_id = vid;

          if (image.id) {
            const { error: updErr } = await (supabase.from(imageTable as any) as any).upsert({ ...imgPayload, id: image.id } as never, { onConflict: 'id' });
            if (updErr) uploadErrors.push(`Update image error: ${updErr.message}`);
          } else {
            const { error: insImgErr } = await supabase.from(imageTable).insert(imgPayload as never);
            if (insImgErr) uploadErrors.push(`Save image error: ${insImgErr.message}`);
          }
        }

        resetBtn();

        if (uploadErrors.length) {
          toast(`Saved, but some image operations failed: ${uploadErrors[0]}`, 'error');
        } else {
          toast(editId ? 'Saved.' : 'Created.', 'success');
        }
        publishSite(100);
        window.location.href = href(mode === 'category' ? 'admin/categories/' : 'admin/products/');
      };

      formEl?.addEventListener('submit', onFormSubmit);
      cleanups.push(() => formEl?.removeEventListener('submit', onFormSubmit));
    })();

    return () => {
      disposed = true;
      cleanups.forEach((fn) => fn());
      cleanups.length = 0;
    };
  }, []);

  return (
    <AdminShell title="Product" current="products">
      <div className="a-page-head">
        <h2 id="page-title">New Product</h2>
        <div style={{ display: 'flex', gap: 10 }}>
          <a href="/admin/products/" className="a-btn a-btn-sm" id="back-link">{'\u2190'} Back to products</a>
          <button type="button" className="a-btn a-btn-primary" id="pd-save-top" style={{ display: 'none' }}>Save</button>
        </div>
      </div>

      <div id="edit-loading" className="a-inline-loading" style={{ padding: 40 }}><div className="a-spinner"></div></div>

      <form id="pd-form" noValidate style={{ display: 'none' }}>
        <div className="a-card is-tabs">
          <div className="a-tabs" role="tablist">
            <button type="button" className="a-tab is-active" data-tab="tab-basics" role="tab">Basics</button>
            <button type="button" className="a-tab" data-tab="tab-variants" role="tab">Sizes &amp; Colours</button>
          </div>

          {/* ======================= BASICS ======================= */}
          <div className="a-tab-panel is-active" id="tab-basics">
            <input type="hidden" id="pd-id" />
            <input type="hidden" id="pd-mode" />
            <div className="a-form-grid">
              <div className="a-field a-field-full" id="field-category">
                <label htmlFor="pd-category">Category <span style={{ color: 'var(--a-danger)' }}>*</span></label>
                <select id="pd-category" className="a-select" required>
                  <option value="">— Select category —</option>
                </select>
                <span className="a-hint" id="category-hint">The range this product belongs to.</span>
              </div>
              <div className="a-field">
                <label htmlFor="pd-name">Name <span style={{ color: 'var(--a-danger)' }}>*</span></label>
                <input id="pd-name" className="a-input" required autoComplete="off" placeholder="e.g. Standard Crates" />
                <span className="a-hint" id="name-hint">Product or range name shown to customers.</span>
              </div>
              <div className="a-field">
                <label htmlFor="pd-slug">Slug</label>
                <input id="pd-slug" className="a-input" required autoComplete="off" placeholder="auto-generated from name" />
                <span className="a-hint">Leave blank to auto-generate.</span>
              </div>
              <div className="a-field" id="field-sku">
                <label htmlFor="pd-sku">SKU / Series code</label>
                <input id="pd-sku" className="a-input" autoComplete="off" placeholder="e.g. VPC-SERIES" />
              </div>
              <div className="a-field a-field-full">
                <label>Main image</label>
                <div id="pd-image-picker"></div>
              </div>
              <div className="a-field a-field-full">
                <label htmlFor="pd-description">Description</label>
                <textarea id="pd-description" className="a-textarea" rows={3} placeholder="What this product / range is and where it is used"></textarea>
              </div>
              <div className="a-field a-field-full" id="field-short">
                <label htmlFor="pd-short">Short description</label>
                <textarea id="pd-short" className="a-textarea a-textarea-sm" rows={2} placeholder="1-2 sentence summary shown in listings"></textarea>
              </div>
              <div className="a-field a-field-full" id="field-features">
                <label htmlFor="pd-features">Features (one per line)</label>
                <textarea id="pd-features" className="a-textarea" rows={3} placeholder="Recyclable&#10;Lightweight&#10;Moisture resistant"></textarea>
              </div>
              <div className="a-field a-field-full" id="field-apps">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label>Applications</label>
                  <button type="button" className="a-btn a-btn-sm" id="add-app">+ Add application</button>
                </div>
                <div id="apps-container"></div>
              </div>
              <div className="a-field">
                <label htmlFor="pd-order">Display order</label>
                <input id="pd-order" className="a-input" type="number" min={0} defaultValue="0" />
                <span className="a-hint">Lower numbers appear first.</span>
              </div>
              <div className="a-field">
                <label>{'\u00A0'}</label>
                <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                  <label className="a-check"><input type="checkbox" id="pd-active" defaultChecked /> Active</label>
                  <label className="a-check" id="field-featured"><input type="checkbox" id="pd-featured" /> Featured on homepage</label>
                </div>
              </div>
            </div>
          </div>

          {/* ======================= SIZES & COLOURS ======================= */}
          <div className="a-tab-panel" id="tab-variants">
            <div className="a-guide" style={{ marginBottom: 16 }}>
              <h4>Add the sizes, shapes and colours this is made in</h4>
              <p style={{ margin: 0 }}>Each row is one model / size with its own photo. These appear on the website as a specification table so customers can see every option at a glance.</p>
            </div>
            <div className="a-var-head">
              <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Sizes / Models</span>
              <button type="button" className="a-btn a-btn-sm a-btn-primary" id="add-variant">+ Add size</button>
            </div>
            <div id="variants-container"></div>
            <p className="a-hint" style={{ marginTop: 6 }}>Add at least one size so customers can see what is available. Leave a field empty if not applicable.</p>
          </div>
        </div>

        <div id="form-error" className="a-tip a-tip-error" style={{ marginTop: 16, display: 'none' }} role="alert"></div>

        <div className="a-sticky-actions">
          <span className="a-hint" id="save-helper">Sizes, colours and photos are saved together.</span>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button type="submit" className="a-btn a-btn-primary" id="pd-submit">Save</button>
            <a href="/admin/products/" className="a-btn" id="cancel-link">Cancel</a>
          </div>
        </div>
      </form>
    </AdminShell>
  );
}
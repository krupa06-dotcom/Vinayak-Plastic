'use client';

import { useEffect } from 'react';
import AdminShell from '@/components/admin/AdminShell';
import { gate, supabase, esc, slugify, toast, publicUrl, uploadFile, deleteFile, publishSite, confirmDialog } from '@/scripts/admin/core';
import { createImagePicker } from '@/scripts/admin/imagePicker';

// Edit series — the Phase 2 catalog editor. Port of the hand-rolled admin style
// from EditProduct (gate'd effect, tabs, DOM-rendered nested builder):
//
//   Series (footprint, e.g. "600 × 400 Series")
//     └── Sizes (heights, e.g. "220 mm")
//           └── Versions (e.g. "Ribbed Bottom", model code VPC-600)
//                 └── Images (photos for that exact version)
//
// Everything (series + sizes + versions + images) saves in one flow so the
// hierarchy never gets into a half-saved state across levels.
export default function EditSeries() {
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

      const params = new URLSearchParams(window.location.search);
      const seriesParam = params.get('series');
      const preCategory = params.get('category');
      const editId = seriesParam && seriesParam !== 'new' ? seriesParam : null;

      const formEl = document.getElementById('sr-form') as HTMLFormElement;
      const loadingEl = document.getElementById('edit-loading')!;
      const titleEl = document.getElementById('page-title')!;
      const idEl = document.getElementById('sr-id') as HTMLInputElement;
      const catEl = document.getElementById('sr-category') as HTMLSelectElement;
      const nameEl = document.getElementById('sr-name') as HTMLInputElement;
      const slugEl = document.getElementById('sr-slug') as HTMLInputElement;
      const baseLenEl = document.getElementById('sr-base-len') as HTMLInputElement;
      const baseWidEl = document.getElementById('sr-base-wid') as HTMLInputElement;
      const codeEl = document.getElementById('sr-code') as HTMLInputElement;
      const shortEl = document.getElementById('sr-short') as HTMLTextAreaElement;
      const descEl = document.getElementById('sr-description') as HTMLTextAreaElement;
      const featuresEl = document.getElementById('sr-features') as HTMLTextAreaElement;
      const appsEl = document.getElementById('sr-apps-container')!;
      const orderEl = document.getElementById('sr-order') as HTMLInputElement;
      const activeEl = document.getElementById('sr-active') as HTMLInputElement;
      const featuredEl = document.getElementById('sr-featured') as HTMLInputElement;
      const sizesEl = document.getElementById('sr-sizes-container')!;
      const errorEl = document.getElementById('form-error');
      const submitBtn = document.getElementById('sr-submit') as HTMLButtonElement;
      const saveTopBtn = document.getElementById('sr-save-top') as HTMLButtonElement;

      const picker = createImagePicker(document.getElementById('sr-image-picker')!, {
        hint: 'The main cover image for this series (shown across the website).'
      });

      titleEl.textContent = editId ? 'Edit Series' : 'New Series';
      if (!editId) {
        document.getElementById('back-link')?.setAttribute('href', href('admin/series/'));
        document.getElementById('cancel-link')?.setAttribute('href', href('admin/series/'));
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

      // ---- Auto-derive series name "600 × 400 Series" from the footprint ----
      let nameAuto = !editId;
      const onBaseDimsChange = () => {
        const l = parseFloat(baseLenEl.value);
        const w = parseFloat(baseWidEl.value);
        if (Number.isFinite(l) && Number.isFinite(w) && nameAuto) {
          nameEl.value = `${fmtNum(l)} × ${fmtNum(w)} Series`;
          if (!slugEl.hasAttribute('data-manual')) slugEl.value = slugify(nameEl.value);
        }
      };
      const onNameInput = () => { nameAuto = false; if (!slugEl.hasAttribute('data-manual')) slugEl.value = slugify(nameEl.value); };
      const onSlugInput = () => { slugEl.setAttribute('data-manual', '1'); };
      baseLenEl?.addEventListener('input', onBaseDimsChange);
      baseWidEl?.addEventListener('input', onBaseDimsChange);
      nameEl?.addEventListener('input', onNameInput);
      slugEl?.addEventListener('input', onSlugInput);
      cleanups.push(() => {
        baseLenEl?.removeEventListener('input', onBaseDimsChange);
        baseWidEl?.removeEventListener('input', onBaseDimsChange);
        nameEl?.removeEventListener('input', onNameInput);
        slugEl?.removeEventListener('input', onSlugInput);
      });

      function fmtNum(n: number): string {
        return Number.isInteger(n) ? String(n) : String(n);
      }

      // ================= APPLICATIONS =================
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
      const onAddApp = () => { appsState.push({ name: '', description: '' }); renderApps(); };
      document.getElementById('add-app')?.addEventListener('click', onAddApp);

      // ================= SIZES / VERSIONS / IMAGES =================
      interface VerImg {
        id: string | null;
        url: string;
        alt: string;
        main: boolean;
        order: number;
        file?: File;
        preview?: string;
      }
      interface VerRow {
        id: string | null;
        key: string;
        version_name: string; version_code: string; model_code: string;
        description: string; material: string; weight: string; load_capacity: string;
        outer_l: string; outer_w: string; outer_h: string;
        inner_l: string; inner_w: string; inner_h: string;
        colours: string; shape: string; price: string;
        is_active: boolean; order: number;
        images: VerImg[];
      }
      interface SizeRow {
        id: string | null;
        key: string;
        height: string;
        is_active: boolean;
        order: number;
        versions: VerRow[];
      }
      let sizesState: SizeRow[] = [];
      const removedImages: { id: string | null; url: string }[] = [];

      function newImgRow(): VerImg {
        return { id: null, url: '', alt: '', main: false, order: 0 };
      }
      function newVerRow(): VerRow {
        return { id: null, key: crypto.randomUUID(), version_name: '', version_code: '', model_code: '',
          description: '', material: '', weight: '', load_capacity: '',
          outer_l: '', outer_w: '', outer_h: '', inner_l: '', inner_w: '', inner_h: '',
          colours: '', shape: '', price: '', is_active: true, order: 0, images: [] };
      }
      function newSizeRow(): SizeRow {
        return { id: null, key: crypto.randomUUID(), height: '', is_active: true, order: 0, versions: [] };
      }

      function renderImages(si: number, vi: number): string {
        const ver = sizesState[si].versions[vi];
        if (!ver.images.length) {
          return `<div class="a-guide" style="margin-top:10px;padding:10px;font-size:0.8rem;">No photos for this version yet — click "+ Add photo".</div>`;
        }
        return ver.images.map((img, ii) => {
          const preview = img.preview || (img.url ? publicUrl(img.url, 300) : '');
          const hasImage = Boolean(preview);
          return `
            <div class="a-img-row ver-img" data-si="${si}" data-vi="${vi}" data-ii="${ii}">
              <div class="a-var-photo-box" style="width:90px;height:60px;">
                ${hasImage
                  ? `<img src="${esc(preview)}" alt="" loading="lazy" style="width:100%;height:100%;object-fit:cover;" />`
                  : `<span class="a-var-photo-empty">No photo</span>`}
              </div>
              <div style="display:flex;flex-direction:column;gap:6px;">
                <input type="file" class="a-input" data-sr-up="${si}|${vi}|${ii}" accept="image/*" style="font-size:0.75rem;padding:4px" />
                <input type="text" class="a-input sr-alt" data-si="${si}" data-vi="${vi}" data-ii="${ii}" value="${esc(img.alt)}" placeholder="Alt text (optional)" style="font-size:0.75rem;padding:4px" />
              </div>
              <label class="a-check" style="font-size:0.75rem;justify-content:flex-start"><input type="radio" name="sr-main-${si}-${vi}" class="sr-main" data-si="${si}" data-vi="${vi}" data-ii="${ii}" ${img.main ? 'checked' : ''} /> Main</label>
              <div class="a-row-tools">
                <button type="button" data-sr-img-del="${si}|${vi}|${ii}" title="Remove photo" style="width:28px;height:28px;">&times;</button>
              </div>
            </div>`;
        }).join('');
      }

      function versionFieldsHtml(ver: VerRow, si: number, vi: number): string {
        const f = (cls: string, value: string, extra = '') => `<input class="a-input ${cls}" data-si="${si}" data-vi="${vi}" value="${esc(value)}"${extra} />`;
        const num = (cls: string, value: string) => `<input class="a-input ${cls}" data-si="${si}" data-vi="${vi}" value="${esc(value)}" type="number" min="0" step="any" />`;
        return `
          <div class="a-var-grid">
            <div class="a-field">
              <label>Version name</label>
              ${f('v-ver-name', ver.version_name, ' placeholder="e.g. Ribbed Bottom"')}
            </div>
            <div class="a-field">
              <label>Version code</label>
              ${f('v-ver-code', ver.version_code, ' placeholder="e.g. RB"')}
            </div>
            <div class="a-field">
              <label>Model code <span style="color:var(--a-danger)">*</span></label>
              ${f('v-model-code', ver.model_code, ' placeholder="e.g. VPC-600"')}
            </div>
            <div class="a-field">
              <label>Material</label>
              ${f('v-material', ver.material, ' placeholder="e.g. PP / HDPE"')}
            </div>
            <div class="a-field">
              <label>Weight</label>
              ${f('v-weight', ver.weight, ' placeholder="e.g. 2.5 kg"')}
            </div>
            <div class="a-field">
              <label>Load capacity</label>
              ${f('v-load-capacity', ver.load_capacity, ' placeholder="e.g. 15 kg"')}
            </div>
            <div class="a-field">
              <label>Outer L</label>
              ${num('v-outer-l', ver.outer_l)}
            </div>
            <div class="a-field">
              <label>Outer W</label>
              ${num('v-outer-w', ver.outer_w)}
            </div>
            <div class="a-field">
              <label>Outer H</label>
              ${num('v-outer-h', ver.outer_h)}
            </div>
            <div class="a-field">
              <label>Inner L</label>
              ${num('v-inner-l', ver.inner_l)}
            </div>
            <div class="a-field">
              <label>Inner W</label>
              ${num('v-inner-w', ver.inner_w)}
            </div>
            <div class="a-field">
              <label>Inner H</label>
              ${num('v-inner-h', ver.inner_h)}
            </div>
            <div class="a-field a-field-full">
              <label>Colours (comma separated)</label>
              ${f('v-colours', ver.colours, ' placeholder="e.g. Blue, Grey"')}
            </div>
            <div class="a-field">
              <label>Shape</label>
              ${f('v-shape', ver.shape, ' placeholder="e.g. Nestable"')}
            </div>
            <div class="a-field">
              <label>Price</label>
              ${f('v-price', ver.price, ' placeholder="Optional price string"')}
            </div>
            <div class="a-field">
              <label>Order</label>
              ${f('v-order', String(ver.order), ' type="number" min="0"')}
            </div>
            <div class="a-field a-field-full">
              <label>Description</label>
              <textarea class="a-textarea v-description" data-si="${si}" data-vi="${vi}" rows="2" placeholder="Optional per-version notes">${esc(ver.description)}</textarea>
            </div>
          </div>`;
      }

      function renderSizeCard(size: SizeRow, si: number): string {
        const verCards = size.versions.length ? size.versions.map((ver, vi) => `
          <div class="a-var-card" style="border-left-color:var(--a-border-strong);background:#fdfcf9;margin-top:10px;" data-ver="${si}|${vi}">
            <div class="a-var-top">
              <span class="a-var-label">Version #${vi + 1}</span>
              <div class="a-var-actions">
                <label class="a-check" style="font-size:0.75rem;"><input type="checkbox" class="v-active" data-si="${si}" data-vi="${vi}" ${ver.is_active ? 'checked' : ''} /> Active</label>
                <button type="button" class="a-btn a-btn-sm" data-ver-up="${si}|${vi}" title="Move version up">&uarr;</button>
                <button type="button" class="a-btn a-btn-sm a-btn-danger" data-ver-del="${si}|${vi}" title="Delete version">&times;</button>
              </div>
            </div>
            ${versionFieldsHtml(ver, si, vi)}
            <div style="margin-top:12px;">
              <div class="a-var-photo-label" style="margin-bottom:4px;">Photos for this version</div>
              <div id="ver-imgs-${si}-${vi}">${renderImages(si, vi)}</div>
              <button type="button" class="a-btn a-btn-sm" data-add-img="${si}|${vi}" style="margin-top:8px;">+ Add photo</button>
            </div>
          </div>`).join('') : '<p style="color:var(--a-faint);font-size:0.82rem;margin:10px 0 2px;">No versions in this size yet.</p>';

        return `
          <div class="a-var-card" data-size="${si}">
            <div class="a-var-top">
              <span class="a-var-label">Size #${si + 1}</span>
              <div class="a-var-actions">
                <label class="a-check" style="font-size:0.75rem;"><input type="checkbox" class="s-active" data-si="${si}" ${size.is_active ? 'checked' : ''} /> Active</label>
                <button type="button" class="a-btn a-btn-sm" data-size-up="${si}" title="Move size up">&uarr;</button>
                <button type="button" class="a-btn a-btn-sm a-btn-danger" data-size-del="${si}" title="Delete size">&times;</button>
              </div>
            </div>
            <div class="a-var-grid">
              <div class="a-field">
                <label>Height (mm) <span style="color:var(--a-danger)">*</span></label>
                <input class="a-input s-height" data-si="${si}" value="${esc(size.height)}" placeholder="e.g. 220" style="width:140px;" />
              </div>
              <div class="a-field">
                <label>Auto label</label>
                <input class="a-input s-label" data-si="${si}" value="${esc(size.height ? size.height + ' mm' : '')}" disabled />
              </div>
            </div>
            <div class="a-var-head" style="margin-top:6px;">
              <span style="font-weight:600;font-size:0.85rem;">Versions in this size</span>
              <button type="button" class="a-btn a-btn-sm a-btn-primary" data-add-ver="${si}">+ Add version</button>
            </div>
            ${verCards}
          </div>`;
      }

      function renderSizes() {
        if (!sizesState.length) {
          sizesEl.innerHTML = '<p style="color:var(--a-faint);font-size:0.85rem;margin:0;">No sizes yet. Click "+ Add size" to add a height step (e.g. 220 mm).</p>';
          return;
        }
        sizesEl.innerHTML = sizesState.map((s, si) => renderSizeCard(s, si)).join('');
        bindSizeEvents();
      }

      const onAddSize = () => {
        const sz = newSizeRow();
        sz.order = sizesState.length;
        sizesState.push(sz);
        renderSizes();
      };
      document.getElementById('add-size')?.addEventListener('click', onAddSize);

      function bindSizeEvents() {
        sizesEl.querySelectorAll<HTMLInputElement>('.s-height').forEach(el => el.addEventListener('input', (e) => {
          const si = Number((e.target as HTMLElement).dataset.si);
          sizesState[si].height = (e.target as HTMLInputElement).value;
          const label = sizesEl.querySelector(`.a-var-card[data-size="${si}"] .s-label`) as HTMLInputElement;
          if (label) label.value = sizesState[si].height ? sizesState[si].height + ' mm' : '';
        }));
        sizesEl.querySelectorAll<HTMLInputElement>('.s-active').forEach(el => el.addEventListener('change', (e) => {
          const si = Number((e.target as HTMLElement).dataset.si);
          sizesState[si].is_active = (e.target as HTMLInputElement).checked;
        }));
        sizesEl.querySelectorAll<HTMLButtonElement>('[data-size-up]').forEach(btn => btn.addEventListener('click', () => {
          const si = Number(btn.dataset.sizeUp);
          if (si > 0) { const t = sizesState[si]; sizesState[si] = sizesState[si - 1]; sizesState[si - 1] = t; renderSizes(); }
        }));
        sizesEl.querySelectorAll<HTMLButtonElement>('[data-size-del]').forEach(btn => btn.addEventListener('click', async () => {
          const si = Number(btn.dataset.sizeDel);
          const ok = await confirmDialog('Delete this size?', 'This removes the size and every version and photo inside it. Prefer deactivating if the size is still in use.');
          if (!ok) return;
          collectVersionsImages(si);
          sizesState.splice(si, 1);
          renderSizes();
        }));
        sizesEl.querySelectorAll<HTMLButtonElement>('[data-add-ver]').forEach(btn => btn.addEventListener('click', () => {
          const si = Number(btn.dataset.addVer);
          const ver = newVerRow();
          ver.order = sizesState[si].versions.length;
          sizesState[si].versions.push(ver);
          renderSizes();
        }));
        sizesEl.querySelectorAll<HTMLButtonElement>('[data-ver-up]').forEach(btn => btn.addEventListener('click', () => {
          const [si, vi] = btn.dataset.verUp!.split('|').map(Number);
          if (vi > 0) { const arr = sizesState[si].versions; const t = arr[vi]; arr[vi] = arr[vi - 1]; arr[vi - 1] = t; renderSizes(); }
        }));
        sizesEl.querySelectorAll<HTMLButtonElement>('[data-ver-del]').forEach(btn => btn.addEventListener('click', async () => {
          const [si, vi] = btn.dataset.verDel!.split('|').map(Number);
          const ok = await confirmDialog('Delete this version?', 'This removes the version and its photos. Prefer deactivating if the version is still in use.');
          if (!ok) return;
          collectVerImages(si, vi);
          sizesState[si].versions.splice(vi, 1);
          renderSizes();
        }));
        sizesEl.querySelectorAll<HTMLInputElement>('[data-sr-up]').forEach(input => input.addEventListener('change', async () => {
          const [si, vi, ii] = input.dataset.srUp!.split('|').map(Number);
          const file = input.files?.[0];
          input.value = '';
          if (!file) return;
          if (!file.type.startsWith('image/')) { toast('Please choose an image file.', 'error'); return; }
          if (file.size > 10 * 1024 * 1024) { toast('Image must be 10 MB or smaller.', 'error'); return; }
          const preview = await toBase64(file);
          const img = sizesState[si].versions[vi].images[ii] || newImgRow();
          img.file = file; img.preview = preview;
          if (!sizesState[si].versions[vi].images[ii]) { img.order = sizesState[si].versions[vi].images.length; sizesState[si].versions[vi].images.push(img); }
          renderSizes();
        }));
        sizesEl.querySelectorAll<HTMLButtonElement>('[data-sr-img-del]').forEach(btn => btn.addEventListener('click', async () => {
          const [si, vi, ii] = btn.dataset.srImgDel!.split('|').map(Number);
          const img = sizesState[si].versions[vi].images[ii];
          if (img && (img.id || img.url)) removedImages.push({ id: img.id, url: img.url });
          sizesState[si].versions[vi].images.splice(ii, 1);
          renderSizes();
        }));
        sizesEl.querySelectorAll<HTMLInputElement>('.sr-alt').forEach(el => el.addEventListener('input', (e) => {
          const [si, vi, ii] = [Number((e.target as HTMLElement).dataset.si), Number((e.target as HTMLElement).dataset.vi), Number((e.target as HTMLElement).dataset.ii)];
          const img = sizesState[si].versions[vi].images[ii];
          if (img) img.alt = (e.target as HTMLInputElement).value;
        }));
        sizesEl.querySelectorAll<HTMLInputElement>('.sr-main').forEach(radio => radio.addEventListener('change', (e) => {
          const [si, vi, ii] = [Number((e.target as HTMLElement).dataset.si), Number((e.target as HTMLElement).dataset.vi), Number((e.target as HTMLElement).dataset.ii)];
          sizesState[si].versions[vi].images.forEach((img, x) => { img.main = (x === ii); });
        }));
        sizesEl.querySelectorAll<HTMLButtonElement>('[data-add-img]').forEach(btn => btn.addEventListener('click', () => {
          const [si, vi] = btn.dataset.addImg!.split('|').map(Number);
          const img = newImgRow();
          img.order = sizesState[si].versions[vi].images.length;
          if (!sizesState[si].versions[vi].images.length) img.main = true;
          sizesState[si].versions[vi].images.push(img);
          renderSizes();
        }));
        // Version field bindings
        const BIND = (cls: string, fn: (row: VerRow) => (v: string) => void) => {
          sizesEl.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(`.${cls}`).forEach(el => el.addEventListener('input', (e) => {
            const si = Number((e.target as HTMLElement).dataset.si);
            const vi = Number((e.target as HTMLElement).dataset.vi);
            const row = sizesState[si]?.versions[vi];
            if (row) fn(row)((e.target as HTMLInputElement).value);
          }));
        };
        BIND('v-ver-name', r => v => { r.version_name = v; });
        BIND('v-ver-code', r => v => { r.version_code = v; });
        BIND('v-model-code', r => v => { r.model_code = v; });
        BIND('v-material', r => v => { r.material = v; });
        BIND('v-weight', r => v => { r.weight = v; });
        BIND('v-load-capacity', r => v => { r.load_capacity = v; });
        BIND('v-outer-l', r => v => { r.outer_l = v; });
        BIND('v-outer-w', r => v => { r.outer_w = v; });
        BIND('v-outer-h', r => v => { r.outer_h = v; });
        BIND('v-inner-l', r => v => { r.inner_l = v; });
        BIND('v-inner-w', r => v => { r.inner_w = v; });
        BIND('v-inner-h', r => v => { r.inner_h = v; });
        BIND('v-colours', r => v => { r.colours = v; });
        BIND('v-shape', r => v => { r.shape = v; });
        BIND('v-price', r => v => { r.price = v; });
        BIND('v-order', r => v => { r.order = Number(v) || 0; });
        BIND('v-description', r => v => { r.description = v; });
        sizesEl.querySelectorAll<HTMLInputElement>('.v-active').forEach(el => el.addEventListener('change', (e) => {
          const si = Number((e.target as HTMLElement).dataset.si);
          const vi = Number((e.target as HTMLElement).dataset.vi);
          const row = sizesState[si]?.versions[vi];
          if (row) row.is_active = (e.target as HTMLInputElement).checked;
        }));
      }

      function collectVersionsImages(si: number) {
        sizesState[si].versions.forEach((_, vi) => collectVerImages(si, vi));
      }
      function collectVerImages(si: number, vi: number): void {
        const ver = sizesState[si].versions[vi];
        if (!ver) return;
        ver.images.forEach(img => { if (img.id || img.url) removedImages.push({ id: img.id, url: img.url }); });
      }

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
        } else {
          catEl.innerHTML = `<option value="">— No categories yet, create one first —</option>`;
        }

        if (preCategory && cats?.some(c => c.id === preCategory)) catEl.value = preCategory;

        if (editId) {
          const { data: s, error } = await supabase
            .from('series')
            .select('*, size_variants(*, product_variants(*, product_images(*)))')
            .eq('id', editId)
            .single();
          if (error || !s) { showError(error?.message || 'Series not found'); loadingEl.remove(); formEl.style.display = ''; return; }

          idEl.value = s.id;
          catEl.value = s.category_id;
          nameEl.value = s.name ?? '';
          slugEl.value = s.slug ?? '';
          slugEl.setAttribute('data-manual', '1');
          baseLenEl.value = s.base_length != null ? String(s.base_length) : '';
          baseWidEl.value = s.base_width != null ? String(s.base_width) : '';
          codeEl.value = (s as any).product_code ?? '';
          shortEl.value = (s as any).short_description ?? '';
          descEl.value = s.description ?? '';
          featuresEl.value = (Array.isArray(s.features) ? s.features : []).join('\n');
          orderEl.value = String(s.display_order ?? 0);
          activeEl.checked = s.is_active ?? true;
          featuredEl.checked = (s as any).is_featured ?? false;
          picker.setValue({ existing: s.image_url ?? null, file: null });

          appsState = Array.isArray((s as any).applications) ? [...((s as any).applications as unknown as AppRow[])] : [];
          renderApps();

          const sizes = (((s as any).size_variants) || []) as any[];
          sizesState = sizes.sort((a, b) => (a.display_order || 0) - (b.display_order || 0)).map((sz, si): SizeRow => {
            const versions = ((sz.product_variants) || []).slice().sort((a: any, b: any) => (a.display_order || 0) - (b.display_order || 0));
            return {
              id: sz.id, key: sz.id, height: sz.height != null ? String(sz.height) : '', is_active: sz.is_active, order: sz.display_order || 0,
              versions: versions.map((pv: any): VerRow => ({
                id: pv.id, key: pv.id,
                version_name: pv.version_name ?? '', version_code: pv.version_code ?? '', model_code: pv.model_code ?? '',
                description: pv.description ?? '', material: pv.material ?? '', weight: pv.weight ?? '', load_capacity: pv.load_capacity ?? '',
                outer_l: pv.outer_length != null ? String(pv.outer_length) : '', outer_w: pv.outer_width != null ? String(pv.outer_width) : '',
                outer_h: pv.outer_height != null ? String(pv.outer_height) : '',
                inner_l: pv.inner_length != null ? String(pv.inner_length) : '', inner_w: pv.inner_width != null ? String(pv.inner_width) : '',
                inner_h: pv.inner_height != null ? String(pv.inner_height) : '',
                colours: pv.colours ?? '', shape: pv.shape ?? '', price: pv.price ?? '',
                is_active: pv.is_active, order: pv.display_order || 0,
                images: ((pv.product_images) || []).slice().sort((a: any, b: any) => (a.display_order || 0) - (b.display_order || 0)).map((pi: any): VerImg => ({
                  id: pi.id, url: pi.image_url ?? '', alt: pi.alt_text ?? '', main: pi.is_main, order: pi.display_order || 0
                }))
              }))
            };
          });
          renderSizes();
        } else {
          renderSizes();
        }

        loadingEl.remove();
        formEl.style.display = '';
        saveTopBtn!.style.display = '';
      })();

      // ================= SAVE =================
      const onFormSubmit = async (e: SubmitEvent) => {
        e.preventDefault();
        if (errorEl) errorEl.style.display = 'none';

        const categoryId = catEl.value;
        if (!categoryId) { showError('Please select a category.'); return; }
        let name = nameEl.value.trim();
        const baseLength = baseLenEl.value.trim();
        const baseWidth = baseWidEl.value.trim();
        const l = baseLength ? parseFloat(baseLength) : NaN;
        const w = baseWidth ? parseFloat(baseWidth) : NaN;
        if (baseLength && !Number.isFinite(l)) { showError('Base length must be a number.'); return; }
        if (baseWidth && !Number.isFinite(w)) { showError('Base width must be a number.'); return; }
        if ((baseLength && !baseWidth) || (!baseLength && baseWidth)) { showError('Enter both base length and width (or leave both empty).'); return; }
        if (!name) {
          if (Number.isFinite(l) && Number.isFinite(w)) name = `${fmtNum(l)} × ${fmtNum(w)} Series`;
          else { showError('A series name is required (or enter a footprint to auto-generate one).'); return; }
        }
        const slug = slugEl.value.trim() || slugify(name);

        // Validate sizes & versions
        if (sizesState.length === 0) { showError('Add at least one size (height).'); return; }
        const seenHeights = new Map<string, string>();
        for (const sz of sizesState) {
          const h = sz.height.trim();
          if (!h) { showError('Every size needs a height (mm) — remove empty sizes before saving.'); return; }
          const hv = parseFloat(h);
          if (!Number.isFinite(hv)) { showError(`Size "${h}" is not a valid height number.`); return; }
          if (seenHeights.has(h)) { showError(`Duplicate size height "${h}" inside this series.`); return; }
          seenHeights.set(h, sz.key);
          if (sz.versions.length) {
            const seen = new Set<string>();
            for (const ver of sz.versions) {
              const mc = ver.model_code.trim();
              if (!mc) { showError('Every version needs a model code (e.g. VPC-600).'); return; }
              if (seen.has(mc.toLowerCase())) { showError(`Duplicate model code "${mc}" in the same size.`); return; }
              seen.add(mc.toLowerCase());
            }
          }
        }

        submitBtn?.setAttribute('disabled', '');
        submitBtn.textContent = 'Saving…';
        saveTopBtn?.setAttribute('disabled', '');
        const resetBtn = () => {
          submitBtn?.removeAttribute('disabled');
          submitBtn!.textContent = 'Save';
          saveTopBtn?.removeAttribute('disabled');
        };

        const pickerValue = picker.getValue();
        let imageUrl: string | null = pickerValue.existing;
        const previousImage = pickerValue.existing;
        const id = editId || crypto.randomUUID();

        if (pickerValue.file) {
          const result = await picker.upload(`media/series/${slug}-${Date.now()}`);
          if ('error' in result) { resetBtn(); showError(result.error); return; }
          imageUrl = result.url;
        }

        // ---- Save series ----
        const seriesPayload: Record<string, unknown> = {
          id,
          category_id: categoryId,
          name,
          slug,
          base_length: baseLength ? l : null,
          base_width: baseWidth ? w : null,
          description: descEl.value.trim() || null,
          product_code: codeEl.value.trim() || null,
          short_description: shortEl.value.trim() || null,
          image_url: imageUrl,
          features: featuresEl.value.split('\n').map(x => x.trim()).filter(Boolean),
          applications: appsState.filter(a => a.name.trim()),
          is_featured: featuredEl.checked,
          is_active: activeEl.checked,
          display_order: Number(orderEl.value) || 0,
          updated_at: new Date().toISOString()
        };
        const { error: sErr } = await supabase.from('series').upsert(seriesPayload as never, { onConflict: 'id' });
        if (sErr) { resetBtn(); showError(sErr.message); return; }
        if (previousImage && previousImage !== imageUrl) await deleteFile(previousImage);

        // ---- Save sizes (delete removed) ----
        {
          const { data: existingSizes } = await supabase.from('size_variants').select('id').eq('series_id', id);
          const kept = sizesState.map(sz => sz.id).filter(Boolean) as string[];
          const toDelete = ((existingSizes as any[]) || []).map(r => r.id).filter((rid: string) => !kept.includes(rid));
          if (toDelete.length) {
            const { error: delErr } = await supabase.from('size_variants').delete().in('id', toDelete);
            if (delErr) { resetBtn(); showError(`Failed to remove sizes: ${delErr.message}`); return; }
          }
        }
        const sizeIdByKey = new Map<string, string>();
        for (let si = 0; si < sizesState.length; si++) {
          const sz = sizesState[si];
          if (!sz.height.trim()) continue;
          const hid = sz.id || crypto.randomUUID();
          sizeIdByKey.set(sz.key, hid);
          const { error: upErr } = await (supabase.from('size_variants') as any).upsert({
            id: hid, series_id: id, label: `${sz.height.trim()} mm`, height: parseFloat(sz.height),
            is_active: sz.is_active, display_order: si, updated_at: new Date().toISOString()
          } as never, { onConflict: 'id' });
          if (upErr) { resetBtn(); showError(`Failed to save size: ${upErr.message}`); return; }
        }

        // ---- Save versions + their images ----
        const uploadErrors: string[] = [];
        for (let si = 0; si < sizesState.length; si++) {
          const sz = sizesState[si];
          if (!sz.height.trim()) continue;
          const sizeId = sizeIdByKey.get(sz.key)!;
          const versions = sz.versions;

          // delete removed versions
          {
            const { data: existingVersions } = await supabase.from('product_variants').select('id').eq('size_variant_id', sizeId);
            const keptV = versions.map(v => v.id).filter(Boolean) as string[];
            const toDeleteV = ((existingVersions as any[]) || []).map(r => r.id).filter((rid: string) => !keptV.includes(rid));
            if (toDeleteV.length) {
              const { error: delVErr } = await supabase.from('product_variants').delete().in('id', toDeleteV);
              if (delVErr) { resetBtn(); showError(`Failed to remove versions: ${delVErr.message}`); return; }
            }
          }

          for (let vi = 0; vi < versions.length; vi++) {
            const ver = versions[vi];
            if (!ver.model_code.trim()) continue;
            const vid = ver.id || crypto.randomUUID();
            const num = (v: string) => { const x = parseFloat(v); return v && Number.isFinite(x) ? x : null; };
            const { error: upErr } = await (supabase.from('product_variants') as any).upsert({
              id: vid, size_variant_id: sizeId,
              version_name: ver.version_name.trim() || null,
              version_code: ver.version_code.trim() || null,
              model_code: ver.model_code.trim(),
              description: ver.description.trim() || null,
              material: ver.material.trim() || null,
              weight: ver.weight.trim() || null,
              load_capacity: ver.load_capacity.trim() || null,
              outer_length: num(ver.outer_l), outer_width: num(ver.outer_w), outer_height: num(ver.outer_h),
              inner_length: num(ver.inner_l), inner_width: num(ver.inner_w), inner_height: num(ver.inner_h),
              colours: ver.colours.trim() || null,
              shape: ver.shape.trim() || null,
              price: ver.price.trim() || null,
              is_active: ver.is_active, display_order: vi,
              updated_at: new Date().toISOString()
            } as never, { onConflict: 'id' });
            if (upErr) { uploadErrors.push(`Save version error: ${upErr.message}`); continue; }

            // delete removed images
            {
              const { data: existingImgs } = await supabase.from('product_images').select('id').eq('product_variant_id', vid);
              const keptI = ver.images.map(i => i.id).filter(Boolean) as string[];
              const toDeleteI = ((existingImgs as any[]) || []).map(r => r.id).filter((rid: string) => !keptI.includes(rid));
              if (toDeleteI.length) {
                const { error: delIErr } = await supabase.from('product_images').delete().in('id', toDeleteI);
                if (delIErr) uploadErrors.push(`Remove photo error: ${delIErr.message}`);
              }
            }

            let mainAssigned = false;
            for (let ii = 0; ii < ver.images.length; ii++) {
              const img = ver.images[ii];
              let imgUrl = img.url;
              if (img.file) {
                const result = await uploadFile(img.file, `media/series/${id}/${vid}-${ii}-${Date.now()}`);
                if ('error' in result) { uploadErrors.push(`Upload failed: ${result.error}`); continue; }
                if (img.url && img.url !== result.path) await deleteFile(img.url);
                imgUrl = result.path;
              }
              if (!imgUrl) continue;
              const isMain = img.main || (!mainAssigned && !ver.images.some(x => x.main));
              if (img.main || isMain) mainAssigned = true;
              const payload: Record<string, unknown> = {
                product_variant_id: vid, image_url: imgUrl, alt_text: img.alt.trim() || null,
                is_main: isMain, display_order: ii
              };
              if (img.id) {
                const { error: updErr } = await (supabase.from('product_images') as any).upsert({ ...payload, id: img.id } as never, { onConflict: 'id' });
                if (updErr) uploadErrors.push(`Update photo error: ${updErr.message}`);
              } else {
                const { error: insErr } = await supabase.from('product_images').insert(payload as never);
                if (insErr) uploadErrors.push(`Save photo error: ${insErr.message}`);
              }
            }
          }
        }

        // ---- Clean removed image rows (detached photos from the UI) ----
        for (const gone of removedImages) {
          if (gone.id) {
            const { error: delErr } = await supabase.from('product_images').delete().eq('id', gone.id);
            if (delErr) uploadErrors.push(`Delete photo error: ${delErr.message}`);
          }
          if (gone.url) await deleteFile(gone.url);
        }

        resetBtn();
        if (uploadErrors.length) {
          toast(`Saved, but some photo operations failed: ${uploadErrors[0]}`, 'error');
        } else {
          toast(editId ? 'Saved.' : 'Created.', 'success');
        }
        publishSite(100);
        window.location.href = href('admin/series/');
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
    <AdminShell title="Series" current="series">
      <div className="a-page-head">
        <h2 id="page-title">New Series</h2>
        <div style={{ display: 'flex', gap: 10 }}>
          <a href="/admin/series/" className="a-btn a-btn-sm" id="back-link">{'\u2190'} Back to series</a>
          <button type="button" className="a-btn a-btn-primary" id="sr-save-top" style={{ display: 'none' }}>Save</button>
        </div>
      </div>

      <div id="edit-loading" className="a-inline-loading" style={{ padding: 40 }}><div className="a-spinner"></div></div>

      <form id="sr-form" noValidate style={{ display: 'none' }}>
        <div className="a-card is-tabs">
          <div className="a-tabs" role="tablist">
            <button type="button" className="a-tab is-active" data-tab="tab-basics" role="tab">Basics</button>
            <button type="button" className="a-tab" data-tab="tab-sizes" role="tab">Sizes &amp; Versions</button>
          </div>

          {/* ======================= BASICS ======================= */}
          <div className="a-tab-panel is-active" id="tab-basics">
            <input type="hidden" id="sr-id" />
            <div className="a-guide" style={{ marginBottom: 16 }}>
              <h4>One series = one base footprint</h4>
              <p style={{ margin: 0 }}>Give the footprint (base Length × base Width) and the series name is auto-derived, e.g. "600 × 400 Series". Heights become sizes, and each size can hold several product versions.</p>
            </div>
            <div className="a-form-grid">
              <div className="a-field a-field-full">
                <label htmlFor="sr-category">Category <span style={{ color: 'var(--a-danger)' }}>*</span></label>
                <select id="sr-category" className="a-select" required>
                  <option value="">— Select category —</option>
                </select>
              </div>
              <div className="a-field">
                <label htmlFor="sr-base-len">Base length (mm)</label>
                <input id="sr-base-len" className="a-input" type="number" min="0" step="1" autoComplete="off" placeholder="e.g. 600" />
              </div>
              <div className="a-field">
                <label htmlFor="sr-base-wid">Base width (mm)</label>
                <input id="sr-base-wid" className="a-input" type="number" min="0" step="1" autoComplete="off" placeholder="e.g. 400" />
              </div>
              <div className="a-field">
                <label htmlFor="sr-name">Series name <span style={{ color: 'var(--a-danger)' }}>*</span></label>
                <input id="sr-name" className="a-input" required autoComplete="off" placeholder="600 × 400 Series" />
              </div>
              <div className="a-field">
                <label htmlFor="sr-slug">Slug</label>
                <input id="sr-slug" className="a-input" required autoComplete="off" placeholder="auto-generated from name" />
                <span className="a-hint">Leave blank to auto-generate.</span>
              </div>
              <div className="a-field">
                <label htmlFor="sr-code">SKU / Series code</label>
                <input id="sr-code" className="a-input" autoComplete="off" placeholder="e.g. VPC-SERIES" />
              </div>
              <div className="a-field">
                <label htmlFor="sr-order">Display order</label>
                <input id="sr-order" className="a-input" type="number" min={0} defaultValue="0" />
                <span className="a-hint">Lower numbers appear first.</span>
              </div>
              <div className="a-field">
                <label>{'\u00A0'}</label>
                <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                  <label className="a-check"><input type="checkbox" id="sr-active" defaultChecked /> Active</label>
                  <label className="a-check"><input type="checkbox" id="sr-featured" /> Featured on homepage</label>
                </div>
              </div>
              <div className="a-field a-field-full">
                <label>Cover image</label>
                <div id="sr-image-picker"></div>
              </div>
              <div className="a-field a-field-full">
                <label htmlFor="sr-short">Short description</label>
                <textarea id="sr-short" className="a-textarea a-textarea-sm" rows={2} placeholder="1-2 sentence summary shown in listings"></textarea>
              </div>
              <div className="a-field a-field-full">
                <label htmlFor="sr-description">Description</label>
                <textarea id="sr-description" className="a-textarea" rows={3} placeholder="What this series is and where it is used"></textarea>
              </div>
              <div className="a-field a-field-full">
                <label htmlFor="sr-features">Features (one per line)</label>
                <textarea id="sr-features" className="a-textarea" rows={3} placeholder="Recyclable&#10;Lightweight&#10;Moisture resistant"></textarea>
              </div>
              <div className="a-field a-field-full">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label>Applications</label>
                  <button type="button" className="a-btn a-btn-sm" id="add-app">+ Add application</button>
                </div>
                <div id="sr-apps-container"></div>
              </div>
            </div>
          </div>

          {/* ======================= SIZES & VERSIONS ======================= */}
          <div className="a-tab-panel" id="tab-sizes">
            <div className="a-guide" style={{ marginBottom: 16 }}>
              <h4>Heights become sizes, versions are the products</h4>
              <p style={{ margin: 0 }}>Add height steps (e.g. 160 / 250 / 325 mm). Inside each size add the versions sold at that height (e.g. "Ribbed Bottom" with model code VPC-600). Photos belong to the exact version, so one version's images never leak onto another.</p>
            </div>
            <div className="a-var-head">
              <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Sizes (heights)</span>
              <button type="button" className="a-btn a-btn-sm a-btn-primary" id="add-size">+ Add size</button>
            </div>
            <div id="sr-sizes-container"></div>
            <p className="a-hint" style={{ marginTop: 6 }}>Add at least one size and one version inside it so the series has something to sell. Deactivate instead of deleting where possible.</p>
          </div>
        </div>

        <div id="form-error" className="a-tip a-tip-error" style={{ marginTop: 16, display: 'none' }} role="alert"></div>

        <div className="a-sticky-actions">
          <span className="a-hint" id="save-helper">Series, sizes, versions and photos are saved together.</span>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button type="submit" className="a-btn a-btn-primary" id="sr-submit">Save</button>
            <a href="/admin/series/" className="a-btn" id="cancel-link">Cancel</a>
          </div>
        </div>
      </form>
    </AdminShell>
  );
}
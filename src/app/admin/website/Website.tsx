'use client';

import { useEffect } from 'react';
import AdminShell from '@/components/admin/AdminShell';
import { gate, supabase, toast, publishSite } from '@/scripts/admin/core';

// Website Content — port of src/pages/admin/website/index.astro. Loads the
// homepage/about site_settings rows, then saves them back (with a publish
// trigger) exactly like the Astro script.
export default function Website() {
  useEffect(() => {
    void (async () => {
      if (!(await gate())) return;

      const formEl = document.getElementById('web-form') as HTMLFormElement;
      const loadingEl = document.getElementById('web-loading')!;
      const errorEl = document.getElementById('web-error');
      const submitBtn = document.getElementById('web-submit') as HTMLButtonElement;

      const whTag = document.getElementById('wh-tag') as HTMLInputElement;
      const whTitle = document.getElementById('wh-title') as HTMLInputElement;
      const whDesc = document.getElementById('wh-desc') as HTMLTextAreaElement;
      const whFeat = document.getElementById('wh-feat') as HTMLInputElement;
      const waDesc = document.getElementById('wa-desc') as HTMLTextAreaElement;
      
      // Image settings
      const logoUrl = document.getElementById('logo-url') as HTMLInputElement;
      const warehouseUrl = document.getElementById('warehouse-url') as HTMLInputElement;
      const heroImagesText = document.getElementById('hero-images') as HTMLTextAreaElement;

      function showError(msg: string) {
        if (errorEl) { errorEl.textContent = msg; errorEl.style.display = ''; }
      }

      const { data: rows } = await supabase.from('site_settings').select('key, value');
      const settings: Record<string, any> = {};
      (rows || []).forEach((r: any) => { settings[r.key] = r.value; });

      const h = settings.homepage || {};
      whTag.value = h.hero_tag ?? '';
      whTitle.value = h.hero_title ?? '';
      whDesc.value = h.hero_description ?? '';
      whFeat.value = h.featured_tagline ?? '';

      const a = settings.about || {};
      waDesc.value = a.description ?? '';

      // Load image settings
      const logo = settings.logo || {};
      logoUrl.value = logo.url ?? '';
      
      const siteImages = settings.site_images || {};
      warehouseUrl.value = siteImages.warehouse ?? '';
      
      const heroImages = settings.hero_images || {};
      const heroImagesList = Array.isArray(heroImages.images) ? heroImages.images : [];
      heroImagesText.value = heroImagesList.join('\n');

      loadingEl.remove();
      formEl.style.display = '';

      formEl?.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (errorEl) errorEl.style.display = 'none';
        submitBtn?.setAttribute('disabled', '');
        submitBtn.textContent = 'Saving…';

        const homepageValue = {
          hero_tag: whTag.value.trim() || null,
          hero_title: whTitle.value.trim() || null,
          hero_description: whDesc.value.trim() || null,
          featured_tagline: whFeat.value.trim() || null
        };

        // The public page no longer renders mission/vision/why-choose-us, but
        // keep any stored values so older content is not destroyed on save.
        const existingAbout = (settings.about || {}) as {
          mission?: string | null;
          vision?: string | null;
          why_choose_us?: string[];
        };
        const aboutValue = {
          description: waDesc.value.trim() || null,
          mission: existingAbout.mission ?? null,
          vision: existingAbout.vision ?? null,
          why_choose_us: Array.isArray(existingAbout.why_choose_us) ? existingAbout.why_choose_us : []
        };

        // Image settings values
        const logoValue = {
          url: logoUrl.value.trim() || null
        };
        
        const siteImagesValue = {
          warehouse: warehouseUrl.value.trim() || null
        };
        
        const heroImagesValue = {
          images: heroImagesText.value.split('\n').map(l => l.trim()).filter(Boolean)
        };

        const { error: err1 } = await supabase.from('site_settings').upsert({ key: 'homepage', value: homepageValue, updated_at: new Date().toISOString() }, { onConflict: 'key' });
        const { error: err2 } = await supabase.from('site_settings').upsert({ key: 'about', value: aboutValue, updated_at: new Date().toISOString() }, { onConflict: 'key' });
        const { error: err3 } = await supabase.from('site_settings').upsert({ key: 'logo', value: logoValue, updated_at: new Date().toISOString() }, { onConflict: 'key' });
        const { error: err4 } = await supabase.from('site_settings').upsert({ key: 'site_images', value: siteImagesValue, updated_at: new Date().toISOString() }, { onConflict: 'key' });
        const { error: err5 } = await supabase.from('site_settings').upsert({ key: 'hero_images', value: heroImagesValue, updated_at: new Date().toISOString() }, { onConflict: 'key' });

        submitBtn?.removeAttribute('disabled');
        submitBtn.textContent = 'Save changes';

        const err = err1 || err2 || err3 || err4 || err5;
        if (err) { showError(err.message); return; }
        toast('Website content updated.', 'success');
        publishSite();
      });
    })();
  }, []);

  return (
    <AdminShell title="Website Content" current="website">
      <div className="a-page-head">
        <h2>Website Content</h2>
      </div>

      <div id="web-loading" className="a-inline-loading" style={{ padding: 40 }}>
        <div className="a-spinner"></div>
      </div>

      <form id="web-form" noValidate style={{ display: 'none' }} className="a-form-page">
        <div className="a-card">
          <div className="a-card-head">
            <h2>Homepage Hero</h2>
          </div>
          <div className="a-card-body">
            <div className="a-form-grid">
              <div className="a-field">
                <label htmlFor="wh-tag">Tagline</label>
                <input id="wh-tag" className="a-input" placeholder="e.g. Trusted Since 1992" />
              </div>
              <div className="a-field">
                <label htmlFor="wh-title">Title (shown after tagline)</label>
                <input id="wh-title" className="a-input" placeholder="e.g. Vinayak Plastics" />
              </div>
              <div className="a-field a-field-full">
                <label htmlFor="wh-desc">Description</label>
                <textarea id="wh-desc" className="a-textarea" rows={3} placeholder="1-2 sentence hero description"></textarea>
              </div>
              <div className="a-field a-field-full">
                <label htmlFor="wh-feat">Featured section tagline</label>
                <input id="wh-feat" className="a-input" placeholder="e.g. Featured Products" />
              </div>
            </div>
          </div>
        </div>

        <div className="a-card">
          <div className="a-card-head">
            <h2>About Page</h2>
          </div>
          <div className="a-card-body">
            <div className="a-form-grid">
              <div className="a-field a-field-full">
                <label htmlFor="wa-desc">Company description</label>
                <textarea id="wa-desc" className="a-textarea" rows={3} placeholder="Brief company description"></textarea>
              </div>
            </div>
          </div>
        </div>

        <div className="a-card">
          <div className="a-card-head">
            <h2>Images &amp; Media</h2>
            <p>
              Paste a full image URL for each field below. Each field shows exactly <strong>where</strong> that image appears on your website.
              Leave any field blank to keep the built-in default image.
            </p>
          </div>
          <div className="a-card-body">
            <div className="a-form-grid">

              {/* ── Logo ── */}
              <div className="a-field a-field-full">
                <label htmlFor="logo-url">Company Logo</label>
                {/* location badges */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 600, padding: '2px 8px', borderRadius: 99, background: 'var(--a-accent-soft, #e8f0fe)', color: 'var(--a-accent, #1a73e8)', border: '1px solid var(--a-accent, #1a73e8)' }}>
                    📌 Top navigation bar (header)
                  </span>
                  <span style={{ fontSize: '0.72rem', fontWeight: 600, padding: '2px 8px', borderRadius: 99, background: 'var(--a-accent-soft, #e8f0fe)', color: 'var(--a-accent, #1a73e8)', border: '1px solid var(--a-accent, #1a73e8)' }}>
                    📌 Footer
                  </span>
                  <span style={{ fontSize: '0.72rem', fontWeight: 600, padding: '2px 8px', borderRadius: 99, background: 'var(--a-accent-soft, #e8f0fe)', color: 'var(--a-accent, #1a73e8)', border: '1px solid var(--a-accent, #1a73e8)' }}>
                    📌 Admin sidebar
                  </span>
                </div>
                <input id="logo-url" className="a-input" placeholder="https://your-project.supabase.co/storage/v1/object/public/..." />
                <span className="a-hint">Leave blank to keep the default Vinayak Plastics logo.</span>
              </div>

              {/* ── Warehouse / About photo ── */}
              <div className="a-field a-field-full">
                <label htmlFor="warehouse-url">Warehouse / Factory Photo</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 600, padding: '2px 8px', borderRadius: 99, background: '#fef3c7', color: '#92400e', border: '1px solid #f59e0b' }}>
                    📌 Homepage — "About us" section (right-side image)
                  </span>
                  <span style={{ fontSize: '0.72rem', fontWeight: 600, padding: '2px 8px', borderRadius: 99, background: '#fef3c7', color: '#92400e', border: '1px solid #f59e0b' }}>
                    📌 About page — banner photo
                  </span>
                </div>
                <input id="warehouse-url" className="a-input" placeholder="https://your-project.supabase.co/storage/v1/object/public/..." />
                <span className="a-hint">Leave blank to keep the default warehouse interior photo.</span>
              </div>

              {/* ── Hero carousel ── */}
              <div className="a-field a-field-full">
                <label htmlFor="hero-images">Hero Carousel Slides (one URL per line, up to 4)</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 600, padding: '2px 8px', borderRadius: 99, background: '#f0fdf4', color: '#166534', border: '1px solid #22c55e' }}>
                    📌 Homepage — full-width hero slideshow (top of the page)
                  </span>
                </div>
                <textarea id="hero-images" className="a-textarea" rows={6} placeholder={"https://…/slide1.jpg\nhttps://…/slide2.jpg\nhttps://…/slide3.jpg\nhttps://…/slide4.jpg"}></textarea>
                <span className="a-hint">Line 1 = Slide 1, Line 2 = Slide 2, etc. Leave blank to keep the 4 built-in hero images.</span>
              </div>

            </div>
          </div>
        </div>

        <div id="web-error" className="a-tip a-tip-error" style={{ marginTop: 16, display: 'none' }} role="alert"></div>

        <div className="a-sticky-actions">
          <span className="a-hint">Changes go live on the website as soon as you save.</span>
          <button type="submit" className="a-btn a-btn-primary" id="web-submit">Save changes</button>
        </div>
      </form>
    </AdminShell>
  );
}
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
      const waMission = document.getElementById('wa-mission') as HTMLTextAreaElement;
      const waVision = document.getElementById('wa-vision') as HTMLTextAreaElement;
      const waWhy = document.getElementById('wa-why') as HTMLTextAreaElement;

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
      waMission.value = a.mission ?? '';
      waVision.value = a.vision ?? '';
      waWhy.value = Array.isArray(a.why_choose_us) ? a.why_choose_us.join('\n') : (a.why_choose_us ?? '');

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

        const aboutValue = {
          description: waDesc.value.trim() || null,
          mission: waMission.value.trim() || null,
          vision: waVision.value.trim() || null,
          why_choose_us: waWhy.value.split('\n').map(l => l.trim()).filter(Boolean)
        };

        const { error: err1 } = await supabase.from('site_settings').upsert({ key: 'homepage', value: homepageValue, updated_at: new Date().toISOString() }, { onConflict: 'key' });
        const { error: err2 } = await supabase.from('site_settings').upsert({ key: 'about', value: aboutValue, updated_at: new Date().toISOString() }, { onConflict: 'key' });

        submitBtn?.removeAttribute('disabled');
        submitBtn.textContent = 'Save changes';

        const err = err1 || err2;
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
              <div className="a-field">
                <label htmlFor="wa-mission">Mission</label>
                <textarea id="wa-mission" className="a-textarea a-textarea-sm" rows={2}></textarea>
              </div>
              <div className="a-field">
                <label htmlFor="wa-vision">Vision</label>
                <textarea id="wa-vision" className="a-textarea a-textarea-sm" rows={2}></textarea>
              </div>
              <div className="a-field a-field-full">
                <label htmlFor="wa-why">Why Choose Us (one point per line)</label>
                <textarea id="wa-why" className="a-textarea" rows={4} placeholder="ISO 9001 certified\nFast turnaround\nEco-friendly materials"></textarea>
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
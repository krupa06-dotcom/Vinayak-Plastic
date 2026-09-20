'use client';

import { useEffect } from 'react';
import AdminShell from '@/components/admin/AdminShell';
import { gate, supabase, toast, publishSite } from '@/scripts/admin/core';

// Settings — port of src/pages/admin/settings/index.astro. Loads the
// contact/social site_settings rows, then saves them back (with a publish
// trigger) exactly like the Astro script.
export default function Settings() {
  useEffect(() => {
    void (async () => {
      if (!(await gate())) return;

      const formEl = document.getElementById('set-form') as HTMLFormElement;
      const loadingEl = document.getElementById('set-loading')!;
      const errorEl = document.getElementById('set-error');
      const submitBtn = document.getElementById('set-submit') as HTMLButtonElement;

      const phoneEl = document.getElementById('sc-phone') as HTMLInputElement;
      const emailEl = document.getElementById('sc-email') as HTMLInputElement;
      const addressEl = document.getElementById('sc-address') as HTMLTextAreaElement;
      const whatsappEl = document.getElementById('sc-whatsapp') as HTMLInputElement;
      const fbEl = document.getElementById('ss-fb') as HTMLInputElement;
      const liEl = document.getElementById('ss-li') as HTMLInputElement;
      const igEl = document.getElementById('ss-ig') as HTMLInputElement;
      const ytEl = document.getElementById('ss-yt') as HTMLInputElement;

      function showError(msg: string) {
        if (errorEl) { errorEl.textContent = msg; errorEl.style.display = ''; }
      }

      const { data: rows } = await supabase.from('site_settings').select('key, value');
      const settings: Record<string, any> = {};
      (rows || []).forEach((r: any) => { settings[r.key] = r.value; });

      const c = settings.contact || {};
      phoneEl.value = c.phone ?? '';
      emailEl.value = c.email ?? '';
      addressEl.value = c.address ?? '';
      whatsappEl.value = c.whatsapp ?? '';

      const s = settings.social || {};
      fbEl.value = s.facebook ?? '';
      liEl.value = s.linkedin ?? '';
      igEl.value = s.instagram ?? '';
      ytEl.value = s.youtube ?? '';

      loadingEl.remove();
      formEl.style.display = '';

      formEl?.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (errorEl) errorEl.style.display = 'none';
        submitBtn?.setAttribute('disabled', '');
        submitBtn.textContent = 'Saving…';

        const contactValue = {
          phone: phoneEl.value.trim() || null,
          email: emailEl.value.trim() || null,
          address: addressEl.value.trim() || null,
          whatsapp: whatsappEl.value.trim() || null
        };

        const socialValue = {
          facebook: fbEl.value.trim() || null,
          linkedin: liEl.value.trim() || null,
          instagram: igEl.value.trim() || null,
          youtube: ytEl.value.trim() || null
        };

        const { error: err1 } = await supabase.from('site_settings').upsert({ key: 'contact', value: contactValue, updated_at: new Date().toISOString() }, { onConflict: 'key' });
        const { error: err2 } = await supabase.from('site_settings').upsert({ key: 'social', value: socialValue, updated_at: new Date().toISOString() }, { onConflict: 'key' });

        submitBtn?.removeAttribute('disabled');
        submitBtn.textContent = 'Save settings';

        const err = err1 || err2;
        if (err) { showError(err.message); return; }
        toast('Settings saved.', 'success');
        publishSite();
      });
    })();
  }, []);

  return (
    <AdminShell title="Settings" current="settings">
      <div className="a-page-head">
        <h2>Settings</h2>
      </div>

      <div id="set-loading" className="a-inline-loading" style={{ padding: 40 }}>
        <div className="a-spinner"></div>
      </div>

      <form id="set-form" noValidate style={{ display: 'none' }} className="a-form-page">
        <div className="a-card">
          <div className="a-card-head">
            <h2>Contact Information</h2>
          </div>
          <div className="a-card-body">
            <div className="a-tip a-tip-info" style={{ marginBottom: 18 }}>
              These details appear in the website footer, contact page, and inquiry emails.
            </div>
            <div className="a-form-grid">
              <div className="a-field">
                <label htmlFor="sc-phone">Phone number</label>
                <input id="sc-phone" className="a-input" placeholder="+91 99795 54635" />
              </div>
              <div className="a-field">
                <label htmlFor="sc-email">Email address</label>
                <input id="sc-email" className="a-input" type="email" placeholder="info@vinayakplastics.com" />
              </div>
              <div className="a-field a-field-full">
                <label htmlFor="sc-address">Address</label>
                <textarea id="sc-address" className="a-textarea a-textarea-sm" rows={2} placeholder="Full address shown on contact page"></textarea>
              </div>
              <div className="a-field">
                <label htmlFor="sc-whatsapp">WhatsApp number</label>
                <input id="sc-whatsapp" className="a-input" placeholder="+91 99795 54635" />
                <span className="a-hint">Used on the contact page CTA button.</span>
              </div>
            </div>
          </div>
        </div>

        <div className="a-card">
          <div className="a-card-head">
            <h2>Social Links</h2>
          </div>
          <div className="a-card-body">
            <div className="a-form-grid">
              <div className="a-field">
                <label htmlFor="ss-fb">Facebook URL</label>
                <input id="ss-fb" className="a-input" type="url" placeholder="https://facebook.com/..." />
              </div>
              <div className="a-field">
                <label htmlFor="ss-li">LinkedIn URL</label>
                <input id="ss-li" className="a-input" type="url" placeholder="https://linkedin.com/..." />
              </div>
              <div className="a-field">
                <label htmlFor="ss-ig">Instagram URL</label>
                <input id="ss-ig" className="a-input" type="url" placeholder="https://instagram.com/..." />
              </div>
              <div className="a-field">
                <label htmlFor="ss-yt">YouTube URL</label>
                <input id="ss-yt" className="a-input" type="url" placeholder="https://youtube.com/..." />
              </div>
            </div>
          </div>
        </div>

        <div id="set-error" className="a-tip a-tip-error" style={{ marginTop: 16, display: 'none' }} role="alert"></div>

        <div className="a-sticky-actions">
          <span className="a-hint">These details appear in the footer and contact page.</span>
          <button type="submit" className="a-btn a-btn-primary" id="set-submit">Save settings</button>
        </div>
      </form>
    </AdminShell>
  );
}
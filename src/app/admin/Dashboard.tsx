'use client';

import { useEffect } from 'react';
import AdminShell from '@/components/admin/AdminShell';
import { gate, supabase, esc, fmtDateTime, statusBadge, showError, showEmpty } from '@/scripts/admin/core';

// Dashboard — port of src/pages/admin/index.astro. The heavy lifting is DOM
// rendering started after gate() resolves, exactly like the Astro script.
export default function Dashboard() {
  useEffect(() => {
    void (async () => {
      if (!(await gate())) return;

      const statsEl = document.getElementById('dashboard-stats');
      const healthEl = document.getElementById('dashboard-health');
      const attentionEl = document.getElementById('dashboard-attention');
      const enquiriesEl = document.getElementById('dashboard-enquiries');

      const [newEnqRes, { data: subCats }, { data: cats }, { data: variants }, { data: subImgs }, { data: catVars }] =
        await Promise.all([
          supabase.from('enquiries').select('id', { count: 'exact', head: true }).eq('status', 'new'),
          supabase.from('sub_categories').select('id, category_id, name, is_active, is_featured, image_url'),
          supabase.from('categories').select('id, name, display_order').order('display_order'),
          supabase.from('sub_category_variants').select('sub_category_id, is_active'),
          supabase.from('sub_category_images').select('sub_category_id'),
          supabase.from('category_variants').select('category_id, is_active')
        ]);

      const subs = (subCats || []) as any[];
      const catsData = (cats || []) as any[];
      const varsBySub = new Map<string, number>();
      (variants || []).forEach((v: any) => {
        if (v.is_active) varsBySub.set(v.sub_category_id, (varsBySub.get(v.sub_category_id) || 0) + 1);
      });
      const varsByCat = new Map<string, number>();
      (catVars || []).forEach((v: any) => {
        if (v.is_active) varsByCat.set(v.category_id, (varsByCat.get(v.category_id) || 0) + 1);
      });
      const imgsSubIds = new Set((subImgs || []).map((i: any) => i.sub_category_id));

      const activeCount = subs.filter((s) => s.is_active).length;
      const sizeCount = (id: string) => varsBySub.get(id) || 0;
      const noSizes = subs.filter((s) => !sizeCount(s.id));
      const noImages = subs.filter((s) => !s.image_url && !imgsSubIds.has(s.id));

      const svg = (paths: string) =>
        `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
      const STAT_ICONS: Record<string, string> = {
        products: svg('<path d="M21 8l-9-5-9 5v8l9 5 9-5V8z"/><path d="M3 8l9 5 9-5"/><path d="M12 13v8"/>'),
        active: svg('<path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/>'),
        subs: svg('<path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>'),
        cats: svg('<path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 12l10 5 10-5"/><path d="M2 17l10 5 10-5"/>'),
        enquiries: svg('<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>'),
        missing: svg('<path d="M10.3 3.85L1.8 18a2 2 0 001.72 3h16.94a2 2 0 001.72-3L13.7 3.85a2 2 0 00-3.4 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>')
      };

      const stats = [
        { num: subs.length, label: 'Products / Ranges', icon: 'products' },
        { num: activeCount, label: 'Active', icon: 'active' },
        { num: noSizes.length, label: 'Missing sizes/shapes', icon: 'missing' },
        { num: catsData.length, label: 'Categories', icon: 'cats' },
        { num: newEnqRes.count ?? 0, label: 'New enquiries', icon: 'enquiries' }
      ];

      if (statsEl) {
        statsEl.innerHTML = stats
          .map(
            (s) => `
          <div class="a-stat">
            <div class="a-stat-icon">${STAT_ICONS[s.icon]}</div>
            <div>
              <div class="a-stat-num">${s.num}</div>
              <div class="a-stat-label">${esc(s.label)}</div>
            </div>
          </div>
        `
          )
          .join('');
      }

      if (healthEl) {
        const rows = catsData.map((c) => {
          const catSubs = subs.filter((s) => s.category_id === c.id);
          const sizeTotal = catSubs.reduce((n, s) => n + sizeCount(s.id), 0) + (varsByCat.get(c.id) || 0);
          return { name: c.name, subs: catSubs.length, sizes: sizeTotal };
        });
        if (!rows.length) {
          healthEl.innerHTML = '<li style="color:var(--a-faint);justify-content:flex-start;">No categories yet.</li>';
        } else {
          healthEl.innerHTML = rows
            .map(
              (r) => `
            <li>
              <span><strong>${esc(r.name)}</strong> &middot; <span style="color:var(--a-muted);font-size:0.8rem;">${esc(r.subs)} sub-categor${r.subs === 1 ? 'y' : 'ies'}</span></span>
              <span class="a-chip ${r.sizes ? 'a-chip-ok' : ''}">${r.sizes} size${r.sizes === 1 ? '' : 's'}</span>
            </li>`
            )
            .join('');
        }
      }

      if (attentionEl) {
        const bothMissing = noSizes.length + noImages.length;
        if (!bothMissing) {
          showEmpty(attentionEl, 'Everything looks complete', 'Every product range has photos and size/shape details.');
        } else {
          const list = (n: any[], label: string, max = 4) =>
            n.length
              ? `<li><strong>${n.length} ${label}</strong><div style="font-size:0.8rem;color:var(--a-muted);">${n
                  .slice(0, max)
                  .map((p) => esc(p.name))
                  .join(', ')}${n.length > max ? ` +${n.length - max} more` : ''}</div></li>`
              : '';
          attentionEl.innerHTML = `<ul class="a-health" style="margin:0;padding:0;list-style:none;">
            ${list(noSizes, 'ranges missing sizes & shapes')}
            ${list(noImages, 'ranges missing photos')}
          </ul>`;
        }
      }

      if (enquiriesEl) {
        const { data, error } = await supabase
          .from('enquiries')
          .select('id, name, company, status, created_at')
          .order('created_at', { ascending: false })
          .limit(5);

        if (error) {
          showError(enquiriesEl, error.message);
          return;
        }

        if (!data?.length) {
          showEmpty(enquiriesEl, 'No enquiries yet', 'Enquiries from the public website will appear here.');
          return;
        }

        enquiriesEl.innerHTML = `
          <ul class="a-health" style="margin:0;padding:0;list-style:none;">
            ${data
              .map(
                (r) => `
              <li>
                <span><strong>${esc(r.name)}</strong>${r.company ? ` · <span style="color:var(--a-muted);font-size:0.82rem;">${esc(r.company)}</span>` : ''}<br>
                <span style="font-size:0.76rem;color:var(--a-faint);">${fmtDateTime(r.created_at)}</span></span>
                ${statusBadge(r.status)}
              </li>`
              )
              .join('')}
          </ul>`;
      }
    })();
  }, []);

  return (
    <AdminShell title="Dashboard" current="dashboard">
      <div className="a-page-head">
        <h2>Overview</h2>
        <a href="/admin/products/edit/" className="a-btn a-btn-primary">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14" />
            <path d="M5 12h14" />
          </svg>
          Add Product
        </a>
      </div>

      <div id="dashboard-stats" className="a-stats"></div>

      <div className="a-dash-grid">
        <div>
          <div className="a-card">
            <div className="a-card-head">
              <h2>Catalogue Health</h2>
              <a href="/admin/products/" className="a-btn a-btn-sm">
                Manage products
              </a>
            </div>
            <div className="a-card-body">
              <ul className="a-health" id="dashboard-health">
                <li>
                  <span className="a-inline-loading" style={{ padding: 0 }}>
                    <div className="a-spinner"></div>
                  </span>
                </li>
              </ul>
            </div>
          </div>

          <div className="a-card">
            <div className="a-card-head">
              <h2>Needs Attention</h2>
            </div>
            <div className="a-card-body" id="dashboard-attention">
              <div className="a-inline-loading">
                <div className="a-spinner"></div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="a-card">
            <div className="a-card-head">
              <h2>Recent Enquiries</h2>
              <a href="/admin/enquiries/" className="a-btn a-btn-sm">
                View all
              </a>
            </div>
            <div className="a-card-body" id="dashboard-enquiries">
              <div className="a-inline-loading">
                <div className="a-spinner"></div>
              </div>
            </div>
          </div>

          <div className="a-card">
            <div className="a-card-head">
              <h2>Shortcuts</h2>
            </div>
            <div className="a-card-body">
              <div className="a-quick">
                <a href="/admin/products/">
                  <span>Manage products</span>
                  <span>→</span>
                </a>
                <a href="/admin/products/edit/">
                  <span>New product</span>
                  <span>→</span>
                </a>
                <a href="/admin/categories/">
                  <span>Manage categories</span>
                  <span>→</span>
                </a>
                <a href="/admin/media/">
                  <span>Upload images</span>
                  <span>→</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import AdminShell from '@/components/admin/AdminShell';
import { gate, supabase, esc, fmtDateTime, statusBadge, showError, showEmpty } from '@/scripts/admin/core';

export default function Dashboard() {
  useEffect(() => {
    void (async () => {
      if (!(await gate())) return;

      const statsEl = document.getElementById('dashboard-stats');
      const healthEl = document.getElementById('dashboard-health');
      const attentionEl = document.getElementById('dashboard-attention');
      const enquiriesEl = document.getElementById('dashboard-enquiries');

      const [newEnqRes, catsRes, seriesRes, sizesRes, versionsRes] =
        await Promise.all([
          supabase.from('enquiries').select('id', { count: 'exact', head: true }).eq('status', 'new'),
          supabase.from('categories').select('id, name, display_order').order('display_order'),
          supabase.from('series').select('id, category_id, name, is_active, image_url').order('display_order'),
          supabase.from('size_variants').select('id, series_id, height, is_active'),
          supabase.from('product_variants').select('id, size_variant_id, is_active')
        ]);

      const cats = (catsRes.data || []) as any[];
      const seriesList = (seriesRes.data || []) as any[];
      const sizes = (sizesRes.data || []) as any[];
      const versions = (versionsRes.data || []) as any[];

      const sizesBySeries = new Map<string, number>();
      sizes.forEach((s) => {
        if (s.is_active) sizesBySeries.set(s.series_id, (sizesBySeries.get(s.series_id) || 0) + 1);
      });

      const sizeIdsBySeries = new Map<string, Set<string>>();
      sizes.forEach((s) => {
        if (!sizeIdsBySeries.has(s.series_id)) sizeIdsBySeries.set(s.series_id, new Set());
        sizeIdsBySeries.get(s.series_id)!.add(s.id);
      });

      const versionsBySize = new Map<string, number>();
      versions.forEach((v) => {
        if (v.is_active) versionsBySize.set(v.size_variant_id, (versionsBySize.get(v.size_variant_id) || 0) + 1);
      });

      const activeSeriesCount = seriesList.filter((s) => s.is_active).length;
      const noSizes = seriesList.filter((s) => !sizesBySeries.get(s.id));
      const noImages = seriesList.filter((s) => !s.image_url);

      const svg = (paths: string) =>
        `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
      const STAT_ICONS: Record<string, string> = {
        products: svg('<path d="M21 8l-9-5-9 5v8l9 5 9-5V8z"/><path d="M3 8l9 5 9-5"/><path d="M12 13v8"/>'),
        active: svg('<path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/>'),
        sizes: svg('<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>'),
        cats: svg('<path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 12l10 5 10-5"/><path d="M2 17l10 5 10-5"/>'),
        enquiries: svg('<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>'),
        models: svg('<polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>')
      };

      const stats = [
        { num: seriesList.length, label: 'Product Series', icon: 'products' },
        { num: activeSeriesCount, label: 'Active Series', icon: 'active' },
        { num: sizes.length, label: 'Height Sizes', icon: 'sizes' },
        { num: versions.length, label: 'Product Models', icon: 'models' },
        { num: cats.length, label: 'Categories', icon: 'cats' },
        { num: newEnqRes.count ?? 0, label: 'New Enquiries', icon: 'enquiries' }
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
        const rows = cats.map((c) => {
          const catSeries = seriesList.filter((s) => s.category_id === c.id);
          const sizeCount = catSeries.reduce((sum, s) => sum + (sizesBySeries.get(s.id) || 0), 0);
          return { name: c.name, seriesCount: catSeries.length, sizesCount: sizeCount };
        });

        if (!rows.length) {
          healthEl.innerHTML = '<li style="color:var(--a-faint);justify-content:flex-start;">No categories created yet.</li>';
        } else {
          healthEl.innerHTML = rows
            .map(
              (r) => `
            <li>
              <span><strong>${esc(r.name)}</strong> &middot; <span style="color:var(--a-muted);font-size:0.82rem;">${r.seriesCount} series</span></span>
              <span class="a-chip ${r.sizesCount ? 'a-chip-ok' : ''}">${r.sizesCount} size${r.sizesCount === 1 ? '' : 's'}</span>
            </li>`
            )
            .join('');
        }
      }

      if (attentionEl) {
        const issuesCount = noSizes.length + noImages.length;
        if (!issuesCount) {
          showEmpty(attentionEl, 'Everything looks complete', 'Every series has photos and size/height variants configured.');
        } else {
          const list = (n: any[], label: string, max = 4) =>
            n.length
              ? `<li><strong>${n.length} ${label}</strong><div style="font-size:0.8rem;color:var(--a-muted);margin-top:2px;">${n
                  .slice(0, max)
                  .map((p) => esc(p.name))
                  .join(', ')}${n.length > max ? ` +${n.length - max} more` : ''}</div></li>`
              : '';
          attentionEl.innerHTML = `<ul class="a-health" style="margin:0;padding:0;list-style:none;">
            ${list(noSizes, 'series missing sizes / heights')}
            ${list(noImages, 'series missing cover photos')}
          </ul>`;
        }
      }

      if (enquiriesEl) {
        const { data, error } = await supabase
          .from('enquiries')
          .select('id, name, company, email, phone, status, created_at')
          .order('created_at', { ascending: false })
          .limit(5);

        if (error) {
          showError(enquiriesEl, error.message);
          return;
        }

        if (!data?.length) {
          showEmpty(enquiriesEl, 'No enquiries yet', 'Customer inquiries submitted via the website will show up here.');
          return;
        }

        enquiriesEl.innerHTML = `
          <ul class="a-health" style="margin:0;padding:0;list-style:none;">
            ${data
              .map(
                (r) => `
              <li>
                <span>
                  <strong>${esc(r.name)}</strong>${r.company ? ` &middot; <span style="color:var(--a-muted);font-size:0.82rem;">${esc(r.company)}</span>` : ''}<br>
                  <span style="font-size:0.76rem;color:var(--a-faint);">${fmtDateTime(r.created_at)}</span>
                </span>
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
        <div>
          <h2>Dashboard Overview</h2>
          <p style={{ margin: '4px 0 0', fontSize: '0.88rem', color: 'var(--a-muted)' }}>
            Welcome to the Vinayak Plastics control center. Manage your product catalog and inquiries in real-time.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <a href="/admin/series/edit/?series=new" className="a-btn a-btn-primary">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
              <path d="M12 5v14" />
              <path d="M5 12h14" />
            </svg>
            + Add Series
          </a>
          <a href="/admin/categories/" className="a-btn">
            + Add Category
          </a>
        </div>
      </div>

      <div id="dashboard-stats" className="a-stats"></div>

      <div className="a-dash-grid">
        <div>
          <div className="a-card">
            <div className="a-card-head">
              <h2>Catalogue Summary by Category</h2>
              <a href="/admin/series/" className="a-btn a-btn-sm">
                View All Series
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

          <div className="a-card" style={{ marginTop: 20 }}>
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
                View All
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
              <h2>Quick Actions</h2>
            </div>
            <div className="a-card-body">
              <div className="a-quick">
                <Link href="/admin/series/">
                  <span>Products &amp; Series</span>
                  <span>→</span>
                </Link>
                <Link href="/admin/series/edit/?series=new">
                  <span>+ New Series / Product</span>
                  <span>→</span>
                </Link>
                <Link href="/admin/categories/">
                  <span>Manage Categories</span>
                  <span>→</span>
                </Link>
                <Link href="/admin/enquiries/">
                  <span>Customer Enquiries</span>
                  <span>→</span>
                </Link>
                <Link href="/admin/website/">
                  <span>Website Hero &amp; Content</span>
                  <span>→</span>
                </Link>
                <Link href="/admin/settings/">
                  <span>Contact &amp; Social Settings</span>
                  <span>→</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
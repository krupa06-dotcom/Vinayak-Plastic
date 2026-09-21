'use client';

import { Fragment, useEffect, type ReactNode } from 'react';
import Link from 'next/link';
import { ensureAdmin } from '@/scripts/admin/core';

export type AdminNavKey =
  | 'dashboard'
  | 'categories'
  | 'products'
  | 'enquiries'
  | 'website'
  | 'media'
  | 'settings';

type AdminShellProps = {
  title: string;
  current: AdminNavKey;
  children: ReactNode;
};

const navItems: Array<{
  key: AdminNavKey;
  href: string;
  label: string;
  svg: string;
  section: string;
}> = [
  { key: 'dashboard', href: '/admin/', label: 'Dashboard', svg: '<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>', section: '' },
  { key: 'categories', href: '/admin/categories/', label: 'Categories', svg: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"/>', section: 'Catalogue' },
  { key: 'products', href: '/admin/products/', label: 'Products', svg: '<path d="M21 8l-9-5-9 5v8l9 5 9-5V8z"/><path d="M3 8l9 5 9-5"/><path d="M12 13v8"/>', section: '' },
  { key: 'enquiries', href: '/admin/enquiries/', label: 'Enquiries', svg: '<path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>', section: 'Sales' },
  { key: 'website', href: '/admin/website/', label: 'Website Content', svg: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a15 15 0 010 18"/><path d="M12 3a15 15 0 000 18"/>', section: 'Website' },
  { key: 'media', href: '/admin/media/', label: 'Media Library', svg: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>', section: '' },
  { key: 'settings', href: '/admin/settings/', label: 'Settings', svg: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z"/>', section: '' }
];

// Admin shell — the sidebar + topbar that wraps every protected page. Mirrors
// AdminLayout.astro. Runs ensureAdmin() once on mount: redirects to the login
// page when there is no valid @vinayakplastics.com session, fills the user
// bar, and wires the mobile burger + logout button.
export default function AdminShell({ title, current, children }: AdminShellProps) {
  useEffect(() => {
    void ensureAdmin();
  }, []);

  return (
    <div className="admin-shell" id="admin-shell">
      <div className="admin-sidebar-backdrop" data-menu-close></div>

      <aside className="admin-sidebar">
        <div className="admin-logo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/vp-logo.png" alt="Vinayak Plastics logo" />
          <div className="admin-logo-text">
            <strong>Vinayak Plastics</strong>
            <span>Admin Panel</span>
          </div>
        </div>

        <nav className="admin-nav" aria-label="Admin navigation">
          {navItems.map((item, i) => {
            const prev = i > 0 ? navItems[i - 1] : null;
            return (
              <Fragment key={item.key}>
                {item.section && prev?.section !== item.section && (
                  <div className="admin-nav-section">{item.section}</div>
                )}
                <Link
                  href={item.href}
                  className={current === item.key ? 'admin-nav-link is-active' : 'admin-nav-link'}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: item.svg }} />
                  {item.label}
                </Link>
              </Fragment>
            );
          })}
        </nav>

        <div className="admin-sidebar-foot">
          <a href="/" className="admin-nav-link" target="_blank" rel="noopener">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><path d="M15 3h6v6"/><path d="M10 14L21 3"/></svg>
            View Website
          </a>
          <button type="button" className="admin-nav-link" id="admin-logout" style={{ width: '100%', background: 'none', border: 'none', textAlign: 'left' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></svg>
            Logout
          </button>
        </div>
      </aside>

      <div className="admin-main">
        <header className="admin-topbar">
          <button className="admin-burger" id="admin-burger" aria-label="Toggle menu" aria-expanded="false">
            <span></span><span></span><span></span>
          </button>
          <h1>{title}</h1>
          <div className="admin-topbar-user">
            <span id="admin-user-email" style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>&nbsp;</span>
            <span className="admin-avatar" id="admin-avatar">VP</span>
          </div>
        </header>

        <main className="admin-content">
          {children}
        </main>
      </div>
    </div>
  );
}
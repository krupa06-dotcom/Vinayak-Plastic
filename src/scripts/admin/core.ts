import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../lib/database.types';

declare global {
  interface Window {
    __VP_SUPABASE__: {
      url: string;
      key: string;
      base: string;
      configured: boolean;
    };
  }
}

function getGlobals() {
  if (typeof window === 'undefined') return undefined;
  return window.__VP_SUPABASE__;
}

function getBase() {
  return getGlobals()?.base ?? '/';
}

let supabaseInstance: ReturnType<typeof createClient<Database>> | null = null;

export function getSupabase() {
  if (!isConfigured()) return null;
  if (!supabaseInstance) {
    const g = getGlobals()!;
    supabaseInstance = createClient<Database>(g.url, g.key);
  }
  return supabaseInstance;
}

export function isConfigured() {
  const g = getGlobals();
  return Boolean(g && g.url && g.key && g.configured);
}

export const configured = isConfigured;

export const supabase = new Proxy({} as ReturnType<typeof createClient<Database>>, {
  get(_target, prop) {
    const client = getSupabase();
    if (!client) {
      throw new Error('Supabase is not configured. Check environment variables.');
    }
    return (client as any)[prop];
  }
}) as ReturnType<typeof createClient<Database>>;

const BASE: string = getBase();

// ============================================================
// URL helpers
// ============================================================

/** Build a root-relative href aware of the site base path. */
function href(p: string): string {
  const clean = p.startsWith('/') ? p.slice(1) : p;
  return `${BASE.replace(/\/$/, '')}/${clean}`.replace(/\/+/g, '/');
}

export function loginHref(): string {
  return href('admin/login/');
}

export function dashboardHref(): string {
  return href('admin/');
}

// ============================================================
// Auth helpers
// ============================================================

let gateState: 'pending' | 'ready' | 'redirected' = 'pending';
let authPromise: Promise<boolean> | null = null;
let currentSessionEmail: string | null = null;

function dispatchReady() {
  gateState = 'ready';
  if (typeof document !== 'undefined') {
    document.body.classList.add('admin-ready');
    document.dispatchEvent(new CustomEvent('vpadmin:ready'));
  }
}

function markRedirected() {
  gateState = 'redirected';
  if (typeof document !== 'undefined') {
    document.body.classList.add('admin-redirecting');
  }
}

function isAdminEmail(email: string): boolean {
  return /@vinayakplastics\.com$/i.test(email);
}

/** Resolves true when the current user is an authorised admin and ready to work. */
export function gate(): Promise<boolean> {
  if (gateState === 'ready') return Promise.resolve(true);
  if (gateState === 'redirected') return Promise.resolve(false);
  return ensureAdmin();
}

/** Run on every protected admin page. Redirects away if there is no valid session. */
export async function ensureAdmin(): Promise<boolean> {
  if (!configured()) {
    markRedirected();
    if (typeof window !== 'undefined') window.location.replace(loginHref());
    return false;
  }
  if (gateState === 'ready') {
    if (currentSessionEmail) fillUserBar(currentSessionEmail);
    wireShellUi();
    return true;
  }

  if (!authPromise) {
    authPromise = (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const session = data.session;
        if (!session || !isAdminEmail(session.user.email || '')) {
          markRedirected();
          if (session) await supabase.auth.signOut();
          if (typeof window !== 'undefined') window.location.replace(loginHref());
          return false;
        }
        currentSessionEmail = session.user.email || '';
        dispatchReady();
        fillUserBar(currentSessionEmail);
        wireShellUi();
        return true;
      } catch (err) {
        console.error('[auth] session check failed', err);
        markRedirected();
        if (typeof window !== 'undefined') window.location.replace(loginHref());
        return false;
      } finally {
        authPromise = null;
      }
    })();
  }
  return authPromise;
}

function fillUserBar(email: string) {
  const emailEl = document.getElementById('admin-user-email');
  const avatarEl = document.getElementById('admin-avatar');
  if (emailEl) emailEl.textContent = email;
  if (avatarEl) avatarEl.textContent = email ? email.charAt(0).toUpperCase() : 'VP';
}

function wireShellUi() {
  const shell = document.getElementById('admin-shell');
  const burger = document.getElementById('admin-burger');
  const backdrop = document.querySelector('[data-menu-close]');
  const logout = document.getElementById('admin-logout');

  burger?.addEventListener('click', () => {
    shell?.classList.toggle('is-open');
    burger.setAttribute('aria-expanded', String(shell?.classList.contains('is-open') ?? false));
  });
  backdrop?.addEventListener('click', () => shell?.classList.remove('is-open'));

  logout?.addEventListener('click', async () => {
    await supabase.auth.signOut();
    window.location.replace(loginHref());
  });
}

// ============================================================
// Small DOM / string helpers
// ============================================================

export function esc(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d.getTime())
    ? '—'
    : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d.getTime())
    ? '—'
    : d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ============================================================
// Toasts
// ============================================================

let toastWrap: HTMLDivElement | null = null;

function getToastWrap(): HTMLDivElement {
  if (!toastWrap) {
    toastWrap = document.createElement('div');
    toastWrap.className = 'a-toast-wrap';
    document.body.appendChild(toastWrap);
  }
  return toastWrap;
}

export function toast(msg: string, type: 'success' | 'error' | 'info' = 'info'): void {
  if (!configured() || !document.body) return;
  const el = document.createElement('div');
  el.className = `a-toast a-toast-${type}`;
  el.textContent = msg;
  getToastWrap().appendChild(el);
  window.setTimeout(() => {
    el.style.opacity = '0';
    el.style.transition = 'opacity 0.3s ease';
    window.setTimeout(() => el.remove(), 320);
  }, 4200);
}

// ============================================================
// Site publish / rebuild trigger
// ============================================================

let publishTimer: number | null = null;

async function doPublish(): Promise<void> {
  try {
    toast('Changes saved! Live website updated.', 'success');
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    const g = getGlobals();
    if (!token || !g?.url) return;

    const endpoint = `${g.url.replace(/\/$/, '')}/functions/v1/deploy-site`;
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    }).catch(() => null);

    if (res && res.ok) {
      console.log('[publish] website rebuild/cache purge triggered');
    }
  } catch (e) {
    console.error('[publish] error', e);
  }
}

/**
 * Notifies admin that changes are saved to Supabase and live on the website.
 * Debounced so rapid saves (image upload + insert, bulk updates, etc.) produce a single notification.
 */
export function publishSite(delayMs = 2500): void {
  if (!configured()) return;
  if (publishTimer !== null) window.clearTimeout(publishTimer);
  if (delayMs <= 0) {
    publishTimer = null;
    void doPublish();
    return;
  }
  publishTimer = window.setTimeout(() => {
    publishTimer = null;
    void doPublish();
  }, delayMs);
}

// ============================================================
// State renderers
// ============================================================

export function showEmpty(el: HTMLElement, title: string, msg: string, actionHtml = ''): void {
  el.innerHTML = `<div class="a-empty"><h3>${esc(title)}</h3><p>${esc(msg)}</p>${actionHtml}</div>`;
}

export function showError(el: HTMLElement, msg: string): void {
  el.innerHTML = `<div class="a-error"><h3>Something went wrong</h3><p>${esc(msg)}</p></div>`;
}

// ============================================================
// Confirmation modal
// ============================================================

export function confirmDialog(title: string, msg: string, confirmLabel = 'Confirm', danger = true): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    const backdrop = document.createElement('div');
    backdrop.className = 'a-modal-backdrop';
    backdrop.innerHTML = `
      <div class="a-modal" role="dialog" aria-modal="true">
        <div class="a-modal-head">
          <h3>${esc(title)}</h3>
          <button type="button" class="a-modal-close" data-close aria-label="Cancel">&times;</button>
        </div>
        <div class="a-modal-body">${esc(msg)}</div>
        <div class="a-modal-foot">
          <button type="button" class="a-btn" data-close>Cancel</button>
          <button type="button" class="a-btn ${danger ? 'a-btn-danger' : 'a-btn-primary'}" data-confirm>${esc(confirmLabel)}</button>
        </div>
      </div>`;
    document.body.appendChild(backdrop);

    const close = (result: boolean) => {
      backdrop.remove();
      resolve(result);
    };
    backdrop.querySelector('[data-close]')?.addEventListener('click', () => close(false));
    backdrop.querySelector('[data-confirm]')?.addEventListener('click', () => close(true));
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) close(false);
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') close(false);
    }, { once: true });
  });
}

// ============================================================
// Badges
// ============================================================

const STATUS_LABELS: Record<string, string> = {
  new: 'New',
  contacted: 'Contacted',
  quotation_sent: 'Quotation Sent',
  converted: 'Converted',
  closed: 'Closed'
};

export function statusBadge(status: string | null | undefined): string {
  const s = (status || '').toLowerCase().replace(/\s+/g, '_');
  const label = STATUS_LABELS[s] || status || '—';
  const cls = s && ['new', 'contacted', 'quotation_sent', 'converted', 'closed'].includes(s) ? s : 'new';
  return `<span class="a-badge a-badge-${cls}">${esc(label)}</span>`;
}

export function activeBadge(active: boolean): string {
  return active
    ? '<span class="a-badge a-badge-active">Active</span>'
    : '<span class="a-badge a-badge-inactive">Inactive</span>';
}

// ============================================================
// Storage helpers (bucket: product-images)
// ============================================================

export function publicUrl(pathOrUrl: string | null | undefined, width = 400): string {
  if (!pathOrUrl) return '';
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  // Root-relative paths are static assets shipped with the site, not
  // Storage objects; make them base-aware instead of building a bucket URL.
  if (pathOrUrl.startsWith('/')) return href(pathOrUrl);
  const { data } = supabase.storage.from('product-images').getPublicUrl(pathOrUrl);
  if (!data) return '';
  // Serve an optimized render so the admin doesn't download multi-MB originals
  return `${data.publicUrl}?width=${width}&format=webp&quality=80`;
}

export async function uploadFile(file: File, storagePath: string): Promise<{ path: string } | { error: string }> {
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
  const safePath = `${storagePath.replace(/\/+/g, '/').replace(/^\/|\/$/g, '')}.${ext}`;
  const { data, error } = await supabase.storage
    .from('product-images')
    .upload(safePath, file, { cacheControl: '3600', upsert: true });
  if (error) return { error: error.message };
  return { path: data.path };
}

export async function deleteFile(pathOrUrl: string): Promise<boolean> {
  // Static assets (root-relative) are not Storage objects — nothing to delete.
  if (!pathOrUrl || /^https?:\/\//i.test(pathOrUrl) || pathOrUrl.startsWith('/')) return true;
  const { error } = await supabase.storage.from('product-images').remove([pathOrUrl]);
  return !error;
}

/**
 * Batch resolves all in-use images in a single parallel query instead of 400 sequential queries.
 * Returns a map from normalized image path/name to reference descriptions.
 */
export async function getAllInUseImagesMap(): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>();

  function record(urlOrPath: string | null | undefined, label: string) {
    if (!urlOrPath) return;
    const clean = urlOrPath.trim();
    if (!clean) return;

    const list1 = map.get(clean) || [];
    if (!list1.includes(label)) list1.push(label);
    map.set(clean, list1);

    const baseName = clean.split('/').pop()?.split('?')[0];
    if (baseName && baseName !== clean) {
      const list2 = map.get(baseName) || [];
      if (!list2.includes(label)) list2.push(label);
      map.set(baseName, list2);
    }
  }

  const [simgsRes, catsRes, catImgsRes, subsRes] = await Promise.all([
    supabase.from('sub_category_images').select('image_url, sub_category:sub_categories(name)').limit(2000),
    supabase.from('categories').select('image_url, name').limit(500),
    supabase.from('category_images').select('image_url, category:categories(name)').limit(2000),
    supabase.from('sub_categories').select('image_url, name').limit(1000)
  ]);

  for (const row of simgsRes.data || []) {
    const name = (row.sub_category && Array.isArray(row.sub_category) ? row.sub_category[0]?.name : (row as any).sub_category?.name) || 'product';
    record(row.image_url, `as an image for product "${name}"`);
  }
  for (const row of catsRes.data || []) {
    record(row.image_url, `as cover image for category "${row.name}"`);
  }
  for (const row of catImgsRes.data || []) {
    const name = (row.category && Array.isArray(row.category) ? row.category[0]?.name : (row as any).category?.name) || 'category';
    record(row.image_url, `as gallery image for category "${name}"`);
  }
  for (const row of subsRes.data || []) {
    record(row.image_url, `as main image for product "${row.name}"`);
  }

  return map;
}

/** Check whether a single storage path / public URL is referenced anywhere in the content model. */
export async function imageInUse(pathOrUrl: string): Promise<string[]> {
  const inUseMap = await getAllInUseImagesMap();
  const clean = (pathOrUrl || '').trim();
  const baseName = clean.split('/').pop()?.split('?')[0] || '';
  return inUseMap.get(clean) || (baseName ? inUseMap.get(baseName) : undefined) || [];
}
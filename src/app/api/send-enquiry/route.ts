import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { supabase, hasSupabase } from '@/lib/supabase';

// ============================================================
// Config
// ============================================================

const TO_EMAIL = process.env.ENQUIRY_TO_EMAIL || 'Vinayakplast2020@gmail.com';
// Resend only delivers from onboarding@resend.dev until a sending domain is
// verified. Set ENQUIRY_FROM_EMAIL once your domain (e.g. vinayakplastic.vercel.app
// is not a domain — use a domain you own) is added & verified in Resend.
const FROM_EMAIL = process.env.ENQUIRY_FROM_EMAIL || 'Vinayak Plastics <onboarding@resend.dev>';

const MAX_FIELD = {
  name: 255,
  company: 255,
  phone: 20,
  email: 255,
  quantity: 100,
  message: 4000,
  label: 120
} as const;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PHONE_RE = /^[0-9+\-() ]{7,20}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ============================================================
// Best-effort in-memory rate limiting + duplicate suppression
// (Per-instance on serverless — good enough to blunt spam bursts;
//  the DB insert remains the source of truth.)
// ============================================================

const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5;
const hits = new Map<string, { count: number; resetAt: number }>();
const recent = new Map<string, number>(); // dedupe key -> timestamp

function clientIp(req: NextRequest): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return req.headers.get('x-real-ip') || 'unknown';
}

function rateLimited(ip: string): boolean {
  const now = Date.now();
  // Opportunistic cleanup so the map doesn't grow unbounded.
  if (hits.size > 1000) {
    for (const [k, v] of hits) if (v.resetAt <= now) hits.delete(k);
  }
  const entry = hits.get(ip);
  if (!entry || entry.resetAt <= now) {
    hits.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_PER_WINDOW;
}

function isDuplicate(ip: string, fingerprint: string): boolean {
  const key = `${ip}:${fingerprint}`;
  const now = Date.now();
  if (recent.size > 500) {
    for (const [k, t] of recent) if (now - t > WINDOW_MS) recent.delete(k);
  }
  const seenAt = recent.get(key);
  if (seenAt && now - seenAt < WINDOW_MS) return true;
  recent.set(key, now);
  return false;
}

// ============================================================
// Validation / sanitisation
// ============================================================

function str(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null;
  const v = value.trim().replace(/\s+/g, ' ');
  if (!v) return null;
  return v.length > max ? v.slice(0, max) : v;
}

/** Multi-line text (message) — keep newlines, just cap the length. */
function text(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null;
  const v = value.replace(/\r\n/g, '\n').trim();
  if (!v) return null;
  return v.length > max ? v.slice(0, max) : v;
}

function uuidOrNull(value: unknown): string | null {
  const v = str(value, 64);
  return v && UUID_RE.test(v) ? v : null;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

interface EnquiryInput {
  name: string;
  company: string | null;
  phone: string;
  email: string | null;
  quantity: string | null;
  message: string | null;
  subCategoryId: string | null;
  productVariantId: string | null;
  category: string | null;
  series: string | null;
  size: string | null;
  version: string | null;
  modelCode: string | null;
}

function validate(body: unknown): { ok: true; value: EnquiryInput } | { ok: false; error: string } {
  if (!body || typeof body !== 'object') {
    return { ok: false, error: 'Invalid request body.' };
  }
  const b = body as Record<string, unknown>;

  // Honeypot — real users never fill this hidden field.
  if (str(b.website, 200)) {
    return { ok: false, error: 'Spam detected.' };
  }

  const name = str(b.name, MAX_FIELD.name);
  const phone = str(b.phone, MAX_FIELD.phone);
  const email = str(b.email, MAX_FIELD.email);
  const company = str(b.company, MAX_FIELD.company);
  const quantity = str(b.quantity, MAX_FIELD.quantity);
  const message = text(b.message, MAX_FIELD.message);

  if (!name || name.length < 2) {
    return { ok: false, error: 'Please enter your name (at least 2 characters).' };
  }
  if (!phone || !PHONE_RE.test(phone)) {
    return { ok: false, error: 'Please enter a valid phone number (digits, +, -, spaces only).' };
  }
  if (email && !EMAIL_RE.test(email)) {
    return { ok: false, error: 'Please enter a valid email address.' };
  }
  if (message && message.length > MAX_FIELD.message) {
    return { ok: false, error: 'Message is too long.' };
  }

  return {
    ok: true,
    value: {
      name,
      company,
      phone,
      email,
      quantity,
      message,
      subCategoryId: uuidOrNull(b.sub_category_id),
      productVariantId: uuidOrNull(b.product_variant_id),
      category: str(b.category, MAX_FIELD.label),
      series: str(b.series, MAX_FIELD.label),
      size: str(b.size, MAX_FIELD.label),
      version: str(b.version, MAX_FIELD.label),
      modelCode: str(b.modelCode, MAX_FIELD.label)
    }
  };
}

// ============================================================
// Email template
// ============================================================

function productName(v: EnquiryInput): string | null {
  const parts = [v.category, v.series, v.version].filter(Boolean);
  if (parts.length) {
    const base = parts.join(' — ');
    return v.modelCode ? `${base} (${v.modelCode})` : base;
  }
  if (v.modelCode) return v.modelCode;
  return null;
}

function buildHtml(v: EnquiryInput): string {
  const e = escapeHtml;
  const product = productName(v);

  const productRows: Array<[string, string]> = [
    ['Category', v.category],
    ['Series', v.series],
    ['Size', v.size],
    ['Version', v.version],
    ['Model Code', v.modelCode]
  ].filter((r): r is [string, string] => Boolean(r[1]));

  const customerRows = [
    ['Name', v.name],
    ['Company', v.company],
    ['Phone', v.phone, `tel:${v.phone.replace(/[^\d+]/g, '')}`],
    ['Email', v.email, `mailto:${v.email}`],
    ['Quantity', v.quantity]
  ] as Array<[string, string | null, string?]>;

  const rowHtml = ([label, value, href]: [string, string | null, string?]) =>
    `<tr>
      <td style="padding:8px 16px 8px 0;color:#6b7280;font-size:13px;white-space:nowrap;vertical-align:top;">${e(label)}</td>
      <td style="padding:8px 0;color:#111827;font-size:14px;font-weight:600;">
        ${href && value ? `<a href="${e(href)}" style="color:#034e94;text-decoration:none;">${e(value)}</a>` : value ? e(value) : '—'}
      </td>
    </tr>`;

  return `<!DOCTYPE html>
<html lang="en">
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #e5e7eb;">
        <tr>
          <td style="background:#034e94;padding:20px 28px;">
            <h1 style="margin:0;color:#ffffff;font-size:18px;line-height:1.3;">New Product Enquiry</h1>
            <p style="margin:4px 0 0;color:#cfe3f6;font-size:13px;">Vinayak Plastics — website enquiry form</p>
          </td>
        </tr>
        <tr><td style="padding:24px 28px 8px;">
          <p style="margin:0 0 12px;color:#374151;font-size:14px;line-height:1.5;">
            A new enquiry has been submitted${product ? ` for <strong style="color:#034e94;">${e(product)}</strong>` : ''}.
          </p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
            ${customerRows.map(rowHtml).join('')}
          </table>
        </td></tr>
        ${productRows.length ? `<tr><td style="padding:12px 28px 4px;">
          <p style="margin:0 0 8px;color:#6b7280;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;">Product of Interest</p>
          <table role="presentation" cellpadding="0" cellspacing="0" style="background:#eaf3fb;border-left:3px solid #034e94;border-radius:4px;padding:4px 16px 4px 12px;">
            ${productRows.map(([k, val]) => `<tr>
              <td style="padding:6px 16px 6px 0;color:#6b7280;font-size:13px;white-space:nowrap;">${e(k)}</td>
              <td style="padding:6px 0;color:#111827;font-size:14px;font-weight:600;">${e(val)}</td>
            </tr>`).join('')}
          </table>
        </td></tr>` : ''}
        ${v.message ? `<tr><td style="padding:16px 28px 4px;">
          <p style="margin:0 0 6px;color:#6b7280;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;">Message</p>
          <p style="margin:0;color:#374151;font-size:14px;line-height:1.6;white-space:pre-wrap;">${e(v.message)}</p>
        </td></tr>` : ''}
        <tr><td style="padding:20px 28px 24px;">
          <p style="margin:16px 0 0;color:#9ca3af;font-size:12px;">
            Received ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })} IST &nbsp;·&nbsp; Reply directly to this email to contact the customer.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function buildSubject(v: EnquiryInput): string {
  const product = productName(v);
  if (product) return `New Product Enquiry – ${product}`;
  return `New Website Enquiry – ${v.name}`;
}

// ============================================================
// Route handler
// ============================================================

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return NextResponse.json({ success: false, error: 'Unsupported content type.' }, { status: 415 });
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid JSON body.' }, { status: 400 });
    }

    const ip = clientIp(req);
    if (rateLimited(ip)) {
      return NextResponse.json(
        { success: false, error: 'Too many enquiries. Please try again later.' },
        { status: 429 }
      );
    }

    const parsed = validate(body);
    if (!parsed.ok) {
      return NextResponse.json({ success: false, error: parsed.error }, { status: 400 });
    }
    const v = parsed.value;

    // Suppress rapid-fire duplicates (double click, resubmit on flaky network).
    const fingerprint = [v.name, v.phone, v.email, v.message, v.modelCode].join('|');
    if (isDuplicate(ip, fingerprint)) {
      // Pretend success — the first submission is already being processed.
      return NextResponse.json({ success: true, duplicate: true });
    }

    // ── 1. Persist to Supabase (source of truth) ────────────────────────────
    if (!hasSupabase()) {
      console.error('[send-enquiry] Supabase is not configured — cannot store enquiry.');
      return NextResponse.json(
        { success: false, error: 'Enquiry service is temporarily unavailable. Please call or email us directly.' },
        { status: 503 }
      );
    }

    // RLS grants public INSERT but not SELECT on enquiries, so we insert with
    // return=minimal (no .select()) — the row is the source of truth; the
    // client doesn't need the generated id.
    const { error: dbError } = await supabase.from('enquiries').insert({
      name: v.name,
      company: v.company,
      phone: v.phone,
      email: v.email,
      quantity: v.quantity,
      message: v.message,
      sub_category_id: v.subCategoryId,
      product_variant_id: v.productVariantId,
      status: 'new'
    });

    if (dbError) {
      console.error('[send-enquiry] Supabase insert failed:', dbError.message);
      return NextResponse.json(
        { success: false, error: 'Could not save your enquiry. Please try again.' },
        { status: 500 }
      );
    }

    // ── 2. Email notification (non-fatal if it fails) ───────────────────────
    // The enquiry is already saved; a failed email must NOT surface an error
    // to the customer (that would invite resubmits and duplicate records).
    // It is logged here and the record stays in Supabase for manual follow-up.
    const apiKey = process.env.RESEND_API_KEY;
    let emailSent = false;
    if (!apiKey) {
      console.error('[send-enquiry] RESEND_API_KEY is not set — email skipped.');
    } else {
      try {
        const resend = new Resend(apiKey);
        const { error } = await resend.emails.send({
          from: FROM_EMAIL,
          to: TO_EMAIL,
          replyTo: v.email || undefined,
          subject: buildSubject(v),
          html: buildHtml(v)
        });
        if (error) {
          console.error('[send-enquiry] Resend error:', error.message);
        } else {
          emailSent = true;
        }
      } catch (err) {
        console.error('[send-enquiry] Email exception:', err);
      }
    }

    return NextResponse.json({ success: true, emailSent });
  } catch (err) {
    console.error('[send-enquiry] Unexpected error:', err);
    return NextResponse.json(
      { success: false, error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}

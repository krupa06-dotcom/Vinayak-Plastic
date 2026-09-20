// Central company contact details — single source of truth.
// Update these values once and they propagate across the whole site.

// Strips formatting and guarantees a single Indian country code (91) prefix
// regardless of how the number was stored.
export function normalizedNumber(value: string): string {
  const digits = value.replace(/\D/g, '');
  return digits.startsWith('91') ? digits : `91${digits}`;
}

export const CONTACT = {
  company: 'Vinayak Plastics',
  phone: '9558747862',
  phoneDisplay: '+91 95587 47862',
  phoneHref: 'tel:+919558747862',
  whatsappHref: 'https://wa.me/919558747862',
  email: 'Vinayakplast2020@gmail.com',
  emailHref: 'mailto:Vinayakplast2020@gmail.com',
  address: 'Vinayak Plastics, BS Kapoor Roadlines, Near Darjipura, Golden Chokdi, Vadodara 390019'
} as const;

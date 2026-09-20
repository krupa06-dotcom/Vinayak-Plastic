import type { Metadata, Viewport } from 'next';
import { SITE_URL } from '@/lib/site';

const DEFAULT_DESCRIPTION =
  'Vinayak Plastics supplies material handling & packaging products — plastic crates, plastic pallets, waste bins / dustbins and hand pallet trucks — for warehouses, dairy, municipal and commercial buyers across India.';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Vinayak Plastics — Material Handling & Packaging Products',
    template: '%s | Vinayak Plastics'
  },
  description: DEFAULT_DESCRIPTION,
  robots: { index: true, follow: true },
  icons: {
    icon: '/favicon.svg',
    apple: '/images/vp-logo.png'
  },
  openGraph: {
    type: 'website',
    siteName: 'Vinayak Plastics',
    locale: 'en_IN',
    title: 'Vinayak Plastics — Material Handling & Packaging Products',
    description: DEFAULT_DESCRIPTION,
    images: [{ url: '/images/vp-logo.png' }]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Vinayak Plastics — Material Handling & Packaging Products',
    description: DEFAULT_DESCRIPTION,
    images: ['/images/vp-logo.png']
  }
};

export const viewport: Viewport = {
  themeColor: '#0A1A33'
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta charSet="UTF-8" />
      </head>
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html: "document.documentElement.classList.add('js');"
          }}
        />
        <a href="#main" className="skip-link">
          Skip to main content
        </a>
        {children}
      </body>
    </html>
  );
}
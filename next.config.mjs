/** @type {import('next').NextConfig} */
const nextConfig = {
  // Fully static output — default export directory `out`, which Vercel's
  // Next.js preset and GitHub Pages both serve directly.
  output: 'export',
  images: {
    // Remote/db images are served as-is; no runtime image optimization for export
    unoptimized: true
  }
};

export default nextConfig;
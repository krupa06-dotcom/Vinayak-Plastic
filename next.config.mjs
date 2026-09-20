/** @type {import('next').NextConfig} */
const nextConfig = {
  // Fully static output (matches the old Astro `output: 'static'` deployment)
  output: 'export',
  // Keep `dist` as the build output so the existing deploy workflow is unchanged
  distDir: 'dist',
  images: {
    // Remote/db images are served as-is; no runtime image optimization for export
    unoptimized: true
  }
};

export default nextConfig;
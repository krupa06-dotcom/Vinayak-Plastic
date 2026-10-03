/** @type {import('next').NextConfig} */
const nextConfig = {
  // No 'output: export' - using server-side rendering for dynamic admin features
  images: {
    // Remote/db images are served as-is; unoptimized allows external storage URLs without custom loaders
    unoptimized: true
  },
  // Enable ISR (Incremental Static Regeneration) for better performance
  experimental: {
    staleTimes: {
      dynamic: 30, // 30 seconds for dynamic pages
      static: 180, // 3 minutes for static pages
    },
  },
};

export default nextConfig;
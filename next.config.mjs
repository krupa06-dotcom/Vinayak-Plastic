/** @type {import('next').NextConfig} */
const nextConfig = {
  // Keep the local preview clean: the floating Next.js dev badge otherwise shows
  // as a black pill over the bottom-left corner of every page.
  devIndicators: false,
  images: {
    // Admin uploads are served straight from Supabase Storage, so no loader needed.
    unoptimized: true
  },
  experimental: {
    staleTimes: {
      dynamic: 0,
      static: 30
    }
  }
};

export default nextConfig;
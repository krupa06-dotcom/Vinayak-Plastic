/** @type {import('next').NextConfig} */
const nextConfig = {
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
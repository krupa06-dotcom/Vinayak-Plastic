/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Remote/db images are served as-is; unoptimized allows external storage URLs without custom loaders
    unoptimized: true
  }
};

export default nextConfig;
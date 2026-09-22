/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: {
    // Remote/db images are served as-is; unoptimized allows external storage URLs without custom loaders
    unoptimized: true
  }
};

export default nextConfig;
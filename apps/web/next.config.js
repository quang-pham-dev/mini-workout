/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: '.next-build',
  images: {
    remotePatterns: [{ protocol: 'https', hostname: 'images.unsplash.com' }],
  },
};

export default nextConfig;

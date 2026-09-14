import type { NextConfig } from 'next';

/** @type {import('next').NextConfig} */
const nextConfig: NextConfig = {
  distDir: '.next',
  reactCompiler: true,
  cacheComponents: true,
  partialPrefetching: true,
  typedRoutes: true,
  images: {
    remotePatterns: [{ protocol: 'https', hostname: 'images.unsplash.com' }],
  },
  experimental: {
    instantInsights: {
      validationLevel: 'manual-warning',
    },
    exposeTestingApiInProductionBuild: true,
    useOffline: true,
    inlineCss: true,
  },
};

export default nextConfig;

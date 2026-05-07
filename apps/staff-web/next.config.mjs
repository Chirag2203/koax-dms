/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@dms/ui', '@dms/tokens', '@dms/types', '@dms/mocks'],

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
    ],
  },

  experimental: {
    // lucide-react: tree-shakes icon imports (Next.js default behaviour for
    // packages without proper package.json exports).
    // @dms/ui: monorepo package — optimizePackageImports ensures only used
    // exports are included in each route's chunk rather than pulling the full
    // package barrel on every page.
    optimizePackageImports: ['lucide-react', '@dms/ui'],
  },
};

export default nextConfig;

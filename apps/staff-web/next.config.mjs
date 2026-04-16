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
    optimizePackageImports: ['lucide-react'],
  },
};

export default nextConfig;

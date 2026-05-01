import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  async redirects() {
    return [
      {
        source: '/v3/:path*',
        destination: '/',
        permanent: true,
      },
    ]
  },
};

export default nextConfig;

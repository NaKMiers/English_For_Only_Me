import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        hostname: 'i.ytimg.com',
        pathname: '/vi/**',
        protocol: 'https',
      },
      {
        hostname: 'img.youtube.com',
        pathname: '/vi/**',
        protocol: 'https',
      },
    ],
  },
}

export default nextConfig

import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Auto-memoizes components and hooks, so a keystroke in practice or a recall
  // answer re-renders only what changed. Opt a component out with 'use no memo'.
  reactCompiler: true,
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

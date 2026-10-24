import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Auto-memoizes components and hooks, so a keystroke in practice or a recall
  // answer re-renders only what changed. Opt a component out with 'use no memo'.
  reactCompiler: true,

  // Grammar v2 routes. Bookmarks and history entries land on the new path
  // instead of a 404.
  async redirects() {
    return [
      { destination: '/grammar', permanent: true, source: '/grammar/points' },
      {
        destination: '/grammar',
        permanent: true,
        source: '/grammar/points/:path*',
      },
      { destination: '/grammar', permanent: true, source: '/grammar/archive' },
      { destination: '/admin', permanent: true, source: '/admin/grammar' },
      {
        destination: '/admin',
        permanent: true,
        source: '/admin/grammar/:path*',
      },
    ]
  },
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

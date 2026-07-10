import NextAuth from 'next-auth'

import { authConfig } from '@/lib/auth/auth.config'

/**
 * Next.js 16 proxy (the renamed middleware convention). Built from the edge-safe
 * authConfig (no Mongoose), scoped to /admin by the matcher, where the
 * `authorized` callback requires the admin role. Defense-in-depth:
 * (admin)/layout.tsx and each admin route service re-check server-side.
 */
const { auth } = NextAuth(authConfig)

export default auth

export const config = {
  matcher: ['/admin/:path*'],
}

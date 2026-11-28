import NextAuth from 'next-auth'

import { authConfig } from '@/lib/auth/auth.config'

/**
 * Next.js 16 proxy (the renamed middleware convention). Every page needs a
 * signed-in Google account except the login page; the `authorized` callback
 * in authConfig decides, and a visitor without a session is sent to
 * `/auth/login?callbackUrl=<page>`. Built from the DB-free authConfig: the
 * proxy runs on every navigation and prefetch, so it only decodes the session
 * JWT and never touches the database. Defense in depth: every page also calls
 * requirePageUser(), and API routes (not matched here) call requireUser().
 */
const { auth } = NextAuth(authConfig)

export default auth

export const config = {
  // Every path except API routes, Next build output and public files (any
  // last segment with an extension: /buddy/ready.png, /favicon.ico, fonts).
  // A literal, as the proxy docs require for static analysis.
  matcher: ['/((?!api|_next/static|_next/image|.*\\.[a-zA-Z0-9]+$).*)'],
}

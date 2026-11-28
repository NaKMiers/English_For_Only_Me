import type { NextAuthConfig } from 'next-auth'
import Google from 'next-auth/providers/google'

import { ENV_KEYS, getOptionalServerEnv } from '@/constants/environments'

import { LOGIN_PATH } from './callbackUrl'
import { resolveRole } from './roles'

/** Where a signed-in learner who is not an admin goes from /admin. */
export const NON_ADMIN_HOME = '/dictation'

interface AuthorizedInput {
  auth: { user?: { role?: string } | null } | null
  request: { nextUrl: { href: string; pathname: string } }
}

/**
 * The proxy's gate for every page (the API routes check for themselves). The
 * login page is the only public page; /admin needs the admin role; every other
 * page needs a session. `false` sends the visitor to `pages.signIn` with the
 * page as `callbackUrl`. A signed-in learner without the admin role is sent
 * home instead: back to the login page they would bounce straight to /admin.
 */
export function authorizePage({
  auth,
  request: { nextUrl },
}: AuthorizedInput): boolean | Response {
  if (nextUrl.pathname === LOGIN_PATH) return true

  const user = auth?.user

  if (!user) return false

  if (nextUrl.pathname === '/admin' || nextUrl.pathname.startsWith('/admin/'))
    return user.role === 'admin'
      ? true
      : Response.redirect(new URL(NON_ADMIN_HOME, nextUrl.href))

  return true
}

/**
 * The DB-free half of the Auth.js config: providers, pages, the proxy gate
 * and token / session shaping. The proxy (`src/proxy.ts`) builds its Auth.js
 * instance from this alone because it runs on every navigation and prefetch,
 * so it may only decode the session JWT, never touch the database (Next
 * authentication guide, "Optimistic checks with Proxy"). The user provisioning
 * that needs Mongoose lives in `auth.ts`.
 */
export const authConfig = {
  providers: [
    Google({
      clientId: getOptionalServerEnv(ENV_KEYS.googleClientId) ?? '',
      clientSecret: getOptionalServerEnv(ENV_KEYS.googleClientSecret) ?? '',
    }),
  ],
  // The Auth.js default sign-in and error pages never show: both land on our
  // one login page, which reads `?error=` itself.
  pages: { signIn: LOGIN_PATH, error: LOGIN_PATH },
  callbacks: {
    authorized: authorizePage,
    // Keep role in sync from the allowlist on every token pass (DB-free).
    // The jwt callback in auth.ts additionally stamps the user id.
    jwt({ token }) {
      token.role = resolveRole(token.email)

      return token
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = (token.uid as string | undefined) ?? session.user.id
        session.user.role = resolveRole(token.email)
      }

      return session
    },
  },
} satisfies NextAuthConfig

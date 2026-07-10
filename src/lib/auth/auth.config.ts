import type { NextAuthConfig } from 'next-auth'
import Google from 'next-auth/providers/google'

import { ENV_KEYS, getOptionalServerEnv } from '@/constants/environments'

import { resolveRole } from './roles'

/**
 * Edge-safe Auth.js config: providers + token/session shaping + the /admin
 * authorization guard. Imports ONLY environments + roles (no Mongoose), so it
 * can run in `middleware.ts` on the edge runtime. The DB-touching user
 * provisioning lives in `auth.ts` (Node only) - see system-update-plan §2.2.
 */
export const authConfig = {
  providers: [
    Google({
      clientId: getOptionalServerEnv(ENV_KEYS.googleClientId) ?? '',
      clientSecret: getOptionalServerEnv(ENV_KEYS.googleClientSecret) ?? '',
    }),
  ],
  callbacks: {
    // Runs in middleware to protect /admin. Everything else is public
    // (public browsing per plan D4). Per-user API/data enforce auth
    // themselves via requireUser (R3), not here.
    authorized({ auth, request: { nextUrl } }) {
      if (!nextUrl.pathname.startsWith('/admin')) return true

      return auth?.user?.role === 'admin'
    },
    // Keep role in sync from the allowlist on every token pass (edge-safe).
    // The Node jwt callback in auth.ts additionally stamps the user id.
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

import NextAuth from 'next-auth'

import { resolveRole } from './roles'
import { authConfig } from './auth.config'
import { provisionUserOnSignIn } from './userProvisioning'

/**
 * Full Auth.js instance (Node runtime). Extends the edge-safe authConfig with a
 * jwt callback that provisions the Mongoose user on first sign-in and stamps its
 * ObjectId into the token. Imported by server components, route handlers, and
 * the /api/auth handler — never by middleware.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  session: { strategy: 'jwt' },
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user }) {
      // Initial sign-in: `user` is the Google profile. Upsert our user record
      // (and claim legacy data for OWNER_EMAIL) to get the canonical ObjectId.
      if (user?.email) {
        const { id } = await provisionUserOnSignIn({
          email: user.email,
          name: user.name,
          image: user.image,
          googleSub: token.sub ?? null,
        })

        token.uid = id
      }

      token.role = resolveRole(token.email)

      return token
    },
  },
})

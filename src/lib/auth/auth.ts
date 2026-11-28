import NextAuth from 'next-auth'

import { isEmailLocked } from './accountStatus'
import { authConfig } from './auth.config'
import { LOCKED_LOGIN_URL } from './callbackUrl'
import { resolveRole } from './roles'
import { provisionUserOnSignIn } from './userProvisioning'

/**
 * Full Auth.js instance. Extends the DB-free authConfig with a signIn
 * callback that refuses a locked account and a jwt callback that provisions
 * the Mongoose user on sign-in and stamps its ObjectId into the token. Imported by server components, route handlers, server actions
 * and the /api/auth handler, never by the proxy (which must not touch the
 * database on every navigation).
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  session: { strategy: 'jwt' },
  callbacks: {
    ...authConfig.callbacks,
    // A locked account cannot sign in again: Google says yes, we say no and
    // send it back to the login page with the locked notice.
    async signIn({ user }) {
      if (user.email && (await isEmailLocked(user.email)))
        return LOCKED_LOGIN_URL

      return true
    },
    async jwt({ token, user }) {
      // Initial sign-in: `user` is the Google profile. Upsert our user record
      // to get the canonical ObjectId used to scope per-user practice data.
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

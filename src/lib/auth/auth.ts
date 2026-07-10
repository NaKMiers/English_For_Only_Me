import NextAuth from 'next-auth'

import { mergeGuestDataIntoUser } from '@/modules/dictation/services/mergeGuestData'

import { clearGuestCookie, getGuestId } from './guestUser'
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
      // to get the canonical ObjectId used to scope per-user practice data.
      if (user?.email) {
        const { id } = await provisionUserOnSignIn({
          email: user.email,
          name: user.name,
          image: user.image,
          googleSub: token.sub ?? null,
        })

        token.uid = id

        // First sign-in: fold any anonymous practice done under the guest
        // cookie into this account. Best-effort — never let it block login.
        try {
          const guestId = await getGuestId()

          if (guestId) {
            await mergeGuestDataIntoUser(guestId, id)
            await clearGuestCookie()
          }
        } catch (error) {
          console.error('Failed to merge guest practice data on sign-in', error)
        }
      }

      token.role = resolveRole(token.email)

      return token
    },
  },
})

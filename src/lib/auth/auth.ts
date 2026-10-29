import NextAuth from 'next-auth'

import { mergeGuestDataIntoUser } from '@/modules/dictation/services/mergeGuestData'
import { mergeGrammarGuestData } from '@/modules/grammar/services/mergeGrammarGuestData'
import { mergeIeltsGuestData } from '@/modules/ielts/services/mergeIeltsGuestData'

import { clearGuestCookie, getGuestId } from './guestUser'
import { resolveRole } from './roles'
import { authConfig } from './auth.config'
import { provisionUserOnSignIn } from './userProvisioning'

/**
 * Full Auth.js instance (Node runtime). Extends the edge-safe authConfig with a
 * jwt callback that provisions the Mongoose user on first sign-in and stamps its
 * ObjectId into the token. Imported by server components, route handlers, and
 * the /api/auth handler - never by middleware.
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
        // cookie into this account. Best-effort - never let it block login.
        try {
          const guestId = await getGuestId()

          if (guestId) {
            await mergeGuestDataIntoUser(guestId, id)

            // If the grammar or IELTS merge fails, keep the guest cookie: the
            // guest's rows stay reachable and the next sign-in retries. The
            // dictation merge re-running then is a no-op (its rows moved).
            const grammarMerged = await mergeGrammarGuestData(guestId, id)
              .then(() => true)
              .catch(error => {
                console.error(
                  'Failed to merge guest grammar data on sign-in',
                  error
                )

                return false
              })

            const ieltsMerged = await mergeIeltsGuestData(guestId, id)
              .then(() => true)
              .catch(error => {
                console.error(
                  'Failed to merge guest IELTS data on sign-in',
                  error
                )

                return false
              })

            if (grammarMerged && ieltsMerged) await clearGuestCookie()
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

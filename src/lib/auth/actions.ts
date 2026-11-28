'use server'

import { signIn, signOut } from './auth'
import { LOGIN_PATH, safeCallbackUrl } from './callbackUrl'

/**
 * Account server actions. A 'use server' module, so client components import
 * these as references and the NextAuth / Mongoose chain never reaches the
 * browser bundle.
 */

/**
 * The login page's "Continue with Google". The page to return to comes from
 * the form, so it is checked again here: only a same-origin path survives.
 */
export async function signInAction(formData: FormData) {
  const raw = formData.get('callbackUrl')

  await signIn('google', {
    redirectTo: safeCallbackUrl(typeof raw === 'string' ? raw : null),
  })
}

export async function signOutAction() {
  await signOut({ redirectTo: LOGIN_PATH })
}

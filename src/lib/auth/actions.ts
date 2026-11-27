'use server'

import { signIn, signOut } from './auth'

/**
 * Account server actions for the topbar control. A 'use server' module, so
 * client components import these as references and the NextAuth / Mongoose
 * chain never reaches the browser bundle.
 */
export async function signInAction() {
  await signIn('google')
}

export async function signOutAction() {
  await signOut()
}

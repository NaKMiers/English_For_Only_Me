import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'

import { NON_ADMIN_HOME } from '@/lib/auth/auth.config'
import { requirePageUser } from '@/lib/auth/currentUser'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Server-side admin guard for every /admin page (defense in depth behind the
 * proxy). Signed out: the login page; signed-in non-admin: back to the
 * catalog.
 */
export default async function AdminLayout({
  children,
}: {
  children: ReactNode
}) {
  const user = await requirePageUser('/admin')

  if (user.role !== 'admin') redirect(NON_ADMIN_HOME)

  return children
}

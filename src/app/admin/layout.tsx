import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'

import { getOptionalUser } from '@/modules/dictation/services/getCurrentUser'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Server-side admin guard for every /admin page (defense-in-depth behind the
 * edge proxy). Anonymous → sign in; signed-in non-admin → back to the catalog.
 */
export default async function AdminLayout({
  children,
}: {
  children: ReactNode
}) {
  const user = await getOptionalUser()

  if (!user) redirect('/api/auth/signin?callbackUrl=/admin')
  if (user.role !== 'admin') redirect('/dictation')

  return children
}

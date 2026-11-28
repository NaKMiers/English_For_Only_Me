import { OutboxOwnerProvider } from '@/components/common/OutboxOwnerProvider'
import { toClientOwnerKey } from '@/lib/auth/clientOwnerKey'
import { requirePageUser } from '@/lib/auth/currentUser'

/**
 * Every learner page needs a session: the proxy sends signed-out visitors to
 * the login page, and this redirects too as defense in depth. Hands the
 * learner's client owner key (a hash of the user id, never the raw id) to the
 * client outbox so queued writes are stored per learner in this browser.
 * Reads only the session JWT: no database work, so it does not delay the
 * route's loading skeleton.
 */
export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const user = await requirePageUser()

  return (
    <OutboxOwnerProvider ownerKey={toClientOwnerKey(user.id)}>
      {children}
    </OutboxOwnerProvider>
  )
}

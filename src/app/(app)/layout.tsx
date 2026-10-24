import { OutboxOwnerProvider } from '@/components/common/OutboxOwnerProvider'
import { toClientOwnerKey } from '@/lib/auth/clientOwnerKey'
import { isGuestId } from '@/lib/auth/guestUser'
import { getPracticeActorId } from '@/modules/dictation/services/getCurrentUser'

/**
 * Hands the learner's client owner key (a hash of the user or existing guest
 * id, or null) to the client outbox so queued writes are stored per learner in
 * this browser. Never the raw guest id: that is the guest's credential. Reads
 * only the session JWT and a cookie: no database work, so it does not delay
 * the route's loading skeleton.
 */
export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const actorId = await getPracticeActorId()

  return (
    <OutboxOwnerProvider
      isGuest={isGuestId(actorId)}
      ownerKey={actorId ? toClientOwnerKey(actorId) : null}
    >
      {children}
    </OutboxOwnerProvider>
  )
}

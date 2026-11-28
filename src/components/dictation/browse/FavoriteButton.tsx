'use client'

import { Star } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'

import { useMessages } from '@/i18n/client'
import { cn } from '@/lib/utils'
import { setFavoriteAction } from '@/modules/dictation/content/favoriteActions'

// 44px hit area for the thumb; the visible chip stays small inside it.
const base =
  'grid size-11 shrink-0 place-items-center rounded-full border border-line bg-surface/90'

const SIGN_IN_HREF = '/api/auth/signin?callbackUrl=/dictation'

export function FavoriteButton({
  videoId,
  initialFavorited,
  canFavorite,
}: {
  videoId: string
  initialFavorited: boolean
  canFavorite: boolean
}) {
  const text = useMessages().dictation.browse
  const router = useRouter()
  const [favorited, setFavorited] = useState(initialFavorited)
  // Every click sets a desired state (never a toggle) and gets a sequence
  // number. Only the latest click may write the UI, so rapid clicks stay
  // enabled and the last one wins. `confirmed` is the newest state the server
  // acknowledged - the rollback target when the latest request throws.
  const latestSeqRef = useRef(0)
  const confirmedRef = useRef({ seq: 0, favorited: initialFavorited })

  // Anonymous: the star links to sign-in (R4 gentle prompt, no dead end).
  if (!canFavorite)
    return (
      <Link
        href={SIGN_IN_HREF}
        aria-label={text.signInToFavorite}
        className={cn(base, 'soft-press hover-pop hover:bg-tint-soft')}
      >
        <Star
          aria-hidden="true"
          className="text-ink-soft size-4"
        />
      </Link>
    )

  async function sendFavorite(seq: number, desired: boolean) {
    try {
      const result = await setFavoriteAction(videoId, desired)

      if (result.needsAuth) {
        if (seq !== latestSeqRef.current) return
        setFavorited(false)
        router.push(SIGN_IN_HREF)
        return
      }

      if (seq > confirmedRef.current.seq)
        confirmedRef.current = { seq, favorited: result.favorited }
      if (seq === latestSeqRef.current) setFavorited(result.favorited)
    } catch {
      if (seq === latestSeqRef.current)
        setFavorited(confirmedRef.current.favorited)
    }
  }

  function onClick() {
    const desired = !favorited
    const seq = latestSeqRef.current + 1

    latestSeqRef.current = seq
    setFavorited(desired) // optimistic
    void sendFavorite(seq, desired)
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={favorited}
      aria-label={favorited ? text.removeFavorite : text.addFavorite}
      className={cn(base, 'soft-press hover-pop hover:bg-tint-soft')}
    >
      <Star
        aria-hidden="true"
        className={cn(
          'size-4',
          favorited ? 'fill-brand text-brand' : 'text-ink-soft'
        )}
      />
    </button>
  )
}

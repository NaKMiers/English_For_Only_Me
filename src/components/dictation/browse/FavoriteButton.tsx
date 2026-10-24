'use client'

import { Star } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'

import { cn } from '@/lib/utils'
import { setFavoriteAction } from '@/modules/dictation/content/favoriteActions'

const base =
  'grid size-9 shrink-0 place-items-center rounded-control border-2 border-manga-black bg-manga-white shadow-[2px_2px_0_var(--manga-black)]'

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
        aria-label="Sign in to save favorites"
        className={cn(base, 'hover:bg-manga-pale-red')}
      >
        <Star
          aria-hidden="true"
          className="text-manga-ink-soft size-4"
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
      aria-label={favorited ? 'Remove favorite' : 'Add favorite'}
      className={cn(base, 'hover:bg-manga-pale-red')}
    >
      <Star
        aria-hidden="true"
        className={cn(
          'size-4',
          favorited ? 'fill-manga-red text-manga-red' : 'text-manga-ink-soft'
        )}
      />
    </button>
  )
}

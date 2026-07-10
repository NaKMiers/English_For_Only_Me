'use client'

import { Star } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

import { cn } from '@/lib/utils'
import { toggleFavoriteAction } from '@/modules/dictation/content/favoriteActions'

const base =
  'grid size-9 shrink-0 place-items-center border-2 border-manga-black bg-manga-white shadow-[2px_2px_0_var(--manga-black)]'

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
  const [pending, startTransition] = useTransition()

  // Anonymous: the star links to sign-in (R4 gentle prompt, no dead end).
  if (!canFavorite)
    return (
      <Link
        href="/api/auth/signin?callbackUrl=/dictation"
        aria-label="Sign in to save favorites"
        className={cn(base, 'hover:bg-manga-pale-red')}
      >
        <Star
          aria-hidden="true"
          className="text-manga-ink-soft size-4"
        />
      </Link>
    )

  function onClick() {
    setFavorited(value => !value) // optimistic
    startTransition(async () => {
      const result = await toggleFavoriteAction(videoId)
      if (result.needsAuth) {
        setFavorited(false)
        router.push('/api/auth/signin?callbackUrl=/dictation')
        return
      }
      setFavorited(result.favorited)
    })
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      aria-pressed={favorited}
      aria-label={favorited ? 'Remove favorite' : 'Add favorite'}
      className={cn(base, 'hover:bg-manga-pale-red disabled:opacity-60')}
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

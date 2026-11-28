import Image from 'next/image'

import { cn } from '@/lib/utils'

import type { BuddyMood } from './buddyMood'

interface Props {
  className?: string
  /** Load at once: Buddy is the page's largest paint (the login card). */
  eager?: boolean
  mood: BuddyMood
}

/**
 * The app's mascot, the little book from the logo, in one illustration per
 * mood (`public/buddy/<mood>.png`, 512px with a transparent background).
 * Purely decorative: the card names the mood in text beside it.
 */
export function HomeBuddyMascot({ className, eager = false, mood }: Props) {
  return (
    <Image
      src={`/buddy/${mood}.png`}
      alt=""
      aria-hidden="true"
      width={512}
      height={512}
      loading={eager ? 'eager' : undefined}
      sizes="176px"
      data-mood={mood}
      className={cn('buddy-bob object-contain', className)}
    />
  )
}

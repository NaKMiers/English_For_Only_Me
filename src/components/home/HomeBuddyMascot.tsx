import Image from 'next/image'

import { cn } from '@/lib/utils'

import type { BuddyMood } from './buddyMood'

interface Props {
  className?: string
  mood: BuddyMood
}

/**
 * The app's mascot, the little book from the logo, in one illustration per
 * mood (`public/buddy/<mood>.png`, 512px with a transparent background).
 * Purely decorative: the card names the mood in text beside it.
 */
export function HomeBuddyMascot({ className, mood }: Props) {
  return (
    <Image
      src={`/buddy/${mood}.png`}
      alt=""
      aria-hidden="true"
      width={512}
      height={512}
      sizes="176px"
      data-mood={mood}
      className={cn('buddy-bob object-contain', className)}
    />
  )
}

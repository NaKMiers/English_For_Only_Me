import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

/**
 * Where the tail points. `none` is for narration, which is not spoken by anyone
 * and so must not look like it is.
 */
export type BubbleTail = 'left' | 'right' | 'none'

/**
 * Dialogue.
 *
 * `shout` uses a jagged burst outline rather than a colour change, so the raised
 * voice survives greyscale, colour blindness and the night theme. Loudness
 * carried only by red would be invisible to a chunk of readers and would fight
 * the danger token for meaning.
 *
 * `speaker` is read out but not printed: a portrait sits beside the bubbles that
 * have a speaker, so a name plate as well would caption a picture that already
 * says who is talking. Screen readers get the name either way.
 */
export function SpeechBubble({
  children,
  className,
  shout = false,
  speaker,
  tail = 'left',
}: {
  children: ReactNode
  className?: string
  shout?: boolean
  /** Read out before the line, so a screen reader knows who is talking. */
  speaker?: string
  tail?: BubbleTail
}) {
  return (
    <div className={cn('relative', className)}>
      <div
        className={cn(
          'border-comic-ink bg-comic-paper text-manga-black relative border-3 px-4 py-3',
          shout
            ? 'font-sans text-lg leading-6 font-black uppercase [clip-path:polygon(0_6%,4%_0,52%_5%,96%_0,100%_7%,97%_50%,100%_93%,54%_100%,6%_95%,0_100%,3%_50%)] sm:text-xl'
            : 'rounded-[1.6rem] text-base leading-7 font-semibold'
        )}
      >
        {speaker ? <span className="sr-only">{speaker}: </span> : null}
        {children}
      </div>
      {tail !== 'none' ? (
        <span
          aria-hidden="true"
          className={cn(
            'border-comic-ink bg-comic-paper absolute -bottom-2 h-4 w-4 rotate-45 border-r-3 border-b-3',
            tail === 'left' ? 'left-7' : 'right-7'
          )}
        />
      ) : null}
    </div>
  )
}

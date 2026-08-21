import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

/** How much of the page width this panel takes. */
export type PanelWidth = 'full' | 'half'

/**
 * One frame on the page.
 *
 * Deliberately NOT `MangaPanel`. That component is the app's card: a titled
 * container with an eyebrow tag, correct everywhere else in the product and
 * exactly what made the old lesson page read like a spec sheet. A comic panel
 * has no header furniture and a caption instead of a title - the frame is
 * scenery, and the words inside it do the work.
 *
 * It used to have a torn edge: a `clip-path` polygon that sheared the box by a
 * fraction of a percent. On a wide panel that is several pixels of skew, so the
 * 3px border came out visible on one side and shaved to nothing on the other,
 * and the offset shadow vanished entirely - a clip-path clips the shadow with
 * the box. That made these the only cards in the app with a broken frame and no
 * ledge. The frame is now the app's: 3px ink, hard offset shadow.
 *
 * A server component, like everything in this directory. A single `'use client'`
 * at the top of the comic tree would pull all 184 rendered lesson pages into the
 * client bundle.
 */
export function ComicPanel({
  caption,
  children,
  className,
  halftone = false,
  speedLines = false,
  tone = 'paper',
  width = 'full',
}: {
  /** Small all-caps label in the corner. The comic equivalent of a heading. */
  caption?: string
  children: ReactNode
  className?: string
  halftone?: boolean
  speedLines?: boolean
  tone?: 'paper' | 'ink' | 'danger'
  width?: PanelWidth
}) {
  return (
    <section
      className={cn(
        'border-comic-ink relative overflow-hidden border-3 p-4 shadow-[4px_4px_0_var(--manga-offset)]',
        // `col-span-full` spans the columns that EXIST. `col-span-2` would
        // create an implicit second column wherever this panel sits in a
        // single-column grid, and every sibling would then be squeezed into
        // half the page - which is exactly what happened on the dojo.
        width === 'full' && 'sm:col-span-full',
        tone === 'paper' && 'bg-comic-paper text-manga-black',
        tone === 'ink' && 'bg-manga-black text-manga-white',
        tone === 'danger' && 'bg-comic-danger text-manga-white',
        halftone && 'comic-halftone',
        speedLines && 'comic-speedlines',
        className
      )}
    >
      {caption ? (
        <p className="relative z-1 mb-2 font-sans text-[0.65rem] leading-none font-black tracking-[0.14em] uppercase opacity-70">
          {caption}
        </p>
      ) : null}
      <div className="relative z-1 grid gap-3">{children}</div>
    </section>
  )
}

import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

/** How much of the page width this panel takes. */
export type PanelWidth = 'full' | 'half'

/** Which torn edge to use. Cycled so no two adjacent panels match. */
export type PanelEdge = 'a' | 'b' | 'c'

const EDGE_CLASS: Record<PanelEdge, string> = {
  a: 'comic-edge-a',
  b: 'comic-edge-b',
  c: 'comic-edge-c',
}

/**
 * One frame on the page.
 *
 * Deliberately NOT `MangaPanel`. That component is the app's card: a titled
 * container with an eyebrow tag, correct everywhere else in the product and
 * exactly what made the old lesson page read like a spec sheet. A comic panel
 * has no header furniture, an irregular edge, and a caption instead of a title -
 * the frame is scenery, and the words inside it do the work.
 *
 * A server component, like everything in this directory. A single `'use client'`
 * at the top of the comic tree would pull all 184 rendered lesson pages into the
 * client bundle.
 */
export function ComicPanel({
  caption,
  children,
  className,
  edge = 'a',
  halftone = false,
  speedLines = false,
  tone = 'paper',
  width = 'full',
}: {
  /** Small all-caps label in the corner. The comic equivalent of a heading. */
  caption?: string
  children: ReactNode
  className?: string
  edge?: PanelEdge
  halftone?: boolean
  speedLines?: boolean
  tone?: 'paper' | 'ink' | 'danger'
  width?: PanelWidth
}) {
  return (
    <section
      className={cn(
        'border-comic-ink relative overflow-hidden border-3 p-4 shadow-[5px_5px_0_var(--manga-offset)]',
        width === 'full' && 'sm:col-span-2',
        tone === 'paper' && 'bg-comic-paper text-manga-black',
        tone === 'ink' && 'bg-manga-black text-manga-white',
        tone === 'danger' && 'bg-comic-danger text-manga-white',
        EDGE_CLASS[edge],
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

'use client'

import { memo, type ReactNode, useEffect, useRef } from 'react'

import { cn } from '@/lib/utils'
import type { IeltsReadingMaterial } from '@/modules/ielts/schema'

export interface IeltsHighlight {
  blockIndex: number
  quote: string
}

/** Wraps the first whitespace-insensitive match of `quote` in a mark. */
export function highlightText(text: string, quote: string): ReactNode {
  const needle = quote.trim()

  if (!needle) return text

  const index = text.indexOf(needle)

  if (index === -1) {
    const pattern = new RegExp(
      needle
        .split(/\s+/)
        .map(part => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
        .join('\\s+')
    )
    const match = pattern.exec(text)

    if (!match) return text

    return highlightAt(text, match.index, match[0].length)
  }

  return highlightAt(text, index, needle.length)
}

function highlightAt(text: string, start: number, length: number) {
  return (
    <>
      {text.slice(0, start)}
      <mark
        className="decoration-lesson-correct rounded-tag bg-yellow-200 px-0.5 text-inherit underline decoration-2 underline-offset-4"
        data-ielts-evidence
      >
        {text.slice(start, start + length)}
      </mark>
      {text.slice(start + length)}
    </>
  )
}

interface Props {
  className?: string
  highlight: IeltsHighlight | null
  material: IeltsReadingMaterial
  partLabel: string
}

/**
 * A reading passage on plain paper (focus mode): no shadows or gradients,
 * 17px Source Sans at 1.7 line height, at most 68ch per line.
 */
export const PassagePane = memo(function PassagePane({
  className,
  highlight,
  material,
  partLabel,
}: Props) {
  const rootRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (!highlight) return

    rootRef.current
      ?.querySelector('[data-ielts-evidence]')
      ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [highlight])

  return (
    <article
      aria-label="Reading passage"
      className={cn(
        'text-manga-black mx-auto grid max-w-[70ch] gap-4 text-[17px] leading-[1.75]',
        className
      )}
      ref={rootRef}
    >
      <header className="grid gap-1.5 pb-1">
        <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
          {partLabel}
        </p>
        <h2 className="font-sans text-[22px] leading-tight font-black">
          {material.title}
        </h2>
        {material.subtitle ? (
          <p className="text-muted-foreground italic">{material.subtitle}</p>
        ) : null}
      </header>
      {material.paragraphs.map((paragraph, index) => (
        <p
          className={cn(paragraph.label && 'grid grid-cols-[1.5rem_1fr] gap-2')}
          key={index}
        >
          {paragraph.label ? (
            <strong className="text-muted-foreground font-sans text-sm leading-[1.75rem] font-black">
              {paragraph.label}
            </strong>
          ) : null}
          <span>
            {highlight?.blockIndex === index
              ? highlightText(paragraph.text, highlight.quote)
              : paragraph.text}
          </span>
        </p>
      ))}
    </article>
  )
})

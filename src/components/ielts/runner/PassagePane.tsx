'use client'

import { memo, type ReactNode, useEffect, useRef } from 'react'

import { useMessages } from '@/i18n/client'
import { cn } from '@/lib/utils'
import { passageStandfirst } from '@/modules/ielts/passageStandfirst'
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
        className="decoration-lesson-correct bg-highlight rounded-tag px-0.5 text-inherit underline decoration-2 underline-offset-4"
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
  /** The big part heading ("Passage 1"); defaults to the label. */
  heading?: string
  highlight: IeltsHighlight | null
  /** "You should spend about 20 minutes on Questions 1-13, ..." */
  intro?: string
  material: IeltsReadingMaterial
  /** Names the passage, also the key saved highlights are stored under. */
  partLabel: string
}

/**
 * A reading passage on plain paper (focus mode): no shadows or gradients,
 * 17px Source Sans at 1.7 line height, as wide as its pane (the split sets it).
 */
export const PassagePane = memo(function PassagePane({
  className,
  heading,
  highlight,
  intro,
  material,
  partLabel,
}: Props) {
  const t = useMessages().ielts.runner
  const rootRef = useRef<HTMLElement>(null)
  const { bodyStart, standfirst } = passageStandfirst(material)
  // Highlights index the stored paragraphs, so a standfirst lifted out of
  // paragraph 0 still answers to block 0.
  const marked = (text: string, index: number) =>
    highlight?.blockIndex === index
      ? highlightText(text, highlight.quote)
      : text

  useEffect(() => {
    if (!highlight) return

    rootRef.current
      ?.querySelector('[data-ielts-evidence]')
      ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [highlight])

  return (
    <article
      aria-label={t.readingPassage}
      data-highlight-scope={`passage:${partLabel}`}
      className={cn(
        'text-ink grid w-full gap-2.5 text-[17px] leading-[1.7]',
        className
      )}
      ref={rootRef}
    >
      <header className="grid gap-1">
        <h2 className="text-ink-soft font-sans text-lg leading-none font-semibold tracking-wide">
          {heading ?? partLabel}
        </h2>
        {intro ? (
          <p className="text-ink-soft text-[15px] leading-snug">{intro}</p>
        ) : null}
      </header>
      <div className="grid gap-2 pt-3 text-center">
        <h3 className="font-sans text-[24px] leading-tight font-semibold">
          {material.title}
        </h3>
        {standfirst ? (
          <p className="font-bold italic">
            {bodyStart ? marked(standfirst, 0) : standfirst}
          </p>
        ) : null}
      </div>
      {material.paragraphs.slice(bodyStart).map((paragraph, offset) => {
        const index = offset + bodyStart

        // A lettered section ("A") heads its own paragraphs, as the paper
        // sets it; a line break inside the stored text starts a paragraph.
        const parts = paragraph.text
          .split(/\n+/)
          .map(part => part.trim())
          .filter(Boolean)

        return (
          <section
            className={cn('grid gap-1.5', paragraph.label && 'pt-5')}
            key={index}
          >
            {paragraph.label ? (
              <h4 className="pb-1 font-sans text-base leading-none font-semibold">
                {paragraph.label}
              </h4>
            ) : null}
            {parts.map((part, partIndex) => (
              <p key={partIndex}>{marked(part, index)}</p>
            ))}
          </section>
        )
      })}
    </article>
  )
})

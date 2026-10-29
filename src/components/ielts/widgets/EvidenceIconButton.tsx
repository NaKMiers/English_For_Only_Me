'use client'

import { Eye } from 'lucide-react'

import { useIeltsAnswers } from './answerContext'

/**
 * Guided practice's "show in text" hint: a faint eye that sits inline after a
 * question or blank, so it costs no row of its own. The tap area reaches past
 * the small glyph. Renders nothing unless Guided is on.
 */
export function EvidenceIconButton({ number }: { number: number }) {
  const { onShowEvidence } = useIeltsAnswers()

  if (!onShowEvidence) return null

  return (
    <button
      aria-label={`Show evidence for question ${number}`}
      className="text-manga-ink-soft/60 hover:text-manga-red hover:bg-manga-pale-red rounded-tag relative -my-1 inline-grid size-6 shrink-0 place-items-center align-middle transition-colors after:absolute after:-inset-2 after:content-['']"
      onClick={() => onShowEvidence(number)}
      title="Show in text"
      type="button"
    >
      <Eye
        aria-hidden="true"
        className="size-3.5"
      />
    </button>
  )
}

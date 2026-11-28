'use client'

import { Eye } from 'lucide-react'

import { useMessages } from '@/i18n/client'
import { format } from '@/i18n/format'

import { useIeltsAnswers } from './answerContext'

/**
 * Guided practice's "show in text" hint: a faint eye that sits inline after a
 * question or blank, so it costs no row of its own. The tap area reaches past
 * the small glyph. Renders nothing unless Guided is on.
 */
export function EvidenceIconButton({ number }: { number: number }) {
  const t = useMessages().ielts.widgets
  const { onShowEvidence } = useIeltsAnswers()

  if (!onShowEvidence) return null

  return (
    <button
      aria-label={format(t.showEvidence, { number })}
      className="text-ink-soft/60 hover:text-brand hover:bg-tint-soft rounded-tag soft-press hover-pop relative -my-1 inline-grid size-6 shrink-0 place-items-center align-middle after:absolute after:-inset-2 after:content-['']"
      onClick={() => onShowEvidence(number)}
      title={t.showInText}
      type="button"
    >
      <Eye
        aria-hidden="true"
        className="size-3.5"
      />
    </button>
  )
}

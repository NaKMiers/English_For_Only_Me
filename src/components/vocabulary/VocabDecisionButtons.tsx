'use client'

import { BookOpen, Check, CircleCheck } from 'lucide-react'
import type { ReactNode } from 'react'

import { InlineNotice } from '@/components/common/InlineNotice'
import { ActionButton } from '@/components/ui/ActionButton'
import { useMessages } from '@/i18n/client'
import type { Messages } from '@/i18n/messages'
import { cn } from '@/lib/utils'
import type {
  VocabEntryWithUserStateRecord,
  VocabUserItemStatus,
} from '@/modules/vocabulary/types'

export type VocabDecision = 'shouldLearn' | 'alreadyKnow'

/** The learner's pick for a word, read from their saved item's status. */
export function decisionOf(
  status: VocabUserItemStatus | null | undefined
): VocabDecision | null {
  if (status === 'learning') return 'shouldLearn'
  if (status === 'alreadyKnow' || status === 'mastered') return 'alreadyKnow'

  return null
}

/**
 * The quiet status beside a word: the learner's pick (or Mastered), else a
 * not-ready enrichment status. "Ready" is the normal case, so it says
 * nothing (null).
 */
export function vocabStatusLabel(
  result: VocabEntryWithUserStateRecord,
  vocab: Messages['vocabulary']
): string | null {
  const status = result.userItem?.status
  const decision = decisionOf(status)

  if (status === 'mastered') return vocab.itemStatus.mastered
  if (decision) return vocab.decisions[decision]
  if (result.entry.enrichmentStatus === 'ready') return null

  return vocab.enrichmentStatus[result.entry.enrichmentStatus]
}

/** A picked mark reads as chosen, without taking the page's one dark CTA. */
export const PICKED_CLASS_NAME: Record<VocabDecision, string> = {
  alreadyKnow:
    'border-lesson-correct bg-pastel-mint text-ink hover:bg-pastel-mint',
  shouldLearn:
    'border-brand bg-brand-soft text-brand-ink hover:bg-brand-soft hover:text-brand-ink',
}

interface Props {
  /** A write is running: both buttons wait. */
  busy?: boolean
  /** Extra classes for each button (size on a tight card). */
  buttonClassName?: string
  className?: string
  /** The saved pick, shown as pressed; clicking it again does nothing. */
  decision: VocabDecision | null
  /** The word cannot be picked yet (no meaning). */
  disabled?: boolean
  /** Why the last pick failed, right under the buttons. */
  error?: string | null
  onDecide: (decision: VocabDecision) => void
  /** A quiet result line under the buttons, e.g. "Saved". */
  status?: ReactNode
}

/**
 * "Should learn" / "Already know" for one word, the same everywhere a word
 * can be picked (search, explore deck, the practice word dialog): the saved
 * pick is pressed and tinted, and the error sits under the buttons that
 * caused it.
 */
export function VocabDecisionButtons({
  busy = false,
  buttonClassName,
  className,
  decision,
  disabled = false,
  error = null,
  onDecide,
  status,
}: Props) {
  const vocab = useMessages().vocabulary

  function decide(next: VocabDecision) {
    if (next === decision) return
    onDecide(next)
  }

  return (
    <div
      className={cn('grid gap-2', className)}
      data-vocab-decision=""
    >
      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        <ActionButton
          aria-pressed={decision === 'shouldLearn'}
          className={cn(
            '[&>span:last-child]:whitespace-nowrap',
            buttonClassName,
            decision === 'shouldLearn' && PICKED_CLASS_NAME.shouldLearn
          )}
          disabled={busy || disabled}
          icon={
            decision === 'shouldLearn' ? (
              <CircleCheck className="size-4" />
            ) : (
              <BookOpen className="size-4" />
            )
          }
          onClick={() => decide('shouldLearn')}
          tone={decision === 'alreadyKnow' ? 'paper' : 'primary'}
          type="button"
        >
          {vocab.marks.shouldLearn}
        </ActionButton>
        <ActionButton
          aria-pressed={decision === 'alreadyKnow'}
          className={cn(
            '[&>span:last-child]:whitespace-nowrap',
            buttonClassName,
            decision === 'alreadyKnow' && PICKED_CLASS_NAME.alreadyKnow
          )}
          disabled={busy || disabled}
          icon={
            decision === 'alreadyKnow' ? (
              <CircleCheck className="size-4" />
            ) : (
              <Check className="size-4" />
            )
          }
          onClick={() => decide('alreadyKnow')}
          tone="paper"
          type="button"
        >
          {vocab.marks.alreadyKnow}
        </ActionButton>
      </div>
      {error ? <InlineNotice tone="error">{error}</InlineNotice> : null}
      {status && !error ? (
        <p
          className="text-ink-soft text-xs font-normal"
          role="status"
        >
          {status}
        </p>
      ) : null}
    </div>
  )
}

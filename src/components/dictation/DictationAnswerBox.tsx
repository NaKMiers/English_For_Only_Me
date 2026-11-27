'use client'

import { Check, Eye, SkipForward } from 'lucide-react'

import { ActionButton } from '@/components/ui/ActionButton'
import { Textarea } from '@/components/ui/textarea'

interface Props {
  answer: string
  isSubmitting?: boolean
  onAnswerChange: (answer: string) => void
  onCheck: () => void
  onReveal: () => void
  onSkip: () => void
  revealed: boolean
  segmentText: string
}

export function DictationAnswerBox({
  answer,
  isSubmitting = false,
  onAnswerChange,
  onCheck,
  onReveal,
  onSkip,
  revealed,
  segmentText,
}: Props) {
  return (
    <section
      aria-label="Dictation answer"
      className="border-line bg-surface rounded-panel grid min-w-0 gap-3 border p-3"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-sans text-lg leading-tight font-semibold tracking-normal">
          Type what you hear
        </h2>
        <span className="text-ink-soft text-xs font-normal">no transcript</span>
      </div>
      <Textarea
        aria-label="Dictation answer"
        data-dictation-shortcuts="allow"
        spellCheck={false}
        autoCorrect="off"
        autoCapitalize="off"
        value={answer}
        onChange={event => onAnswerChange(event.target.value)}
        placeholder="Type what you hear..."
        className="border-line bg-surface rounded-control min-h-36 border text-xl leading-8 font-semibold"
      />
      <div className="flex flex-wrap gap-2">
        <ActionButton
          type="button"
          onClick={onCheck}
          disabled={isSubmitting}
          icon={
            <Check
              aria-hidden="true"
              className="size-5"
            />
          }
        >
          {isSubmitting ? 'Checking' : 'Check'}
        </ActionButton>
        <ActionButton
          type="button"
          tone="paper"
          onClick={onReveal}
          disabled={isSubmitting}
          icon={
            <Eye
              aria-hidden="true"
              className="size-5"
            />
          }
        >
          Reveal
        </ActionButton>
        <ActionButton
          type="button"
          tone="paper"
          onClick={onSkip}
          disabled={isSubmitting}
          icon={
            <SkipForward
              aria-hidden="true"
              className="size-5"
            />
          }
        >
          Skip
        </ActionButton>
      </div>
      {revealed ? (
        <div className="border-line bg-tint rounded-control border p-3 text-base leading-7 font-semibold">
          {segmentText}
        </div>
      ) : null}
    </section>
  )
}

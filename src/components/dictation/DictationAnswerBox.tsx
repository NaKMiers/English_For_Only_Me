'use client'

import { Check, Eye, SkipForward } from 'lucide-react'

import { MangaButton } from '@/components/ui/MangaButton'
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
      className="border-manga-black bg-manga-white grid min-w-0 gap-3 border-2 p-3 shadow-[3px_3px_0_var(--manga-black)]"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-sans text-lg leading-tight font-black tracking-normal">
          Type what you hear
        </h2>
        <span className="text-manga-ink-soft text-xs font-black uppercase">
          no transcript
        </span>
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
        className="border-manga-black bg-manga-white min-h-36 rounded-none border-2 text-xl leading-8 font-semibold shadow-[2px_2px_0_var(--manga-black)]"
      />
      <div className="flex flex-wrap gap-2">
        <MangaButton
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
        </MangaButton>
        <MangaButton
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
        </MangaButton>
        <MangaButton
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
        </MangaButton>
      </div>
      {revealed ? (
        <div className="border-manga-black bg-manga-paper-soft border-2 p-3 text-base leading-7 font-semibold shadow-[2px_2px_0_var(--manga-black)]">
          {segmentText}
        </div>
      ) : null}
    </section>
  )
}

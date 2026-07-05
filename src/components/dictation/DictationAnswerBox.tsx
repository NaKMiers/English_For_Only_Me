'use client'

import { Check, Eye, SkipForward } from 'lucide-react'

import { MangaPanel } from '@/components/common/MangaPanel'
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
    <MangaPanel
      eyebrow="Answer"
      title="Type what you hear"
      className="shadow-[3px_3px_0_var(--manga-black)]"
    >
      <div className="border-manga-black bg-manga-pale-red border-2 p-3 text-sm leading-6 font-black">
        {revealed ? segmentText : 'Listen first. Reveal only when stuck.'}
      </div>
      <Textarea
        aria-label="Dictation answer"
        data-dictation-shortcuts="allow"
        value={answer}
        onChange={event => onAnswerChange(event.target.value)}
        placeholder="Type what you hear..."
        className="border-manga-black bg-manga-white min-h-32 rounded-none border-3 text-base leading-7 font-semibold shadow-[3px_3px_0_var(--manga-black)]"
      />
      <div className="flex flex-wrap gap-3">
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
    </MangaPanel>
  )
}

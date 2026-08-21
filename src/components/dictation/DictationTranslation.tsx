'use client'

import { Languages } from 'lucide-react'

import { cn } from '@/lib/utils'
import {
  ANSWER_TEXT_STYLE,
  type AnswerTextSize,
} from '@/modules/dictation/preferences/dictationPreferences'
import { getLanguageLabel } from '@/modules/dictation/translations/languages'

interface Props {
  className?: string
  isUnlocked: boolean
  language: string
  text: string
  textSize: AnswerTextSize
}

const NO_CAPTION_MESSAGE =
  'No caption for this moment in the selected language.'

export function DictationTranslation({
  className,
  isUnlocked,
  language,
  text,
  textSize,
}: Props) {
  if (!isUnlocked) return null

  const hasText = text.trim().length > 0

  // A single strip rather than a titled panel: the language marker sits inline
  // with the text so the reveal costs one row on the height-locked practice
  // screen instead of an eyebrow, a heading, and a body block. The text follows
  // the answer text size so it reads at the same scale as the sentence above.
  return (
    <div
      role="status"
      className={cn(
        'border-manga-black bg-manga-paper-soft flex min-w-0 items-start gap-2 border-2 p-2 shadow-[3px_3px_0_var(--manga-black)]',
        hasText && 'bg-white',
        className
      )}
    >
      {/* Icon only - the language name stays in the DOM for screen readers,
          since the glyph alone does not say WHICH language this is. */}
      <Languages
        aria-hidden="true"
        className="text-manga-red mt-1 size-5 shrink-0"
      />
      <span className="sr-only">{getLanguageLabel(language)}</span>
      <span
        style={hasText ? ANSWER_TEXT_STYLE[textSize] : undefined}
        className="min-w-0 text-base leading-7 font-semibold wrap-break-word"
      >
        {hasText ? text : NO_CAPTION_MESSAGE}
      </span>
    </div>
  )
}

'use client'

import { Languages } from 'lucide-react'

import { useLocale, useMessages } from '@/i18n/client'
import { INTL_LOCALES } from '@/i18n/config'
import { cn } from '@/lib/utils'
import {
  ANSWER_TEXT_STYLE,
  type AnswerTextSize,
} from '@/modules/dictation/preferences/dictationPreferences'
import { getLanguageLabel } from '@/modules/dictation/translations/languages'

interface Props {
  className?: string
  /** The language's captions are still being fetched (picked mid-practice). */
  isLoading?: boolean
  isUnlocked: boolean
  language: string
  text: string
  textSize: AnswerTextSize
}

export function DictationTranslation({
  className,
  isLoading = false,
  isUnlocked,
  language,
  text,
  textSize,
}: Props) {
  const t = useMessages()
  const locale = useLocale()

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
        'border-line bg-tint rounded-control flex min-w-0 items-start gap-2 border p-2',
        hasText && 'bg-white',
        className
      )}
    >
      {/* Icon only - the language name stays in the DOM for screen readers,
          since the glyph alone does not say WHICH language this is. */}
      <Languages
        aria-hidden="true"
        className="text-brand mt-1 size-5 shrink-0"
      />
      <span className="sr-only">
        {getLanguageLabel(language, INTL_LOCALES[locale])}
      </span>
      <span
        style={hasText ? ANSWER_TEXT_STYLE[textSize] : undefined}
        className="min-w-0 text-base leading-7 font-semibold wrap-break-word"
      >
        {hasText
          ? text
          : isLoading
            ? t.dictation.translation.loading
            : t.dictation.translation.noCaption}
      </span>
    </div>
  )
}

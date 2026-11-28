'use client'

import { CircleAlert, Languages } from 'lucide-react'

import { useLocale, useMessages } from '@/i18n/client'
import { INTL_LOCALES } from '@/i18n/config'
import { cn } from '@/lib/utils'
import { getLanguageLabel } from '@/modules/dictation/translations/languages'

interface Props {
  className?: string
  /** The language's captions failed to load: said here, in the strip. */
  error?: string | null
  /** The language's captions are still being fetched (picked mid-practice). */
  isLoading?: boolean
  isUnlocked: boolean
  language: string
  text: string
}

export function DictationTranslation({
  className,
  error = null,
  isLoading = false,
  isUnlocked,
  language,
  text,
}: Props) {
  const t = useMessages()
  const locale = useLocale()

  if (!isUnlocked) return null

  const hasText = text.trim().length > 0

  if (error && !hasText)
    return (
      <div
        role="alert"
        className={cn(
          'bg-danger-soft text-danger rounded-control flex min-w-0 items-start gap-2 p-2 text-sm leading-6',
          className
        )}
      >
        <CircleAlert
          aria-hidden="true"
          className="mt-0.5 size-5 shrink-0"
        />
        <span className="min-w-0 wrap-break-word">{error}</span>
      </div>
    )

  // A single strip rather than a titled panel: the language marker sits inline
  // with the text so the reveal costs one row on the height-locked practice
  // screen. A helper, not the answer: smaller, lighter and quieter than the
  // sentence above, like the full transcript's translations.
  return (
    <div
      role="status"
      className={cn(
        'border-line bg-surface rounded-control flex min-w-0 items-start gap-2 border p-2',
        !hasText && 'bg-tint',
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
      <span className="text-ink-soft min-w-0 text-sm leading-6 font-normal wrap-break-word">
        {hasText
          ? text
          : isLoading
            ? t.dictation.translation.loading
            : t.dictation.translation.noCaption}
      </span>
    </div>
  )
}

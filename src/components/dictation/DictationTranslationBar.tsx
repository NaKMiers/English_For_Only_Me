'use client'

import { Languages } from 'lucide-react'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { INTL_LOCALES } from '@/i18n/config'
import { useLocale, useMessages } from '@/i18n/client'
import { cn } from '@/lib/utils'
import { getLanguageLabel } from '@/modules/dictation/translations/languages'

interface Props {
  className?: string
  /**
   * Drop the "Translation" caption and tighten the padding. The icon plus the
   * language value still say what the control is, and the select keeps its
   * aria-label, so nothing is lost for screen readers - only width.
   */
  compact?: boolean
  languages: string[]
  onChange: (language: string) => void
  // '' means no translation ("None").
  value: string
}

export function DictationTranslationBar({
  className,
  compact = false,
  languages,
  onChange,
  value,
}: Props) {
  const t = useMessages()
  const locale = useLocale()

  if (languages.length === 0) return null

  return (
    <div
      className={cn(
        'border-line bg-surface rounded-control flex flex-wrap items-center gap-2 border text-sm font-semibold',
        compact ? 'gap-1 px-1.5 py-1' : 'px-3 py-2',
        className
      )}
    >
      <Languages
        aria-hidden="true"
        className="text-brand size-4 shrink-0"
      />
      {compact ? null : (
        <span className="font-sans text-xs tracking-normal">
          {t.dictation.translation.label}
        </span>
      )}
      <Select
        value={value}
        onValueChange={next => onChange(next ?? '')}
      >
        <SelectTrigger
          size="sm"
          aria-label={t.dictation.translation.language}
          className="min-w-0 flex-1 px-2"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">{t.dictation.translation.none}</SelectItem>
          {languages.map(language => (
            <SelectItem
              key={language}
              value={language}
            >
              {getLanguageLabel(language, INTL_LOCALES[locale])}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

'use client'

import { Languages } from 'lucide-react'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getLanguageLabel } from '@/modules/dictation/translations/languages'

interface Props {
  className?: string
  languages: string[]
  onChange: (language: string) => void
  // '' means no translation ("None").
  value: string
}

export function DictationTranslationBar({
  className,
  languages,
  onChange,
  value,
}: Props) {
  if (languages.length === 0) return null

  return (
    <div
      className={
        'border-manga-black bg-manga-white flex flex-wrap items-center gap-2 border-2 px-3 py-2 text-sm font-black shadow-[2px_2px_0_var(--manga-black)]' +
        (className ? ` ${className}` : '')
      }
    >
      <Languages
        aria-hidden="true"
        className="text-manga-red size-4 shrink-0"
      />
      <span className="font-sans text-xs tracking-normal uppercase">
        Translation
      </span>
      <Select
        value={value}
        onValueChange={next => onChange(next ?? '')}
      >
        <SelectTrigger
          size="sm"
          aria-label="Translation language"
          className="min-w-0 flex-1 px-2"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">None</SelectItem>
          {languages.map(language => (
            <SelectItem
              key={language}
              value={language}
            >
              {getLanguageLabel(language)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

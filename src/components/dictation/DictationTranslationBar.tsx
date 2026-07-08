'use client'

import { Languages } from 'lucide-react'

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
    <label
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
      <select
        value={value}
        onChange={event => onChange(event.target.value)}
        className="border-manga-black bg-manga-white min-h-9 min-w-0 flex-1 rounded-none border-2 px-2 py-1 font-black"
      >
        <option value="">None</option>
        {languages.map(language => (
          <option
            key={language}
            value={language}
          >
            {getLanguageLabel(language)}
          </option>
        ))}
      </select>
    </label>
  )
}

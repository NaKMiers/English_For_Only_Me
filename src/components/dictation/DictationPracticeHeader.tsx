'use client'

import { DictationTranslationBar } from './DictationTranslationBar'

interface Props {
  eyebrow: string
  onTranslationLanguageChange: (language: string) => void
  title: string
  translationLanguage: string
  translationLanguages: string[]
}

export function DictationPracticeHeader({
  eyebrow,
  onTranslationLanguageChange,
  title,
  translationLanguage,
  translationLanguages,
}: Props) {
  return (
    <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
      <div className="grid min-w-0 gap-1">
        <span className="text-manga-red text-xs font-black tracking-normal uppercase">
          {eyebrow}
        </span>
        <h1 className="font-sans text-2xl leading-tight font-black tracking-normal wrap-break-word sm:text-3xl">
          {title}
        </h1>
      </div>

      <DictationTranslationBar
        className="shrink-0"
        languages={translationLanguages}
        onChange={onTranslationLanguageChange}
        value={translationLanguage}
      />
    </div>
  )
}

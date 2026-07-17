'use client'

import { Trophy } from 'lucide-react'

import { CompletionBadge } from '@/components/dictation/CompletionBadge'
import { MangaButton } from '@/components/ui/MangaButton'
import { PageTag } from '@/components/ui/PageTag'
import type { DictationLevel } from '@/modules/dictation/levels'

import { DictationTranslationBar } from './DictationTranslationBar'

interface Props {
  completions: number
  eyebrow: string
  level: DictationLevel | null
  onTranslationLanguageChange: (language: string) => void
  title: string
  translationLanguage: string
  translationLanguages: string[]
  videoId: string
}

export function DictationPracticeHeader({
  completions,
  eyebrow,
  level,
  onTranslationLanguageChange,
  title,
  translationLanguage,
  translationLanguages,
  videoId,
}: Props) {
  return (
    <div className="grid min-w-0 gap-3">
      <div className="grid min-w-0 gap-1">
        <span className="text-manga-red text-xs font-black tracking-normal uppercase">
          {eyebrow}
        </span>
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <h1 className="font-sans text-2xl leading-tight font-black tracking-normal wrap-break-word sm:text-3xl">
            {title}
          </h1>
          {level && <PageTag tone="sky">{level}</PageTag>}
          <CompletionBadge completions={completions} />
        </div>
      </div>

      {completions > 0 || translationLanguages.length > 0 ? (
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
          {completions > 0 ? (
            <MangaButton
              href={`/dictation/videos/${videoId}/results`}
              tone="paper"
              className="min-h-10 w-fit px-3 py-1 text-xs"
              icon={
                <Trophy
                  aria-hidden="true"
                  className="size-4"
                />
              }
            >
              View Results
            </MangaButton>
          ) : null}
          <DictationTranslationBar
            className="ml-auto shrink-0 justify-end"
            languages={translationLanguages}
            onChange={onTranslationLanguageChange}
            value={translationLanguage}
          />
        </div>
      ) : null}
    </div>
  )
}

'use client'

import { Trophy } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

import { CompletionBadge } from '@/components/dictation/CompletionBadge'
import { IconButton } from '@/components/ui/IconButton'
import { PageTag } from '@/components/ui/PageTag'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import type { DictationLevel } from '@/modules/dictation/levels'

import { DictationTranslationBar } from './DictationTranslationBar'

interface Props {
  completions: number
  isResuming: boolean
  level: DictationLevel | null
  onTranslationLanguageChange: (language: string) => void
  title: string
  translationLanguage: string
  translationLanguages: string[]
  videoId: string
}

const CHIP_CLASS_NAME =
  'min-h-7 shrink-0 px-2 py-0.5 shadow-[2px_2px_0_var(--manga-black)]'

/**
 * The practice screen's only header: exercise title on the left, its metadata
 * and controls on the right, home logo at the far right.
 *
 * This row replaces the app topbar on this route. Practice is a focus screen -
 * the primary nav and the app name were spending a whole row that the learner
 * never uses mid-exercise, so the logo alone carries the way home and the row
 * is given over to the exercise itself.
 */
export function DictationPracticeHeader({
  completions,
  isResuming,
  level,
  onTranslationLanguageChange,
  title,
  translationLanguage,
  translationLanguages,
  videoId,
}: Props) {
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1.5">
      {/* basis-64 rather than a bare flex-1: when the row runs out of room the
          side controls wrap to their own line instead of squeezing the title
          down to an ellipsis. */}
      <div className="flex min-w-0 flex-1 basis-64 items-center gap-2">
        {/* The logo is the only way home on this screen, so the app name it
            replaced comes back as its tooltip. */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger
              render={
                <Link
                  href="/"
                  className="shrink-0"
                />
              }
            >
              <Image
                src="/logo.png"
                alt="English For Only Me home"
                width={58}
                height={58}
                priority
                className="border-manga-black bg-manga-white size-9 border-2 object-contain shadow-[2px_2px_0_var(--manga-black)]"
              />
            </TooltipTrigger>
            <TooltipContent
              side="bottom"
              className="rounded-none font-sans font-black uppercase"
            >
              English For Only Me
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {isResuming ? (
          <PageTag
            tone="pale"
            className={CHIP_CLASS_NAME}
          >
            Resume
          </PageTag>
        ) : null}
        {/* Clamped to one line: a long TED-Ed title would otherwise eat three
            rows of a height-locked screen. The full text stays on hover.
            Below sm it goes sr-only rather than hidden - a phone has no width
            to spare for it, but the screen still needs its one h1. */}
        <h1
          title={title}
          className="min-w-0 flex-1 truncate font-sans text-base leading-tight font-black tracking-normal max-sm:sr-only sm:text-lg"
        >
          {title}
        </h1>
        {level && (
          <PageTag
            tone="sky"
            className={CHIP_CLASS_NAME}
          >
            {level}
          </PageTag>
        )}
        <CompletionBadge
          completions={completions}
          className={CHIP_CLASS_NAME}
        />
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {completions > 0 ? (
          <IconButton
            href={`/dictation/videos/${videoId}/results`}
            label="View results"
            className="size-9 border-2 shadow-[2px_2px_0_var(--manga-black)]"
          >
            <Trophy
              aria-hidden="true"
              className="size-4"
            />
          </IconButton>
        ) : null}
        <DictationTranslationBar
          compact
          languages={translationLanguages}
          onChange={onTranslationLanguageChange}
          value={translationLanguage}
        />
      </div>
    </div>
  )
}

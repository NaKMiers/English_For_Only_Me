'use client'

import { Languages } from 'lucide-react'

import { MangaPanel } from '@/components/common/MangaPanel'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { getLanguageLabel } from '@/modules/dictation/translations/languages'

interface Props {
  className?: string
  isUnlocked: boolean
  language: string
  text: string
}

const NO_CAPTION_MESSAGE =
  'No caption for this moment in the selected language.'

export function DictationTranslation({
  className,
  isUnlocked,
  language,
  text,
}: Props) {
  if (!isUnlocked) return null

  const hasText = text.trim().length > 0

  return (
    <MangaPanel
      eyebrow="After effort"
      title="Translation"
      className={className}
      action={
        <Badge
          className="border-manga-black bg-manga-pale-red text-manga-black rounded-none border-2 font-black"
          variant="outline"
        >
          {getLanguageLabel(language)}
        </Badge>
      }
    >
      <div
        role="status"
        className={cn(
          'border-manga-black bg-manga-paper-soft flex items-start gap-3 border-2 p-3 text-base leading-7 font-semibold shadow-[3px_3px_0_var(--manga-black)]',
          hasText && 'bg-white'
        )}
      >
        <Languages
          aria-hidden="true"
          className="text-manga-red mt-1 size-5 shrink-0"
        />
        <span className="min-w-0 wrap-break-word">
          {hasText ? text : NO_CAPTION_MESSAGE}
        </span>
      </div>
    </MangaPanel>
  )
}

'use client'

import { Volume2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { useMessages } from '@/i18n/client'
import { format } from '@/i18n/format'
import { cn } from '@/lib/utils'
import type { VocabEntryApiRecord } from '@/modules/vocabulary/types'

interface Props {
  buttonClassName?: string
  className?: string
  entry?: VocabEntryApiRecord
  headingClassName?: string
  iconClassName?: string
  phonetics?: VocabEntryApiRecord['phonetics']
  pronunciationClassName?: string
  size?: 'md' | 'lg' | 'xl'
  speakTerm?: (term: string) => void
  term?: string
}

function getPronunciation({
  phonetics,
  term,
}: {
  phonetics: VocabEntryApiRecord['phonetics'] | undefined
  term: string
}) {
  const phonetic = phonetics?.find(item => item.text.trim().length > 0)

  if (phonetic) return phonetic.text

  return `/${term}/`
}

function speakFallback(term: string) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return

  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(term)

  utterance.lang = 'en-US'
  window.speechSynthesis.speak(utterance)
}

const headingClassNames = {
  md: 'text-3xl',
  lg: 'text-[clamp(2rem,7vw,4.5rem)]',
  xl: 'text-[clamp(2.4rem,6vw,5.4rem)]',
} as const

export function VocabTermHeader({
  buttonClassName,
  className,
  entry,
  headingClassName,
  iconClassName,
  phonetics,
  pronunciationClassName,
  size = 'md',
  speakTerm,
  term,
}: Props) {
  const t = useMessages().vocabulary.word
  const displayTerm = entry?.term ?? term ?? ''
  const pronunciation = getPronunciation({
    phonetics: entry?.phonetics ?? phonetics,
    term: displayTerm,
  })

  if (!displayTerm) return null

  return (
    <div
      className={cn(
        'flex min-w-0 items-start justify-between gap-3',
        className
      )}
    >
      <div className="grid min-w-0 gap-1">
        <h3
          className={cn(
            'font-sans leading-none font-semibold wrap-break-word',
            headingClassNames[size],
            headingClassName
          )}
        >
          {displayTerm}
        </h3>
        <p
          className={cn(
            'text-ink-soft font-sans text-sm leading-tight font-normal',
            pronunciationClassName
          )}
        >
          {pronunciation}
        </p>
      </div>
      <Button
        aria-label={format(t.speak, { term: displayTerm })}
        className={cn(
          'border-line bg-surface text-ink hover:bg-tint rounded-control soft-press size-10 shrink-0 border',
          buttonClassName
        )}
        onClick={() =>
          speakTerm ? speakTerm(displayTerm) : speakFallback(displayTerm)
        }
        size="icon"
        type="button"
        variant="ghost"
      >
        <Volume2
          aria-hidden="true"
          className={cn('size-5', iconClassName)}
        />
      </Button>
    </div>
  )
}

'use client'

import { BadgeCheck, CircleAlert } from 'lucide-react'

import { MangaPanel } from '@/components/common/MangaPanel'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { DictationAttemptApiRecord } from '@/modules/dictation/types'

interface Props {
  attempt: DictationAttemptApiRecord | null
  className?: string
}

const statusClassNames: Record<
  DictationAttemptApiRecord['feedbackTokens'][number]['status'],
  string
> = {
  correct: 'bg-emerald-50 text-emerald-800 border-emerald-700',
  extra: 'bg-amber-50 text-amber-900 border-amber-700',
  missing: 'bg-manga-pale-red text-manga-red border-manga-red',
  spellingVariant: 'bg-sky-50 text-sky-900 border-sky-700',
  wrong: 'bg-red-50 text-red-900 border-red-800',
}

function getTokenLabel(
  token: DictationAttemptApiRecord['feedbackTokens'][number]
) {
  if (token.status === 'extra')
    return `+ ${token.actualOriginal ?? token.actual}`
  if (token.status === 'missing')
    return `- ${token.expectedOriginal ?? token.expected}`
  if (token.status === 'wrong' || token.status === 'spellingVariant')
    return `${token.actualOriginal ?? token.actual} -> ${
      token.expectedOriginal ?? token.expected
    }`

  return token.expectedOriginal ?? token.expected ?? ''
}

export function DictationFeedback({ attempt, className }: Props) {
  if (!attempt) return null

  return (
    <MangaPanel
      eyebrow="Correction"
      title={attempt.isPassed ? 'Accepted' : 'Keep Listening'}
      className={className}
      action={
        <Badge
          className="border-manga-black bg-manga-white text-manga-black rounded-none border-2 font-black"
          variant="outline"
        >
          {attempt.stats.accuracy}%
        </Badge>
      }
    >
      <div
        role="status"
        className={cn(
          'border-manga-black flex items-start gap-3 border-2 p-3 text-sm leading-6 font-black shadow-[3px_3px_0_var(--manga-black)]',
          attempt.isPassed ? 'bg-emerald-50' : 'bg-manga-paper-soft'
        )}
      >
        {attempt.isPassed ? (
          <BadgeCheck
            aria-hidden="true"
            className="mt-0.5 size-5 shrink-0 text-emerald-700"
          />
        ) : (
          <CircleAlert
            aria-hidden="true"
            className="text-manga-red mt-0.5 size-5 shrink-0"
          />
        )}
        <span>
          {attempt.isPassed
            ? 'Correct. The server accepted this sentence.'
            : attempt.action === 'reveal'
              ? 'Answer revealed and recorded separately from a correct attempt.'
              : attempt.action === 'skip'
                ? 'Sentence skipped and recorded for later review.'
                : 'Not yet. Fix the marked words and try again.'}
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        {attempt.feedbackTokens.map((token, index) => (
          <span
            key={`${token.status}-${index}-${token.expected}-${token.actual}`}
            className={cn(
              'rounded-none border-2 px-2 py-1 text-sm font-black break-words',
              statusClassNames[token.status]
            )}
            title={token.status}
          >
            {getTokenLabel(token)}
          </span>
        ))}
      </div>
    </MangaPanel>
  )
}

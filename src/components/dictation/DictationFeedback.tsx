'use client'

import { BadgeCheck, CircleAlert } from 'lucide-react'

import { ContentPanel } from '@/components/common/ContentPanel'
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
  correct: 'bg-lesson-correct/10 text-lesson-correct border-lesson-correct',
  extra: 'bg-pastel-peach text-accent-orange border-accent-orange',
  missing: 'bg-danger-soft text-danger border-danger',
  spellingVariant: 'bg-pastel-sky text-accent-blue border-accent-blue',
  wrong: 'bg-danger-soft text-danger border-danger',
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
    <ContentPanel
      eyebrow="Correction"
      title={attempt.isPassed ? 'Accepted' : 'Keep Listening'}
      className={className}
      action={
        <Badge
          className="border-line bg-surface text-ink rounded-tag border font-semibold"
          variant="outline"
        >
          {attempt.stats.accuracy}%
        </Badge>
      }
    >
      <div
        role="status"
        className={cn(
          'border-line rounded-control flex items-start gap-3 border p-3 text-sm leading-6 font-semibold',
          'motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-1',
          attempt.isPassed ? 'bg-lesson-correct/10' : 'bg-tint'
        )}
      >
        {attempt.isPassed ? (
          <BadgeCheck
            aria-hidden="true"
            className="text-lesson-correct mt-0.5 size-5 shrink-0"
          />
        ) : (
          <CircleAlert
            aria-hidden="true"
            className="text-danger mt-0.5 size-5 shrink-0"
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
              'rounded-tag border px-2 py-1 text-sm font-semibold wrap-break-word',
              statusClassNames[token.status]
            )}
            title={token.status}
          >
            {getTokenLabel(token)}
          </span>
        ))}
      </div>
    </ContentPanel>
  )
}

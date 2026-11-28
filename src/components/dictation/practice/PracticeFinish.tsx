'use client'

import { ArrowRight, Headphones } from 'lucide-react'
import type { ReactNode } from 'react'

import { NextStopCard } from '@/components/journey/NextStopCard'
import { SessionEnd } from '@/components/journey/SessionEnd'
import { useMessages } from '@/i18n/client'
import { format } from '@/i18n/format'
import type { PracticeNextVideo } from '@/modules/dictation/practice/findNextVideo'

export type { PracticeNextVideo }

interface Props {
  /** Sentences written right this run. */
  correct: number
  /** The next video of the topic, or null (topic done, no topic). */
  next: PracticeNextVideo | null
  /** Quiet secondary actions: see results, repeat. */
  secondary: ReactNode
  total: number
}

/**
 * The end of a dictation run (peak-end rule): what was written first, then
 * one next stop into the next video of the topic, or back to the landing
 * when the topic is done. Results and repeat stay as quiet links.
 */
export function PracticeFinish({ correct, next, secondary, total }: Props) {
  const t = useMessages()
  const text = t.dictation.practice

  return (
    <SessionEnd
      headline={{
        icon: <Headphones />,
        unit: text.finishUnit,
        value: total,
      }}
      module="dictation"
      nextStop={
        <NextStopCard
          actionIcon={<ArrowRight aria-hidden="true" />}
          actionLabel={next ? text.nextVideo : text.allTopicsAction}
          detail={
            next
              ? format(text.nextInTopic, { topic: next.topicTitle })
              : text.topicDone
          }
          href={next?.href ?? '/dictation'}
          pinLabel={t.common.journey.nextStop}
          title={next?.title ?? t.dictation.landing.title}
          variant="compact"
        />
      }
      secondary={secondary}
      title={text.doneTitle}
      titleId="practice-finish-title"
      wins={format(text.finishWins, { correct, total })}
    />
  )
}

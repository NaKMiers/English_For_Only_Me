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
  /**
   * Sentences written right this run, or null when this visit did not
   * cover the whole video (a resumed run, or a video already done on load):
   * a count of part of the run would read as a score for all of it.
   */
  correct: number | null
  /** The end replaced the run in place: move focus to its heading. */
  focusTitle?: boolean
  /** False for a video outside any topic: no "topic is done" line. */
  hasTopic?: boolean
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
export function PracticeFinish({
  correct,
  focusTitle = false,
  hasTopic = true,
  next,
  secondary,
  total,
}: Props) {
  const t = useMessages()
  const text = t.dictation.practice

  return (
    <SessionEnd
      focusTitle={focusTitle}
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
              : hasTopic
                ? text.topicDone
                : text.noTopicNext
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
      wins={
        correct === null ? null : format(text.finishWins, { correct, total })
      }
    />
  )
}

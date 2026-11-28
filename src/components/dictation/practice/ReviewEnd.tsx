'use client'

import { ArrowRight } from 'lucide-react'

import { NextStopCard } from '@/components/journey/NextStopCard'
import { useMessages } from '@/i18n/client'
import { plural } from '@/i18n/format'
import { REVIEW_QUEUE_HREF } from '@/modules/dictation/review/reviewDeepLink'

interface Props {
  /** Sentences still due, this one included when it was not solved. */
  left: number
  /** The next due sentence's deep link, or the queue. */
  nextHref: string
}

/**
 * The end of one review sentence: how many are left and one next stop, into
 * the next due sentence or back to the queue. Nothing about the video's own
 * run: review mode never finishes it.
 */
export function ReviewEnd({ left, nextHref }: Props) {
  const t = useMessages()
  const text = t.dictation.reviewQueue
  const toQueue = nextHref === REVIEW_QUEUE_HREF

  return (
    <div
      className="grid gap-2"
      data-review-end=""
    >
      <NextStopCard
        actionIcon={<ArrowRight aria-hidden="true" />}
        actionLabel={toQueue ? text.endBack : text.endNext}
        href={nextHref}
        pinLabel={t.common.journey.nextStop}
        title={left > 0 ? plural(text.endLeft, left) : text.endClear}
        variant="compact"
      />
    </div>
  )
}

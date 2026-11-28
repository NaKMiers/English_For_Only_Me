'use client'

import { CheckCircle2, ChevronDown, PartyPopper } from 'lucide-react'

import { QueueRow } from '@/components/common/QueueRow'
import { EmptyState } from '@/components/journey/EmptyState'
import { ActionButton } from '@/components/ui/ActionButton'
import { DUE_ICON } from '@/constants/stateIcons'
import { useMessages } from '@/i18n/client'
import { format, plural } from '@/i18n/format'
import { reviewPracticeHref } from '@/modules/dictation/review/reviewDeepLink'
import type { DictationReviewItemApiRecord } from '@/modules/dictation/types'

/** Rows shown before the rest fold behind "N more". */
export const REVIEW_VISIBLE_ROWS = 5

interface Props {
  /**
   * Every due item, for the page head: `reviewItems` is capped, so its
   * length would undercount (and disagree with the landing's count).
   */
  dueCount?: number
  emptyMessage?: string
  reviewItems: DictationReviewItemApiRecord[]
  title?: string
}

export function DictationReviewQueue({
  dueCount,
  emptyMessage,
  reviewItems,
  title,
}: Props) {
  const t = useMessages()
  const text = t.dictation.reviewQueue
  const reasonLabel: Record<DictationReviewItemApiRecord['reason'], string> =
    text.reasons
  const due = reviewItems.filter(item => item.status !== 'completed')
  const first = due[0] ?? reviewItems[0] ?? null

  if (reviewItems.length === 0)
    return (
      <EmptyState
        action={{ href: '/dictation', label: text.toLanding }}
        body={emptyMessage ?? text.allCaughtUpBody}
        icon={<PartyPopper />}
        title={text.allCaughtUp}
      />
    )

  const row = (item: DictationReviewItemApiRecord) => (
    <li key={item.id}>
      <QueueRow
        href={reviewPracticeHref(item)}
        title={item.label}
        meta={format(text.itemMeta, {
          accuracy: item.statsSnapshot.accuracy,
          reason: reasonLabel[item.reason],
        })}
        action={
          item.status === 'completed' ? (
            <CheckCircle2
              aria-label={t.common.journey.allClear}
              className="text-lesson-correct size-5"
            />
          ) : null
        }
      />
    </li>
  )
  const visible = reviewItems.slice(0, REVIEW_VISIBLE_ROWS)
  const folded = reviewItems.slice(REVIEW_VISIBLE_ROWS)

  return (
    <section
      aria-label={title ?? text.title}
      className="grid gap-4"
    >
      {/* The head: the due count and one Start review. */}
      <div className="border-line from-pastel-sky to-surface rounded-panel flex flex-wrap items-center justify-between gap-4 border bg-linear-160 p-5">
        <p className="font-sans text-2xl font-medium tracking-tight">
          {plural(text.dueHead, Math.max(dueCount ?? 0, due.length))}
        </p>
        {first ? (
          <ActionButton
            data-next-stop=""
            href={reviewPracticeHref(first)}
            icon={<DUE_ICON aria-hidden="true" />}
            tone="ink"
          >
            {text.start}
          </ActionButton>
        ) : null}
      </div>

      <ul className="grid gap-2">{visible.map(row)}</ul>
      {folded.length > 0 ? (
        // Native disclosure: the long tail of the queue, out of the way.
        <details className="group grid gap-2">
          <summary className="soft-press hover-pop text-ink-soft rounded-control flex min-h-11 w-fit cursor-pointer list-none items-center gap-1.5 px-2 text-sm font-medium">
            <ChevronDown
              aria-hidden="true"
              className="size-4 transition-transform group-open:rotate-180"
            />
            {plural(t.common.journey.moreItems, folded.length)}
          </summary>
          <ul className="mt-2 grid gap-2">{folded.map(row)}</ul>
        </details>
      ) : null}
    </section>
  )
}

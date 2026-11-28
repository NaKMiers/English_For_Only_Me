'use client'

import { ChevronDown } from 'lucide-react'
import { useRef, useState } from 'react'

import { InlineNotice } from '@/components/common/InlineNotice'
import { useClientOutbox } from '@/components/common/OutboxOwnerProvider'
import {
  Collapsible,
  CollapsiblePanel,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  type ExploreDecision,
  VocabularyExplorePanel,
} from '@/components/vocabulary/VocabularyExplorePanel'
import {
  buildOptimisticUserItem,
  createEntryWriteTracker,
  enqueueVocabItemStatus,
  type VocabMarkStatus,
} from '@/components/vocabulary/vocabItemWrites'
import { useMessages } from '@/i18n/client'
import { format } from '@/i18n/format'
import type {
  UserVocabItemApiRecord,
  VocabEntryWithUserStateRecord,
} from '@/modules/vocabulary/types'

interface Props {
  entries: VocabEntryWithUserStateRecord[]
}

function toDecision(
  item: UserVocabItemApiRecord | null
): ExploreDecision | undefined {
  if (!item) return undefined
  if (item.status === 'learning') return 'shouldLearn'
  if (item.status === 'alreadyKnow' || item.status === 'mastered')
    return 'alreadyKnow'

  return undefined
}

function toDecisions(entries: VocabEntryWithUserStateRecord[]) {
  const decisions: Record<string, ExploreDecision> = {}

  for (const item of entries) {
    const decision = toDecision(item.userItem)

    if (decision) decisions[item.entry.id] = decision
  }

  return decisions
}

/**
 * The words of one IELTS test, read before starting it. The Vocab page's
 * Explore deck with a fixed list: "Should Learn" puts the word in the recall
 * queue, "Already Know" marks it known, through the same outbox lane.
 */
export function TestVocabPanel({ entries: initialEntries }: Props) {
  const t = useMessages().ielts.testPage
  const outbox = useClientOutbox()
  const [entries, setEntries] = useState(initialEntries)
  const [decisions, setDecisions] = useState(() => toDecisions(initialEntries))
  const [activeIndex, setActiveIndex] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const trackerRef = useRef(
    createEntryWriteTracker<UserVocabItemApiRecord | null>()
  )

  function applyUserItem(entryId: string, item: UserVocabItemApiRecord | null) {
    setEntries(current =>
      current.map(entry =>
        entry.entry.id === entryId ? { ...entry, userItem: item } : entry
      )
    )
    setDecisions(current => {
      const next = { ...current }
      const decision = toDecision(item)

      if (decision) next[entryId] = decision
      else delete next[entryId]

      return next
    })
  }

  function showIndex(index: number) {
    setActiveIndex(Math.min(Math.max(index, 0), entries.length - 1))
  }

  async function markEntry({
    entry,
    status,
  }: {
    entry: VocabEntryWithUserStateRecord
    status: VocabMarkStatus
  }) {
    const entryId = entry.entry.id
    const ticket = trackerRef.current.begin(entryId, entry.userItem)

    setError(null)
    applyUserItem(
      entryId,
      buildOptimisticUserItem({ entry, source: 'ielts', status })
    )
    setDecisions(current => ({ ...current, [entryId]: status }))
    setActiveIndex(current => Math.min(current + 1, entries.length - 1))

    const outcome = await enqueueVocabItemStatus(outbox, {
      source: 'ielts',
      status,
      vocabEntryId: entryId,
    })
    const settled = trackerRef.current.settle(
      entryId,
      ticket,
      outcome.kind === 'saved'
        ? { kind: 'saved', state: outcome.item }
        : outcome
    )

    if (settled.kind === 'ignore') return

    applyUserItem(entryId, settled.state)

    if (settled.kind === 'rollback' && outcome.kind === 'failed')
      setError(outcome.error)
  }

  if (!entries.length) return null

  return (
    // Folded behind one row: the words are a warm-up, not the page.
    <Collapsible
      aria-label={t.vocabLabel}
      className="grid gap-2"
    >
      <CollapsibleTrigger className="soft-press hover-pop group border-line bg-surface rounded-panel flex min-h-12 w-full items-center justify-between gap-3 border px-4 py-3 text-left font-sans text-base font-medium">
        {format(t.vocabEyebrow, { count: entries.length })}
        <ChevronDown
          aria-hidden="true"
          className="size-5 transition-transform group-data-panel-open:rotate-180"
        />
      </CollapsibleTrigger>
      <CollapsiblePanel className="grid gap-2">
        <VocabularyExplorePanel
          activeIndex={activeIndex}
          decisions={decisions}
          entries={entries}
          eyebrow={format(t.vocabEyebrow, { count: entries.length })}
          markEntry={input => void markEntry(input)}
          moveExplore={delta => showIndex(activeIndex + delta)}
          numbering="position"
          showExploreIndex={showIndex}
          source="ielts"
          title={t.vocabTitle}
        />
        {error ? <InlineNotice tone="error">{error}</InlineNotice> : null}
      </CollapsiblePanel>
    </Collapsible>
  )
}

'use client'

import { BookA } from 'lucide-react'
import type { ReactNode } from 'react'

import { InlineNotice } from '@/components/common/InlineNotice'
import { PageHeader } from '@/components/common/PageHeader'
import { ContinueFloat } from '@/components/journey/ContinueFloat'
import { DrawerRow } from '@/components/journey/SideDrawer'
import { useMessages } from '@/i18n/client'
import { pickNextStop } from '@/lib/journey/nextStop'
import type { VocabStatsRecord } from '@/modules/vocabulary/types'

import { VOCAB_EXPLORE_ACTIVE_ID, VOCAB_EXPLORE_ID } from './vocabExploreIds'
import { VocabularyStatsOverview } from './VocabularyStatsOverview'
import { WordGardenHero, type GardenNextStop } from './WordGardenHero'

export { VOCAB_EXPLORE_ID }

interface Props {
  /** The browse area: search, then the explore deck. */
  children: ReactNode
  errorMessage: string | null
  /** The first due card's word, or null with nothing due. */
  nextTerm: string | null
  /** Due cards: from stats, at least the cards already held. */
  dueCount: number
  onStartRecall: () => void
  stats: VocabStatsRecord
  statusMessage: string | null
}

/**
 * The vocabulary landing on the shared skeleton: the garden journey card
 * (its next stop is the recall session; with nothing due a Continue float
 * leads to the explore deck instead), the "How a word grows" drawer, then the browse area (the link to
 * every saved word sits in its search card's header).
 */
export function VocabularyLanding({
  children,
  dueCount,
  errorMessage,
  nextTerm,
  onStartRecall,
  stats,
  statusMessage,
}: Props) {
  const messages = useMessages()
  const vocab = messages.vocabulary
  const picked = pickNextStop<GardenNextStop>([
    nextTerm && dueCount > 0
      ? {
          data: { due: dueCount, nextTerm, onStart: onStartRecall },
          kind: 'due',
        }
      : null,
  ])
  const next = picked.kind === 'done' ? null : picked.data

  return (
    <div className="grid gap-5 px-4 pb-6 md:pr-6 md:pl-0">
      <PageHeader
        icon={<BookA />}
        iconClassName="bg-pastel-mint text-accent-green"
        inTopbar
        subtitle={vocab.dashboard.intro}
        title={vocab.dashboard.title}
      />

      {errorMessage ? (
        <InlineNotice tone="error">{errorMessage}</InlineNotice>
      ) : null}
      {statusMessage ? (
        <div aria-live="polite">
          <InlineNotice>{statusMessage}</InlineNotice>
        </div>
      ) : null}

      <DrawerRow
        side={
          <VocabularyStatsOverview
            className="h-full lg:min-w-[280px]"
            stats={stats}
          />
        }
        sideId="vocab-garden-side"
      >
        <WordGardenHero
          next={next}
          stats={stats}
          withDrawer
        />
      </DrawerRow>

      {children}

      {/* Nothing due: planting new words is the way on, so the float stays
          on screen and bounces the deck once the scroll settles. */}
      {next ? null : (
        <ContinueFloat
          fallbackId={VOCAB_EXPLORE_ID}
          label={messages.common.journey.continue}
          nextStopId={null}
          nudge="[data-explore-deck]"
          persistent
          targetId={VOCAB_EXPLORE_ACTIVE_ID}
        />
      )}
    </div>
  )
}

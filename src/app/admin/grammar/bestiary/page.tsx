import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { AppTopbar } from '@/components/common/AppTopbar'
import { AuthControl } from '@/components/common/AuthControl'
import { MangaPageShell } from '@/components/common/MangaPageShell'
import { CreatureSlot } from '@/components/grammar/cast/CreatureSlot'
import {
  GRAMMAR_FAMILIES,
  GRAMMAR_FAMILY_LABELS,
  GRAMMAR_REVIEW_STATUSES,
  GRAMMAR_USER_ITEM_STATUSES,
} from '@/modules/grammar/constants'
import { creatureFromPoint } from '@/modules/grammar/presentation/creatureFromPoint'
import { resolveCreatureState } from '@/modules/grammar/presentation/resolveCreatureState'
import type { MenaceTier } from '@/modules/grammar/presentation/types'
import { isL1RiskToolEnabled } from '@/modules/grammar/services/grammarRouteDecisions'

export const metadata: Metadata = { title: 'Bestiary Sheet' }
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const TIERS: MenaceTier[] = [1, 2, 3, 4, 5]

/**
 * Every creature, every tier, every state, on one page.
 *
 * Development only, and not a learner surface: this is the contact sheet for
 * drawing the cast. Seventeen species across five tiers and ten creature states
 * is a lot of combinations, and the ones that look wrong are only findable by
 * looking. Gated behind the same check as the l1Risk tool.
 */
export default async function BestiarySheetPage() {
  if (!isL1RiskToolEnabled()) notFound()

  return (
    <MangaPageShell
      topbar={
        <AppTopbar
          activeHref="/admin/grammar"
          authControl={<AuthControl />}
          subtitle="Bestiary contact sheet"
        />
      }
    >
      <section className="grid gap-8 p-4 sm:p-6 lg:p-8">
        <div className="grid gap-4">
          <h2 className="font-sans text-2xl font-black uppercase">
            Every species, tiers 1 to 5
          </h2>
          {GRAMMAR_FAMILIES.map(family => (
            <div
              className="grid gap-2"
              key={family}
            >
              <h3 className="font-sans text-sm font-black uppercase">
                {GRAMMAR_FAMILY_LABELS[family]}
              </h3>
              <div className="flex flex-wrap gap-2">
                {TIERS.map(menace => (
                  <CreatureSlot
                    className="max-w-32"
                    key={menace}
                    spec={{
                      ...creatureFromPoint({
                        point: {
                          complexity: 3,
                          family,
                          l1Risk: 'medium',
                          title: GRAMMAR_FAMILY_LABELS[family],
                        },
                        recallStage: menace,
                      }),
                      menace,
                    }}
                    state={resolveCreatureState({
                      reviewStatus: 'reviewed',
                      status: 'learning',
                    })}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="grid gap-4">
          <h2 className="font-sans text-2xl font-black uppercase">
            All ten creature states
          </h2>
          {GRAMMAR_REVIEW_STATUSES.map(reviewStatus => (
            <div
              className="grid gap-2"
              key={reviewStatus}
            >
              <h3 className="font-sans text-sm font-black uppercase">
                {reviewStatus}
              </h3>
              <div className="flex flex-wrap gap-2">
                {[null, ...GRAMMAR_USER_ITEM_STATUSES].map(status => (
                  <CreatureSlot
                    className="max-w-32"
                    key={status ?? 'none'}
                    spec={creatureFromPoint({
                      point: {
                        complexity: 5,
                        family: 'articles-determiners',
                        l1Risk: 'high',
                        title: status ?? 'untouched',
                      },
                      recallStage: status == null ? null : 4,
                    })}
                    state={resolveCreatureState({ reviewStatus, status })}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </MangaPageShell>
  )
}

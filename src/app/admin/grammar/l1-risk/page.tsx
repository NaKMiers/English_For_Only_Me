import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { AppTopbar } from '@/components/common/AppTopbar'
import { AuthControl } from '@/components/common/AuthControl'
import { MangaPageShell } from '@/components/common/MangaPageShell'
import { AdminL1RiskPanel } from '@/components/grammar/AdminL1RiskPanel'
import { loadGrammarContent } from '@/modules/grammar/seed/loadGrammarContent'
import { isL1RiskToolEnabled } from '@/modules/grammar/services/grammarRouteDecisions'
import { buildL1RiskQueue } from '@/modules/grammar/taxonomy/buildL1RiskQueue'

export const metadata: Metadata = { title: 'Admin L1 Risk' }
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Judge how hard each of the 184 points really is for a Vietnamese speaker.
 *
 * Reads the committed taxonomy file, not the database: the file is the source of
 * truth for `l1RiskObserved`, and reading it here means the page shows exactly
 * what is on disk, including judgments made moments ago and not yet seeded.
 *
 * Development only. `notFound()` rather than a redirect or an explanatory page,
 * so a deployed build gives away nothing about a route that writes source files.
 */
export default async function AdminL1RiskPage() {
  if (!isL1RiskToolEnabled()) notFound()

  const entries = buildL1RiskQueue(loadGrammarContent())

  return (
    <MangaPageShell
      topbar={
        <AppTopbar
          activeHref="/admin/grammar"
          authControl={<AuthControl />}
          subtitle="Admin l1Risk judgment"
        />
      }
    >
      <section className="grid gap-5 p-4 sm:p-6 lg:p-8">
        <AdminL1RiskPanel entries={entries} />
      </section>
    </MangaPageShell>
  )
}

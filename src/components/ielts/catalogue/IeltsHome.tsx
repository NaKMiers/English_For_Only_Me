import { GraduationCap } from 'lucide-react'

import { PageHeader } from '@/components/common/PageHeader'
import { ContinueFloat } from '@/components/journey/ContinueFloat'
import { DrawerRow } from '@/components/journey/SideDrawer'
import { getMessages } from '@/i18n/server'
import type { IeltsHomeData } from '@/modules/ielts/services/ieltsPageData'

import { groupCatalogue } from './catalogueGroups'
import { JourneyHero } from './JourneyHero'
import { ProgressTabs } from './ProgressTabs'
import { TestPath } from './TestPath'
import { HERE_STATION_ID, pickNextTest } from './testPath'
import { ExamButton, ExamCard, ExamSheet } from '@/components/ielts/ui'

/**
 * The IELTS landing page as a journey, kept minimal: the journey card (the
 * trail of milestones, the steps left in each stage and the numbers), with the recent attempts and weak
 * spots card folded away until its toggle slides it out beside the journey,
 * then every book as a metro line of test stations.
 * The floating Continue button is always on screen and scrolls to the next
 * test station; there is no next stop card.
 * Admins reach the editor from the account menu. Unfinished attempts are not
 * surfaced here.
 */
export async function IeltsHome({
  attempts,
  catalog,
  error,
  isAdmin,
  overall,
  testBands,
  weakness,
}: IeltsHomeData) {
  const messages = await getMessages()
  const t = messages.ielts
  const groups = groupCatalogue(catalog)
  const next = pickNextTest(groups, testBands)

  return (
    <ExamSheet>
      {/* From md the heading sits in the topbar (AppTopbar page). */}
      <PageHeader
        inTopbar
        icon={<GraduationCap />}
        iconClassName="bg-pastel-peach text-accent-orange"
        subtitle={t.home.intro}
        title={messages.common.modules.ielts.title}
      />

      {!error && catalog.length ? (
        <DrawerRow
          sideId="ielts-progress-side"
          side={
            <ProgressTabs
              attempts={attempts}
              className="h-full lg:min-w-[300px]"
              weakness={weakness}
            />
          }
        >
          <JourneyHero
            attempts={attempts}
            bands={testBands}
            groups={groups}
            messages={messages}
            now={new Date()}
            overall={overall}
          />
        </DrawerRow>
      ) : null}

      {error ? (
        <ExamCard title={t.home.loadFailedTitle}>
          <p>{t.home[error]}</p>
          <ExamButton
            href="/ielts"
            tone="ink"
          >
            {messages.common.actions.retry}
          </ExamButton>
        </ExamCard>
      ) : catalog.length ? (
        <TestPath
          bands={testBands}
          catalog={catalog}
        />
      ) : (
        <ExamCard title={t.home.noTestsTitle}>
          <p>{isAdmin ? t.home.createFirst : t.home.newTestsAppear}</p>
          {isAdmin ? (
            <ExamButton
              href="/admin/ielts"
              tone="ink"
            >
              {t.home.createTest}
            </ExamButton>
          ) : null}
        </ExamCard>
      )}

      <p className="text-ink-soft text-xs">{t.home.disclaimer}</p>

      {next ? (
        <ContinueFloat
          label={messages.common.journey.continue}
          nextStopId={null}
          persistent
          targetId={HERE_STATION_ID}
        />
      ) : null}
    </ExamSheet>
  )
}

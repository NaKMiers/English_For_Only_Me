// TEMPORARY visual harness for the IELTS editor redesign. Delete after review.
import { notFound } from 'next/navigation'

import { AppTopbar } from '@/components/common/AppTopbar'
import { MangaPageShell } from '@/components/common/MangaPageShell'
import { TestEditor } from '@/components/ielts/editor/TestEditor'
import { IELTS_SAMPLE_TEST } from '@/modules/ielts/fixtures/sampleTest'
import type { IeltsAdminTest } from '@/modules/ielts/tests/testService'

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  if (process.env.NODE_ENV !== 'development') notFound()

  const { status = 'draft' } = await searchParams
  const sections = structuredClone(IELTS_SAMPLE_TEST.sections)

  sections[1].genStatus = 'needsRepair'
  sections[2].genStatus = 'pending'
  sections[5].groups[0].questions[0].answers = []

  const test = {
    ...IELTS_SAMPLE_TEST,
    id: 'dev',
    status,
    sections,
    metaRevision: 1,
    plan: null,
    generationLog: Array.from({ length: 14 }, (_, index) => ({
      at: new Date(2026, 9, 1 + index).toISOString(),
      sectionKey: sections[index % sections.length].key,
      kind: 'draft',
      model: 'x',
      inputTokens: 1200,
      outputTokens: 3400,
      durationMs: 12400,
      outcome: index % 4 ? 'ok' : 'needsRepair',
      failedRules: index % 4 ? [] : ['evidence_verbatim'],
      error: '',
    })),
  } as unknown as IeltsAdminTest

  return (
    <MangaPageShell
      className="overflow-clip"
      topbar={
        <AppTopbar
          compact
          subtitle="Admin · IELTS"
        />
      }
    >
      <TestEditor
        initial={test}
        seriesOptions={['Cambridge 19', 'IELTS 21']}
      />
    </MangaPageShell>
  )
}

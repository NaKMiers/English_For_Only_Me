import { PageShell } from '@/components/common/PageShell'
import { ExamButton, ExamCard } from '@/components/ielts/ui'
import { getMessages } from '@/i18n/server'

export default async function IeltsNotFound() {
  const t = await getMessages()

  return (
    <PageShell>
      <div className="grid place-items-center p-6">
        <ExamCard title={t.ielts.boundary.notFoundTitle}>
          <p>{t.ielts.boundary.notFoundBody}</p>
          <ExamButton
            href="/ielts"
            tone="ink"
          >
            {t.ielts.boundary.backToIelts}
          </ExamButton>
        </ExamCard>
      </div>
    </PageShell>
  )
}

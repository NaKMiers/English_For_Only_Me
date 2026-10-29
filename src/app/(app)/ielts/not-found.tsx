import { MangaPageShell } from '@/components/common/MangaPageShell'
import { ExamButton, ExamCard } from '@/components/ielts/ui'

export default function IeltsNotFound() {
  return (
    <MangaPageShell>
      <div className="grid place-items-center p-6">
        <ExamCard title="Not found">
          <p>
            This test or attempt does not exist, is not published, or is not
            yours.
          </p>
          <ExamButton
            href="/ielts"
            tone="ink"
          >
            Back to IELTS
          </ExamButton>
        </ExamCard>
      </div>
    </MangaPageShell>
  )
}

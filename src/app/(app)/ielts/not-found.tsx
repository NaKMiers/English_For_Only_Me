import { MangaPageShell } from '@/components/common/MangaPageShell'
import { ExamButton, ExamCard } from '@/components/ielts/ui'

export default function IeltsNotFound() {
  return (
    <MangaPageShell>
      <div className="grid place-items-center p-6">
        <ExamCard title="Không tìm thấy">
          <p>
            Đề hoặc bài làm này không tồn tại, chưa xuất bản, hoặc không phải
            của bạn.
          </p>
          <ExamButton
            href="/ielts"
            tone="ink"
          >
            Về IELTS
          </ExamButton>
        </ExamCard>
      </div>
    </MangaPageShell>
  )
}

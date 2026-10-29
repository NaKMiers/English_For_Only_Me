import type { Metadata } from 'next'
import Link from 'next/link'

import { AppTopbar } from '@/components/common/AppTopbar'
import { AuthControl } from '@/components/common/AuthControl'
import { MangaPageShell } from '@/components/common/MangaPageShell'
import { CreateTestPanel } from '@/components/ielts/editor/CreateTestPanel'
import { hasMongoDbUri } from '@/constants/environments'
import { connectDatabase } from '@/lib/db/connectDatabase'
import {
  type IeltsAdminTestRow,
  listAdminTests,
} from '@/modules/ielts/tests/testService'
import { ExamBadge, ExamCard, ExamSheet } from '@/components/ielts/ui'

export const metadata: Metadata = { title: 'Admin · IELTS' }
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const GROUPS = [
  ['draft', 'Bản nháp'],
  ['published', 'Đã xuất bản'],
  ['archived', 'Lưu trữ'],
] as const

const dateFormat = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

function readyCount(row: IeltsAdminTestRow) {
  return row.sections.filter(
    section => section.genStatus === 'ready' || section.genStatus === 'manual'
  ).length
}

export default async function AdminIeltsPage() {
  let tests: IeltsAdminTestRow[] = []
  let error = ''

  if (hasMongoDbUri())
    try {
      await connectDatabase()
      tests = await listAdminTests()
    } catch (caught) {
      console.error('admin ielts list failed', { caught })
      error = 'Không tải được danh sách đề.'
    }
  else error = 'Chưa cấu hình cơ sở dữ liệu.'

  return (
    <MangaPageShell
      topbar={
        <AppTopbar
          authControl={<AuthControl />}
          subtitle="Admin"
        />
      }
    >
      <ExamSheet>
        <header className="grid gap-2">
          <nav
            aria-label="Breadcrumb"
            className="text-ex-muted text-sm"
          >
            <Link
              className="hover:text-ex-accent underline"
              href="/admin"
            >
              Admin
            </Link>{' '}
            / IELTS
          </nav>
          <ExamBadge tone="ink">IELTS</ExamBadge>
          <h1 className="text-ex-ink font-sans text-2xl leading-tight font-bold sm:text-3xl">
            Đề IELTS
          </h1>
        </header>
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="grid content-start gap-5">
            {error ? (
              <ExamCard title="Lỗi">
                <p>{error}</p>
              </ExamCard>
            ) : tests.length === 0 ? (
              <ExamCard title="Chưa có đề">
                <p>Chưa có đề. Tạo đề tay hoặc bằng AI.</p>
              </ExamCard>
            ) : (
              GROUPS.map(([status, label]) => {
                const rows = tests.filter(test => test.status === status)

                if (!rows.length) return null

                return (
                  <ExamCard
                    key={status}
                    title={`${label} (${rows.length})`}
                  >
                    <ul className="grid gap-2">
                      {rows.map(row => (
                        <li key={row.id}>
                          <Link
                            className="border-ex-line hover:bg-ex-soft grid gap-1 rounded-lg border bg-white px-3 py-2 sm:grid-cols-[1fr_auto] sm:items-center"
                            href={`/admin/ielts/${row.id}`}
                          >
                            <span className="grid gap-0.5">
                              <strong className="font-sans font-bold">
                                {row.title}
                              </strong>
                              <span className="text-ex-muted text-xs font-semibold">
                                {row.slug} · v{row.version} · {row.source} ·{' '}
                                {row.track}
                              </span>
                            </span>
                            <span className="text-xs font-semibold tabular-nums">
                              {readyCount(row)}/{row.sections.length} phần sẵn
                              sàng
                              {row.updatedAt
                                ? ` · ${dateFormat.format(new Date(row.updatedAt))}`
                                : ''}
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </ExamCard>
                )
              })
            )}
          </div>
          <CreateTestPanel />
        </div>
      </ExamSheet>
    </MangaPageShell>
  )
}

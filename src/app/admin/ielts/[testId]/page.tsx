import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { AppTopbar } from '@/components/common/AppTopbar'
import { AuthControl } from '@/components/common/AuthControl'
import { MangaPageShell } from '@/components/common/MangaPageShell'
import { TestEditor } from '@/components/ielts/editor/TestEditor'
import { hasMongoDbUri } from '@/constants/environments'
import { connectDatabase } from '@/lib/db/connectDatabase'
import { parseTestId } from '@/modules/ielts/tests/testRouteDecisions'
import { readAdminTest } from '@/modules/ielts/tests/testService'

export const metadata: Metadata = { title: 'Admin · Soạn đề IELTS' }
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

interface Props {
  params: Promise<{ testId: string }>
}

export default async function AdminIeltsEditorPage({ params }: Props) {
  const id = parseTestId((await params).testId)

  if (!id.ok || !hasMongoDbUri()) notFound()

  await connectDatabase()

  const test = await readAdminTest(id.data)

  if (!test) notFound()

  return (
    <MangaPageShell
      topbar={
        <AppTopbar
          authControl={<AuthControl />}
          subtitle="Admin · IELTS"
        />
      }
    >
      <nav
        aria-label="Breadcrumb"
        className="px-4 pt-4 text-sm font-semibold"
      >
        <Link
          className="underline"
          href="/admin"
        >
          Admin
        </Link>{' '}
        /{' '}
        <Link
          className="underline"
          href="/admin/ielts"
        >
          IELTS
        </Link>{' '}
        / {test.title}
        {test.status === 'published' ? (
          <>
            {' · '}
            <Link
              className="underline"
              href={`/ielts/${test.slug}`}
            >
              Xem như học viên
            </Link>
          </>
        ) : null}
      </nav>
      <TestEditor
        initial={test}
        key={test.id}
      />
    </MangaPageShell>
  )
}

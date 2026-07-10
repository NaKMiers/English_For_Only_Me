import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { AppTopbar } from '@/components/common/AppTopbar'
import { MangaPageShell } from '@/components/common/MangaPageShell'
import { AuthControl } from '@/components/common/AuthControl'
import { DictationImportForm } from '@/components/dictation/DictationImportForm'
import { PageTag } from '@/components/ui/PageTag'
import { getOptionalUser } from '@/modules/dictation/services/getCurrentUser'

export const metadata: Metadata = {
  title: 'Import Dictation Video',
  description:
    'Save a YouTube video and attach manual English transcript source text.',
}

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export default async function DictationImportPage() {
  // Admin-only: importing creates shared catalog content (gated in place;
  // relocation into /admin is a deferred follow-up).
  const user = await getOptionalUser()
  if (!user) redirect('/api/auth/signin?callbackUrl=/dictation/import')
  if (user.role !== 'admin') redirect('/dictation')

  return (
    <MangaPageShell
      topbar={
        <AppTopbar
          activeHref="/dictation"
          subtitle="Dictation Lab import desk"
          authControl={<AuthControl />}
        />
      }
      footer={
        <div className="border-manga-black bg-manga-black text-manga-white border-t-3 px-5 py-4">
          <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-3">
            <strong className="font-sans text-base font-black tracking-normal uppercase">
              English For Only Me
            </strong>
            <span className="text-manga-pale-red text-sm font-semibold">
              Official metadata. User-provided transcript. No hidden scraping.
            </span>
          </div>
        </div>
      }
    >
      <div className="grid gap-5 p-3 sm:p-5">
        <section
          aria-labelledby="dictation-import-title"
          className="border-manga-black bg-manga-white/92 grid min-w-0 overflow-hidden border-3 shadow-[6px_6px_0_var(--manga-black)]"
        >
          <div className="border-manga-black bg-manga-white/90 flex min-w-0 flex-wrap items-start justify-between gap-4 border-b-3 p-4 sm:p-5">
            <div className="grid min-w-0 gap-3">
              <p className="text-manga-red text-xs leading-tight font-black tracking-normal uppercase">
                Listening module import page
              </p>
              <h1
                id="dictation-import-title"
                className="font-sans text-[clamp(2rem,7vw,4.75rem)] leading-none font-black tracking-normal wrap-break-word uppercase"
              >
                Add Dictation Source
              </h1>
              <p className="text-manga-ink-soft max-w-3xl text-base leading-7 font-semibold">
                Save a YouTube video, then attach the English transcript source
                that future segmenting and practice will trust.
              </p>
            </div>
            <PageTag tone="red">Import</PageTag>
          </div>

          <div className="p-4 sm:p-5">
            <DictationImportForm />
          </div>
        </section>
      </div>
    </MangaPageShell>
  )
}

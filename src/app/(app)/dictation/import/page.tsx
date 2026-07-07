import type { Metadata } from 'next'

import { AppTopbar } from '@/components/common/AppTopbar'
import { MangaPageShell } from '@/components/common/MangaPageShell'
import { DictationImportForm } from '@/components/dictation/DictationImportForm'
import { PageTag } from '@/components/ui/PageTag'

export const metadata: Metadata = {
  title: 'Import Dictation Video',
  description:
    'Save a YouTube video and attach manual English transcript source text.',
}

export default function DictationImportPage() {
  return (
    <MangaPageShell
      topbar={
        <AppTopbar
          activeHref="/dictation"
          subtitle="Dictation Lab import desk"
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

import { AppTopbar } from '@/components/common/AppTopbar'
import { AuthControl } from '@/components/common/AuthControl'
import { MangaPageShell } from '@/components/common/MangaPageShell'
import { PageTag } from '@/components/ui/PageTag'
import type {
  DictationGlobalStatsRecord,
  DictationReviewItemApiRecord,
  DictationVideoApiRecord,
} from '@/modules/dictation/types'

import { DictationSceneTabs } from './DictationSceneTabs'

interface Props {
  globalStats?: DictationGlobalStatsRecord | null
  reviewItems?: DictationReviewItemApiRecord[]
  videos?: DictationVideoApiRecord[]
}

export function DictationHome({
  globalStats = null,
  reviewItems = [],
  videos = [],
}: Props) {
  return (
    <MangaPageShell
      topbar={
        <AppTopbar
          activeHref="/dictation"
          subtitle="Dictation Lab is the listening module"
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
              Connected to saved videos, attempts, and review where available.
            </span>
          </div>
        </div>
      }
    >
      <div className="grid gap-5 p-3 sm:p-5">
        <section
          aria-labelledby="dictation-title"
          className="border-manga-black bg-manga-white/92 grid min-w-0 overflow-hidden border-3 shadow-[6px_6px_0_var(--manga-black)]"
        >
          <div className="border-manga-black bg-manga-white/90 flex min-w-0 flex-wrap items-start justify-between gap-4 border-b-3 p-4 sm:p-5">
            <div className="grid min-w-0 gap-3">
              <p className="text-manga-red text-xs leading-tight font-black tracking-normal uppercase">
                Listening module inside English For Only Me
              </p>
              <h1
                id="dictation-title"
                className="font-sans text-[clamp(2rem,7vw,5rem)] leading-none font-black tracking-normal wrap-break-word uppercase"
              >
                Dictation Lab
              </h1>
              <p className="text-manga-ink-soft max-w-3xl text-base leading-7 font-semibold">
                Import a video, type what I hear, check sentence by sentence,
                then turn weak spots into review.
              </p>
            </div>
            <PageTag tone="red">Listening</PageTag>
          </div>

          <DictationSceneTabs
            globalStats={globalStats}
            reviewItems={reviewItems}
            videos={videos}
          />
        </section>
      </div>
    </MangaPageShell>
  )
}

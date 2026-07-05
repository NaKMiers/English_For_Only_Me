import { AppTopbar } from '@/components/common/AppTopbar'
import { MangaPageShell } from '@/components/common/MangaPageShell'
import { PageTag } from '@/components/ui/PageTag'
import type { DictationGlobalStatsRecord } from '@/modules/dictation/types'

import { HomeFutureModuleMap } from './HomeFutureModuleMap'
import { HomeIeltsSnapshot } from './HomeIeltsSnapshot'
import { HomeModuleLauncher } from './HomeModuleLauncher'
import { HomeTodayPanel } from './HomeTodayPanel'

function StudyDeskSketch() {
  return (
    <div
      aria-label="Pencil sketch of the English For Only Me study desk"
      className="border-manga-black bg-manga-pale-red relative min-h-[270px] overflow-hidden border-3 shadow-[inset_0_0_0_9px_rgba(255,255,255,0.38),4px_4px_0_var(--manga-black)] sm:min-h-[390px]"
    >
      <svg
        role="img"
        aria-label="Hand drawn study desk with app modules"
        viewBox="0 0 820 460"
        className="text-manga-black min-h-[270px] w-full sm:min-h-[390px]"
      >
        <rect
          x="54"
          y="40"
          width="708"
          height="344"
          rx="2"
          fill="#ffffff"
          stroke="currentColor"
          strokeWidth="8"
        />
        <path
          d="M92 318 C188 190 252 248 340 150 C442 34 556 168 706 86"
          stroke="currentColor"
          strokeWidth="6"
          fill="none"
        />
        <rect
          x="112"
          y="88"
          width="172"
          height="102"
          fill="#fff0ef"
          stroke="currentColor"
          strokeWidth="6"
          transform="rotate(-2 198 139)"
        />
        <rect
          x="326"
          y="78"
          width="176"
          height="114"
          fill="#f6f6f6"
          stroke="currentColor"
          strokeWidth="6"
          transform="rotate(1.4 414 135)"
        />
        <rect
          x="548"
          y="98"
          width="132"
          height="92"
          fill="#ffe0dc"
          stroke="currentColor"
          strokeWidth="6"
          transform="rotate(-1.2 614 144)"
        />
        <path
          d="M164 137h68M164 158h92M374 126h84M374 150h62M585 137h54M585 158h40"
          stroke="currentColor"
          strokeWidth="5"
        />
        <path
          d="M196 239 l64 0 l-32 56Z"
          fill="#e03020"
          stroke="currentColor"
          strokeWidth="7"
        />
        <path
          d="M386 234 h140M386 260 h190M386 286 h124"
          stroke="currentColor"
          strokeWidth="6"
        />
        <rect
          x="86"
          y="408"
          width="660"
          height="20"
          fill="#ffffff"
          stroke="currentColor"
          strokeWidth="5"
        />
        <rect
          x="86"
          y="408"
          width="392"
          height="20"
          fill="#e03020"
          stroke="currentColor"
          strokeWidth="5"
        />
      </svg>
    </div>
  )
}

interface Props {
  dictationStats?: DictationGlobalStatsRecord | null
}

export function HomeStudyDesk({ dictationStats = null }: Props) {
  return (
    <MangaPageShell
      topbar={
        <AppTopbar
          activeHref="/"
          subtitle="Private IELTS training drawn like a study manga"
        />
      }
      footer={
        <div className="border-manga-black bg-manga-black text-manga-white border-t-3 px-5 py-4">
          <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-3">
            <strong className="font-sans text-base font-black tracking-normal uppercase">
              English For Only Me
            </strong>
            <span className="text-manga-pale-red text-sm font-semibold">
              A private English learning OS first, one useful module at a time.
            </span>
          </div>
        </div>
      }
    >
      <div className="grid gap-5 p-3 sm:p-5 xl:grid-cols-[minmax(0,1.12fr)_minmax(360px,0.88fr)]">
        <section
          aria-labelledby="home-title"
          className="border-manga-black bg-manga-white/90 grid min-w-0 overflow-hidden border-3 shadow-[6px_6px_0_var(--manga-black)]"
        >
          <div className="border-manga-black bg-manga-white/90 flex min-w-0 flex-wrap items-start justify-between gap-4 border-b-3 p-4 sm:p-5">
            <div className="grid min-w-0 gap-3">
              <h1
                id="home-title"
                className="font-sans text-[clamp(2.125rem,7vw,5.125rem)] leading-none font-black tracking-normal break-words uppercase"
              >
                Your English training desk.
              </h1>
              <p className="text-manga-ink-soft max-w-3xl text-base leading-7 font-semibold">
                One private place for IELTS listening, vocabulary, review,
                writing notes, and the modules I add later.
              </p>
            </div>
            <PageTag tone="ink">Home 00</PageTag>
          </div>

          <div className="grid gap-5 p-4 lg:grid-cols-[minmax(0,1fr)_minmax(260px,340px)]">
            <StudyDeskSketch />
            <HomeTodayPanel dictationStats={dictationStats} />
          </div>

          <HomeModuleLauncher />
        </section>

        <aside
          aria-labelledby="side-title"
          className="border-manga-black bg-manga-white/90 grid min-w-0 content-start gap-4 overflow-hidden border-3 p-4 shadow-[6px_6px_0_var(--manga-black)] sm:p-5"
        >
          <div className="border-manga-black bg-manga-white/90 -mx-4 -mt-4 flex min-w-0 flex-wrap items-start justify-between gap-4 border-b-3 p-4 sm:-mx-5 sm:-mt-5 sm:p-5">
            <div className="grid min-w-0 gap-2">
              <h2
                id="side-title"
                className="font-sans text-[clamp(1.75rem,4vw,2.75rem)] leading-none font-black tracking-normal break-words uppercase"
              >
                IELTS path
              </h2>
              <p className="text-manga-ink-soft text-base leading-7 font-semibold">
                The homepage shows the whole personal system. Dictation is
                important, but it is only one training panel.
              </p>
            </div>
            <PageTag tone="red">Map</PageTag>
          </div>

          <HomeIeltsSnapshot dictationStats={dictationStats} />
          <HomeFutureModuleMap />
        </aside>
      </div>
    </MangaPageShell>
  )
}

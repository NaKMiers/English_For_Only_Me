import type { Metadata } from 'next'
import Link from 'next/link'

import { AppTopbar } from '@/components/common/AppTopbar'
import { AuthControl } from '@/components/common/AuthControl'
import { MangaPageShell } from '@/components/common/MangaPageShell'
import { BrowseBreadcrumb } from '@/components/dictation/browse/BrowseBreadcrumb'
import { PageTag } from '@/components/ui/PageTag'
import { hasMongoDbUri } from '@/constants/environments'
import { connectDatabase } from '@/lib/db/connectDatabase'
import { listNoTopicVideos } from '@/modules/dictation/content/contentRepository'
import { hasDictationTranscript } from '@/modules/dictation/videoReadiness'

export const metadata: Metadata = {
  title: 'Uncategorized',
  description: 'Dictation videos not yet filed under a topic.',
}

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export default async function NoTopicPage() {
  const videos = hasMongoDbUri()
    ? (await connectDatabase(), await listNoTopicVideos())
    : []

  return (
    <MangaPageShell
      topbar={
        <AppTopbar
          activeHref="/dictation"
          subtitle="Browse dictation topics"
          authControl={<AuthControl />}
        />
      }
    >
      <section className="grid gap-5 p-4 sm:p-6 lg:p-8">
        <BrowseBreadcrumb current="Uncategorized" />
        <h1 className="font-sans text-[clamp(1.8rem,4vw,2.6rem)] leading-none font-black uppercase">
          Uncategorized
        </h1>
        {videos.length === 0 ? (
          <div className="border-manga-black bg-manga-white border-3 p-6 text-center shadow-[4px_4px_0_var(--manga-black)]">
            <p className="font-sans text-lg font-black">Nothing here</p>
            <p className="text-manga-ink-soft mt-1 text-sm">
              Every video has been filed under a topic.
            </p>
          </div>
        ) : (
          <ul className="grid gap-2">
            {videos.map(video => {
              const practiceHref = hasDictationTranscript(video)
                ? `/dictation/videos/${video.id}/practice`
                : null

              return (
                <li
                  key={video.id}
                  className="border-manga-black bg-manga-white flex items-center justify-between gap-3 border-3 p-3 shadow-[3px_3px_0_var(--manga-black)]"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    {video.level && <PageTag tone="sky">{video.level}</PageTag>}
                    <span className="truncate font-sans text-sm font-black">
                      {video.title}
                    </span>
                  </div>
                  {practiceHref ? (
                    <Link
                      href={practiceHref}
                      className="border-manga-black bg-manga-paper-soft hover:bg-manga-pale-red inline-flex min-h-9 shrink-0 items-center border-2 px-3 font-sans text-sm font-black shadow-[2px_2px_0_var(--manga-black)]"
                    >
                      Practice
                    </Link>
                  ) : (
                    <span className="text-manga-ink-soft shrink-0 text-xs font-black uppercase">
                      No transcript
                    </span>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </MangaPageShell>
  )
}

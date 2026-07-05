'use client'

import { useEffect } from 'react'

import { AppTopbar } from '@/components/common/AppTopbar'
import { MangaPageShell } from '@/components/common/MangaPageShell'
import { MangaPanel } from '@/components/common/MangaPanel'
import { MangaButton } from '@/components/ui/MangaButton'

interface Props {
  error: Error & { digest?: string }
  unstable_retry: () => void
}

export default function Error({ error, unstable_retry }: Props) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <MangaPageShell
      topbar={
        <AppTopbar
          activeHref="/dictation"
          subtitle="Listening module recovery"
        />
      }
    >
      <div className="p-3 sm:p-5">
        <MangaPanel
          eyebrow="Error"
          title="Dictation Lab needs a retry"
        >
          <p className="text-manga-ink-soft max-w-2xl text-base leading-7 font-semibold">
            The static module shell failed to render. Try the page again before
            changing any practice data.
          </p>
          <MangaButton onClick={() => unstable_retry()}>Retry</MangaButton>
        </MangaPanel>
      </div>
    </MangaPageShell>
  )
}

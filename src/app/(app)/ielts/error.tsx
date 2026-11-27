'use client'

import { useEffect } from 'react'

import { useMessages } from '@/i18n/client'

interface Props {
  error: Error & { digest?: string }
  unstable_retry: () => void
}

/**
 * Dependency-free like the other module boundaries: plain elements and the
 * shared tokens, so this client bundle stays small.
 */
export default function Error({ error, unstable_retry }: Props) {
  const t = useMessages()

  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="bg-surface text-ink rounded-shell shadow-shell mx-auto min-h-dvh w-full p-4 sm:my-5 sm:min-h-[calc(100dvh-40px)] sm:w-[min(1480px,calc(100%-40px))] sm:p-8 lg:my-8 lg:min-h-[calc(100dvh-64px)] lg:w-[min(1480px,calc(100%-64px))]">
      <section
        className="border-line bg-surface rounded-panel shadow-card mx-auto grid max-w-2xl gap-4 border p-6"
        role="alert"
      >
        <span className="bg-danger-soft text-danger inline-flex min-h-7 w-fit items-center rounded-full px-3 py-1 font-sans text-xs leading-tight font-medium">
          {t.ielts.boundary.tag}
        </span>
        <h1 className="font-sans text-2xl leading-tight font-medium tracking-tight">
          {t.ielts.boundary.title}
        </h1>
        <p className="text-ink-soft max-w-2xl text-base leading-7 font-normal">
          {t.ielts.boundary.body}
        </p>
        <button
          className="bg-cta text-cta-fg hover:bg-cta/85 soft-press inline-flex min-h-11 w-fit items-center justify-center rounded-full px-5 py-2 font-sans text-sm leading-tight font-medium"
          onClick={() => unstable_retry()}
          type="button"
        >
          {t.common.actions.retry}
        </button>
      </section>
    </div>
  )
}

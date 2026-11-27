'use client'

import { useEffect } from 'react'

import { useMessages } from '@/i18n/client'

interface Props {
  error: Error & { digest?: string }
  unstable_retry: () => void
}

/**
 * Deliberately dependency-free: this boundary ships in every /dictation/*
 * client bundle, so it uses plain elements and the shared Tailwind tokens
 * instead of the page chrome (topbar, shell, panel, button).
 */
export default function Error({ error, unstable_retry }: Props) {
  const t = useMessages()
  const text = t.dictation.errorBoundary

  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="bg-surface text-ink rounded-shell shadow-shell mx-auto min-h-dvh w-full p-4 sm:my-5 sm:min-h-[calc(100dvh-40px)] sm:w-[min(1480px,calc(100%-40px))] sm:p-8 lg:my-8 lg:min-h-[calc(100dvh-64px)] lg:w-[min(1480px,calc(100%-64px))]">
      <section
        role="alert"
        className="border-line bg-surface rounded-panel shadow-card mx-auto grid max-w-2xl gap-4 border p-6"
      >
        <span className="bg-danger-soft text-danger inline-flex min-h-7 w-fit items-center rounded-full px-3 py-1 font-sans text-xs leading-tight font-medium">
          {text.eyebrow}
        </span>
        <h1 className="font-sans text-2xl leading-tight font-medium tracking-tight">
          {text.title}
        </h1>
        <p className="text-ink-soft max-w-2xl text-base leading-7 font-normal">
          {text.description}
        </p>
        <button
          type="button"
          onClick={() => unstable_retry()}
          className="bg-ink text-surface hover:bg-ink/85 soft-press inline-flex min-h-11 w-fit items-center justify-center rounded-full px-5 py-2 font-sans text-sm leading-tight font-medium"
        >
          {text.retry}
        </button>
      </section>
    </div>
  )
}

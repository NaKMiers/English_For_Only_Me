'use client'

import { useEffect } from 'react'

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
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="border-manga-black bg-manga-paper text-manga-black rounded-shell mx-auto my-3 w-[min(1460px,calc(100%-24px))] border-3 p-3 shadow-[8px_8px_0_var(--manga-black)] sm:my-4 sm:w-[min(1460px,calc(100%-32px))] sm:p-5">
      <section
        role="alert"
        className="border-manga-black bg-manga-white rounded-panel grid gap-4 border-3 p-5 shadow-[4px_4px_0_var(--manga-black)]"
      >
        <span className="border-manga-black bg-manga-pale-red text-manga-black rounded-tag inline-flex min-h-8 w-fit items-center border-2 px-3 py-1 font-sans text-xs leading-tight font-black tracking-normal uppercase shadow-[3px_3px_0_var(--manga-black)]">
          Error
        </span>
        <h1 className="font-sans text-2xl leading-none font-black tracking-normal uppercase">
          Dictation Lab needs a retry
        </h1>
        <p className="text-manga-ink-soft max-w-2xl text-base leading-7 font-semibold">
          The static module shell failed to render. Try the page again before
          changing any practice data.
        </p>
        <button
          type="button"
          onClick={() => unstable_retry()}
          className="border-manga-black bg-manga-paper-soft text-manga-black hover:bg-manga-pale-red rounded-control sticker-press inline-flex min-h-11 w-fit items-center justify-center border-3 px-4 py-2 font-sans text-sm leading-tight font-black tracking-normal shadow-[3px_3px_0_var(--manga-black)] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none"
        >
          Retry
        </button>
      </section>
    </div>
  )
}

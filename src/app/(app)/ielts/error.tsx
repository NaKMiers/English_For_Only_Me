'use client'

import { useEffect } from 'react'

interface Props {
  error: Error & { digest?: string }
  unstable_retry: () => void
}

/**
 * Dependency-free like the other module boundaries: plain elements and the
 * shared tokens, so this client bundle stays small.
 */
export default function Error({ error, unstable_retry }: Props) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="ielts-exam border-ex-line text-ex-ink mx-auto my-3 w-[min(1460px,calc(100%-24px))] rounded-2xl border p-3 sm:my-4 sm:w-[min(1460px,calc(100%-32px))] sm:p-5">
      <section
        className="border-ex-line grid gap-4 rounded-xl border bg-white p-5"
        role="alert"
      >
        <h1 className="font-sans text-2xl leading-none font-bold tracking-normal uppercase">
          Trang IELTS bị lỗi
        </h1>
        <p className="text-ex-muted max-w-2xl text-base leading-7 font-semibold">
          Bài làm đã lưu vẫn an toàn. Thử tải lại trang.
        </p>
        <button
          className="border-ex-accent bg-ex-accent inline-flex min-h-10 w-fit items-center justify-center rounded-lg border px-4 py-2 text-sm font-semibold text-white"
          onClick={() => unstable_retry()}
          type="button"
        >
          Thử lại
        </button>
      </section>
    </div>
  )
}

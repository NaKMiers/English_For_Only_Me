import Image from 'next/image'
import Link from 'next/link'

interface Props {
  body: string
  homeHref: string
  homeLabel: string
  onRetry: () => void
  retryLabel: string
  tag: string
  title: string
}

/**
 * The card a route's `error.tsx` shows: the mascot, what went wrong, and two
 * ways out (try again, or back to the module). Plain elements and tokens only,
 * so an error boundary bundle stays small and never pulls the page chrome.
 */
export function RouteError({
  body,
  homeHref,
  homeLabel,
  onRetry,
  retryLabel,
  tag,
  title,
}: Props) {
  return (
    <div className="bg-board text-ink rounded-shell shadow-shell mx-auto grid min-h-dvh w-full place-items-center p-4 sm:my-5 sm:min-h-[calc(100dvh-40px)] sm:w-[min(1480px,calc(100%-40px))] sm:p-8 lg:my-8 lg:min-h-[calc(100dvh-64px)] lg:w-[min(1480px,calc(100%-64px))]">
      <section
        className="border-line bg-surface rounded-panel shadow-card grid w-full max-w-lg justify-items-center gap-4 border p-6 text-center sm:p-8"
        role="alert"
      >
        <Image
          alt=""
          className="size-20 rounded-3xl object-contain"
          height={80}
          src="/logo.png"
          width={80}
        />
        <span className="bg-danger-soft text-danger inline-flex min-h-7 items-center rounded-full px-3 py-1 font-sans text-xs leading-tight font-medium">
          {tag}
        </span>
        <h1 className="font-sans text-2xl leading-tight font-medium tracking-tight">
          {title}
        </h1>
        <p className="text-ink-soft text-base leading-7">{body}</p>
        <div className="flex flex-wrap justify-center gap-2">
          <button
            className="bg-cta text-cta-fg hover:bg-cta/85 soft-press inline-flex min-h-11 items-center justify-center rounded-full px-5 py-2 font-sans text-sm leading-tight font-medium"
            onClick={onRetry}
            type="button"
          >
            {retryLabel}
          </button>
          <Link
            className="border-line bg-surface hover:bg-tint-soft soft-press inline-flex min-h-11 items-center justify-center rounded-full border px-5 py-2 font-sans text-sm leading-tight font-medium"
            href={homeHref}
          >
            {homeLabel}
          </Link>
        </div>
      </section>
    </div>
  )
}

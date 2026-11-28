'use client'

import { ArrowRight, ShieldCheck } from 'lucide-react'
import Image from 'next/image'
import type { CSSProperties } from 'react'
import { useFormStatus } from 'react-dom'

import { InlineNotice } from '@/components/common/InlineNotice'
import { useMessages } from '@/i18n/client'
import { signInAction } from '@/lib/auth/actions'
import { cn } from '@/lib/utils'

/** What the login page has to say besides the button. */
export type LoginNotice =
  'accessDenied' | 'generic' | 'locked' | 'notConfigured' | null

interface Props {
  /** Same-origin path to land on after Google, already sanitised. */
  callbackUrl: string
  className?: string
  /** False when Google OAuth is not configured: no button (fail closed). */
  configured: boolean
  notice: LoginNotice
}

/** Google's "G" mark. Decorative: the button text carries the meaning. */
function GoogleMark() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 48 48"
      className="size-5"
    >
      <path
        fill="#ffc107"
        d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9z"
      />
      <path
        fill="#ff3d00"
        d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
      />
      <path
        fill="#4caf50"
        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"
      />
      <path
        fill="#1976d2"
        d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.9z"
      />
    </svg>
  )
}

/**
 * The single call to action: a tall ink pill with Google's mark in a white
 * disc and an arrow that slides on hover. Pending while the form posts, so a
 * double click cannot start two Google round trips.
 */
function ContinueWithGoogleButton() {
  const t = useMessages()
  const { pending } = useFormStatus()

  return (
    <button
      aria-busy={pending || undefined}
      className="group soft-press hover-pop bg-cta text-cta-fg hover:bg-cta/90 focus-visible:ring-brand/50 flex min-h-14 w-full items-center gap-3 rounded-full py-2 pr-5 pl-2 text-base font-medium outline-none focus-visible:ring-4 disabled:opacity-60"
      disabled={pending}
      type="submit"
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-white">
        <GoogleMark />
      </span>
      <span className="flex-1 text-center">
        {pending
          ? t.common.auth.openingGoogle
          : t.common.auth.continueWithGoogle}
      </span>
      <ArrowRight
        aria-hidden="true"
        className={cn(
          'size-5 shrink-0 transition-transform duration-300 group-hover:translate-x-1',
          pending && 'animate-pulse'
        )}
      />
    </button>
  )
}

/**
 * The login page's right half: the brand, a big welcome, one line of why,
 * "Continue with Google" and a quiet reassurance. Google is the only way in,
 * so there is no sign-up, password or reset.
 */
export function LoginCard({
  callbackUrl,
  className,
  configured,
  notice,
}: Props) {
  const t = useMessages()
  const noticeText =
    notice === 'accessDenied'
      ? t.common.auth.errorAccessDenied
      : notice === 'locked'
        ? t.common.auth.errorLocked
        : notice === 'notConfigured'
          ? t.common.auth.notConfigured
          : notice === 'generic'
            ? t.common.auth.errorGeneric
            : null

  return (
    <section
      aria-labelledby="login-title"
      className={cn('flex w-full max-w-md flex-col gap-9', className)}
    >
      <div className="login-rise flex items-center gap-3">
        <Image
          alt=""
          aria-hidden="true"
          className="shadow-card rounded-control size-11"
          height={44}
          loading="eager"
          src="/logo.png"
          width={44}
        />
        <span className="text-ink text-base font-medium">
          {t.common.auth.loginTitle}
        </span>
      </div>

      <div
        className="login-rise flex flex-col gap-4"
        style={{ '--rise-delay': '90ms' } as CSSProperties}
      >
        <h1
          className="text-ink text-4xl leading-[1.08] font-medium tracking-tight text-balance sm:text-5xl"
          id="login-title"
        >
          {t.common.auth.loginHeading}
        </h1>
        <p className="text-ink-soft max-w-sm text-base leading-relaxed text-pretty">
          {t.common.auth.loginTagline}
        </p>
      </div>

      <div
        className="login-rise flex flex-col gap-4"
        style={{ '--rise-delay': '180ms' } as CSSProperties}
      >
        {configured ? (
          <form action={signInAction}>
            <input
              name="callbackUrl"
              type="hidden"
              value={callbackUrl}
            />
            <ContinueWithGoogleButton />
          </form>
        ) : null}

        {noticeText ? (
          <InlineNotice
            className="w-full text-left"
            tone={notice === 'notConfigured' ? 'info' : 'error'}
          >
            {noticeText}
          </InlineNotice>
        ) : null}

        {configured ? (
          <p className="text-ink-soft flex items-center gap-2 text-sm">
            <ShieldCheck
              aria-hidden="true"
              className="text-accent-green size-4 shrink-0"
            />
            {t.common.auth.loginFootnote}
          </p>
        ) : null}
      </div>
    </section>
  )
}

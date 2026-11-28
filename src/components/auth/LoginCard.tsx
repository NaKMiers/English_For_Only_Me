'use client'

import { useFormStatus } from 'react-dom'

import { InlineNotice } from '@/components/common/InlineNotice'
import { HomeBuddyMascot } from '@/components/home/HomeBuddyMascot'
import { ActionButton } from '@/components/ui/ActionButton'
import { MODULE_ICONS, type AppModuleKey } from '@/constants/modules'
import { MODULE_THEMES } from '@/constants/theme'
import { useMessages } from '@/i18n/client'
import { signInAction } from '@/lib/auth/actions'
import { cn } from '@/lib/utils'

/** What the login page has to say besides the button. */
export type LoginNotice = 'accessDenied' | 'generic' | 'notConfigured' | null

const CHIP_MODULES: AppModuleKey[] = [
  'dictation',
  'grammar',
  'ielts',
  'vocabulary',
]

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
 * The single call to action. Pending while the form posts, so a double click
 * cannot start two Google round trips.
 */
function ContinueWithGoogleButton() {
  const t = useMessages()
  const { pending } = useFormStatus()

  return (
    <ActionButton
      aria-busy={pending || undefined}
      className="w-full"
      disabled={pending}
      icon={
        <span className="bg-surface grid size-6 place-items-center rounded-full">
          <GoogleMark />
        </span>
      }
      tone="ink"
      type="submit"
    >
      {pending ? t.common.auth.openingGoogle : t.common.auth.continueWithGoogle}
    </ActionButton>
  )
}

/**
 * The login page's card: Buddy, the app name, one tagline, the four modules
 * as quiet chips, and "Continue with Google". Google is the only way in, so
 * there is no sign-up, password or reset.
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
      : notice === 'notConfigured'
        ? t.common.auth.notConfigured
        : notice === 'generic'
          ? t.common.auth.errorGeneric
          : null

  return (
    <section
      aria-labelledby="login-title"
      className={cn(
        'bg-surface border-line rounded-panel shadow-card flex w-full max-w-sm flex-col items-center gap-5 border px-6 pt-6 pb-7 text-center sm:px-8',
        className
      )}
    >
      <HomeBuddyMascot
        className="size-32 sm:size-36"
        eager
        mood="ready"
      />

      <div className="flex flex-col gap-2">
        <h1
          className="text-ink text-2xl font-medium"
          id="login-title"
        >
          {t.common.auth.loginTitle}
        </h1>
        <p className="text-ink-soft text-sm leading-relaxed">
          {t.common.auth.loginTagline}
        </p>
      </div>

      <ul className="grid w-full grid-cols-2 gap-2">
        {CHIP_MODULES.map(key => {
          const Icon = MODULE_ICONS[key]
          const theme = MODULE_THEMES[key]

          return (
            <li
              className={cn(
                'flex min-h-10 items-center justify-center gap-2 rounded-full px-3 text-sm',
                theme.tint,
                theme.accent
              )}
              key={key}
            >
              {Icon ? (
                <Icon
                  aria-hidden="true"
                  className="size-4 shrink-0"
                />
              ) : null}
              <span className="text-ink">
                {t.common.modules[key].shortTitle}
              </span>
            </li>
          )
        })}
      </ul>

      {configured ? (
        <form
          action={signInAction}
          className="w-full"
        >
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
    </section>
  )
}

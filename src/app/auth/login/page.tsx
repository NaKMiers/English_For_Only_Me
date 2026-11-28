import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

import { LoginCard } from '@/components/auth/LoginCard'
import { LoginHero } from '@/components/auth/LoginHero'
import { AppCredits } from '@/components/common/AppCredits'
import { LocaleToggle } from '@/components/common/LocaleToggle'
import { ThemeToggle } from '@/components/common/ThemeToggle'
import { hasGoogleAuth } from '@/constants/environments'
import { getMessages } from '@/i18n/server'
import { safeCallbackUrl } from '@/lib/auth/callbackUrl'
import { getOptionalUser, getSessionBlock } from '@/lib/auth/currentUser'

import { firstParam, noticeForError } from './loginPageState'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getMessages()

  return {
    title: t.common.auth.loginMetaTitle,
    robots: { index: false, follow: false },
  }
}

/** This request's own origin, to accept Auth.js's absolute callbackUrl. */
async function requestOrigin() {
  const list = await headers()
  const host = list.get('x-forwarded-host') ?? list.get('host')

  if (!host) return null

  const proto =
    list.get('x-forwarded-proto')?.split(',')[0]?.trim() ||
    (host.startsWith('localhost') || host.startsWith('127.0.0.1')
      ? 'http'
      : 'https')

  return `${proto}://${host}`
}

interface Props {
  searchParams: Promise<{
    callbackUrl?: string | string[]
    error?: string | string[]
  }>
}

/**
 * The one public page, in two halves: the decorative hero (Buddy, floating
 * module cards, a dictation line typing itself) and the sign-in panel. A
 * signed-in learner goes straight back to where they were heading; everyone
 * else gets "Continue with Google". When
 * Google OAuth is not configured the page fails closed: a notice, no button.
 */
export default async function LoginPage({ searchParams }: Props) {
  const [params, origin, user, block] = await Promise.all([
    searchParams,
    requestOrigin(),
    getOptionalUser(),
    getSessionBlock(),
  ])
  const callbackUrl = safeCallbackUrl(firstParam(params.callbackUrl), origin)

  if (user) redirect(callbackUrl)

  const configured = hasGoogleAuth()

  return (
    <div className="bg-canvas relative grid min-h-dvh lg:grid-cols-[minmax(0,1.08fr)_minmax(0,1fr)]">
      <div className="lg:sticky lg:top-0 lg:h-dvh lg:p-4">
        <LoginHero className="h-[300px] sm:h-[420px] lg:h-full" />
      </div>
      <div className="absolute top-4 right-4 z-10 flex gap-2 sm:top-6 sm:right-6">
        <LocaleToggle variant="round" />
        <ThemeToggle />
      </div>
      <div className="flex min-h-full flex-col">
        <main className="flex flex-1 items-center justify-center px-6 py-10 sm:px-12 lg:py-16">
          <LoginCard
            callbackUrl={callbackUrl}
            configured={configured}
            notice={
              noticeForError(firstParam(params.error), configured) ??
              (block === 'locked' ? 'locked' : null)
            }
          />
        </main>
        <AppCredits className="mx-6 sm:mx-12 md:mx-12 md:mr-12 md:px-0" />
      </div>
    </div>
  )
}

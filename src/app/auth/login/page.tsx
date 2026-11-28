import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

import { LoginCard } from '@/components/auth/LoginCard'
import { AppCredits } from '@/components/common/AppCredits'
import { LocaleToggle } from '@/components/common/LocaleToggle'
import { ThemeToggle } from '@/components/common/ThemeToggle'
import { hasGoogleAuth } from '@/constants/environments'
import { getMessages } from '@/i18n/server'
import { safeCallbackUrl } from '@/lib/auth/callbackUrl'
import { getOptionalUser } from '@/lib/auth/currentUser'

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
 * The one public page. A signed-in learner goes straight back to where they
 * were heading; everyone else gets the card with "Continue with Google". When
 * Google OAuth is not configured the page fails closed: a notice, no button.
 */
export default async function LoginPage({ searchParams }: Props) {
  const [params, origin, user] = await Promise.all([
    searchParams,
    requestOrigin(),
    getOptionalUser(),
  ])
  const callbackUrl = safeCallbackUrl(firstParam(params.callbackUrl), origin)

  if (user) redirect(callbackUrl)

  const configured = hasGoogleAuth()

  return (
    <div className="bg-canvas flex min-h-dvh flex-col">
      <div className="flex justify-end gap-2 px-4 pt-4 sm:px-6 sm:pt-6">
        <LocaleToggle variant="round" />
        <ThemeToggle />
      </div>
      <main className="page-enter flex flex-1 items-center justify-center px-4 py-8">
        <LoginCard
          callbackUrl={callbackUrl}
          configured={configured}
          notice={noticeForError(firstParam(params.error), configured)}
        />
      </main>
      <AppCredits className="mx-4 md:mr-6 md:ml-6 md:px-0" />
    </div>
  )
}

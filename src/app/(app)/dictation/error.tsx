'use client'

import { useEffect } from 'react'

import { RouteError } from '@/components/common/RouteError'
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
    <RouteError
      body={text.description}
      homeHref="/dictation"
      homeLabel={t.dictation.reviewQueue.toLanding}
      onRetry={() => unstable_retry()}
      retryLabel={text.retry}
      tag={text.eyebrow}
      title={text.title}
    />
  )
}

'use client'

import { useEffect } from 'react'

import { RouteError } from '@/components/common/RouteError'
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
    <RouteError
      body={t.ielts.boundary.body}
      homeHref="/ielts"
      homeLabel={t.ielts.boundary.backToIelts}
      onRetry={() => unstable_retry()}
      retryLabel={t.common.actions.retry}
      tag={t.ielts.boundary.tag}
      title={t.ielts.boundary.title}
    />
  )
}

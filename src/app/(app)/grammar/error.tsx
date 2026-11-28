'use client'

import { useEffect } from 'react'

import { RouteError } from '@/components/common/RouteError'
import { useMessages } from '@/i18n/client'

interface Props {
  error: Error & { digest?: string }
  unstable_retry: () => void
}

/** The grammar routes' boundary: the shared RouteError look. */
export default function Error({ error, unstable_retry }: Props) {
  const t = useMessages()
  const text = t.grammar.errorBoundary

  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <RouteError
      body={text.description}
      homeHref="/grammar"
      homeLabel={text.home}
      onRetry={() => unstable_retry()}
      retryLabel={text.retry}
      tag={text.eyebrow}
      title={text.title}
    />
  )
}

'use client'

import {
  BookA,
  CircleCheck,
  CircleX,
  DatabaseZap,
  Lock,
  RefreshCcw,
  SearchX,
  Sprout,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

import { ContentPanel } from '@/components/common/ContentPanel'
import { PageHeader } from '@/components/common/PageHeader'
import { StatChip, StatStrip } from '@/components/journey/StatChip'
import { Input } from '@/components/ui/input'
import { ActionButton } from '@/components/ui/ActionButton'
import { format } from '@/i18n/format'
import { useMessages } from '@/i18n/client'
import {
  enrichVocabularyAdminApi,
  getVocabAdminQueueApi,
} from '@/requests/vocabularyApi'
import type { VocabAdminQueueSummaryRecord } from '@/modules/vocabulary/types'

interface Props {
  initialQueue: VocabAdminQueueSummaryRecord | null
  mongoConfigured: boolean
}

const EMPTY_QUEUE: VocabAdminQueueSummaryRecord = {
  failedCount: 0,
  notFoundCount: 0,
  readyCount: 0,
  seededCount: 0,
  staleLeaseCount: 0,
}

export function AdminVocabPanel({ initialQueue, mongoConfigured }: Props) {
  const t = useMessages()
  const v = t.admin.vocab
  const [queue, setQueue] = useState(initialQueue ?? EMPTY_QUEUE)
  const [limit, setLimit] = useState(5)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const refreshQueue = useCallback(async () => {
    const response = await getVocabAdminQueueApi()
    setQueue(response.queue)
  }, [])

  useEffect(() => {
    if (!mongoConfigured || initialQueue) return

    const timeoutId = window.setTimeout(() => {
      refreshQueue().catch(currentError => {
        setError(
          currentError instanceof Error ? currentError.message : v.loadFailed
        )
      })
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [initialQueue, mongoConfigured, refreshQueue, v.loadFailed])

  async function enrich() {
    setIsLoading(true)
    setError(null)
    setMessage(null)

    try {
      const response = await enrichVocabularyAdminApi({ limit })

      setQueue(response.queue)
      setMessage(
        format(v.result, {
          processed: response.result.processed,
          requested: response.result.requested,
          ready: response.result.ready,
          failed: response.result.failed,
          notFound: response.result.notFound,
        })
      )
    } catch (currentError) {
      setError(
        currentError instanceof Error ? currentError.message : v.enrichFailed
      )
    } finally {
      setIsLoading(false)
    }
  }

  if (!mongoConfigured)
    return (
      <ContentPanel
        eyebrow={v.eyebrow}
        title={v.dbNeededTitle}
      >
        <p className="text-ink-soft text-sm leading-6 font-normal">
          {v.dbNeededBody}
        </p>
      </ContentPanel>
    )

  return (
    <div className="grid gap-5">
      <PageHeader
        actions={
          <button
            aria-label={v.refresh}
            className="border-line bg-surface hover:bg-tint soft-press inline-grid size-11 shrink-0 place-items-center rounded-full border disabled:opacity-55"
            disabled={isLoading}
            onClick={() => refreshQueue()}
            title={v.refresh}
            type="button"
          >
            <RefreshCcw
              aria-hidden="true"
              className="size-5"
            />
          </button>
        }
        eyebrow={v.tag}
        icon={<BookA />}
        iconClassName="bg-pastel-mint text-accent-green"
        subtitle={v.intro}
        title={v.title}
        titleClassName="wrap-break-word"
      />

      <StatStrip label={v.title}>
        <StatChip
          icon={Sprout}
          label={v.metrics.enrichable}
          value={String(queue.seededCount)}
        />
        <StatChip
          icon={CircleCheck}
          label={v.metrics.ready}
          value={String(queue.readyCount)}
        />
        <StatChip
          icon={CircleX}
          label={v.metrics.failed}
          value={String(queue.failedCount)}
        />
        <StatChip
          icon={SearchX}
          label={v.metrics.notFound}
          value={String(queue.notFoundCount)}
        />
        <StatChip
          icon={Lock}
          label={v.metrics.staleLocks}
          value={String(queue.staleLeaseCount)}
        />
      </StatStrip>

      <ContentPanel
        eyebrow={v.panelEyebrow}
        title={v.panelTitle}
      >
        <div className="grid gap-3 sm:grid-cols-[180px_minmax(0,1fr)]">
          <Input
            aria-label={v.limitLabel}
            className="border-line bg-surface rounded-control h-12 border px-3 font-sans font-semibold"
            max={10}
            min={1}
            onChange={event => setLimit(Number(event.target.value))}
            type="number"
            value={limit}
          />
          <ActionButton
            disabled={isLoading}
            icon={<DatabaseZap className="size-4" />}
            onClick={enrich}
          >
            {v.enrich}
          </ActionButton>
        </div>

        <p className="text-ink-soft text-sm leading-6 font-normal">
          {format(v.note, { command: '`bun run vocab:seed`' })}
        </p>

        {message ? (
          <div className="border-line bg-tint rounded-control border p-3 text-sm font-semibold">
            {message}
          </div>
        ) : null}
        {error ? (
          <div className="border-line bg-tint-soft rounded-control border p-3 text-sm font-semibold">
            {error}
          </div>
        ) : null}
      </ContentPanel>
    </div>
  )
}

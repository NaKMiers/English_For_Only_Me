'use client'

import { DatabaseZap, RefreshCcw } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

import { ContentPanel } from '@/components/common/ContentPanel'
import { MetricTile } from '@/components/common/MetricTile'
import { Input } from '@/components/ui/input'
import { ActionButton } from '@/components/ui/ActionButton'
import { PageTag } from '@/components/ui/PageTag'
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
          currentError instanceof Error
            ? currentError.message
            : 'Could not load vocabulary queue.'
        )
      })
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [initialQueue, mongoConfigured, refreshQueue])

  async function enrich() {
    setIsLoading(true)
    setError(null)
    setMessage(null)

    try {
      const response = await enrichVocabularyAdminApi({ limit })

      setQueue(response.queue)
      setMessage(
        `Processed ${response.result.processed}/${response.result.requested}. Ready ${response.result.ready}, failed ${response.result.failed}, not found ${response.result.notFound}.`
      )
    } catch (currentError) {
      setError(
        currentError instanceof Error
          ? currentError.message
          : 'Could not enrich vocabulary.'
      )
    } finally {
      setIsLoading(false)
    }
  }

  if (!mongoConfigured)
    return (
      <ContentPanel
        eyebrow="Admin"
        title="Database needed"
      >
        <p className="text-ink-soft text-sm leading-6 font-normal">
          Set MONGODB_URI before seeding or enriching vocabulary entries.
        </p>
      </ContentPanel>
    )

  return (
    <div className="grid gap-5">
      <header className="page-hero flex flex-wrap items-start justify-between gap-3">
        <div className="grid min-w-0 gap-2">
          <PageTag tone="ink">Admin</PageTag>
          <h1 className="font-sans text-[clamp(1.8rem,4vw,2.6rem)] leading-none font-medium wrap-break-word">
            Vocabulary queue
          </h1>
          <p className="text-ink-soft max-w-2xl text-sm leading-6 font-normal">
            Seed the top words, then enrich small batches through the free
            dictionary providers.
          </p>
        </div>
        <button
          aria-label="Refresh vocabulary queue"
          className="border-line bg-surface hover:bg-tint rounded-control soft-press inline-grid size-11 shrink-0 place-items-center border disabled:opacity-55"
          disabled={isLoading}
          onClick={() => refreshQueue()}
          title="Refresh vocabulary queue"
          type="button"
        >
          <RefreshCcw
            aria-hidden="true"
            className="size-5"
          />
        </button>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <MetricTile
          label="Enrichable"
          value={String(queue.seededCount)}
        />
        <MetricTile
          label="Ready"
          value={String(queue.readyCount)}
        />
        <MetricTile
          label="Failed"
          value={String(queue.failedCount)}
        />
        <MetricTile
          label="Not Found"
          value={String(queue.notFoundCount)}
        />
        <MetricTile
          label="Stale Locks"
          value={String(queue.staleLeaseCount)}
        />
      </div>

      <ContentPanel
        eyebrow="Vocabulary"
        title="Enrich queue"
      >
        <div className="grid gap-3 sm:grid-cols-[180px_minmax(0,1fr)]">
          <Input
            aria-label="Vocabulary enrich limit"
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
            Enrich N
          </ActionButton>
        </div>

        <p className="text-ink-soft text-sm leading-6 font-normal">
          This action claims up to 10 eligible words with short leases, then
          calls the free dictionary providers. Run the seed first with `bun run
          vocab:seed` so this queue has the NGSL top 1000 shells.
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

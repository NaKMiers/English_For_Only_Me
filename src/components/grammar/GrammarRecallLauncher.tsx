'use client'

import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'

import { MangaPanel } from '@/components/common/MangaPanel'
import { useClientOutbox } from '@/components/common/OutboxOwnerProvider'
import { MangaButton } from '@/components/ui/MangaButton'
import type { Outbox } from '@/lib/sync/outbox'
import { GRAMMAR_RECALL_LANE } from '@/modules/grammar/constants'
import type { GrammarServedRecallTask } from '@/modules/grammar/recall/recallTaskGrading'

const AUTO_OPEN_KEY = 'grammar:recall:lastAutoOpenDay'

/** A prefetched queue older than this is fetched again before opening. */
export const DUE_QUEUE_STALE_MS = 2 * 60 * 1000

/**
 * How long the queue read waits for queued answers to land. Offline, or while
 * a lane keeps retrying, the outbox never drains, so Start Recall reads the
 * queue anyway after this instead of staying on Loading forever.
 */
export const DUE_QUEUE_IDLE_TIMEOUT_MS = 8000

const loadRecallModal = () =>
  import('./GrammarRecallModal').then(mod => mod.GrammarRecallModal)

// Split out of the dashboard bundle; the prefetch below also warms this chunk,
// so opening a prefetched session does not wait on it.
const GrammarRecallModal = dynamic(loadRecallModal, { ssr: false })

type DueResult =
  | { message: string; tasks: null }
  | { message: null; tasks: GrammarServedRecallTask[] }

function today() {
  return new Date().toISOString().slice(0, 10)
}

function whenBrowserIdle(callback: () => void) {
  if (typeof window.requestIdleCallback === 'function') {
    const handle = window.requestIdleCallback(callback, { timeout: 2000 })

    return () => window.cancelIdleCallback(handle)
  }

  const handle = window.setTimeout(callback, 200)

  return () => window.clearTimeout(handle)
}

/**
 * Fetch the due queue. Sets no state, so it is safe to call from an effect
 * without triggering a synchronous render cascade - the caller decides what to
 * do with the result.
 */
async function fetchDueTasks(): Promise<DueResult> {
  try {
    const response = await fetch('/api/grammar/recall/due')

    if (!response.ok) {
      const body: unknown = await response.json().catch(() => null)

      return {
        message:
          (body as { message?: string } | null)?.message ??
          'Could not load your grammar queue.',
        tasks: null,
      }
    }

    const data = (await response.json()) as {
      tasks: GrammarServedRecallTask[]
    }

    return { message: null, tasks: data.tasks }
  } catch {
    return { message: 'Could not load your grammar queue.', tasks: null }
  }
}

/**
 * Points whose answer is still queued come back due with a fresh key until it
 * lands. The server will not move them twice, but dealing them again would ask
 * the learner for an answer that cannot count, so leave them out.
 */
function withoutSavingPoints(result: DueResult, outbox: Outbox): DueResult {
  if (result.tasks === null) return result

  const savingSlugs = new Set(
    outbox
      .pendingItems()
      .filter(item => item.lane === GRAMMAR_RECALL_LANE)
      .map(item => (item.body as { slug?: unknown } | null)?.slug)
  )

  return {
    message: null,
    tasks: result.tasks.filter(task => !savingSlugs.has(task.pointSlug)),
  }
}

/**
 * Opens the recall session, and auto-opens it once on the first visit of a day
 * when something is due - the same ritual already approved for vocabulary.
 *
 * The queue is prefetched while the browser is idle (and again on hover or
 * focus once it goes stale), so Start Recall opens instantly. It is read only
 * after the outbox has drained (or the wait timed out): an answer still in
 * flight would otherwise come back due with a fresh idempotency key and be
 * applied twice.
 *
 * "Once per day" lives in localStorage rather than server state on purpose:
 * getting it wrong costs a redundant modal, not data, and it keeps the dashboard
 * a server component with no per-request write.
 */
export function GrammarRecallLauncher({ dueCount }: { dueCount: number }) {
  const outbox = useClientOutbox()
  const router = useRouter()
  const [tasks, setTasks] = useState<GrammarServedRecallTask[] | null>(null)
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [sessionCount, setSessionCount] = useState(0)
  const cacheRef = useRef<{ at: number; promise: Promise<DueResult> } | null>(
    null
  )

  const loadDue = useCallback(() => {
    const cached = cacheRef.current

    if (cached && Date.now() - cached.at < DUE_QUEUE_STALE_MS)
      return cached.promise

    void loadRecallModal()

    const promise = outbox
      .whenIdle({ timeoutMs: DUE_QUEUE_IDLE_TIMEOUT_MS })
      .then(async isIdle => {
        const result = await fetchDueTasks()

        // Neither a failure nor a read taken while answers were still saving
        // is worth remembering: the next click should read again.
        if (
          (result.tasks === null || !isIdle) &&
          cacheRef.current?.promise === promise
        )
          cacheRef.current = null

        return isIdle ? result : withoutSavingPoints(result, outbox)
      })

    cacheRef.current = { at: Date.now(), promise }

    return promise
  }, [outbox])

  const prefetch = useCallback(() => {
    if (dueCount > 0) void loadDue()
  }, [dueCount, loadDue])

  const start = useCallback(async () => {
    setPending(true)
    setMessage(null)

    try {
      const result = await loadDue()

      if (result.tasks === null) {
        setMessage(result.message)
        return
      }

      if (result.tasks.length === 0) {
        setMessage(
          'Nothing is due right now. Points you have started will come back on schedule.'
        )
        return
      }

      setTasks(result.tasks)
    } finally {
      setPending(false)
    }
  }, [loadDue])

  const close = useCallback(() => {
    // The served keys are spent and the queue has moved, so the next session
    // starts from a fresh read.
    cacheRef.current = null
    setTasks(null)
    setSessionCount(previous => previous + 1)
    // Answers go to a route handler, which leaves this page's server data as it
    // was. Once they have landed, re-read it so the due count and the tallies
    // match. Still queued (offline) means the server has nothing new yet.
    void outbox
      .whenIdle({ timeoutMs: DUE_QUEUE_IDLE_TIMEOUT_MS })
      .then(isIdle => {
        if (isIdle) router.refresh()
      })
  }, [outbox, router])

  // The page's server data moved (a session or a test changed what is due), so
  // a queue prefetched before it is out of date.
  useEffect(() => {
    cacheRef.current = null
  }, [dueCount])

  // Warm the queue on idle, on mount and after every session.
  useEffect(() => {
    if (dueCount === 0) return

    return whenBrowserIdle(prefetch)
  }, [dueCount, prefetch, sessionCount])

  useEffect(() => {
    if (dueCount === 0) return

    try {
      if (window.localStorage.getItem(AUTO_OPEN_KEY) === today()) return
      window.localStorage.setItem(AUTO_OPEN_KEY, today())
    } catch {
      // Private mode or storage disabled: skip the auto-open, keep the button.
      return
    }

    let cancelled = false

    // Nothing sets state until after the await, so this does not cascade.
    void loadDue().then(result => {
      if (cancelled || !result.tasks?.length) return

      setTasks(result.tasks)
    })

    return () => {
      cancelled = true
    }
  }, [dueCount, loadDue])

  if (tasks)
    return (
      <GrammarRecallModal
        onClose={close}
        tasks={tasks}
      />
    )

  return (
    <MangaPanel
      eyebrow="Today"
      title={dueCount > 0 ? `${dueCount} due` : 'Nothing due'}
    >
      {message ? (
        <p className="text-manga-ink-soft text-sm leading-6 font-semibold">
          {message}
        </p>
      ) : (
        <p className="text-manga-ink-soft text-base leading-7 font-semibold">
          {dueCount > 0
            ? 'Grammar points are waiting. A wrong answer sends a point back to the bottom of the ladder, so accuracy matters more than speed.'
            : 'Start a point from the grammar map and it will enter the review ladder.'}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <MangaButton
          disabled={pending || dueCount === 0}
          onClick={() => void start()}
          onFocus={prefetch}
          onPointerEnter={prefetch}
          tone="ink"
          type="button"
        >
          {pending ? 'Loading...' : 'Start Recall'}
        </MangaButton>
        <MangaButton href="/grammar/points">Browse Grammar Map</MangaButton>
      </div>
    </MangaPanel>
  )
}

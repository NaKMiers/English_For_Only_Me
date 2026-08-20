'use client'

import { useCallback, useEffect, useState } from 'react'

import { MangaPanel } from '@/components/common/MangaPanel'
import { MangaButton } from '@/components/ui/MangaButton'
import type { GrammarRecallTaskRecord } from '@/modules/grammar/types'

import { GrammarRecallModal } from './GrammarRecallModal'

const AUTO_OPEN_KEY = 'grammar:recall:lastAutoOpenDay'

function today() {
  return new Date().toISOString().slice(0, 10)
}

/**
 * Fetch the due queue. Sets no state, so it is safe to call from an effect
 * without triggering a synchronous render cascade - the caller decides what to
 * do with the result.
 */
async function fetchDueTasks(): Promise<
  | { message: string; tasks: null }
  | { message: null; tasks: GrammarRecallTaskRecord[] }
> {
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

  const data = (await response.json()) as { tasks: GrammarRecallTaskRecord[] }

  return { message: null, tasks: data.tasks }
}

/**
 * Opens the recall session, and auto-opens it once on the first visit of a day
 * when something is due - the same ritual already approved for vocabulary.
 *
 * "Once per day" lives in localStorage rather than server state on purpose:
 * getting it wrong costs a redundant modal, not data, and it keeps the dashboard
 * a server component with no per-request write.
 */
export function GrammarRecallLauncher({ dueCount }: { dueCount: number }) {
  const [tasks, setTasks] = useState<GrammarRecallTaskRecord[] | null>(null)
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const start = useCallback(async () => {
    setPending(true)
    setMessage(null)

    try {
      const result = await fetchDueTasks()

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
  }, [])

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
    void fetchDueTasks().then(result => {
      if (cancelled || !result.tasks?.length) return

      setTasks(result.tasks)
    })

    return () => {
      cancelled = true
    }
  }, [dueCount])

  if (tasks)
    return (
      <GrammarRecallModal
        onClose={() => setTasks(null)}
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

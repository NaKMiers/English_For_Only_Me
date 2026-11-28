'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import { Skeleton } from '@/components/ui/skeleton'
import { useMessages } from '@/i18n/client'
import type { IeltsAttemptRecord } from '@/modules/ielts/attempts/attemptRecords'
import type { IeltsSkill } from '@/modules/ielts/constants'
import type { IeltsPublicSection } from '@/modules/ielts/publicView'
import {
  IeltsApiError,
  ieltsErrorMessage,
  startIeltsAttemptApi,
} from '@/requests/ieltsApi'

import { IeltsRunner } from './IeltsRunner'
import { WritingRunner } from './WritingRunner'
import { ExamButton } from '@/components/ielts/ui'

interface Props {
  backHref: string
  mode: 'practice' | 'mock'
  /** Practice only: the test's next and previous skills, for the bottom bar. */
  next?: { href: string; label: string } | null
  prev?: { href: string; label: string } | null
  /** Part to open first; the attempt itself always covers the whole skill. */
  startPart: number | null
  sections: IeltsPublicSection[]
  skill: IeltsSkill
  testSlug: string
  testTitle: string
}

function mintKey() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

/**
 * The start key is kept per (test, skill, mode) in sessionStorage, so
 * a double mount or a reload replays the same request instead of opening a
 * second attempt. A replay of an attempt that is already finished mints a
 * fresh key and starts a new one.
 */
function readStartKey(name: string, fresh = false) {
  try {
    const existing = fresh ? null : window.sessionStorage.getItem(name)

    if (existing) return existing

    const key = mintKey()

    window.sessionStorage.setItem(name, key)

    return key
  } catch {
    return mintKey()
  }
}

export function RunnerSkeleton() {
  const t = useMessages()

  return (
    <div
      aria-busy
      aria-label={t.ielts.loading.test}
      className="flex h-full flex-col"
    >
      <Skeleton className="h-16 w-full" />
      <div className="grid flex-1 gap-4 p-4 lg:grid-cols-[55fr_45fr]">
        <Skeleton className="rounded-panel h-full min-h-60" />
        <Skeleton className="rounded-panel h-full min-h-60" />
      </div>
      <Skeleton className="h-14 w-full" />
    </div>
  )
}

export function AttemptLoader({
  backHref,
  mode,
  next = null,
  prev = null,
  startPart,
  sections,
  skill,
  testSlug,
  testTitle,
}: Props) {
  const t = useMessages()
  const openFailed = t.ielts.runner.openFailed
  const [attempt, setAttempt] = useState<IeltsAttemptRecord | null>(null)
  const [error, setError] = useState('')
  const startedRef = useRef(false)
  const keyName = `ielts:start:${testSlug}:${skill}:${mode}`

  const start = useCallback(async () => {
    setError('')

    try {
      const body = {
        mode,
        scope: { kind: 'skill' as const },
        sessionId: null,
        skill,
        testSlug,
      }
      // A stored key that points at an older test version answers 409:
      // start fresh once with a new key.
      let result = await startIeltsAttemptApi({
        ...body,
        idempotencyKey: readStartKey(keyName),
      }).catch(async (caught: unknown) => {
        if (caught instanceof IeltsApiError && caught.status === 409)
          return startIeltsAttemptApi({
            ...body,
            idempotencyKey: readStartKey(keyName, true),
          })

        throw caught
      })

      if (result.attempt.status !== 'in_progress')
        result = await startIeltsAttemptApi({
          ...body,
          idempotencyKey: readStartKey(keyName, true),
        })

      setAttempt(result.attempt)
    } catch (caught) {
      setError(ieltsErrorMessage(caught, openFailed))
    }
  }, [keyName, mode, openFailed, skill, testSlug])

  useEffect(() => {
    if (startedRef.current) return

    startedRef.current = true
    void start()
  }, [start])

  if (error)
    return (
      <div
        className="grid h-full place-content-center gap-4 p-6 text-center"
        role="alert"
      >
        <p className="font-sans text-lg font-semibold">
          {t.ielts.runner.openFailedTitle}
        </p>
        <p className="font-semibold">{error}</p>
        <div className="flex flex-wrap justify-center gap-3">
          <ExamButton
            onClick={() => void start()}
            tone="ink"
            type="button"
          >
            {t.common.actions.retry}
          </ExamButton>
          <ExamButton
            href={backHref}
            tone="paper"
          >
            {t.common.actions.back}
          </ExamButton>
        </div>
      </div>
    )

  if (!attempt) return <RunnerSkeleton />

  if (skill === 'writing')
    return (
      <WritingRunner
        attempt={attempt}
        backHref={backHref}
        next={next}
        prev={prev}
        sections={sections}
        startPart={startPart}
        testTitle={testTitle}
      />
    )

  return (
    <IeltsRunner
      attempt={attempt}
      backHref={backHref}
      next={next}
      prev={prev}
      sections={sections}
      startPart={startPart}
      testTitle={testTitle}
    />
  )
}

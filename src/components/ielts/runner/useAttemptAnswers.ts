'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import { useClientOutbox } from '@/components/common/OutboxOwnerProvider'
import type { IeltsAttemptRecord } from '@/modules/ielts/attempts/attemptRecords'
import type { IeltsAnswers } from '@/modules/ielts/scoring/scoreObjective'
import {
  buildIeltsAnswersWrite,
  buildIeltsSubmitWrite,
} from '@/requests/ieltsApi'

import type { IeltsAnswerValue } from '../widgets/answerContext'

export const IELTS_AUTOSAVE_DEBOUNCE_MS = 1500

export type IeltsSaveState =
  'idle' | 'pending' | 'saving' | 'saved' | 'offline' | 'timeup'

interface LocalSnapshot {
  answers: IeltsAnswers
  seq: number
}

const storageKey = (attemptId: string) => `ielts:attempt:${attemptId}`

function readLocal(attemptId: string): LocalSnapshot | null {
  try {
    const raw = window.localStorage.getItem(storageKey(attemptId))

    if (!raw) return null

    const parsed = JSON.parse(raw) as Partial<LocalSnapshot>

    if (
      typeof parsed.seq !== 'number' ||
      !parsed.answers ||
      typeof parsed.answers !== 'object'
    )
      return null

    return { answers: parsed.answers, seq: parsed.seq }
  } catch {
    return null
  }
}

function writeLocal(attemptId: string, snapshot: LocalSnapshot) {
  try {
    window.localStorage.setItem(storageKey(attemptId), JSON.stringify(snapshot))
  } catch {
    // Storage full or blocked: the outbox still carries the write.
  }
}

export function clearIeltsLocalAnswers(attemptId: string) {
  try {
    window.localStorage.removeItem(storageKey(attemptId))
  } catch {
    // Nothing to clear.
  }
}

/** A newer local snapshot (saved before a reload or offline) wins. */
export function pickInitialSnapshot(
  attempt: Pick<IeltsAttemptRecord, 'answers' | 'savedSeq'>,
  local: LocalSnapshot | null
): LocalSnapshot {
  if (local && local.seq > attempt.savedSeq) return local

  return { answers: attempt.answers ?? {}, seq: attempt.savedSeq }
}

interface Options {
  attempt: IeltsAttemptRecord
  /** False once submitted or in review: no saves. */
  enabled: boolean
  /** The server refused a save because time is up (deadline + grace). */
  onTimeUp?: () => void
}

/**
 * Learner answers for one attempt: state, a localStorage copy, and a
 * debounced full-snapshot autosave through the client outbox (seq rises on
 * every change; the server keeps the newest). Submit flushes and sends the
 * final snapshot on the same lane.
 */
export function useAttemptAnswers({ attempt, enabled, onTimeUp }: Options) {
  const outbox = useClientOutbox()
  // The runner mounts only in the browser (after the attempt is fetched), so
  // reading localStorage in the initializer is safe: a newer local snapshot
  // saved before a reload or while offline wins.
  const [initial] = useState(() =>
    pickInitialSnapshot(
      attempt,
      typeof window === 'undefined' ? null : readLocal(attempt.id)
    )
  )
  const restoredNewer = enabled && initial.seq > attempt.savedSeq
  const [answers, setAnswers] = useState<IeltsAnswers>(initial.answers)
  const [saveState, setSaveState] = useState<IeltsSaveState>(
    restoredNewer ? 'pending' : 'idle'
  )
  const seqRef = useRef(initial.seq)
  const answersRef = useRef<IeltsAnswers>(initial.answers)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dirtyRef = useRef(restoredNewer)
  const timeUpRef = useRef(false)
  const onTimeUpRef = useRef(onTimeUp)

  useEffect(() => {
    onTimeUpRef.current = onTimeUp
  })

  const send = useCallback(async () => {
    timerRef.current = null

    if (!dirtyRef.current || timeUpRef.current) return

    dirtyRef.current = false
    setSaveState(navigator.onLine === false ? 'offline' : 'saving')

    const result = await outbox.enqueue(
      buildIeltsAnswersWrite(attempt.id, answersRef.current, seqRef.current)
    )

    if (!result.ok && result.status === 409) {
      timeUpRef.current = true
      setSaveState('timeup')
      onTimeUpRef.current?.()
      return
    }

    if (!dirtyRef.current) setSaveState(result.ok ? 'saved' : 'pending')
  }, [attempt.id, outbox])

  const schedule = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)

    timerRef.current = setTimeout(() => {
      void send()
    }, IELTS_AUTOSAVE_DEBOUNCE_MS)
  }, [send])

  // A snapshot restored from storage still has to reach the server.
  useEffect(() => {
    if (enabled && dirtyRef.current) schedule()
  }, [enabled, schedule])

  useEffect(() => {
    const onOffline = () =>
      setSaveState(current =>
        current === 'saving' || current === 'pending' ? 'offline' : current
      )
    const onOnline = () =>
      setSaveState(current => (current === 'offline' ? 'saving' : current))

    window.addEventListener('offline', onOffline)
    window.addEventListener('online', onOnline)

    return () => {
      window.removeEventListener('offline', onOffline)
      window.removeEventListener('online', onOnline)
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const setAnswer = useCallback(
    (number: number, value: IeltsAnswerValue) => {
      if (!enabled || timeUpRef.current) return

      const next = { ...answersRef.current }
      const empty = Array.isArray(value) ? value.length === 0 : value === ''

      if (empty) delete next[String(number)]
      else next[String(number)] = value

      answersRef.current = next
      seqRef.current += 1
      dirtyRef.current = true
      writeLocal(attempt.id, { answers: next, seq: seqRef.current })
      setAnswers(next)
      setSaveState('pending')
      schedule()
    },
    [attempt.id, enabled, schedule]
  )

  /** Final snapshot; resolves with the scored attempt or an error message. */
  const submit = useCallback(async (): Promise<
    | { ok: true; attempt: IeltsAttemptRecord }
    | { ok: false; message: string; status: number }
  > => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }

    dirtyRef.current = false
    seqRef.current += 1

    const result = await outbox.enqueue(
      buildIeltsSubmitWrite(attempt.id, answersRef.current, seqRef.current)
    )

    if (!result.ok)
      return { ok: false, message: result.error, status: result.status }

    clearIeltsLocalAnswers(attempt.id)

    return {
      ok: true,
      attempt: (result.data as { attempt: IeltsAttemptRecord }).attempt,
    }
  }, [attempt.id, outbox])

  return { answers, saveState, setAnswer, submit }
}

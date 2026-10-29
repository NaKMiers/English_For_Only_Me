import {
  IELTS_MAX_AUDIO_INTERRUPTIONS,
  IELTS_TIMERS,
  type IeltsSkill,
} from '../constants'

export type IeltsAttemptScope =
  { kind: 'skill' } | { kind: 'part'; part: number }

export type IeltsAudioEvent =
  | { kind: 'part-started'; part: number; atMs: number }
  | { kind: 'interrupted'; atMs: number; positionSec: number }
  | { kind: 'resumed'; atMs: number; positionSec: number }

/*
 * Mock deadlines. Reading and Writing start the clock when the attempt is
 * created. Listening has no deadline until audio starts, and is re-anchored
 * at every part start so a slow load between parts never eats the
 * learner's time:
 *
 *   part p playing:  partStartedAt(p) + duration(p)
 *                    + sum over later parts q (30 s preview + duration(q))
 *                    + 120 s transfer
 *   part mock:       audioStartedAt + duration(part) + 30 s
 *   both:            + the gap of each interruption, at most 2 counted
 */

function interruptionGapMs(events: IeltsAudioEvent[]): number {
  let counted = 0
  let gap = 0
  let interruptedAt: number | null = null

  for (const event of events)
    if (event.kind === 'interrupted' && interruptedAt === null) {
      if (counted >= IELTS_MAX_AUDIO_INTERRUPTIONS) break

      interruptedAt = event.atMs
    } else if (event.kind === 'resumed' && interruptedAt !== null) {
      gap += Math.max(0, event.atMs - interruptedAt)
      counted++
      interruptedAt = null
    }

  return gap
}

export function computeDeadline({
  skill,
  scope,
  startedAt,
  partDurationsSec,
  audioEvents,
}: {
  skill: IeltsSkill
  scope: IeltsAttemptScope
  startedAt: Date
  /** Listening only: audio duration of parts 1..4 (index 0 = part 1). */
  partDurationsSec: number[]
  audioEvents: IeltsAudioEvent[]
}): Date | null {
  const start = startedAt.getTime()

  if (skill === 'reading')
    return new Date(
      start +
        (scope.kind === 'part'
          ? IELTS_TIMERS.readingPart
          : IELTS_TIMERS.readingSkill) *
          1000
    )

  if (skill === 'writing') {
    const seconds =
      scope.kind === 'skill'
        ? IELTS_TIMERS.writingSkill
        : scope.part === 1
          ? IELTS_TIMERS.writingTask1
          : IELTS_TIMERS.writingTask2

    return new Date(start + seconds * 1000)
  }

  const starts = audioEvents.filter(
    (event): event is Extract<IeltsAudioEvent, { kind: 'part-started' }> =>
      event.kind === 'part-started'
  )

  if (starts.length === 0) return null

  const gap = interruptionGapMs(audioEvents)

  if (scope.kind === 'part') {
    const first = starts[0]
    const duration = partDurationsSec[scope.part - 1] ?? 0

    return new Date(
      first.atMs + (duration + IELTS_TIMERS.listeningPartTransfer) * 1000 + gap
    )
  }

  const latest = starts.reduce((current, event) =>
    event.part > current.part ? event : current
  )
  const remainingParts = partDurationsSec
    .slice(latest.part)
    .reduce(
      (sum, duration) => sum + IELTS_TIMERS.listeningPartPreview + duration,
      0
    )
  const seconds =
    (partDurationsSec[latest.part - 1] ?? 0) +
    remainingParts +
    IELTS_TIMERS.listeningTransfer

  return new Date(latest.atMs + seconds * 1000 + gap)
}

export function isPastGrace(deadlineAt: Date | null, now: Date): boolean {
  if (!deadlineAt) return false

  return now.getTime() > deadlineAt.getTime() + IELTS_TIMERS.graceSeconds * 1000
}

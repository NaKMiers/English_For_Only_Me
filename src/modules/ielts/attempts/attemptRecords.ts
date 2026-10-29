import type {
  IeltsAttemptMode,
  IeltsAttemptStatus,
  IeltsSkill,
  IeltsTrack,
} from '../constants'
import type { IeltsObjectiveResult } from '../scoring/scoreObjective'
import type { IeltsAttemptScope, IeltsAudioEvent } from './deadline'

export interface IeltsWritingCorrection {
  quote: string
  suggestion: string
  reason: string
  grammarLessonId: string | null
  grammarLessonTitle: string | null
}

export interface IeltsWritingTaskFeedback {
  status: 'pending' | 'grading' | 'done' | 'failed'
  /** Set while a grading request runs; a stale one may be retried. */
  startedAt?: string | null
  error: string
  model: string
  criteria: { taskResponse: number; cc: number; lr: number; gra: number } | null
  band: number | null
  summary: string
  corrections: IeltsWritingCorrection[]
  improved: string
}

export interface IeltsDrillItem {
  testId: string
  testSlug: string
  version: number
  sectionKey: string
  groupId: string
  numberMap: { drillNo: number; originalNo: number }[]
}

/** What the learner's own browser may see about their attempt. */
export interface IeltsAttemptRecord {
  id: string
  testSlug: string
  testVersion: number
  testTitle: string
  track: IeltsTrack
  skill: IeltsSkill
  mode: IeltsAttemptMode
  scope: IeltsAttemptScope
  items: IeltsDrillItem[]
  sessionId: string | null
  status: IeltsAttemptStatus
  startedAt: string
  deadlineAt: string | null
  audioEvents: IeltsAudioEvent[]
  answers: Record<string, string | string[]>
  savedSeq: number
  submittedAt: string | null
  scoredAt: string | null
  /** Only after submit. */
  result: (IeltsObjectiveResult & { band: number | null }) | null
  writingFeedback: Partial<Record<'1' | '2', IeltsWritingTaskFeedback>> | null
  writingBand: number | null
}

type LeanAttempt = Record<string, unknown>

const iso = (value: unknown) =>
  value ? new Date(value as string).toISOString() : null

export function toIeltsAttemptRecord(raw: LeanAttempt): IeltsAttemptRecord {
  const scope = raw.scope as { kind: string; part?: number | null }
  const items = (raw.items as LeanAttempt[] | undefined) ?? []

  return {
    id: String(raw._id),
    testSlug: String(raw.testSlug ?? ''),
    testVersion: Number(raw.testVersion ?? 0),
    testTitle: String(raw.testTitle ?? ''),
    track: (raw.track as IeltsTrack) ?? 'academic',
    skill: raw.skill as IeltsSkill,
    mode: raw.mode as IeltsAttemptMode,
    scope:
      scope?.kind === 'part'
        ? { kind: 'part', part: Number(scope.part) }
        : { kind: 'skill' },
    items: items.map(item => ({
      testId: String(item.testId),
      testSlug: String(item.testSlug ?? ''),
      version: Number(item.version),
      sectionKey: String(item.sectionKey),
      groupId: String(item.groupId),
      numberMap: ((item.numberMap as LeanAttempt[] | undefined) ?? []).map(
        row => ({
          drillNo: Number(row.drillNo),
          originalNo: Number(row.originalNo),
        })
      ),
    })),
    sessionId: (raw.sessionId as string | null) ?? null,
    status: raw.status as IeltsAttemptStatus,
    startedAt: iso(raw.startedAt) ?? new Date(0).toISOString(),
    deadlineAt: iso(raw.deadlineAt),
    audioEvents: (raw.audioEvents as IeltsAudioEvent[] | undefined) ?? [],
    answers: (raw.answers as Record<string, string | string[]>) ?? {},
    savedSeq: Number(raw.savedSeq ?? 0),
    submittedAt: iso(raw.submittedAt),
    scoredAt: iso(raw.scoredAt),
    result:
      raw.status === 'scored' || raw.status === 'submitted'
        ? ((raw.result as IeltsAttemptRecord['result']) ?? null)
        : null,
    writingFeedback:
      (raw.writingFeedback as IeltsAttemptRecord['writingFeedback']) ?? null,
    writingBand: (raw.writingBand as number | null) ?? null,
  }
}

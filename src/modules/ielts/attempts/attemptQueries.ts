import 'server-only'

import { IeltsAttemptModel } from '@/models/ielts/IeltsAttemptModel'

import type {
  IeltsAttemptMode,
  IeltsAttemptStatus,
  IeltsSkill,
} from '../constants'
import { type IeltsBandedAttempt, overallEstimate } from '../scoring/overall'

/** One row of the learner's history (no answers, no key). */
export interface IeltsAttemptSummary {
  id: string
  testSlug: string
  testTitle: string
  testVersion: number
  skill: IeltsSkill
  mode: IeltsAttemptMode
  part: number | null
  status: IeltsAttemptStatus
  startedAt: string
  deadlineAt: string | null
  raw: number | null
  total: number | null
  band: number | null
}

type LeanRow = Record<string, unknown>

function toSummary(row: LeanRow): IeltsAttemptSummary {
  const result = row.result as {
    raw?: number
    total?: number
    band?: number | null
  } | null
  const scope = row.scope as { kind?: string; part?: number | null } | undefined
  const skill = row.skill as IeltsSkill

  return {
    id: String(row._id),
    testSlug: String(row.testSlug ?? ''),
    testTitle: String(row.testTitle ?? ''),
    testVersion: Number(row.testVersion ?? 0),
    skill,
    mode: row.mode as IeltsAttemptMode,
    part: scope?.kind === 'part' ? Number(scope.part) : null,
    status: row.status as IeltsAttemptStatus,
    startedAt: new Date(row.startedAt as string).toISOString(),
    deadlineAt: row.deadlineAt
      ? new Date(row.deadlineAt as string).toISOString()
      : null,
    raw: typeof result?.raw === 'number' ? result.raw : null,
    total: typeof result?.total === 'number' ? result.total : null,
    band:
      skill === 'writing'
        ? ((row.writingBand as number | null) ?? null)
        : (result?.band ?? null),
  }
}

const SUMMARY_FIELDS = {
  testSlug: 1,
  testTitle: 1,
  testVersion: 1,
  skill: 1,
  mode: 1,
  scope: 1,
  status: 1,
  startedAt: 1,
  deadlineAt: 1,
  'result.raw': 1,
  'result.total': 1,
  'result.band': 1,
  writingBand: 1,
}

export async function listIeltsAttempts(
  ownerId: string,
  { limit = 30, testSlug }: { limit?: number; testSlug?: string } = {}
): Promise<IeltsAttemptSummary[]> {
  const rows = await IeltsAttemptModel.find(
    { ownerId, ...(testSlug ? { testSlug } : {}) },
    SUMMARY_FIELDS
  )
    .sort({ startedAt: -1 })
    .limit(limit)
    .lean()

  return rows.map(row => toSummary(row as LeanRow))
}

/**
 * In-progress attempts that can still be resumed. A mock whose deadline
 * passed is left out: reading it expires and scores it.
 */
export function openAttempts(
  summaries: IeltsAttemptSummary[],
  now = new Date()
) {
  return summaries.filter(
    item =>
      item.status === 'in_progress' &&
      (!item.deadlineAt || new Date(item.deadlineAt) > now)
  )
}

/** Overall estimate from the owner's full-skill banded attempts. */
export async function readIeltsOverall(ownerId: string) {
  const rows = await IeltsAttemptModel.find(
    {
      ownerId,
      status: { $in: ['scored', 'submitted'] },
      mode: { $in: ['practice', 'mock'] },
      'scope.kind': 'skill',
    },
    {
      skill: 1,
      testId: 1,
      testVersion: 1,
      sessionId: 1,
      scoredAt: 1,
      submittedAt: 1,
      'result.band': 1,
      writingBand: 1,
    }
  )
    .sort({ startedAt: -1 })
    .limit(60)
    .lean()

  const banded: IeltsBandedAttempt[] = []

  for (const row of rows as LeanRow[]) {
    const skill = row.skill as IeltsSkill
    const band =
      skill === 'writing'
        ? (row.writingBand as number | null)
        : ((row.result as { band?: number | null } | null)?.band ?? null)

    if (typeof band !== 'number') continue

    banded.push({
      skill,
      band,
      testId: String(row.testId ?? ''),
      testVersion: Number(row.testVersion ?? 0),
      sessionId: (row.sessionId as string | null) ?? null,
      scoredAt: new Date(
        (row.scoredAt ?? row.submittedAt ?? Date.now()) as string
      ),
    })
  }

  return overallEstimate(banded)
}

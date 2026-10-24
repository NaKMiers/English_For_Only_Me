import 'server-only'

import { assertOwnerKey } from '@/lib/auth/ownerKey'
import { GrammarCardMissModel } from '@/models/grammar/GrammarCardMissModel'
import { GrammarLessonProgressModel } from '@/models/grammar/GrammarLessonProgressModel'
import { GrammarSessionModel } from '@/models/grammar/GrammarSessionModel'
import { GrammarUnitProgressModel } from '@/models/grammar/GrammarUnitProgressModel'
import { grammarCourse } from '@/modules/grammar/course'
import type {
  CardMiss,
  LessonPassedBy,
  LessonProgress,
  UnitPassedBy,
  UnitProgress,
} from '@/modules/grammar/progress/types'
import {
  planGrammarSessionWrite,
  type ActorGrammarProgress,
  type GrammarSessionResult,
  type GrammarSessionSubmission,
  type GrammarSessionWritePlan,
} from '@/modules/grammar/session/planGrammarSessionWrite'

/**
 * The only file that talks to Mongo for grammar progress. Every rule lives in
 * the pure planners; this reads rows, hands them over, and upserts the result.
 */

function isDuplicateKeyError(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 11000
  )
}

interface LessonRow {
  lessonId: string
  stars: number
  bestAccuracy: number
  passedBy?: string | null
  completedAt?: Date | null
  attempts: number
  recallStage?: number | null
  dueAt?: Date | null
  reviewCount: number
  correctCount: number
  wrongCount: number
  masteredAt?: Date | null
}

function toLessonProgress(row: LessonRow): LessonProgress {
  return {
    attempts: row.attempts,
    bestAccuracy: row.bestAccuracy,
    completedAt: row.completedAt ?? null,
    correctCount: row.correctCount,
    dueAt: row.dueAt ?? null,
    lessonId: row.lessonId,
    masteredAt: row.masteredAt ?? null,
    passedBy: (row.passedBy as LessonPassedBy | null | undefined) ?? null,
    recallStage: row.recallStage ?? null,
    reviewCount: row.reviewCount,
    stars: row.stars,
    wrongCount: row.wrongCount,
  }
}

export async function getGrammarProgressForActor(
  actorId: string
): Promise<ActorGrammarProgress> {
  const userId = assertOwnerKey(actorId)
  const [lessons, units, misses] = await Promise.all([
    GrammarLessonProgressModel.find({ userId }).lean(),
    GrammarUnitProgressModel.find({ userId }).lean(),
    GrammarCardMissModel.find({ userId }).lean(),
  ])

  return {
    lessonProgress: lessons.map(toLessonProgress),
    misses: misses.map((row): CardMiss => ({
      cardId: row.cardId,
      clearedAt: row.clearedAt ?? null,
      lastMissedAt: row.lastMissedAt,
      lessonId: row.lessonId,
      missCount: row.missCount,
    })),
    unitProgress: units.map((row): UnitProgress => ({
      completedAt: row.completedAt,
      passedBy: row.passedBy as UnitPassedBy,
      unitId: row.unitId,
    })),
  }
}

async function applyWritePlan(
  userId: string,
  plan: Pick<
    GrammarSessionWritePlan,
    'lessonWrites' | 'missWrites' | 'unitWrites'
  >
) {
  await Promise.all([
    plan.lessonWrites.length > 0
      ? GrammarLessonProgressModel.bulkWrite(
          plan.lessonWrites.map(row => ({
            updateOne: {
              filter: { lessonId: row.lessonId, userId },
              update: { $set: { ...row, userId } },
              upsert: true,
            },
          }))
        )
      : null,
    plan.unitWrites.length > 0
      ? GrammarUnitProgressModel.bulkWrite(
          plan.unitWrites.map(row => ({
            updateOne: {
              filter: { unitId: row.unitId, userId },
              update: { $set: { ...row, userId } },
              upsert: true,
            },
          }))
        )
      : null,
    plan.missWrites.length > 0
      ? GrammarCardMissModel.bulkWrite(
          plan.missWrites.map(row => ({
            updateOne: {
              filter: { cardId: row.cardId, userId },
              update: { $set: { ...row, userId } },
              upsert: true,
            },
          }))
        )
      : null,
  ])
}

export type RecordGrammarSessionOutcome =
  | { ok: true; result: GrammarSessionResult; replayed: boolean }
  | { ok: false; status: 400 | 409 | 503; message: string }

/** A claim older than this was abandoned mid-write; the key may be retried. */
const STALE_CLAIM_MS = 60_000

/**
 * Apply one finished session for an actor, at most once per idempotency key.
 *
 *   claim key (insert, response: null) ──dup──▶ finished? replay : 503 "đang lưu"
 *        │
 *        ▼
 *   read rows ─▶ plan ─▶ write rows ─▶ store response on the claim
 *        │                   │
 *        └─ 400/409 ─────────┴─ error ─▶ release the claim, so a retry replans
 *
 * Claiming BEFORE reading means two requests with the same key (a retry racing
 * the original, the path page replaying a pending save) can never both plan
 * and write: the loser gets a retryable 503 and later replays the stored
 * result. A claim left behind by a crash expires after STALE_CLAIM_MS.
 */
export async function recordGrammarSession({
  actorId,
  idempotencyKey,
  now = new Date(),
  submission,
}: {
  actorId: string
  idempotencyKey: string
  now?: Date
  submission: GrammarSessionSubmission
}): Promise<RecordGrammarSessionOutcome> {
  const userId = assertOwnerKey(actorId)
  const key = { idempotencyKey, userId }

  try {
    await GrammarSessionModel.create({
      ...key,
      claimedAt: now,
      mode: submission.mode,
      response: null,
      targetId: submission.targetId,
    })
  } catch (error) {
    if (!isDuplicateKeyError(error)) throw error

    const prior = await GrammarSessionModel.findOne(key).lean()

    if (prior?.response)
      return {
        ok: true,
        replayed: true,
        result: prior.response as GrammarSessionResult,
      }

    const claimedAt = prior?.claimedAt?.getTime() ?? now.getTime()

    if (now.getTime() - claimedAt < STALE_CLAIM_MS)
      return { message: 'Bài làm đang được lưu.', ok: false, status: 503 }

    // An abandoned claim: take it over and plan again.
    await GrammarSessionModel.updateOne(key, { $set: { claimedAt: now } })
  }

  try {
    const progress = await getGrammarProgressForActor(userId)
    const outcome = planGrammarSessionWrite({
      course: grammarCourse,
      now,
      progress,
      submission,
    })

    if (!outcome.ok) {
      await GrammarSessionModel.deleteOne(key)

      return outcome
    }

    await applyWritePlan(userId, outcome.plan)
    await GrammarSessionModel.updateOne(key, {
      $set: { response: outcome.plan.response },
    })

    return { ok: true, replayed: false, result: outcome.plan.response }
  } catch (error) {
    // Release the claim so the client's retry plans again instead of waiting
    // out the stale window. Best-effort: the original error is what matters.
    await GrammarSessionModel.deleteOne(key).catch(() => undefined)
    throw error
  }
}

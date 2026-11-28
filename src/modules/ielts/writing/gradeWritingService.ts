import 'server-only'

import {
  getIeltsWritingDailyLimit,
  getQwenApiKey,
  getQwenIeltsGradingModel,
} from '@/constants/environments'
import { IeltsAttemptModel } from '@/models/ielts/IeltsAttemptModel'
import { IeltsGradingLedgerModel } from '@/models/ielts/IeltsGradingLedgerModel'
import { grammarCourse } from '@/modules/grammar/course'

import {
  type IeltsAttemptRecord,
  type IeltsWritingTaskFeedback,
  toIeltsAttemptRecord,
} from '../attempts/attemptRecords'
import {
  type IeltsDecision,
  ieltsMessageError,
} from '../attempts/attemptRouteDecisions'
import { loadAttemptSections } from '../attempts/attemptService'
import { IELTS_GENERATING_STALE_SECONDS } from '../constants'
import { writingBand } from '../scoring/roundBand'
import { countEssayWords } from '../scoring/wordCount'
import { runExaminer } from './runExaminer'

/** Lesson ids and titles the examiner may link a correction to. */
function examinerLessons() {
  return grammarCourse.units.flatMap(unit =>
    unit.lessons.map(lesson => ({
      id: lesson.id,
      title: `${lesson.titleEn} (${unit.level})`,
    }))
  )
}

function startOfUtcDay(now: Date) {
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  )
}

/**
 * Successful gradings today across all the owner's attempts, plus those of
 * attempts deleted today (kept in the grading ledger).
 */
export async function countGradingsToday(ownerId: string, now = new Date()) {
  const since = startOfUtcDay(now)
  const [[row], deleted] = await Promise.all([
    IeltsAttemptModel.aggregate<{ count: number }>([
      { $match: { ownerId, 'gradings.at': { $gte: since } } },
      { $unwind: '$gradings' },
      { $match: { 'gradings.at': { $gte: since } } },
      { $count: 'count' },
    ]),
    IeltsGradingLedgerModel.countDocuments({ ownerId, at: { $gte: since } }),
  ])

  return (row?.count ?? 0) + deleted
}

/**
 * When every task has feedback: the writing band (full skill only) and the
 * `scored` status. Part attempts are scored without a band.
 */
function completion(
  feedback: Partial<Record<'1' | '2', IeltsWritingTaskFeedback>>,
  isFullSkill: boolean
) {
  const tasks = Object.values(feedback)

  if (!tasks.length || tasks.some(item => item?.status !== 'done')) return null

  const t1 = feedback['1']?.band
  const t2 = feedback['2']?.band

  return {
    band:
      isFullSkill && typeof t1 === 'number' && typeof t2 === 'number'
        ? writingBand(t1, t2)
        : null,
  }
}

/**
 * Grade one task of a submitted writing attempt. The daily limit counts only
 * successful runs, and a task already being graded (by another click or tab)
 * is not graded twice.
 */
export async function gradeWritingTask({
  attemptId,
  fetcher,
  now = new Date(),
  ownerId,
  task,
}: {
  attemptId: string
  fetcher?: typeof fetch
  now?: Date
  ownerId: string
  task: 1 | 2
}): Promise<IeltsDecision<IeltsAttemptRecord>> {
  const attempt = await IeltsAttemptModel.findOne({
    _id: attemptId,
    ownerId,
  }).lean()

  if (!attempt) return ieltsMessageError(404, 'attemptNotFound')

  if (attempt.skill !== 'writing')
    return ieltsMessageError(400, 'onlyWritingGraded')

  if (attempt.status !== 'submitted' && attempt.status !== 'scored')
    return ieltsMessageError(409, 'submitBeforeGrading')

  const key = String(task) as '1' | '2'
  const feedback = (attempt.writingFeedback ?? {}) as Partial<
    Record<'1' | '2', IeltsWritingTaskFeedback>
  >

  if (!feedback[key]) return ieltsMessageError(404, 'taskNotInAttempt')

  if (!getQwenApiKey()) return ieltsMessageError(503, 'aiNotConfiguredCompare')

  const limit = getIeltsWritingDailyLimit()

  if ((await countGradingsToday(ownerId, now)) >= limit)
    return ieltsMessageError(429, 'gradingLimit', { limit })

  const staleBefore = new Date(
    now.getTime() - IELTS_GENERATING_STALE_SECONDS * 1000
  ).toISOString()
  const claimed = await IeltsAttemptModel.findOneAndUpdate(
    {
      _id: attempt._id,
      ownerId,
      $or: [
        { [`writingFeedback.${key}.status`]: { $ne: 'grading' } },
        { [`writingFeedback.${key}.startedAt`]: { $lt: staleBefore } },
      ],
    },
    {
      $set: {
        [`writingFeedback.${key}.status`]: 'grading',
        [`writingFeedback.${key}.startedAt`]: now.toISOString(),
      },
    },
    { new: true }
  ).lean()

  if (!claimed) return ieltsMessageError(409, 'alreadyGrading')

  const sections = await loadAttemptSections(
    claimed as unknown as Parameters<typeof loadAttemptSections>[0]
  )
  const material = sections.find(
    section => section.writing?.task === task
  )?.writing
  const essay = String(
    (claimed.answers as Record<string, unknown>)?.[key] ?? ''
  )

  if (!material) {
    await IeltsAttemptModel.updateOne(
      { _id: attempt._id },
      {
        $set: {
          [`writingFeedback.${key}.status`]: 'failed',
          [`writingFeedback.${key}.error`]: 'The task content is missing.',
        },
      }
    )
    return ieltsMessageError(404, 'taskContentMissing')
  }

  const model = getQwenIeltsGradingModel()
  const result = essay.trim()
    ? await runExaminer({
        apiKey: getQwenApiKey(),
        fetcher,
        model,
        input: {
          task,
          track: claimed.track === 'general' ? 'general' : 'academic',
          prompt: material.prompt,
          visual: material.visual,
          minWords: material.minWords,
          essay,
          wordCount: countEssayWords(essay),
          lessons: examinerLessons(),
        },
      })
    : ({ ok: false, message: 'The essay is empty, nothing to grade.' } as const)

  if (!result.ok) {
    console.warn('ielts writing grading failed', {
      attemptId,
      message: result.message,
      task,
    })

    const failed = await IeltsAttemptModel.findOneAndUpdate(
      { _id: attempt._id, ownerId },
      {
        $set: {
          [`writingFeedback.${key}.status`]: 'failed',
          [`writingFeedback.${key}.error`]: result.message,
          [`writingFeedback.${key}.startedAt`]: null,
        },
      },
      { new: true }
    ).lean()

    return failed
      ? { ok: true, data: toIeltsAttemptRecord(failed) }
      : ieltsMessageError(404, 'attemptNotFound')
  }

  const isFullSkill =
    (claimed.scope as { kind?: string } | undefined)?.kind !== 'part'
  const written = await IeltsAttemptModel.findOneAndUpdate(
    { _id: attempt._id, ownerId },
    {
      $set: {
        [`writingFeedback.${key}`]: { ...result.feedback, startedAt: null },
      },
      $push: { gradings: { task, at: now } },
    },
    { new: true }
  ).lean()

  if (!written) return ieltsMessageError(404, 'attemptNotFound')

  // Completion is judged on the fresh document, so two tasks graded at the
  // same time still end `scored` with a band (whichever finishes last).
  const done = completion(
    (written.writingFeedback ?? {}) as Partial<
      Record<'1' | '2', IeltsWritingTaskFeedback>
    >,
    isFullSkill
  )
  const updated =
    done && written.status !== 'scored'
      ? await IeltsAttemptModel.findOneAndUpdate(
          { _id: attempt._id, ownerId, status: { $ne: 'scored' } },
          { $set: { status: 'scored', scoredAt: now, writingBand: done.band } },
          { new: true }
        ).lean()
      : written

  return updated
    ? { ok: true, data: toIeltsAttemptRecord(updated) }
    : ieltsMessageError(404, 'attemptNotFound')
}

/**
 * Practice "check task": AI feedback on one task's essay before the attempt
 * is submitted. The essay comes from the screen (it may be newer than the
 * last autosave). The feedback goes back to the runner only, nothing on the
 * attempt changes except the grading count, which keeps the daily limit
 * honest. Same configuration and limit rules as graded results.
 */
export async function checkPracticeWriting({
  attemptId,
  essay,
  fetcher,
  now = new Date(),
  ownerId,
  task,
}: {
  attemptId: string
  essay: string
  fetcher?: typeof fetch
  now?: Date
  ownerId: string
  task: 1 | 2
}): Promise<IeltsDecision<IeltsWritingTaskFeedback>> {
  const attempt = await IeltsAttemptModel.findOne({
    _id: attemptId,
    ownerId,
  }).lean()

  if (!attempt) return ieltsMessageError(404, 'attemptNotFound')

  if (attempt.skill !== 'writing')
    return ieltsMessageError(400, 'onlyWritingAi')

  if (attempt.mode !== 'practice')
    return ieltsMessageError(403, 'checkTaskPracticeOnly')

  if (attempt.status !== 'in_progress')
    return ieltsMessageError(409, 'alreadySubmitted')

  if (!essay.trim()) return ieltsMessageError(400, 'writeEssayFirst')

  const sections = await loadAttemptSections(
    attempt as unknown as Parameters<typeof loadAttemptSections>[0]
  )
  const material = sections.find(
    section => section.writing?.task === task
  )?.writing

  if (!material) return ieltsMessageError(404, 'taskNotInAttempt')

  if (!getQwenApiKey()) return ieltsMessageError(503, 'aiNotConfigured')

  const limit = getIeltsWritingDailyLimit()

  if ((await countGradingsToday(ownerId, now)) >= limit)
    return ieltsMessageError(429, 'gradingLimit', { limit })

  const result = await runExaminer({
    apiKey: getQwenApiKey(),
    fetcher,
    model: getQwenIeltsGradingModel(),
    input: {
      task,
      track: attempt.track === 'general' ? 'general' : 'academic',
      prompt: material.prompt,
      visual: material.visual,
      minWords: material.minWords,
      essay,
      wordCount: countEssayWords(essay),
      lessons: examinerLessons(),
    },
  })

  if (!result.ok) {
    console.warn('ielts writing check failed', {
      attemptId,
      message: result.message,
      task,
    })

    return ieltsMessageError(500, 'couldNotGrade', { reason: result.message })
  }

  await IeltsAttemptModel.updateOne(
    { _id: attempt._id, ownerId },
    { $push: { gradings: { task, at: now } } }
  )

  return { ok: true, data: { ...result.feedback, startedAt: null } }
}

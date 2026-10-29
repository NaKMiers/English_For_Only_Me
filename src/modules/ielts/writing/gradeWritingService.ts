import 'server-only'

import {
  getIeltsWritingDailyLimit,
  getOpenAiApiKey,
  getOpenAiIeltsGradingModel,
} from '@/constants/environments'
import { IeltsAttemptModel } from '@/models/ielts/IeltsAttemptModel'
import { grammarCourse } from '@/modules/grammar/course'

import {
  type IeltsAttemptRecord,
  type IeltsWritingTaskFeedback,
  toIeltsAttemptRecord,
} from '../attempts/attemptRecords'
import {
  ieltsError,
  type IeltsDecision,
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

/** Successful gradings today across all the owner's attempts. */
export async function countGradingsToday(ownerId: string, now = new Date()) {
  const since = startOfUtcDay(now)
  const [row] = await IeltsAttemptModel.aggregate<{ count: number }>([
    { $match: { ownerId, 'gradings.at': { $gte: since } } },
    { $unwind: '$gradings' },
    { $match: { 'gradings.at': { $gte: since } } },
    { $count: 'count' },
  ])

  return row?.count ?? 0
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
 * Grade one task of a submitted writing attempt. Guests cannot grade, the
 * daily limit counts only successful runs, and a task already being graded
 * (by another click or tab) is not graded twice.
 */
export async function gradeWritingTask({
  attemptId,
  fetcher,
  isGuest,
  now = new Date(),
  ownerId,
  task,
}: {
  attemptId: string
  fetcher?: typeof fetch
  isGuest: boolean
  now?: Date
  ownerId: string
  task: 1 | 2
}): Promise<IeltsDecision<IeltsAttemptRecord>> {
  if (isGuest)
    return ieltsError(
      401,
      'Sign in to get AI grading. Compare with the model answer yourself.'
    )

  const attempt = await IeltsAttemptModel.findOne({
    _id: attemptId,
    ownerId,
  }).lean()

  if (!attempt) return ieltsError(404, 'Attempt not found.')

  if (attempt.skill !== 'writing')
    return ieltsError(400, 'Only writing attempts are graded.')

  if (attempt.status !== 'submitted' && attempt.status !== 'scored')
    return ieltsError(409, 'Submit the attempt before grading.')

  const key = String(task) as '1' | '2'
  const feedback = (attempt.writingFeedback ?? {}) as Partial<
    Record<'1' | '2', IeltsWritingTaskFeedback>
  >

  if (!feedback[key])
    return ieltsError(404, 'That task is not in this attempt.')

  if (!getOpenAiApiKey())
    return ieltsError(
      503,
      'OpenAI is not configured. Compare with the model answer yourself.'
    )

  const limit = getIeltsWritingDailyLimit()

  if ((await countGradingsToday(ownerId, now)) >= limit)
    return ieltsError(429, `No gradings left today (limit ${limit}).`)

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

  if (!claimed)
    return ieltsError(409, 'This task is already being graded. Wait a moment.')

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
    return ieltsError(404, 'The task content is missing.')
  }

  const model = getOpenAiIeltsGradingModel()
  const result = essay.trim()
    ? await runExaminer({
        apiKey: getOpenAiApiKey(),
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
      : ieltsError(404, 'Attempt not found.')
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

  if (!written) return ieltsError(404, 'Attempt not found.')

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
    : ieltsError(404, 'Attempt not found.')
}

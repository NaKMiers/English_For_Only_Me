import 'server-only'

import { Types } from 'mongoose'

import { IeltsAttemptModel } from '@/models/ielts/IeltsAttemptModel'
import { isDuplicateKeyError } from '@/modules/dictation/practice/duplicateKeyError'

import { IELTS_MAX_AUDIO_EVENTS, IELTS_TIMERS, NOT_GIVEN } from '../constants'
import type { IeltsSection } from '../schema'
import {
  buildAnswerKey,
  sectionsInScope,
  type IeltsAnswerKey,
} from '../scoring/answerKey'
import { bandTableFor, rawToBand } from '../scoring/bandTables'
import { normalizeIeltsKey } from '../scoring/normalize'
import { scoreObjective, type IeltsAnswers } from '../scoring/scoreObjective'
import {
  readIeltsTestVersion,
  readPublishedIeltsTest,
} from '../tests/testReaders'
import type { IeltsTestRecord } from '../tests/testRecords'
import {
  type IeltsAttemptRecord,
  type IeltsDrillItem,
  toIeltsAttemptRecord,
} from './attemptRecords'
import {
  type AudioEventInput,
  ieltsError,
  type IeltsDecision,
  shouldAwardBand,
  type StartAttemptInput,
  validateAnswerLengths,
} from './attemptRouteDecisions'
import { buildDrillSections } from './attemptSections'
import {
  computeDeadline,
  type IeltsAttemptScope,
  type IeltsAudioEvent,
  isPastGrace,
} from './deadline'

/*
 * Learner attempts. Every query is scoped by ownerId (no IDOR), every write
 * is idempotent or guarded by a condition, and no answer key leaves this file
 * before the attempt is submitted.
 */

type LeanAttempt = Record<string, unknown> & {
  _id: Types.ObjectId
  ownerId: string
  status: string
  skill: string
  mode: string
  scope: { kind: 'skill' | 'part'; part?: number | null }
  testSlug: string
  testVersion: number
  track: string
  items: IeltsDrillItem[]
  deadlineAt: Date | null
  answers: IeltsAnswers
  audioEvents: IeltsAudioEvent[]
}

function scopeOf(attempt: Pick<LeanAttempt, 'scope'>): IeltsAttemptScope {
  return attempt.scope.kind === 'part'
    ? { kind: 'part', part: Number(attempt.scope.part) }
    : { kind: 'skill' }
}

function partOf(scope: IeltsAttemptScope) {
  return scope.kind === 'part' ? scope.part : null
}

function partDurations(sections: IeltsSection[]) {
  return sections
    .filter(section => section.skill === 'listening')
    .sort((left, right) => left.order - right.order)
    .map(section => section.listening?.audio?.durationSec ?? 0)
}

async function loadTestForAttempt(
  attempt: Pick<LeanAttempt, 'testSlug' | 'testVersion'>
): Promise<IeltsTestRecord | null> {
  return readIeltsTestVersion(attempt.testSlug, attempt.testVersion)
}

/** The sections an attempt covers, in scope order (drills renumbered). */
export async function loadAttemptSections(
  attempt: Pick<
    LeanAttempt,
    'mode' | 'items' | 'skill' | 'scope' | 'testSlug' | 'testVersion'
  >
): Promise<IeltsSection[]> {
  if (attempt.mode === 'drill') {
    const tests = new Map<string, IeltsTestRecord | null>()

    for (const item of attempt.items) {
      const key = `${item.testSlug}:${item.version}`

      if (!tests.has(key))
        tests.set(key, await readIeltsTestVersion(item.testSlug, item.version))
    }

    return buildDrillSections(
      attempt.items,
      item =>
        tests
          .get(`${item.testSlug}:${item.version}`)
          ?.sections.find(section => section.key === item.sectionKey) ?? null
    )
  }

  const test = await loadTestForAttempt(attempt)

  if (!test) return []

  return sectionsInScope(
    test.sections,
    attempt.skill as IeltsSection['skill'],
    partOf(scopeOf(attempt))
  )
}

function toSnapshot(key: IeltsAnswerKey) {
  return {
    single: Object.fromEntries(
      key.questions.map(question => [
        String(question.number),
        question.accepted,
      ])
    ),
    groups: key.groups.map(group => ({
      numbers: group.numbers,
      correctKeys: group.correctKeys,
    })),
  }
}

/**
 * Scores a submitted or expired attempt. Listening and Reading become
 * `scored`; Writing stays `submitted` with pending feedback per task (the
 * grade route scores it). Guarded by status so a double call scores once.
 */
async function finalizeAttempt(attempt: LeanAttempt): Promise<void> {
  const sections = await loadAttemptSections(attempt)

  if (attempt.skill === 'writing') {
    const tasks = sections
      .map(section => section.writing?.task)
      .filter((task): task is 1 | 2 => task === 1 || task === 2)
    const feedback = Object.fromEntries(
      tasks.map(task => [
        String(task),
        {
          status: 'pending',
          error: '',
          model: '',
          criteria: null,
          band: null,
          summary: '',
          corrections: [],
          improved: '',
        },
      ])
    )

    await IeltsAttemptModel.updateOne(
      { _id: attempt._id, status: { $in: ['submitted', 'expired'] } },
      { $set: { status: 'submitted', writingFeedback: feedback } }
    )
    return
  }

  const key = buildAnswerKey(sections)
  const result = scoreObjective(key, attempt.answers ?? {})
  const band = shouldAwardBand({
    mode: attempt.mode as 'practice' | 'mock' | 'drill',
    scopeKind: attempt.scope.kind,
    total: result.total,
  })
    ? rawToBand(
        bandTableFor(
          attempt.skill as 'listening' | 'reading',
          attempt.track === 'general' ? 'general' : 'academic'
        ),
        result.raw
      )
    : null

  await IeltsAttemptModel.updateOne(
    { _id: attempt._id, status: { $in: ['submitted', 'expired'] } },
    {
      $set: {
        status: 'scored',
        scoredAt: new Date(),
        result: { ...result, band },
        answerKeySnapshot: toSnapshot(key),
      },
    }
  )
}

async function readOwnedAttempt(ownerId: string, attemptId: string) {
  return (await IeltsAttemptModel.findOne({
    _id: attemptId,
    ownerId,
  }).lean()) as unknown as LeanAttempt | null
}

/**
 * Reads an attempt for its owner. An in-progress attempt past its deadline
 * plus grace is expired and scored on the way out, so a closed tab still
 * gets a result.
 */
export async function readAttemptForOwner(
  ownerId: string,
  attemptId: string,
  now = new Date()
): Promise<IeltsAttemptRecord | null> {
  let attempt = await readOwnedAttempt(ownerId, attemptId)

  if (!attempt) return null

  if (
    attempt.status === 'in_progress' &&
    isPastGrace(attempt.deadlineAt, now)
  ) {
    const expired = await IeltsAttemptModel.findOneAndUpdate(
      { _id: attempt._id, ownerId, status: 'in_progress' },
      { $set: { status: 'expired', submittedAt: now } },
      { new: true }
    ).lean()

    if (expired) await finalizeAttempt(expired as unknown as LeanAttempt)

    attempt = await readOwnedAttempt(ownerId, attemptId)
  }

  // A submit whose scoring failed half way (status flipped, no result) is
  // scored on the next read instead of staying empty forever.
  if (attempt && needsFinalize(attempt)) {
    await finalizeAttempt(attempt)
    attempt = await readOwnedAttempt(ownerId, attemptId)
  }

  return attempt ? toIeltsAttemptRecord(attempt) : null
}

function needsFinalize(attempt: LeanAttempt) {
  if (attempt.status !== 'submitted' && attempt.status !== 'expired')
    return false

  return attempt.skill === 'writing'
    ? !attempt.writingFeedback
    : !attempt.result
}

export const STALE_START_MESSAGE =
  'This attempt belongs to an older version of the test. Start again.'

function requireAudio(sections: IeltsSection[]) {
  return sections.every(section => Boolean(section.listening?.audio?.url))
}

export async function startOrResumeAttempt({
  input,
  now = new Date(),
  ownerId,
}: {
  input: StartAttemptInput
  now?: Date
  ownerId: string
}): Promise<
  IeltsDecision<{
    attempt: IeltsAttemptRecord
    mode: 'created' | 'resumed' | 'idempotent'
  }>
> {
  const replay = await IeltsAttemptModel.findOne({
    ownerId,
    idempotencyKey: input.idempotencyKey,
  }).lean()

  const test = await readPublishedIeltsTest(input.testSlug)

  if (replay) {
    // A key kept from an attempt on an older version (the test was
    // republished since) must not resume it under the new version's page.
    if (
      replay.status === 'in_progress' &&
      test &&
      replay.testVersion !== test.version
    )
      return ieltsError(409, STALE_START_MESSAGE)

    return {
      ok: true,
      data: {
        attempt: toIeltsAttemptRecord(replay),
        mode: 'idempotent',
      },
    }
  }

  if (!test) return ieltsError(404, 'This test is not available.')

  const sections = sectionsInScope(
    test.sections,
    input.skill,
    input.scope.kind === 'part' ? input.scope.part : null
  )

  if (sections.length === 0)
    return ieltsError(
      404,
      `This test has no ${input.skill} section for that part.`
    )

  if (
    input.skill === 'listening' &&
    input.mode === 'mock' &&
    !requireAudio(sections)
  )
    return ieltsError(409, 'Listening mock needs audio for every part.')

  const openFilter: Record<string, unknown> = {
    ownerId,
    testId: new Types.ObjectId(test.id),
    testVersion: test.version,
    skill: input.skill,
    mode: input.mode,
    status: 'in_progress',
    'scope.kind': input.scope.kind,
    ...(input.scope.kind === 'part' ? { 'scope.part': input.scope.part } : {}),
  }
  const open = (await IeltsAttemptModel.findOne(openFilter)
    .sort({ startedAt: -1 })
    .lean()) as unknown as LeanAttempt | null

  if (open) {
    const current = await readAttemptForOwner(ownerId, String(open._id), now)

    if (current?.status === 'in_progress')
      return { ok: true, data: { attempt: current, mode: 'resumed' } }
  }

  const deadlineAt =
    input.mode === 'mock'
      ? computeDeadline({
          skill: input.skill,
          scope: input.scope,
          startedAt: now,
          partDurationsSec: partDurations(test.sections),
          audioEvents: [],
        })
      : null

  try {
    const created = await IeltsAttemptModel.create({
      ownerId,
      idempotencyKey: input.idempotencyKey,
      testId: new Types.ObjectId(test.id),
      testSlug: test.slug,
      testVersion: test.version,
      testTitle: test.title,
      track: test.track,
      skill: input.skill,
      mode: input.mode,
      scope:
        input.scope.kind === 'part'
          ? { kind: 'part', part: input.scope.part }
          : { kind: 'skill', part: null },
      sessionId: input.mode === 'mock' ? input.sessionId : null,
      status: 'in_progress',
      startedAt: now,
      deadlineAt,
      answers: {},
      savedSeq: 0,
    })

    return {
      ok: true,
      data: {
        attempt: toIeltsAttemptRecord(created.toObject()),
        mode: 'created',
      },
    }
  } catch (error) {
    if (!isDuplicateKeyError(error)) throw error

    const winner = await IeltsAttemptModel.findOne({
      ownerId,
      idempotencyKey: input.idempotencyKey,
    }).lean()

    if (!winner) throw error

    return {
      ok: true,
      data: { attempt: toIeltsAttemptRecord(winner), mode: 'idempotent' },
    }
  }
}

function deadlineOk(now: Date) {
  return {
    $or: [
      { deadlineAt: null },
      {
        deadlineAt: {
          $gt: new Date(now.getTime() - IELTS_TIMERS.graceSeconds * 1000),
        },
      },
    ],
  }
}

/**
 * Set-desired-state autosave: the newest snapshot wins by `seq`. A stale seq
 * or an already-submitted attempt is a 200 with `applied: false` so the
 * client outbox never drops and rolls back; only "time is up" is a 409.
 */
export async function saveAttemptAnswers({
  answers,
  attemptId,
  now = new Date(),
  ownerId,
  seq,
}: {
  answers: IeltsAnswers
  attemptId: string
  now?: Date
  ownerId: string
  seq: number
}): Promise<IeltsDecision<{ applied: boolean; savedSeq: number }>> {
  const existing = await readOwnedAttempt(ownerId, attemptId)

  if (!existing) return ieltsError(404, 'Attempt not found.')

  const lengths = validateAnswerLengths(answers, existing.skill === 'writing')

  if (!lengths.ok) return lengths

  const updated = await IeltsAttemptModel.findOneAndUpdate(
    {
      _id: existing._id,
      ownerId,
      status: 'in_progress',
      savedSeq: { $lt: seq },
      ...deadlineOk(now),
    },
    { $set: { answers, savedSeq: seq } },
    { new: true, projection: { savedSeq: 1 } }
  ).lean()

  if (updated)
    return { ok: true, data: { applied: true, savedSeq: updated.savedSeq } }

  const current = await readOwnedAttempt(ownerId, attemptId)

  if (current?.status === 'in_progress' && isPastGrace(current.deadlineAt, now))
    return ieltsError(409, 'Time is up for this attempt.')

  return {
    ok: true,
    data: { applied: false, savedSeq: Number(current?.savedSeq ?? 0) },
  }
}

export async function submitAttempt({
  answers,
  attemptId,
  now = new Date(),
  ownerId,
  seq,
}: {
  answers: IeltsAnswers
  attemptId: string
  now?: Date
  ownerId: string
  seq: number
}): Promise<IeltsDecision<IeltsAttemptRecord>> {
  const existing = await readOwnedAttempt(ownerId, attemptId)

  if (!existing) return ieltsError(404, 'Attempt not found.')

  const lengths = validateAnswerLengths(answers, existing.skill === 'writing')

  if (!lengths.ok) return lengths

  if (
    existing.skill === 'listening' &&
    existing.mode === 'mock' &&
    existing.deadlineAt === null &&
    existing.audioEvents.length === 0 &&
    Object.keys(answers).length === 0
  )
    return ieltsError(409, 'Start the audio before submitting.')

  // The final snapshot and the status flip happen in one write when the
  // snapshot is newer and in time; otherwise the server keeps what it holds.
  const applied = await IeltsAttemptModel.findOneAndUpdate(
    {
      _id: existing._id,
      ownerId,
      status: 'in_progress',
      savedSeq: { $lt: seq },
      ...deadlineOk(now),
    },
    { $set: { answers, savedSeq: seq, status: 'submitted', submittedAt: now } },
    { new: true }
  ).lean()
  const flipped =
    applied ??
    (await IeltsAttemptModel.findOneAndUpdate(
      { _id: existing._id, ownerId, status: 'in_progress' },
      { $set: { status: 'submitted', submittedAt: now } },
      { new: true }
    ).lean())

  if (flipped) await finalizeAttempt(flipped as unknown as LeanAttempt)

  const record = await readAttemptForOwner(ownerId, attemptId, now)

  if (!record) return ieltsError(404, 'Attempt not found.')

  return { ok: true, data: record }
}

/** Listening mock audio clock: part starts and interruptions. */
export async function recordAudioEvent({
  attemptId,
  event,
  now = new Date(),
  ownerId,
}: {
  attemptId: string
  event: AudioEventInput
  now?: Date
  ownerId: string
}): Promise<IeltsDecision<IeltsAttemptRecord>> {
  for (let tries = 0; tries < 3; tries++) {
    const attempt = await readOwnedAttempt(ownerId, attemptId)

    if (!attempt) return ieltsError(404, 'Attempt not found.')

    if (
      attempt.skill !== 'listening' ||
      attempt.mode !== 'mock' ||
      attempt.status !== 'in_progress'
    )
      return { ok: true, data: toIeltsAttemptRecord(attempt) }

    const events = attempt.audioEvents ?? []

    if (
      events.length >= IELTS_MAX_AUDIO_EVENTS ||
      (event.kind === 'part-started' &&
        events.some(
          item => item.kind === 'part-started' && item.part === event.part
        ))
    )
      return { ok: true, data: toIeltsAttemptRecord(attempt) }

    const next: IeltsAudioEvent =
      event.kind === 'part-started'
        ? { kind: 'part-started', part: event.part, atMs: now.getTime() }
        : {
            kind: event.kind,
            atMs: now.getTime(),
            positionSec: event.positionSec,
          }
    const test = await loadTestForAttempt(attempt)
    const deadlineAt = computeDeadline({
      skill: 'listening',
      scope: scopeOf(attempt),
      startedAt: new Date(String(attempt.startedAt)),
      partDurationsSec: partDurations(test?.sections ?? []),
      audioEvents: [...events, next],
    })
    const updated = await IeltsAttemptModel.findOneAndUpdate(
      {
        _id: attempt._id,
        ownerId,
        status: 'in_progress',
        audioEvents: { $size: events.length },
      },
      { $push: { audioEvents: next }, $set: { deadlineAt } },
      { new: true }
    ).lean()

    if (updated) return { ok: true, data: toIeltsAttemptRecord(updated) }
  }

  return ieltsError(409, 'Audio events changed, try again.')
}

/** Guided mode: the evidence for one question, practice attempts only. */
export async function readPracticeEvidence({
  attemptId,
  number,
  ownerId,
}: {
  attemptId: string
  number: number
  ownerId: string
}): Promise<
  IeltsDecision<{
    number: number
    sectionKey: string
    notGiven: boolean
    evidence: { quote: string; blockIndex: number } | null
  }>
> {
  const attempt = await readOwnedAttempt(ownerId, attemptId)

  if (!attempt) return ieltsError(404, 'Attempt not found.')

  if (attempt.mode !== 'practice')
    return ieltsError(403, 'Guided mode is only available in practice.')

  const sections = await loadAttemptSections(attempt)

  for (const section of sections)
    for (const group of section.groups) {
      const question = group.questions.find(item => item.number === number)

      if (!question) continue

      return {
        ok: true,
        data: {
          number,
          sectionKey: section.key,
          notGiven: question.answers.some(
            answer => normalizeIeltsKey(answer) === NOT_GIVEN
          ),
          evidence: question.evidence,
        },
      }
    }

  return ieltsError(404, 'That question is not in this attempt.')
}

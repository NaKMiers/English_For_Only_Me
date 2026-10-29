import 'server-only'

import { Types } from 'mongoose'

import { IeltsAttemptModel } from '@/models/ielts/IeltsAttemptModel'
import { isDuplicateKeyError } from '@/modules/dictation/practice/duplicateKeyError'

import {
  type IeltsAttemptRecord,
  toIeltsAttemptRecord,
} from '../attempts/attemptRecords'
import {
  ieltsError,
  type IeltsDecision,
  type StartDrillInput,
} from '../attempts/attemptRouteDecisions'
import { planDrillNumbers } from '../attempts/attemptSections'
import { IELTS_QUESTION_TYPE_LABELS } from '../constants'
import { readIeltsCatalog, readPublishedIeltsTest } from '../tests/testReaders'
import {
  drillCandidateKey,
  type IeltsDrillCandidate,
  selectDrillGroups,
} from './selectDrillGroups'

async function collectCandidates(
  input: StartDrillInput
): Promise<IeltsDrillCandidate[]> {
  const catalog = await readIeltsCatalog()
  const tests = await Promise.all(
    catalog.map(entry => readPublishedIeltsTest(entry.slug))
  )

  return tests.flatMap(test =>
    test
      ? test.sections
          .filter(section => section.skill === input.skill)
          .flatMap(section =>
            section.groups
              .filter(group => group.type === input.type)
              .map(group => ({
                testId: test.id,
                testSlug: test.slug,
                version: test.version,
                sectionKey: section.key,
                group,
              }))
          )
      : []
  )
}

/** Groups in the owner's last few drills of this type, to rotate content. */
async function recentDrillKeys(ownerId: string) {
  const rows = await IeltsAttemptModel.find(
    { ownerId, mode: 'drill' },
    { items: 1 }
  )
    .sort({ startedAt: -1 })
    .limit(5)
    .lean()

  return new Set(
    rows.flatMap(row =>
      (row.items ?? []).map(item =>
        drillCandidateKey({
          testSlug: item.testSlug,
          version: item.version,
          groupId: item.groupId,
        })
      )
    )
  )
}

/**
 * A drill of one question type: up to four groups from published tests,
 * renumbered 1..N. Practice rules (no deadline, no band). Idempotent on the
 * key.
 */
export async function startDrill({
  input,
  now = new Date(),
  ownerId,
}: {
  input: StartDrillInput
  now?: Date
  ownerId: string
}): Promise<IeltsDecision<IeltsAttemptRecord>> {
  const replay = await IeltsAttemptModel.findOne({
    ownerId,
    idempotencyKey: input.idempotencyKey,
  }).lean()

  if (replay) return { ok: true, data: toIeltsAttemptRecord(replay) }

  const picked = selectDrillGroups(await collectCandidates(input), {
    recentKeys: await recentDrillKeys(ownerId),
  })

  if (!picked.length)
    return ieltsError(
      404,
      `Chưa có nhóm câu dạng ${IELTS_QUESTION_TYPE_LABELS[input.type]}.`
    )

  const maps = planDrillNumbers(picked.map(item => item.group))

  try {
    const created = await IeltsAttemptModel.create({
      ownerId,
      idempotencyKey: input.idempotencyKey,
      testId: null,
      testSlug: '',
      testVersion: 0,
      testTitle: `Drill · ${IELTS_QUESTION_TYPE_LABELS[input.type]}`,
      track: 'academic',
      skill: input.skill,
      mode: 'drill',
      scope: { kind: 'skill', part: null },
      items: picked.map((item, index) => ({
        testId: new Types.ObjectId(item.testId),
        testSlug: item.testSlug,
        version: item.version,
        sectionKey: item.sectionKey,
        groupId: item.group.id,
        numberMap: maps[index],
      })),
      status: 'in_progress',
      startedAt: now,
      deadlineAt: null,
      answers: {},
      savedSeq: 0,
    })

    return { ok: true, data: toIeltsAttemptRecord(created.toObject()) }
  } catch (error) {
    if (!isDuplicateKeyError(error)) throw error

    const winner = await IeltsAttemptModel.findOne({
      ownerId,
      idempotencyKey: input.idempotencyKey,
    }).lean()

    if (!winner) throw error

    return { ok: true, data: toIeltsAttemptRecord(winner) }
  }
}

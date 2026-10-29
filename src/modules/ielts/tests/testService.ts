import 'server-only'

import { CACHE_TAGS } from '@/lib/db/cacheTags'
import { expireCacheTags } from '@/lib/db/revalidateCatalog'
import { IeltsAttemptModel } from '@/models/ielts/IeltsAttemptModel'
import { IeltsTestModel } from '@/models/ielts/IeltsTestModel'
import { isDuplicateKeyError } from '@/modules/dictation/practice/duplicateKeyError'

import {
  ieltsError,
  type IeltsDecision,
} from '../attempts/attemptRouteDecisions'
import {
  type IeltsConsistencyReport,
  checkTest,
} from '../consistency/checkTest'
import { IELTS_SECTION_KEYS, type IeltsSectionKey } from '../constants'
import type { IeltsSection, IeltsSectionInput, IeltsTestMeta } from '../schema'
import { emptySections, slugify } from './emptySections'
import type { CreateTestInput } from './testRouteDecisions'
import {
  effectiveGenStatus,
  type IeltsTestRecord,
  toIeltsTestRecord,
} from './testRecords'

/*
 * Admin authoring. One document per test, editable in every status: status
 * only decides who sees it. Sections save with a revision guard so a manual
 * save and an AI job never overwrite each other; saving a published or
 * archived test refreshes the learner cache. Publishing runs in a transaction
 * because at most one document per slug may be published.
 */

export interface IeltsAdminTestRow {
  id: string
  slug: string
  version: number
  status: IeltsTestRecord['status']
  source: IeltsTestRecord['source']
  title: string
  track: IeltsTestRecord['track']
  updatedAt: string | null
  publishedAt: string | null
  sections: { key: string; genStatus: IeltsSection['genStatus'] }[]
}

export interface IeltsAdminTest extends IeltsTestRecord {
  status: IeltsTestRecord['status']
  plan: Record<string, string> | null
  generationLog: {
    at: string
    sectionKey: string
    kind: string
    model: string
    inputTokens: number
    outputTokens: number
    durationMs: number
    outcome: string
    failedRules: string[]
    error: string
  }[]
}

type LeanDoc = Record<string, unknown>

export async function listAdminTests(): Promise<IeltsAdminTestRow[]> {
  const docs = await IeltsTestModel.find(
    {},
    {
      slug: 1,
      version: 1,
      status: 1,
      source: 1,
      title: 1,
      track: 1,
      updatedAt: 1,
      publishedAt: 1,
      'sections.key': 1,
      'sections.genStatus': 1,
      'sections.genStartedAt': 1,
    }
  )
    .sort({ updatedAt: -1 })
    .limit(200)
    .lean()

  return docs.map(raw => {
    const doc = raw as unknown as LeanDoc
    const sections = (doc.sections as LeanDoc[] | undefined) ?? []

    return {
      id: String(doc._id),
      slug: String(doc.slug),
      version: Number(doc.version),
      status: doc.status as IeltsAdminTestRow['status'],
      source: doc.source as IeltsAdminTestRow['source'],
      title: String(doc.title),
      track: doc.track as IeltsAdminTestRow['track'],
      updatedAt: doc.updatedAt
        ? new Date(doc.updatedAt as string).toISOString()
        : null,
      publishedAt: doc.publishedAt
        ? new Date(doc.publishedAt as string).toISOString()
        : null,
      sections: sections.map(section => ({
        key: String(section.key),
        genStatus: effectiveGenStatus({
          genStatus: section.genStatus as IeltsSection['genStatus'],
          genStartedAt: section.genStartedAt
            ? new Date(section.genStartedAt as string)
            : null,
        }),
      })),
    }
  })
}

export function toAdminTest(raw: LeanDoc): IeltsAdminTest {
  const record = toIeltsTestRecord(raw)
  const log = (raw.generationLog as LeanDoc[] | undefined) ?? []

  return {
    ...record,
    sections: record.sections.map(section => ({
      ...section,
      genStatus: effectiveGenStatus(section),
    })),
    plan: (raw.plan as Record<string, string> | null) ?? null,
    generationLog: log.map(row => ({
      at: new Date(row.at as string).toISOString(),
      sectionKey: String(row.sectionKey ?? ''),
      kind: String(row.kind ?? ''),
      model: String(row.model ?? ''),
      inputTokens: Number(row.inputTokens ?? 0),
      outputTokens: Number(row.outputTokens ?? 0),
      durationMs: Number(row.durationMs ?? 0),
      outcome: String(row.outcome ?? ''),
      failedRules: ((row.failedRules as string[] | undefined) ?? []).map(
        String
      ),
      error: String(row.error ?? ''),
    })),
  }
}

export async function readAdminTest(
  testId: string
): Promise<IeltsAdminTest | null> {
  const doc = await IeltsTestModel.findById(testId).lean()

  return doc ? toAdminTest(doc as unknown as LeanDoc) : null
}

async function uniqueSlug(base: string) {
  const taken = new Set(
    (await IeltsTestModel.distinct('slug', {
      slug: new RegExp(`^${base}(-\\d+)?$`),
    })) as string[]
  )

  if (!taken.has(base)) return base

  for (let index = 2; index < 1000; index++)
    if (!taken.has(`${base}-${index}`)) return `${base}-${index}`

  return `${base}-${Date.now()}`
}

/** Topic hints spread over the nine sections in order. */
export function planFromTopics(topics: string[]) {
  if (!topics.length) return null

  return Object.fromEntries(
    IELTS_SECTION_KEYS.map((key, index) => [key, topics[index % topics.length]])
  )
}

export async function createTest(
  input: CreateTestInput,
  createdBy: string
): Promise<IeltsAdminTest> {
  const generated = input.mode === 'generate'
  const title =
    input.title ||
    `AI ${input.track === 'general' ? 'General' : 'Academic'} test ${new Date().toISOString().slice(0, 10)}`
  const slug = await uniqueSlug(slugify(title))
  const created = await IeltsTestModel.create({
    slug,
    version: 1,
    status: 'draft',
    source: generated ? 'ai' : 'manual',
    title,
    track: input.track,
    targetBand: input.targetBand,
    tags: [],
    description: '',
    plan: generated ? planFromTopics(input.topics) : null,
    createdBy,
    metaRevision: 0,
    sections: emptySections(generated ? 'pending' : 'manual'),
  })

  return toAdminTest(created.toObject() as unknown as LeanDoc)
}

export async function saveTestMeta({
  meta,
  metaRevision,
  testId,
}: {
  meta: IeltsTestMeta
  metaRevision: number
  testId: string
}): Promise<IeltsDecision<IeltsAdminTest>> {
  const updated = await IeltsTestModel.findOneAndUpdate(
    { _id: testId, metaRevision },
    { $set: { ...meta, metaRevision: metaRevision + 1 } },
    { new: true }
  ).lean()

  if (updated) return { ok: true, data: adoptSaved(updated) }

  return explainConflict(testId)
}

/** Learners read published and archived tests from the cache: refresh it. */
export function adoptSaved(raw: unknown): IeltsAdminTest {
  const test = toAdminTest(raw as LeanDoc)

  if (test.status !== 'draft') expireCacheTags([CACHE_TAGS.ieltsContent])

  return test
}

async function explainConflict(testId: string): Promise<IeltsDecision<never>> {
  const current = await IeltsTestModel.exists({ _id: testId })

  if (!current) return ieltsError(404, 'Test not found.')

  return ieltsError(409, 'Section was just updated elsewhere. Reload.')
}

/**
 * Conditional per-section write: matches only the expected revision, so a
 * stale editor tab or a running AI job gets a 409 instead of a silent
 * overwrite. A manual save marks the section `manual`.
 */
export async function saveTestSection({
  input,
  key,
  revision,
  testId,
  genStatus = 'manual',
}: {
  input: IeltsSectionInput
  key: IeltsSectionKey
  revision: number
  testId: string
  genStatus?: IeltsSection['genStatus']
}): Promise<IeltsDecision<IeltsAdminTest>> {
  const [skill, order] = key.split('-')

  if (
    (skill === 'listening' &&
      (!input.listening || input.reading || input.writing)) ||
    (skill === 'reading' &&
      (!input.reading || input.listening || input.writing)) ||
    (skill === 'writing' &&
      (!input.writing || input.listening || input.reading))
  )
    return ieltsError(400, `A ${skill} section carries only ${skill} material.`)

  if (skill === 'writing' && input.groups.length)
    return ieltsError(400, 'Writing sections have no question groups.')

  const next: IeltsSection = {
    ...input,
    key,
    skill: skill as IeltsSection['skill'],
    order: Number(order),
    revision: revision + 1,
    genStatus,
    genStartedAt: null,
    genError: '',
  }
  const updated = await IeltsTestModel.findOneAndUpdate(
    { _id: testId, sections: { $elemMatch: { key, revision } } },
    { $set: { 'sections.$': { ...next, genPending: null } } },
    { new: true }
  ).lean()

  if (updated) return { ok: true, data: adoptSaved(updated) }

  return explainConflict(testId)
}

export interface PublishOutcome {
  test: IeltsAdminTest
  report: IeltsConsistencyReport
}

/**
 * Publish a draft. Errors block; warnings need `confirmWarnings`. The live
 * version of the slug is archived in the same transaction so the partial
 * unique index never sees two published versions.
 */
export async function publishTest({
  confirmWarnings,
  now = new Date(),
  testId,
}: {
  confirmWarnings: boolean
  now?: Date
  testId: string
}): Promise<
  | IeltsDecision<PublishOutcome>
  | {
      ok: false
      status: 422
      body: { message: string; report: IeltsConsistencyReport }
    }
> {
  const draft = await IeltsTestModel.findById(testId).lean()

  if (!draft) return ieltsError(404, 'Test not found.')

  if (draft.status !== 'draft')
    return ieltsError(409, 'Only a draft can be published.')

  const record = toIeltsTestRecord(draft as unknown as LeanDoc)
  const report = checkTest(record)

  if (report.errors.length)
    return {
      ok: false,
      status: 422,
      body: {
        message: `${report.errors.length} ${report.errors.length === 1 ? 'error' : 'errors'} to fix before publishing.`,
        report,
      },
    }

  if (report.warnings.length && !confirmWarnings)
    return {
      ok: false,
      status: 422,
      body: {
        message: `${report.warnings.length} ${report.warnings.length === 1 ? 'warning' : 'warnings'}. Confirm to publish.`,
        report,
      },
    }

  const session = await IeltsTestModel.startSession()

  try {
    await session.withTransaction(async () => {
      await IeltsTestModel.updateMany(
        { slug: draft.slug, status: 'published' },
        { $set: { status: 'archived', archivedAt: now } },
        { session }
      )

      const published = await IeltsTestModel.updateOne(
        { _id: draft._id, status: 'draft' },
        { $set: { status: 'published', publishedAt: now } },
        { session }
      )

      if (published.matchedCount === 0)
        throw new Error('Draft changed while publishing.')
    })
  } catch (error) {
    if (
      isDuplicateKeyError(error) ||
      (error as Error).message?.includes('Draft changed')
    )
      return ieltsError(409, 'Test was just published elsewhere. Reload.')

    throw error
  } finally {
    await session.endSession()
  }

  expireCacheTags([CACHE_TAGS.ieltsContent])

  const fresh = await IeltsTestModel.findById(testId).lean()

  return {
    ok: true,
    data: { test: toAdminTest(fresh as unknown as LeanDoc), report },
  }
}

/** Take a published version off the catalogue (attempts keep working). */
export async function archiveTest(
  testId: string,
  now = new Date()
): Promise<IeltsDecision<IeltsAdminTest>> {
  const updated = await IeltsTestModel.findOneAndUpdate(
    { _id: testId, status: 'published' },
    { $set: { status: 'archived', archivedAt: now } },
    { new: true }
  ).lean()

  if (!updated) return ieltsError(409, 'Only a published test can be archived.')

  expireCacheTags([CACHE_TAGS.ieltsContent])

  return { ok: true, data: toAdminTest(updated as unknown as LeanDoc) }
}

/**
 * Put an archived version back on the catalogue. Only one version of a slug
 * can be live, so a newer published version has to be archived first.
 */
export async function unarchiveTest(
  testId: string
): Promise<IeltsDecision<IeltsAdminTest>> {
  const test = await IeltsTestModel.findById(testId, {
    slug: 1,
    status: 1,
  }).lean()

  if (!test) return ieltsError(404, 'Test not found.')

  if (test.status !== 'archived')
    return ieltsError(409, 'Only an archived test can be unarchived.')

  const live = await IeltsTestModel.findOne(
    { slug: test.slug, status: 'published' },
    { version: 1 }
  ).lean()

  if (live)
    return ieltsError(
      409,
      'Another test with this slug is live. Archive it first.'
    )

  try {
    const updated = await IeltsTestModel.findOneAndUpdate(
      { _id: testId, status: 'archived' },
      { $set: { status: 'published', archivedAt: null } },
      { new: true }
    ).lean()

    if (!updated) return ieltsError(409, 'Test status just changed. Reload.')

    expireCacheTags([CACHE_TAGS.ieltsContent])

    return { ok: true, data: toAdminTest(updated as unknown as LeanDoc) }
  } catch (error) {
    // The partial unique index: another version went live meanwhile.
    if (isDuplicateKeyError(error))
      return ieltsError(409, 'Another version was just published. Reload.')

    throw error
  }
}

/**
 * Delete a draft or an archived test. An archived test still backs old
 * reviews, so when attempts use it the call stops with their count (409)
 * until `withAttempts` deletes those attempts too. A published test has to
 * be archived first.
 */
export async function deleteTest({
  testId,
  withAttempts = false,
}: {
  testId: string
  withAttempts?: boolean
}): Promise<
  | IeltsDecision<{ deleted: true; attemptsDeleted: number }>
  | {
      ok: false
      status: 409
      body: { message: string; attemptCount: number }
    }
> {
  const test = await IeltsTestModel.findById(testId, {
    slug: 1,
    status: 1,
    version: 1,
  }).lean()

  if (!test) return ieltsError(404, 'Test not found.')

  if (test.status === 'published')
    return ieltsError(409, 'Archive the test before deleting it.')

  // Attempts find their test by slug + version (drills per item).
  const attemptFilter = {
    $or: [
      { testSlug: test.slug, testVersion: test.version },
      { items: { $elemMatch: { testSlug: test.slug, version: test.version } } },
    ],
  }
  const attemptCount =
    test.status === 'archived'
      ? await IeltsAttemptModel.countDocuments(attemptFilter)
      : 0

  if (attemptCount > 0 && !withAttempts)
    return {
      ok: false,
      status: 409,
      body: {
        message: `${attemptCount} ${attemptCount === 1 ? 'attempt uses' : 'attempts use'} this test.`,
        attemptCount,
      },
    }

  const result = await IeltsTestModel.deleteOne({
    _id: testId,
    status: test.status,
  })

  if (result.deletedCount === 0)
    return ieltsError(409, 'Test status just changed. Reload.')

  const attempts = attemptCount
    ? await IeltsAttemptModel.deleteMany(attemptFilter)
    : { deletedCount: 0 }

  if (test.status === 'archived') expireCacheTags([CACHE_TAGS.ieltsContent])

  return {
    ok: true,
    data: { deleted: true, attemptsDeleted: attempts.deletedCount },
  }
}

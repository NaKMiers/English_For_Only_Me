import 'server-only'

import { CACHE_TAGS, createCatalogReader } from '@/lib/db/catalogCache'
import { IeltsTestModel } from '@/models/ielts/IeltsTestModel'

import type { IeltsSkill, IeltsTrack } from '../constants'
import { type IeltsTestRecord, toIeltsTestRecord } from './testRecords'

/*
 * Cached readers for published content. Shared data only: answer keys stay
 * inside the cached record (the server needs them to score), but pages hand
 * learners `toPublicTest(...)`, never this record.
 */

export interface IeltsCatalogEntry {
  id: string
  slug: string
  version: number
  title: string
  track: IeltsTrack
  targetBand: number
  tags: string[]
  description: string
  skills: { skill: IeltsSkill; parts: number }[]
  publishedAt: string | null
}

async function loadCatalog(): Promise<IeltsCatalogEntry[]> {
  const docs = await IeltsTestModel.find(
    { status: 'published' },
    {
      slug: 1,
      version: 1,
      title: 1,
      track: 1,
      targetBand: 1,
      tags: 1,
      description: 1,
      publishedAt: 1,
      'sections.skill': 1,
    }
  )
    .sort({ publishedAt: -1 })
    .lean()

  return docs.map(doc => {
    const counts = new Map<IeltsSkill, number>()

    const sections =
      (doc as unknown as { sections?: { skill: string }[] }).sections ?? []

    for (const section of sections)
      counts.set(
        section.skill as IeltsSkill,
        (counts.get(section.skill as IeltsSkill) ?? 0) + 1
      )

    return {
      id: String(doc._id),
      slug: doc.slug,
      version: doc.version,
      title: doc.title,
      track: doc.track as IeltsTrack,
      targetBand: doc.targetBand ?? 6.5,
      tags: doc.tags ?? [],
      description: doc.description ?? '',
      skills: (['listening', 'reading', 'writing'] as const)
        .filter(skill => counts.has(skill))
        .map(skill => ({ skill, parts: counts.get(skill) ?? 0 })),
      publishedAt: doc.publishedAt ? doc.publishedAt.toISOString() : null,
    }
  })
}

export const readIeltsCatalog = createCatalogReader({
  key: 'ielts-catalog',
  load: loadCatalog,
  revive: value => value as IeltsCatalogEntry[],
  tag: CACHE_TAGS.ieltsContent,
})

function reviveTest(value: unknown): IeltsTestRecord | null {
  return value ? toIeltsTestRecord(value as Record<string, unknown>) : null
}

/** The live published version of a slug. */
export const readPublishedIeltsTest = createCatalogReader({
  key: 'ielts-published-test',
  load: async (slug: string) => {
    const doc = await IeltsTestModel.findOne({ slug, status: 'published' })
      .select({ generationLog: 0, plan: 0 })
      .lean()

    return doc ? toIeltsTestRecord(doc as Record<string, unknown>) : null
  },
  revive: reviveTest,
  tag: CACHE_TAGS.ieltsContent,
})

/**
 * A specific version that learners may still need (published or archived),
 * for in-progress attempts and old reviews. Drafts are never served.
 */
export const readIeltsTestVersion = createCatalogReader({
  key: 'ielts-test-version',
  load: async (slug: string, version: number) => {
    const doc = await IeltsTestModel.findOne({
      slug,
      version,
      status: { $in: ['published', 'archived'] },
    })
      .select({ generationLog: 0, plan: 0 })
      .lean()

    return doc ? toIeltsTestRecord(doc as Record<string, unknown>) : null
  },
  revive: reviveTest,
  tag: CACHE_TAGS.ieltsContent,
})

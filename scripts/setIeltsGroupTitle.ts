import { disconnect } from 'mongoose'

import { CACHE_TAGS } from '@/lib/db/cacheTags'
import { connectDatabase } from '@/lib/db/connectDatabase'
import { IeltsTestModel } from '@/models/ielts/IeltsTestModel'
import { checkTest } from '@/modules/ielts/consistency/checkTest'
import { ieltsTestSchema } from '@/modules/ielts/schema'

import { requestContentRevalidation } from './lib/requestContentRevalidation'

/*
 * Set the title of one question group ("Assignment on sleep and dreams"
 * over Questions 21-24) on the newest version of a test. For a run of
 * one-question groups, set it on the first group of the run.
 *
 *   bun run ielts:set-group-title -- <slug> <sectionKey> <firstQuestion> "<title>"
 */

async function main() {
  const [slug, sectionKey, fromArg, titleArg] = process.argv.slice(2)
  const from = Number(fromArg)
  const title = titleArg?.trim() ?? ''

  if (!slug || !sectionKey || !Number.isInteger(from) || !title)
    throw new Error(
      'Usage: setIeltsGroupTitle <slug> <sectionKey> <firstQuestion> "<title>"'
    )

  await connectDatabase()

  const doc = await IeltsTestModel.findOne({ slug }).sort({ version: -1 })
  if (!doc) throw new Error(`${slug} not found`)

  const test = ieltsTestSchema.parse(doc.toObject())
  const section = test.sections.find(item => item.key === sectionKey)
  if (!section) throw new Error(`${slug} has no section ${sectionKey}`)

  const group = section.groups.find(item => item.from === from)
  if (!group)
    throw new Error(`${sectionKey} has no group starting at question ${from}`)

  const before = group.title

  group.title = title
  section.revision += 1

  const report = checkTest(test)
  if (report.errors.length) {
    console.error(report.errors)
    throw new Error('Patched test fails the consistency check')
  }

  await IeltsTestModel.updateOne(
    { _id: doc._id, 'sections.key': section.key },
    { $set: { 'sections.$': section } }
  )
  console.info(
    `${slug} ${sectionKey} Q${group.from}-${group.to} title: "${before}" -> "${title}" (revision ${section.revision}).`
  )
  await requestContentRevalidation([CACHE_TAGS.ieltsContent])
  await disconnect()
}

main().catch(async error => {
  console.error(error)
  await disconnect()
  process.exit(1)
})

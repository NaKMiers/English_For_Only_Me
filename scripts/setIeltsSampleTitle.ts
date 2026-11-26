import { disconnect } from 'mongoose'

import { CACHE_TAGS } from '@/lib/db/cacheTags'
import { connectDatabase } from '@/lib/db/connectDatabase'
import { IeltsTestModel } from '@/models/ielts/IeltsTestModel'
import { checkTest } from '@/modules/ielts/consistency/checkTest'
import { ieltsTestSchema } from '@/modules/ielts/schema'
import { splitSampleAnswer } from '@/modules/ielts/writing/sampleAnswer'

import { requestContentRevalidation } from './lib/requestContentRevalidation'

/*
 * Give a writing task's sample answer its title, stored as the first line
 * "# <title>" (see splitSampleAnswer). Replaces an existing title.
 *
 *   bun run ielts:set-sample-title -- <slug> <writing-1|writing-2> "<title>"
 */

async function main() {
  const [slug, sectionKey, titleArg] = process.argv.slice(2)
  const title = titleArg?.trim() ?? ''

  if (!slug || !sectionKey || !title)
    throw new Error(
      'Usage: setIeltsSampleTitle <slug> <writing-1|writing-2> "<title>"'
    )

  await connectDatabase()

  const doc = await IeltsTestModel.findOne({ slug }).sort({ version: -1 })
  if (!doc) throw new Error(`${slug} not found`)

  const test = ieltsTestSchema.parse(doc.toObject())
  const section = test.sections.find(item => item.key === sectionKey)
  const writing = section?.writing
  if (!section || !writing) throw new Error(`${slug} has no ${sectionKey}`)
  if (!writing.sampleAnswer.trim())
    throw new Error(`${slug} ${sectionKey} has no sample answer`)

  const { paragraphs, title: before } = splitSampleAnswer(writing.sampleAnswer)

  writing.sampleAnswer = [`# ${title}`, ...paragraphs].join('\n\n')
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
    `${slug} ${sectionKey} sample title: "${before}" -> "${title}" (revision ${section.revision}).`
  )
  await requestContentRevalidation([CACHE_TAGS.ieltsContent])
  await disconnect()
}

main().catch(async error => {
  console.error(error)
  await disconnect()
  process.exit(1)
})

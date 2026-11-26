import { disconnect } from 'mongoose'

import { CACHE_TAGS } from '@/lib/db/cacheTags'
import { connectDatabase } from '@/lib/db/connectDatabase'
import { IeltsTestModel } from '@/models/ielts/IeltsTestModel'
import { checkTest } from '@/modules/ielts/consistency/checkTest'
import { ieltsTestSchema } from '@/modules/ielts/schema'

import { requestContentRevalidation } from './lib/requestContentRevalidation'

/*
 * Move a reading passage's standfirst (the line printed under the title,
 * e.g. "What are the implications of the way we read today?") out of the
 * first paragraph into `reading.subtitle`, on the newest version of the
 * test. The text must start the first paragraph exactly.
 *
 *   bun run ielts:set-standfirst -- <slug> <sectionKey> "<standfirst>"
 *   bun run ielts:set-standfirst -- ielts-16-test-4 reading-2 "What are the implications of the way we read today?"
 */

async function main() {
  const [slug, sectionKey, standfirst] = process.argv.slice(2)
  const text = standfirst?.trim()

  if (!slug || !sectionKey || !text)
    throw new Error(
      'Usage: setIeltsStandfirst <slug> <sectionKey> "<standfirst>"'
    )

  await connectDatabase()

  const doc = await IeltsTestModel.findOne({ slug }).sort({ version: -1 })
  if (!doc) throw new Error(`${slug} not found`)

  const test = ieltsTestSchema.parse(doc.toObject())
  const section = test.sections.find(item => item.key === sectionKey)
  const reading = section?.reading
  if (!section || !reading)
    throw new Error(`${slug} has no reading section ${sectionKey}`)

  const [first] = reading.paragraphs
  if (!first?.text.startsWith(text))
    throw new Error(
      `The first paragraph of ${sectionKey} does not start with that text: "${first?.text.slice(0, 80)}"`
    )

  const rest = first.text.slice(text.length).trim()

  reading.subtitle = text
  if (rest) first.text = rest
  else reading.paragraphs.shift()
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
    `Set the standfirst of ${slug} ${sectionKey} (version ${doc.get('version')}, revision ${section.revision}).`
  )
  await requestContentRevalidation([CACHE_TAGS.ieltsContent])
  await disconnect()
}

main().catch(async error => {
  console.error(error)
  await disconnect()
  process.exit(1)
})

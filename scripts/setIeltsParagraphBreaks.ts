import { disconnect } from 'mongoose'

import { CACHE_TAGS } from '@/lib/db/cacheTags'
import { connectDatabase } from '@/lib/db/connectDatabase'
import { IeltsTestModel } from '@/models/ielts/IeltsTestModel'
import { checkTest } from '@/modules/ielts/consistency/checkTest'
import { ieltsTestSchema } from '@/modules/ielts/schema'

import { requestContentRevalidation } from './lib/requestContentRevalidation'

/*
 * Restore the paragraph breaks inside a lettered reading section ("A" holds
 * three paragraphs on the paper but was stored as one block). Each argument
 * names the section letter and the words a new paragraph starts with; a
 * blank line is put before them. Blocks keep their index, so evidence and
 * question references stay valid.
 *
 *   bun run ielts:paragraph-breaks -- <slug> <sectionKey> "A=Many decisions" "A=If we want AI" ...
 */

const startsAt = (text: string, start: string) => {
  const exact = text.indexOf(start)

  if (exact !== -1) return exact

  // Straight and curly apostrophes are both in the content.
  return text.indexOf(start.replace(/'/g, '’'))
}

async function main() {
  const [slug, sectionKey, ...breaks] = process.argv.slice(2)

  if (!slug || !sectionKey || !breaks.length)
    throw new Error(
      'Usage: setIeltsParagraphBreaks <slug> <sectionKey> "<letter>=<first words>" ...'
    )

  await connectDatabase()

  const doc = await IeltsTestModel.findOne({ slug }).sort({ version: -1 })
  if (!doc) throw new Error(`${slug} not found`)

  const test = ieltsTestSchema.parse(doc.toObject())
  const section = test.sections.find(item => item.key === sectionKey)
  const reading = section?.reading
  if (!section || !reading)
    throw new Error(`${slug} has no reading section ${sectionKey}`)

  for (const entry of breaks) {
    const split = entry.indexOf('=')
    const label = entry.slice(0, split).trim()
    const start = entry.slice(split + 1).trim()
    const paragraph = reading.paragraphs.find(item => item.label === label)

    if (split < 1 || !start || !paragraph)
      throw new Error(`No section "${label}" for "${entry}"`)

    const at = startsAt(paragraph.text, start)

    if (at <= 0)
      throw new Error(`Section ${label} has no "${start}" after its start`)

    paragraph.text = `${paragraph.text.slice(0, at).trimEnd()}\n\n${paragraph.text.slice(at)}`
  }

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
    `Added ${breaks.length} paragraph breaks to ${slug} ${sectionKey} (version ${doc.get('version')}, revision ${section.revision}).`
  )
  await requestContentRevalidation([CACHE_TAGS.ieltsContent])
  await disconnect()
}

main().catch(async error => {
  console.error(error)
  await disconnect()
  process.exit(1)
})

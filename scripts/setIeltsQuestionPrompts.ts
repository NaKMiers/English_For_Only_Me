import { disconnect } from 'mongoose'

import { CACHE_TAGS } from '@/lib/db/cacheTags'
import { connectDatabase } from '@/lib/db/connectDatabase'
import { IeltsTestModel } from '@/models/ielts/IeltsTestModel'
import { checkTest } from '@/modules/ielts/consistency/checkTest'
import { ieltsTestSchema } from '@/modules/ielts/schema'

import { requestContentRevalidation } from './lib/requestContentRevalidation'

/*
 * Set the question text (stem) of questions in one section, e.g. blank
 * multiple-choice stems, on the newest version of a test.
 *
 *   bun run ielts:set-prompts -- <slug> <sectionKey> "14=What point does ...?" "15=..."
 */

async function main() {
  const [slug, sectionKey, ...pairs] = process.argv.slice(2)

  if (!slug || !sectionKey || !pairs.length)
    throw new Error(
      'Usage: setIeltsQuestionPrompts <slug> <sectionKey> "<number>=<prompt>" ...'
    )

  await connectDatabase()

  const doc = await IeltsTestModel.findOne({ slug }).sort({ version: -1 })
  if (!doc) throw new Error(`${slug} not found`)

  const test = ieltsTestSchema.parse(doc.toObject())
  const section = test.sections.find(item => item.key === sectionKey)
  if (!section) throw new Error(`${slug} has no section ${sectionKey}`)

  for (const pair of pairs) {
    const split = pair.indexOf('=')
    const number = Number(pair.slice(0, split))
    const prompt = pair.slice(split + 1).trim()
    const question = section.groups
      .flatMap(group => group.questions)
      .find(item => item.number === number)

    if (split < 1 || !prompt || !question)
      throw new Error(`No question ${pair.slice(0, split)} in ${sectionKey}`)

    console.info(`Q${number}: "${question.prompt}" -> "${prompt}"`)
    question.prompt = prompt
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
    `Saved ${pairs.length} prompts in ${slug} ${sectionKey} (revision ${section.revision}).`
  )
  await requestContentRevalidation([CACHE_TAGS.ieltsContent])
  await disconnect()
}

main().catch(async error => {
  console.error(error)
  await disconnect()
  process.exit(1)
})

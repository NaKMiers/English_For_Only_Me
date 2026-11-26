import { readFile } from 'node:fs/promises'

import { disconnect } from 'mongoose'

import { CACHE_TAGS } from '@/lib/db/cacheTags'
import { connectDatabase } from '@/lib/db/connectDatabase'
import { IeltsTestModel } from '@/models/ielts/IeltsTestModel'
import { checkTest } from '@/modules/ielts/consistency/checkTest'
import { ieltsSectionSchema, ieltsTestSchema } from '@/modules/ielts/schema'

import { requestContentRevalidation } from './lib/requestContentRevalidation'

/*
 * Replace one section of the newest version of a test with the full section
 * in a JSON file. The section is validated, the patched test must pass the
 * consistency check, the revision is bumped, and a field-level diff is
 * printed. The key in the file must match <sectionKey>.
 *
 *   bun run ielts:patch-section -- <slug> <sectionKey> <file.json>
 */

function diff(before: unknown, after: unknown, at = ''): string[] {
  if (JSON.stringify(before) === JSON.stringify(after)) return []

  const isObject = (value: unknown) =>
    typeof value === 'object' && value !== null

  if (!isObject(before) || !isObject(after))
    return [
      `${at || '(root)'}: ${JSON.stringify(before)?.slice(0, 160)} -> ${JSON.stringify(after)?.slice(0, 160)}`,
    ]

  const a = before as Record<string, unknown>
  const b = after as Record<string, unknown>
  const keys = new Set([...Object.keys(a), ...Object.keys(b)])

  return [...keys].flatMap(key =>
    diff(a[key], b[key], at ? `${at}.${key}` : key)
  )
}

async function main() {
  const [slug, sectionKey, file] = process.argv.slice(2)
  if (!slug || !sectionKey || !file)
    throw new Error('Usage: patchIeltsSection <slug> <sectionKey> <file.json>')

  const input = ieltsSectionSchema.parse(
    JSON.parse(await readFile(file, 'utf8'))
  )
  if (input.key !== sectionKey)
    throw new Error(`The file holds section ${input.key}, not ${sectionKey}`)

  await connectDatabase()

  const doc = await IeltsTestModel.findOne({ slug }).sort({ version: -1 })
  if (!doc) throw new Error(`${slug} not found`)

  const test = ieltsTestSchema.parse(doc.toObject())
  const index = test.sections.findIndex(item => item.key === sectionKey)
  if (index < 0) throw new Error(`${slug} has no section ${sectionKey}`)

  const current = test.sections[index]
  const section = { ...input, revision: current.revision + 1 }
  const changes = diff({ ...current, revision: 0 }, { ...section, revision: 0 })
  if (!changes.length) {
    console.info('No changes.')
    await disconnect()
    return
  }

  test.sections[index] = section

  const report = checkTest(test)
  if (report.errors.length) {
    console.error(report.errors)
    throw new Error('Patched test fails the consistency check')
  }

  await IeltsTestModel.updateOne(
    { _id: doc._id, 'sections.key': sectionKey },
    { $set: { 'sections.$': section } }
  )
  console.info(
    `Patched ${slug} ${sectionKey} (version ${doc.get('version')}, revision ${section.revision}):`
  )
  for (const line of changes) console.info(`  ${line}`)
  await requestContentRevalidation([CACHE_TAGS.ieltsContent])
  await disconnect()
}

main().catch(async error => {
  console.error(error)
  await disconnect()
  process.exit(1)
})

import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { disconnect } from 'mongoose'

import { connectDatabase } from '@/lib/db/connectDatabase'
import { IeltsTestModel } from '@/models/ielts/IeltsTestModel'
import { checkTest } from '@/modules/ielts/consistency/checkTest'
import { ieltsTestSchema } from '@/modules/ielts/schema'

/*
 * Write the newest version of one IELTS test as JSON to
 * tmp/ielts-dumps/<slug>.json (gitignored) and print its
 * consistency report.
 *
 *   bun run ielts:dump-test -- <slug>
 */

async function main() {
  const [slug] = process.argv.slice(2)
  if (!slug) throw new Error('Usage: dumpIeltsTest <slug>')

  await connectDatabase()

  const doc = await IeltsTestModel.findOne({ slug }).sort({ version: -1 })
  if (!doc) throw new Error(`${slug} not found`)

  const test = ieltsTestSchema.parse(doc.toObject())
  const report = checkTest(test)
  const dir = path.join('tmp', 'ielts-dumps')
  const file = path.join(dir, `${slug}.json`)

  await mkdir(dir, { recursive: true })
  await writeFile(
    file,
    `${JSON.stringify({ _id: String(doc._id), ...test }, null, 2)}\n`
  )

  console.info(`Wrote ${file} (version ${doc.get('version')}).`)
  console.info(
    `checkTest: ${report.errors.length} errors, ${report.warnings.length} warnings`
  )
  for (const issue of [...report.errors, ...report.warnings])
    console.info(
      `  ${issue.rule} ${issue.sectionKey} ${issue.path}: ${issue.message}`
    )
  await disconnect()
}

main().catch(async error => {
  console.error(error)
  await disconnect()
  process.exit(1)
})

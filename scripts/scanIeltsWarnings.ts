import { disconnect } from 'mongoose'

import { connectDatabase } from '@/lib/db/connectDatabase'
import { IeltsTestModel } from '@/models/ielts/IeltsTestModel'
import { checkTest } from '@/modules/ielts/consistency/checkTest'
import { ieltsTestSchema } from '@/modules/ielts/schema'

/*
 * Read-only: run the consistency check on every published test and list the
 * errors and warnings per test, optionally for one rule only.
 *
 *   bun run ielts:scan-warnings
 *   bun run ielts:scan-warnings -- question_stem_missing
 */

async function main() {
  const [rule] = process.argv.slice(2)

  await connectDatabase()

  const docs = await IeltsTestModel.find({ status: 'published' })
    .select({ generationLog: 0, plan: 0 })
    .sort({ slug: 1 })
  let affected = 0

  for (const doc of docs) {
    const test = ieltsTestSchema.parse(doc.toObject())
    const report = checkTest(test)
    const issues = [...report.errors, ...report.warnings].filter(
      issue => !rule || issue.rule === rule
    )

    if (!issues.length) continue

    affected += 1
    console.info(test.slug)
    for (const issue of issues)
      console.info(`  ${issue.rule} ${issue.sectionKey}: ${issue.message}`)
  }

  console.info(
    `${affected} of ${docs.length} published tests${rule ? ` have ${rule}` : ' have issues'}.`
  )
  await disconnect()
}

main().catch(async error => {
  console.error(error)
  await disconnect()
  process.exit(1)
})

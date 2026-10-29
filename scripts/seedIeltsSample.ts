import { disconnect } from 'mongoose'

import { CACHE_TAGS } from '@/lib/db/cacheTags'
import { connectDatabase } from '@/lib/db/connectDatabase'
import { IeltsTestModel } from '@/models/ielts/IeltsTestModel'
import { checkTest } from '@/modules/ielts/consistency/checkTest'
import { IELTS_SAMPLE_TEST } from '@/modules/ielts/fixtures/sampleTest'
import { ieltsTestSchema } from '@/modules/ielts/schema'

import { requestContentRevalidation } from './lib/requestContentRevalidation'

/**
 * Publish the original sample test (`sample-academic-1`, v1) so the learner
 * pages have something to run before any test is authored. Idempotent: an
 * existing v1 is left alone unless `--force` is passed, which replaces it.
 *
 *   bun run ielts:seed-sample
 *   bun run ielts:seed-sample -- --force
 */
async function main() {
  const force = process.argv.includes('--force')
  const test = ieltsTestSchema.parse(IELTS_SAMPLE_TEST)
  const report = checkTest(test)

  if (report.errors.length) {
    console.error('Sample test fails the consistency check', report.errors)
    process.exit(1)
  }

  await connectDatabase()

  const existing = await IeltsTestModel.findOne({
    slug: test.slug,
    version: test.version,
  }).lean()

  if (existing && !force)
    console.info(
      `${test.slug} v${test.version} already exists (${existing.status}). Pass --force to replace it.`
    )
  else {
    await IeltsTestModel.deleteOne({ slug: test.slug, version: test.version })
    await IeltsTestModel.create({
      ...test,
      status: 'published',
      publishedAt: new Date(),
      createdBy: 'seed',
    })
    console.info(`Published ${test.slug} v${test.version}.`)
    await requestContentRevalidation([CACHE_TAGS.ieltsContent])
  }

  await disconnect()
}

main().catch(error => {
  console.error('Failed to seed the IELTS sample test', error)
  process.exit(1)
})

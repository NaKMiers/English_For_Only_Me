import { disconnect } from 'mongoose'

import { connectDatabase } from '@/lib/db/connectDatabase'
import { seedVocabularyFromOfficialSource } from '@/modules/vocabulary/seed/seedVocabulary'

// Top-N NGSL words to ingest. Pass a bare number (`vocab:seed 2000`) or set
// VOCAB_SEED_LIMIT. Seeds ranks 1..limit; existing ranks are refreshed via
// idempotent upsert, so raising the limit only inserts the new higher ranks.
function getLimit() {
  const rawValue =
    process.argv.find(arg => /^\d+$/.test(arg)) ??
    process.env.VOCAB_SEED_LIMIT ??
    '1000'
  const value = Number(rawValue)

  return Number.isFinite(value) ? Math.max(1, Math.floor(value)) : 1000
}

async function main() {
  await connectDatabase()

  const limit = getLimit()
  const result = await seedVocabularyFromOfficialSource({ limit })

  console.info(
    `Seeded vocabulary (limit ${limit}): ${result.insertedOrUpdated} inserted/updated, ${result.skipped} skipped. Source: ${result.sourceUrl}`
  )

  // Close the connection so the script exits instead of hanging on the open pool.
  await disconnect()
}

main().catch(error => {
  console.error('Failed to seed vocabulary', error)
  process.exit(1)
})

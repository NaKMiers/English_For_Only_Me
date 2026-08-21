import { disconnect } from 'mongoose'

import { connectDatabase } from '@/lib/db/connectDatabase'
import { GrammarPointModel } from '@/models/grammar/GrammarPointModel'

/**
 * Drop grammar indexes that a schema change has superseded.
 *
 * Mongoose `Schema.index()` CREATES indexes and never removes them, so an index
 * whose declaration is gone from the schema stays in the database forever: it
 * still costs every write, and it stays available to the query planner. Nothing
 * about that is visible from the code.
 *
 * `{ reviewStatus: 1, l1Risk: 1 }` served the admin review queue while the queue
 * sorted the raw `l1Risk` string enum. Mongo orders strings lexicographically,
 * so that sort returned medium > low > high and the 30-row queue showed none of
 * the 67 high-risk lessons. The queue now sorts `l1RiskRank`, and the index was
 * replaced by { reviewStatus, l1RiskRank, complexity }.
 *
 * Safe to run repeatedly: a missing index is reported, not an error.
 */
const STALE_INDEXES = ['reviewStatus_1_l1Risk_1']

async function main() {
  await connectDatabase()

  const collection = GrammarPointModel.collection
  const existing = await collection.indexes()
  const existingNames = new Set(existing.map(index => index.name))

  for (const name of STALE_INDEXES) {
    if (!existingNames.has(name)) {
      console.info(`Index ${name} is already absent.`)
      continue
    }

    await collection.dropIndex(name)
    console.info(`Dropped index ${name}.`)
  }

  await disconnect()
}

main().catch(error => {
  console.error('Failed to drop stale grammar indexes', error)
  process.exit(1)
})

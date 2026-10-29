import { connect, disconnect } from 'mongoose'

import { getMongoDbUri } from '@/constants/environments'
import { getManualSchemaConnectOptions } from '@/lib/db/connectDatabase'
import { DictationSegmentModel } from '@/models/dictation/DictationSegmentModel'

/**
 * One-shot cleanup. Practice used to stamp one learner's progress
 * (attemptStatus, attemptCount, lastAttemptAt) onto the SHARED segment
 * document, so every other learner saw it. Progress is now derived per user
 * from their own attempts and nothing reads these fields, but the stale values
 * still sit in the content collection. This resets them to their defaults.
 *
 * Dry run by default: prints how many segments would change. Pass `--apply` to
 * write. Idempotent - safe to re-run. Run only after the per-user progress
 * change is deployed, or the old code would stamp them again.
 */
const DIRTY_SEGMENT_FILTER = {
  $or: [
    { attemptStatus: { $ne: 'notStarted' } },
    { attemptCount: { $gt: 0 } },
    { lastAttemptAt: { $ne: null } },
  ],
}

async function main() {
  const apply = process.argv.includes('--apply')

  // Like syncIndexes.ts: no autoIndex/autoCreate, so even the dry run writes
  // nothing (scripts run without NODE_ENV, where they would otherwise be on).
  await connect(getMongoDbUri(), getManualSchemaConnectOptions())

  // Raw driver collection: these fields are on their way out of the model, so
  // match the stored data directly.
  const segments = DictationSegmentModel.collection
  const dirtyCount = await segments.countDocuments(DIRTY_SEGMENT_FILTER)

  if (!apply) {
    console.info(
      `Dry run: ${dirtyCount} segment(s) carry shared progress. Re-run with --apply to reset them.`
    )
    await disconnect()
    return
  }

  const result = await segments.updateMany(DIRTY_SEGMENT_FILTER, {
    $set: { attemptCount: 0, attemptStatus: 'notStarted', lastAttemptAt: null },
  })

  console.info(
    `Shared segment progress reset: matched ${result.matchedCount}, modified ${result.modifiedCount}.`
  )

  await disconnect()
}

main().catch(error => {
  console.error('Failed to reset shared segment progress', error)
  process.exit(1)
})

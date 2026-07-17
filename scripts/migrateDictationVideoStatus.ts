import { disconnect } from 'mongoose'

import { connectDatabase } from '@/lib/db/connectDatabase'
import { DictationVideoModel } from '@/models/dictation/DictationVideoModel'

/**
 * One-shot migration. Dictation `video.status` no longer stores per-user
 * practice progress — that is derived from sessions now. Remap any video still
 * stamped with the removed `'completed'`/`'inProgress'` values back to the
 * content-lifecycle `'ready'`.
 *
 * Run this BEFORE deploying the reduced enum: after deploy, docs left on the
 * old values render an undefined status chip and reject on admin save (enum
 * validation). Idempotent — safe to re-run.
 */
async function main() {
  await connectDatabase()

  // Raw driver collection: the removed literals aren't in the Mongoose enum
  // type anymore, but they still exist in stored data we need to match.
  const result = await DictationVideoModel.collection.updateMany(
    { status: { $in: ['completed', 'inProgress'] } },
    { $set: { status: 'ready' } }
  )

  console.info(
    `Dictation video status migration: matched ${result.matchedCount}, modified ${result.modifiedCount} ('completed'/'inProgress' -> 'ready').`
  )

  await disconnect()
}

main().catch(error => {
  console.error('Failed to migrate dictation video status', error)
  process.exit(1)
})

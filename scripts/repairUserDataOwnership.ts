import mongoose, { disconnect, type Model } from 'mongoose'

import { OWNER_KEY_PATTERN } from '@/lib/auth/ownerKey'
import { connectDatabase } from '@/lib/db/connectDatabase'
import { DictationAttemptModel } from '@/models/dictation/DictationAttemptModel'
import { DictationDebriefModel } from '@/models/dictation/DictationDebriefModel'
import { DictationReviewItemModel } from '@/models/dictation/DictationReviewItemModel'
import { DictationSessionModel } from '@/models/dictation/DictationSessionModel'

// Manage indexes explicitly below; never auto-build against dirty data.
mongoose.set('autoIndex', false)

/**
 * Repair per-user data isolation. Idempotent. DRY-RUN by default - pass --apply
 * to write. See .prompts/user-data-isolation-plan.md.
 *
 * 1. Quarantine every row whose `userId` is null/empty/malformed (not a valid
 *    owner key) by reassigning it to a sentinel owner no real user or guest
 *    cookie can ever hold. Orphan sessions are also forced to 'abandoned' so
 *    they leave the active space (and stop showing as "In Progress"). Reversible:
 *    the rows are stamped, not deleted, so they can be re-attributed later.
 * 2. Collapse duplicate active sessions per (owner, video) to a single newest
 *    one; the rest become 'abandoned'. Required before the partial-unique index
 *    can build.
 * 3. Rebuild the partial-unique active-session index on the now-clean data.
 *
 *   pnpm dictation:repair-users           # dry run, writes nothing
 *   pnpm dictation:repair-users --apply   # performs the repair
 */

// guest_ + 32 zero-hex: a valid owner-key shape that no randomUUID guest and no
// ObjectId user can collide with. Quarantined rows land here, owned by nobody.
const QUARANTINE_OWNER = `guest_${'0'.repeat(32)}`

const INVALID_OWNER = { userId: { $not: OWNER_KEY_PATTERN } }

const apply = process.argv.includes('--apply')

const COLLECTIONS: { label: string; model: Model<unknown> }[] = [
  { label: 'attempts', model: DictationAttemptModel as Model<unknown> },
  { label: 'reviewItems', model: DictationReviewItemModel as Model<unknown> },
  { label: 'debriefs', model: DictationDebriefModel as Model<unknown> },
]

async function quarantineInvalidOwners() {
  console.info('\n[1] Quarantine invalid-owner rows')

  // Sessions: reassign owner AND force-abandon in one pass.
  const badSessions = await DictationSessionModel.countDocuments(INVALID_OWNER)
  console.info(`  sessions with invalid owner: ${badSessions}`)
  if (apply && badSessions > 0) {
    const res = await DictationSessionModel.updateMany(INVALID_OWNER, {
      $set: { userId: QUARANTINE_OWNER, status: 'abandoned' },
    })
    console.info(`    -> quarantined ${res.modifiedCount} sessions`)
  }

  for (const { label, model } of COLLECTIONS) {
    const bad = await model.countDocuments(INVALID_OWNER)
    console.info(`  ${label} with invalid owner: ${bad}`)
    if (apply && bad > 0) {
      const res = await model.updateMany(INVALID_OWNER, {
        $set: { userId: QUARANTINE_OWNER },
      })
      console.info(`    -> quarantined ${res.modifiedCount} ${label}`)
    }
  }
}

async function dedupeActiveSessions() {
  console.info('\n[2] Collapse duplicate active sessions per (owner, video)')

  const dupes = await DictationSessionModel.aggregate<{
    _id: { userId: string; videoId: unknown }
    ids: unknown[]
  }>([
    { $match: { status: 'active' } },
    { $sort: { lastActiveAt: -1 } },
    {
      $group: {
        _id: { userId: '$userId', videoId: '$videoId' },
        ids: { $push: '$_id' },
      },
    },
    { $match: { $expr: { $gt: [{ $size: '$ids' }, 1] } } },
  ])

  let totalAbandoned = 0
  for (const group of dupes) {
    const [, ...stale] = group.ids // keep newest (first after sort), abandon rest
    totalAbandoned += stale.length
    console.info(
      `  owner=${group._id.userId} video=${String(group._id.videoId)}: ${stale.length} stale`
    )
    if (apply && stale.length > 0)
      await DictationSessionModel.updateMany(
        { _id: { $in: stale } },
        { $set: { status: 'abandoned' } }
      )
  }
  console.info(
    `  ${dupes.length} pair(s) with duplicates, ${totalAbandoned} session(s) ${
      apply ? 'abandoned' : 'would be abandoned'
    }`
  )
}

async function rebuildActiveSessionIndex() {
  console.info('\n[3] Rebuild partial-unique active-session index')
  if (!apply) {
    console.info('  (dry run - skipped)')
    return
  }

  const collection = DictationSessionModel.collection
  const name = 'userId_1_videoId_1'
  const existing = await collection.indexes()
  if (existing.some(index => index.name === name)) {
    await collection.dropIndex(name)
    console.info(`  dropped existing ${name}`)
  }
  await collection.createIndex(
    { userId: 1, videoId: 1 },
    { unique: true, partialFilterExpression: { status: 'active' }, name }
  )
  console.info(`  created ${name} (unique, partial: status=active)`)
}

async function main() {
  console.info(
    apply ? '=== REPAIR (APPLY - writing) ===' : '=== REPAIR (DRY RUN - no writes) ==='
  )
  await connectDatabase()

  await quarantineInvalidOwners()
  await dedupeActiveSessions()
  await rebuildActiveSessionIndex()

  console.info('\nDone. Re-run scripts/diagnoseUserData.ts to verify.')
  await disconnect()
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})

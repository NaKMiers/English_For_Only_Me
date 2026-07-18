import mongoose, { disconnect, type Model, type Types } from 'mongoose'

import { OWNER_KEY_PATTERN } from '@/lib/auth/ownerKey'

// Read-only audit runs against possibly-dirty data; don't let autoIndex try to
// build the partial-unique active-session index (it would fail loudly here).
mongoose.set('autoIndex', false)
import { connectDatabase } from '@/lib/db/connectDatabase'
import { UserModel } from '@/models/UserModel'
import { DictationAttemptModel } from '@/models/dictation/DictationAttemptModel'
import { DictationDebriefModel } from '@/models/dictation/DictationDebriefModel'
import { DictationReviewItemModel } from '@/models/dictation/DictationReviewItemModel'
import { DictationSessionModel } from '@/models/dictation/DictationSessionModel'
import { DictationVideoModel } from '@/models/dictation/DictationVideoModel'

/**
 * Read-only audit of user-scoping for dictation practice data. Prints owner
 * distribution, invalid-owner counts, orphan->video mapping, and any (owner,
 * video) pairs with more than one active session. Run before AND after the
 * repair migration to verify isolation. Writes nothing.
 *
 *   pnpm dictation:diagnose-users   (see package.json)
 */
const MODELS: { label: string; model: Model<unknown> }[] = [
  { label: 'sessions', model: DictationSessionModel as Model<unknown> },
  { label: 'attempts', model: DictationAttemptModel as Model<unknown> },
  { label: 'reviewItems', model: DictationReviewItemModel as Model<unknown> },
  { label: 'debriefs', model: DictationDebriefModel as Model<unknown> },
]

function classify(id: unknown) {
  if (typeof id !== 'string') return '[NULL/NON-STRING]'
  if (OWNER_KEY_PATTERN.test(id))
    return id.startsWith('guest_') ? '[guest]' : '[user]'
  return '[INVALID]'
}

async function main() {
  await connectDatabase()

  const users = await UserModel.find().select({ email: 1 }).lean()
  console.info('\n=== USERS ===')
  for (const u of users) console.info(`${String(u._id)}  ${u.email}`)

  for (const { label, model } of MODELS) {
    const ids: unknown[] = await model.distinct('userId')
    const invalid = await model.countDocuments({
      userId: { $not: OWNER_KEY_PATTERN },
    })
    console.info(`\n=== ${label} owners (invalid=${invalid}) ===`)
    for (const id of ids) console.info(`  ${JSON.stringify(id)}  ${classify(id)}`)
  }

  console.info('\n=== sessions by owner + status ===')
  const grouped = await DictationSessionModel.aggregate([
    {
      $group: {
        _id: { userId: '$userId', status: '$status' },
        count: { $sum: 1 },
      },
    },
    { $sort: { '_id.userId': 1 } },
  ])
  for (const g of grouped)
    console.info(
      `  userId=${JSON.stringify(g._id.userId)}  status=${g._id.status}  count=${g.count}`
    )

  console.info('\n=== (owner, video) pairs with >1 ACTIVE session ===')
  const dupes = await DictationSessionModel.aggregate([
    { $match: { status: 'active' } },
    { $group: { _id: { userId: '$userId', videoId: '$videoId' }, count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } },
  ])
  if (dupes.length === 0) console.info('  none')
  for (const d of dupes)
    console.info(
      `  userId=${JSON.stringify(d._id.userId)}  videoId=${String(d._id.videoId)}  count=${d.count}`
    )

  console.info(
    '\n=== active sessions: total vs started (>=1 attempt) per owner ==='
  )
  const activeSessions = await DictationSessionModel.find({ status: 'active' })
    .select({ userId: 1, videoId: 1 })
    .lean<{ _id: Types.ObjectId; userId: string; videoId: Types.ObjectId }[]>()
  const startedSessionIds = new Set(
    (
      await DictationAttemptModel.distinct('sessionId', {
        sessionId: { $in: activeSessions.map(s => s._id) },
      })
    ).map(id => String(id))
  )
  const byOwner = new Map<string, { total: Set<string>; started: Set<string> }>()
  for (const s of activeSessions) {
    const entry =
      byOwner.get(s.userId) ??
      { total: new Set<string>(), started: new Set<string>() }
    entry.total.add(String(s.videoId))
    if (startedSessionIds.has(String(s._id))) entry.started.add(String(s.videoId))
    byOwner.set(s.userId, entry)
  }
  for (const [owner, e] of byOwner)
    console.info(
      `  owner=${owner}  activeVideos=${e.total.size}  inProgress(started)=${e.started.size}`
    )

  console.info('\n=== invalid-owner sessions -> videos ===')
  const orphan = await DictationSessionModel.aggregate([
    { $match: { userId: { $not: OWNER_KEY_PATTERN } } },
    { $group: { _id: '$videoId', count: { $sum: 1 }, statuses: { $addToSet: '$status' } } },
  ])
  if (orphan.length === 0) console.info('  none')
  for (const o of orphan) {
    const v = await DictationVideoModel.findById(o._id).select({ title: 1 }).lean()
    console.info(
      `  video="${v?.title ?? '?'}" (${String(o._id)})  count=${o.count}  statuses=${o.statuses}`
    )
  }

  await disconnect()
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})

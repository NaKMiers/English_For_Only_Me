import mongoose, { disconnect } from 'mongoose'

import { connectDatabase } from '@/lib/db/connectDatabase'
import { USER_OWNED_MODELS } from '@/models/userOwnedModels'

import {
  type GuestCleanupTarget,
  guestOwnerFilter,
  parseGuestCleanupArgs,
  planGuestCleanup,
} from './lib/guestCleanup'

/**
 * Delete the rows anonymous guests left behind before sign-in became required
 * (every owner id shaped `guest_...`). Nothing reads them any more.
 *
 * DRY-RUN by default: prints the database name and, per collection, how many
 * guest rows it holds. Run it only after the sign-in deploy is checked: the
 * delete cannot be undone.
 *
 *   bun run auth:drop-guest-data                      # dry run, writes nothing
 *   bun run auth:drop-guest-data --apply --i-am-sure  # deletes the rows
 */

// Guests could not favorite or grade, so those collections are expected to
// hold 0 guest rows; they stay in the list so a stray row cannot survive.
const TARGETS: GuestCleanupTarget[] = USER_OWNED_MODELS.map(
  ({ model, ownerField }) => ({
    collection: model.collection.name,
    ownerField,
  })
)

async function main() {
  const { apply } = parseGuestCleanupArgs(process.argv.slice(2))

  await connectDatabase()

  const database = mongoose.connection.db

  if (!database) throw new Error('No database handle after connecting.')

  console.info(`Database: ${database.databaseName}`)

  const counts: Record<string, number> = {}

  for (const target of TARGETS)
    counts[target.collection] = await database
      .collection(target.collection)
      .countDocuments(guestOwnerFilter(target.ownerField))

  const plan = planGuestCleanup(TARGETS, counts, { apply })

  for (const step of plan.steps) {
    console.info(`  ${step.collection} (${step.ownerField}): ${step.count}`)

    if (!step.willDelete) continue

    const { deletedCount } = await database
      .collection(step.collection)
      .deleteMany(step.filter)

    console.info(`    -> deleted ${deletedCount}`)
  }

  console.info(`Total guest rows: ${plan.total}`)

  if (!apply)
    console.info('\nDry run. Re-run with --apply --i-am-sure to delete them.')
}

main()
  .catch(error => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => void disconnect())

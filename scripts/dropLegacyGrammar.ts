import mongoose, { disconnect } from 'mongoose'

import { connectDatabase } from '@/lib/db/connectDatabase'

/**
 * Drop the grammar v2 collections. v3 keeps its content in code and its
 * progress in new collections (grammarlessonprogresses, grammarunitprogresses,
 * grammarcardmisses, grammarsessions), so nothing reads these any more.
 *
 * DRY-RUN by default: lists each collection and its document count. Run it
 * only after v3 is deployed and checked - once dropped, v2 cannot come back.
 *
 *   bun run grammar:drop-legacy                      # dry run, writes nothing
 *   bun run grammar:drop-legacy --apply --i-am-sure  # drops the collections
 */

const LEGACY_COLLECTIONS = [
  'grammarpoints',
  'usergrammaritems',
  'grammardrillattempts',
  'grammartestsessions',
]

const apply =
  process.argv.includes('--apply') && process.argv.includes('--i-am-sure')

async function main() {
  await connectDatabase()

  const database = mongoose.connection.db

  if (!database) throw new Error('No database handle after connecting.')

  const existing = new Set(
    (await database.listCollections().toArray()).map(item => item.name)
  )

  for (const name of LEGACY_COLLECTIONS) {
    if (!existing.has(name)) {
      console.info(`  ${name}: not present`)
      continue
    }

    const count = await database.collection(name).countDocuments()

    console.info(`  ${name}: ${count} documents`)

    if (apply) {
      await database.dropCollection(name)
      console.info(`    -> dropped`)
    }
  }

  if (!apply)
    console.info('\nDry run. Re-run with --apply --i-am-sure to drop these.')
}

main()
  .catch(error => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => void disconnect())

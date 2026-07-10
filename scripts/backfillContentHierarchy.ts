/**
 * Backfill existing dictation videos into the Chunk 2 content hierarchy
 * (no-topic / ungrouped, null level). Safe by default: runs a DRY RUN unless
 * --apply is passed.
 *
 * Runs under Node (NOT bun — the mongodb driver needs node:v8 snapshot APIs bun
 * lacks) via tsx, with the react-server condition so `server-only` imports
 * resolve to their no-op stub.
 *
 * Usage (local):
 *   node --conditions=react-server --env-file=.env.development \
 *     --import tsx scripts/backfillContentHierarchy.ts            # dry-run
 *   ...same... scripts/backfillContentHierarchy.ts --apply        # write
 *
 * Or, with MONGODB_URI already in the environment:
 *   bun run backfill:content            # dry-run
 *   bun run backfill:content -- --apply # write
 */
import mongoose from 'mongoose'

import { getMongoDbUri } from '@/constants/environments'
import { backfillContentHierarchy } from '@/modules/dictation/content/backfill'

async function main() {
  const apply = process.argv.includes('--apply')
  const dryRun = !apply

  await mongoose.connect(getMongoDbUri(), { bufferCommands: false })

  try {
    const result = await backfillContentHierarchy({ dryRun })

    console.info(
      `[backfill] mode=${dryRun ? 'DRY-RUN' : 'APPLY'} ` +
        `scanned=${result.scanned} needing-backfill=${result.needing} ` +
        `updated=${result.updated}`
    )

    if (dryRun && result.needing > 0)
      console.info('[backfill] Re-run with --apply to write these changes.')
  } finally {
    await mongoose.disconnect()
  }
}

main().catch(error => {
  console.error('[backfill] failed:', error)
  process.exit(1)
})

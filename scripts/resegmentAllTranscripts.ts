/**
 * Re-segment every existing dictation transcript with the current pause-based
 * segment logic. Safe by default: DRY RUN unless --apply is passed.
 *
 * DESTRUCTIVE with --apply: rebuilds all segments (new ObjectIds) and prunes
 * review items that referenced the old segments. Attempts are kept (they carry
 * expectedTextSnapshot).
 *
 * Runs under Node (NOT bun - the mongodb driver needs node:v8 snapshot APIs bun
 * lacks) via tsx, with the react-server condition so `server-only` imports
 * resolve to their no-op stub.
 *
 * Usage:
 *   bun run resegment              # dry-run (report old vs new counts)
 *   bun run resegment -- --apply   # write
 */
import mongoose from 'mongoose'

import { getMongoDbUri } from '@/constants/environments'
import { resegmentAllTranscripts } from '@/modules/dictation/segmenting/resegmentAll'

async function main() {
  const apply = process.argv.includes('--apply')
  const dryRun = !apply

  await mongoose.connect(getMongoDbUri(), { bufferCommands: false })

  try {
    const result = await resegmentAllTranscripts({ dryRun })

    console.info(
      `[resegment] mode=${dryRun ? 'DRY-RUN' : 'APPLY'} ` +
        `active-transcripts=${result.scanned} resegmented=${result.resegmented} ` +
        `skipped-empty=${result.skippedEmpty} skipped-no-video=${result.skippedNoVideo} ` +
        `skipped-not-active=${result.skippedNotActive} ` +
        `segments ${result.oldSegmentTotal} -> ${result.newSegmentTotal} ` +
        `pruned-review-items=${result.prunedReviewItems}`
    )

    if (dryRun && result.resegmented > 0)
      console.info('[resegment] Re-run with --apply to write these changes.')
  } finally {
    await mongoose.disconnect()
  }
}

main().catch(error => {
  console.error('[resegment] failed:', error)
  process.exitCode = 1
})

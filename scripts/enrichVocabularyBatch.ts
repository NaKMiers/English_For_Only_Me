import { disconnect } from 'mongoose'

import { connectDatabase } from '@/lib/db/connectDatabase'
import {
  enrichNextVocabularyEntries,
  getVocabAdminQueueSummary,
} from '@/modules/vocabulary/enrichment/enrichmentService'

/**
 * Drain the vocabulary enrichment queue in throttled batches. Repeatedly claims
 * up to 10 eligible words and fills them from the free dictionary + translation
 * providers, pausing between batches so the free APIs (MyMemory in particular)
 * do not rate-limit us. Idempotent and resumable - re-run any time to continue.
 *
 *   pnpm vocab:enrich                 # drain the whole queue
 *   pnpm vocab:enrich 500             # stop after ~500 words processed
 *   pnpm vocab:enrich --delay=1500    # 1.5s between batches (default 800ms)
 */
function getMaxWords() {
  const raw = process.argv.find(arg => /^\d+$/.test(arg))
  const value = raw ? Number(raw) : Number.POSITIVE_INFINITY

  return Number.isFinite(value) ? Math.max(1, Math.floor(value)) : Infinity
}

function getDelayMs() {
  const raw =
    process.argv.find(arg => /^--delay=\d+$/.test(arg))?.split('=')[1] ??
    process.env.VOCAB_ENRICH_DELAY_MS ??
    '800'

  return Math.max(0, Number(raw) || 800)
}

function sleep(ms: number) {
  return new Promise<void>(resolve => setTimeout(resolve, ms))
}

async function main() {
  await connectDatabase()

  const maxWords = getMaxWords()
  const delayMs = getDelayMs()
  const startQueue = await getVocabAdminQueueSummary()
  const startedAt = Date.now()

  console.info(
    `Enrichable now: ${startQueue.seededCount}. Target: ${
      maxWords === Infinity ? 'drain all' : maxWords
    }. Delay: ${delayMs}ms between batches.`
  )

  const totals = { failed: 0, notFound: 0, processed: 0, rateLimited: 0, ready: 0 }
  let emptyStreak = 0
  let rateLimitStreak = 0
  let batch = 0

  while (totals.processed < maxWords) {
    const result = await enrichNextVocabularyEntries({ limit: 10 })
    batch += 1
    totals.processed += result.processed
    totals.ready += result.ready
    totals.failed += result.failed
    totals.notFound += result.notFound
    totals.rateLimited += result.rateLimited

    // Two consecutive batches with nothing claimed = queue is drained.
    if (result.processed === 0) {
      emptyStreak += 1
      if (emptyStreak >= 2) break
    } else {
      emptyStreak = 0
    }

    if (batch % 10 === 0 || result.rateLimited > 0)
      console.info(
        `batch ${batch}: +${result.ready} ready, +${result.failed} failed, ` +
          `+${result.rateLimited} rate-limited | totals: ${totals.ready} ready, ` +
          `${totals.processed} processed`
      )

    // Back off hard when the providers start rate-limiting; bail if it persists
    // so we do not burn the daily quota spinning on words we cannot enrich now.
    if (result.rateLimited > 0) {
      rateLimitStreak += 1
      if (rateLimitStreak >= 5) {
        console.warn(
          'Rate-limited 5 batches in a row - stopping to preserve provider quota. Re-run later to continue.'
        )
        break
      }
      await sleep(delayMs * 6)
    } else {
      rateLimitStreak = 0
      await sleep(delayMs)
    }
  }

  const endQueue = await getVocabAdminQueueSummary()
  const elapsedSec = Math.round((Date.now() - startedAt) / 1000)

  console.info(
    `\nDONE in ${elapsedSec}s. Processed ${totals.processed} (` +
      `${totals.ready} ready, ${totals.failed} failed, ${totals.notFound} not-found, ` +
      `${totals.rateLimited} rate-limited).`
  )
  console.info(
    `Queue: enrichable ${startQueue.seededCount} -> ${endQueue.seededCount}, ` +
      `ready ${startQueue.readyCount} -> ${endQueue.readyCount}, failed ${endQueue.failedCount}.`
  )

  await disconnect()
}

main().catch(error => {
  console.error('Batch enrichment failed', error)
  process.exit(1)
})

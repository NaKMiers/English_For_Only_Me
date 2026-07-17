import { connectDatabase } from '@/lib/db/connectDatabase'
import { VocabEntryModel } from '@/models/vocabulary/VocabEntryModel'
import { VOCAB_DEFAULT_LOCALIZED_LANGUAGE } from '@/modules/vocabulary/constants'
import { enrichVocabEntryIfNeeded } from '@/modules/vocabulary/enrichment/enrichmentService'
import {
  MY_MEMORY_PROVIDER,
  translateTextToVietnamese,
} from '@/modules/vocabulary/providers/myMemoryTranslate'
import { VOCAB_MISSING_VI_MEANING_FILTER } from '@/modules/vocabulary/vietnameseMeaning'

function getLimit() {
  const rawValue =
    process.argv.find(arg => /^\d+$/.test(arg)) ??
    process.env.VOCAB_VI_BACKFILL_LIMIT ??
    '25'
  const value = Number(rawValue)

  return Number.isFinite(value) ? Math.max(1, Math.floor(value)) : 25
}

function shouldOverwrite() {
  return process.argv.includes('--overwrite')
}

// Optional pause between entries (`--delay=400` or VOCAB_VI_BACKFILL_DELAY_MS).
// Defaults to 0 (unchanged). Set a few hundred ms for large runs so the free
// MyMemory translation API is less likely to rate-limit (429) the batch.
function getDelayMs() {
  const rawValue =
    process.argv.find(arg => /^--delay=\d+$/.test(arg))?.split('=')[1] ??
    process.env.VOCAB_VI_BACKFILL_DELAY_MS ??
    '0'
  const value = Number(rawValue)

  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function main() {
  await connectDatabase()

  const limit = getLimit()
  const overwrite = shouldOverwrite()
  const delayMs = getDelayMs()
  const entries = await VocabEntryModel.find({
    ...(overwrite ? {} : VOCAB_MISSING_VI_MEANING_FILTER),
  })
    .sort({ enrichmentStatus: 1, frequencyRank: 1, updatedAt: 1 })
    .limit(limit)
    .lean()

  let translated = 0
  let enriched = 0
  let skipped = 0

  for (const [index, entry] of entries.entries()) {
    if (index > 0 && delayMs > 0) await sleep(delayMs)

    const definitions = entry.definitions ?? []

    if (definitions.length === 0) {
      const enrichedEntry = await enrichVocabEntryIfNeeded({
        entryId: String(entry._id),
      })

      if (enrichedEntry?.localizedMeanings.some(item => item.language === 'vi'))
        enriched += 1
      else skipped += 1

      continue
    }

    const meaning = await translateTextToVietnamese({ text: entry.term })

    if (!meaning) {
      skipped += 1
      continue
    }

    if (overwrite)
      await VocabEntryModel.updateOne(
        { _id: entry._id },
        {
          $pull: {
            localizedMeanings: {
              language: VOCAB_DEFAULT_LOCALIZED_LANGUAGE,
            },
          },
        }
      )

    await VocabEntryModel.updateOne(
      { _id: entry._id, ...VOCAB_MISSING_VI_MEANING_FILTER },
      {
        $push: {
          localizedMeanings: {
            language: VOCAB_DEFAULT_LOCALIZED_LANGUAGE,
            license: null,
            meaning,
            partOfSpeech: definitions[0]?.partOfSpeech ?? null,
            source: MY_MEMORY_PROVIDER,
          },
        },
        $set: {
          enrichmentStatus: 'ready',
          nextRetryAt: null,
        },
      }
    )
    translated += 1
  }

  console.info(
    `Vietnamese vocab backfill: ${translated} translated, ${enriched} enriched, ${skipped} skipped. Limit: ${limit}. Overwrite: ${overwrite}.`
  )

  await VocabEntryModel.db.close()
}

main().catch(error => {
  console.error('Failed to backfill Vietnamese vocabulary meanings', error)
  process.exit(1)
})

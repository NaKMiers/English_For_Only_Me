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

async function main() {
  await connectDatabase()

  const limit = getLimit()
  const overwrite = shouldOverwrite()
  const entries = await VocabEntryModel.find({
    ...(overwrite ? {} : VOCAB_MISSING_VI_MEANING_FILTER),
  })
    .sort({ enrichmentStatus: 1, frequencyRank: 1, updatedAt: 1 })
    .limit(limit)
    .lean()

  let translated = 0
  let enriched = 0
  let skipped = 0

  for (const entry of entries) {
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

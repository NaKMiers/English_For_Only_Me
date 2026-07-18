import { disconnect } from 'mongoose'

import { connectDatabase } from '@/lib/db/connectDatabase'
import { VocabEntryModel } from '@/models/vocabulary/VocabEntryModel'
import {
  VOCAB_DEFAULT_LANGUAGE,
  VOCAB_FAMILY_SEED_SOURCES,
} from '@/modules/vocabulary/constants'
import {
  insertNewVocabularyEntries,
  parseNgslStatsCsv,
} from '@/modules/vocabulary/seed/seedVocabulary'

/**
 * Add up to N new words from the NGSL family (NGSL -> NAWL -> TSL -> BSL, in
 * priority order). Only genuinely new terms are inserted - existing entries and
 * their ranks/enrichment are never touched - so re-running never duplicates.
 * New entries land as `enrichmentStatus: 'seeded'`; run vocab enrichment after.
 *
 *   pnpm vocab:seed-family          # adds up to 2000 new words
 *   pnpm vocab:seed-family 500      # adds up to 500 new words
 */
function getTarget() {
  const raw =
    process.argv.find(arg => /^\d+$/.test(arg)) ??
    process.env.VOCAB_SEED_TARGET ??
    '2000'
  const value = Number(raw)

  return Number.isFinite(value) ? Math.max(1, Math.floor(value)) : 2000
}

async function main() {
  await connectDatabase()

  const language = VOCAB_DEFAULT_LANGUAGE
  const target = getTarget()

  // Seed set of every term already in the catalog, so nothing is duplicated.
  const existingTerms = new Set<string>(
    await VocabEntryModel.distinct('normalizedTerm', { language })
  )
  const startCount = existingTerms.size
  console.info(
    `Catalog has ${startCount} terms. Adding up to ${target} new words from the NGSL family.`
  )

  let added = 0
  for (const source of VOCAB_FAMILY_SEED_SOURCES) {
    if (added >= target) break

    const response = await fetch(source.csvUrl)
    if (!response.ok) {
      console.warn(`  ${source.provider}: download failed (${response.status}), skipping`)
      continue
    }

    const words = parseNgslStatsCsv(await response.text(), Number.MAX_SAFE_INTEGER)
    const { inserted } = await insertNewVocabularyEntries({
      existingTerms,
      language,
      remaining: target - added,
      source,
      words,
    })
    added += inserted
    console.info(
      `  ${source.provider} (${source.name}): +${inserted} new (${words.length} in list) -> running total ${added}/${target}`
    )
  }

  const endCount = await VocabEntryModel.countDocuments({ language })
  console.info(
    `Done. Added ${added} new words. Catalog: ${startCount} -> ${endCount} terms.`
  )
  console.info(
    'New words are `seeded` (no definitions yet). Run enrichment to make them learnable.'
  )

  await disconnect()
}

main().catch(error => {
  console.error('Failed to seed vocabulary family', error)
  process.exit(1)
})

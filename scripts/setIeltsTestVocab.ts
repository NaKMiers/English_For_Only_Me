import { readFile } from 'node:fs/promises'
import path from 'node:path'

import { disconnect } from 'mongoose'
import { z } from 'zod'

import { connectDatabase } from '@/lib/db/connectDatabase'
import { IeltsTestModel } from '@/models/ielts/IeltsTestModel'
import { VocabEntryModel } from '@/models/vocabulary/VocabEntryModel'
import { saveIeltsTestVocab } from '@/modules/ielts/vocab/testVocabService'
import { enrichVocabEntryIfNeeded } from '@/modules/vocabulary/enrichment/enrichmentService'
import { MY_MEMORY_PROVIDER } from '@/modules/vocabulary/providers/myMemoryTranslate'
import { findOrCreateVocabEntryShell } from '@/modules/vocabulary/services/vocabEntryService'
import { REQUIRED_VOCAB_MEANING_LANGUAGE } from '@/modules/vocabulary/vietnameseMeaning'

/*
 * Set the words shown under the skill cards of one IELTS test from a curated
 * list, scripts/data/ielts-vocab/<slug>.json (term, part of speech,
 * Vietnamese meaning in the test's context, short English definition, the
 * sentence from the test).
 *
 * For each word: find or create its dictionary entry; give it the curated
 * Vietnamese meaning when it has none (before enrichment, so the machine
 * translation is never used for it) or only has a word-for-word MyMemory
 * translation (often the wrong sense: "scheme" as "phối hợp", "colony" as
 * "khuẩn lạc"); enrich it from the free dictionaries for pronunciation and
 * audio; fall back to the curated definition when no dictionary knows the
 * word. Other meanings and existing definitions are never overwritten. The
 * test's list is replaced in the file's order.
 *
 *   bun run ielts:set-vocab -- <slug>            # writes
 *   bun run ielts:set-vocab -- <slug> --dry-run  # only reports
 */

const CURATED_SOURCE = 'ielts-curated'

const wordSchema = z.object({
  part: z.string(),
  term: z.string().min(1),
  pos: z.string().min(1),
  vi: z.string().min(1),
  en: z.string().min(1),
  example: z.string().default(''),
})

type CuratedWord = z.infer<typeof wordSchema>

interface Meaning {
  language: string
  meaning: string
  source: string
}

const isVi = (meaning: Meaning) =>
  meaning.language === REQUIRED_VOCAB_MEANING_LANGUAGE &&
  meaning.meaning.trim().length > 0

/** No Vietnamese meaning, or only MyMemory's context-free translation. */
function needsCuratedVi(meanings: Meaning[] = []) {
  const vi = meanings.filter(isVi)

  return vi.every(meaning => meaning.source === MY_MEMORY_PROVIDER)
}

async function prepareEntry(word: CuratedWord, dryRun: boolean) {
  if (dryRun) {
    const existing = await VocabEntryModel.findOne({
      normalizedTerm: word.term.toLowerCase(),
    }).lean()

    // The stored Vietnamese meaning and where it came from, so a machine
    // translation that misses the test's sense can be spotted and fixed.
    const vi = existing?.localizedMeanings
      ?.filter(meaning => meaning.language === REQUIRED_VOCAB_MEANING_LANGUAGE)
      .map(meaning => `${meaning.meaning} [${meaning.source}]`)
      .join(' | ')

    return {
      id: existing ? String(existing._id) : null,
      note: existing
        ? `${existing.enrichmentStatus}, rank: ${existing.frequencyRank ?? '-'}, vi: ${vi || 'none'}`
        : 'new',
    }
  }

  const shell = await findOrCreateVocabEntryShell({ term: word.term })
  if (!shell) throw new Error(`"${word.term}" is not a valid term`)

  const notes: string[] = []

  if (needsCuratedVi(shell.localizedMeanings)) {
    const replaced = shell.localizedMeanings.some(isVi)

    await VocabEntryModel.updateOne(
      { _id: shell.id },
      {
        $set: {
          localizedMeanings: [
            ...shell.localizedMeanings.filter(meaning => !isVi(meaning)),
            {
              language: REQUIRED_VOCAB_MEANING_LANGUAGE,
              license: null,
              meaning: word.vi,
              partOfSpeech: word.pos,
              source: CURATED_SOURCE,
            },
          ],
        },
      }
    )
    notes.push(replaced ? 'replaced machine vi' : 'curated vi')
  }

  if (shell.enrichmentStatus !== 'ready') {
    await enrichVocabEntryIfNeeded({ entryId: shell.id })
    notes.push('enriched')
  }

  const entry = await VocabEntryModel.findById(shell.id).lean()
  if (!entry) throw new Error(`"${word.term}" disappeared`)

  if (!entry.definitions?.length || entry.enrichmentStatus !== 'ready') {
    await VocabEntryModel.updateOne(
      { _id: shell.id },
      {
        $set: {
          enrichmentStatus: 'ready',
          partOfSpeech: entry.partOfSpeech ?? word.pos,
          ...(entry.definitions?.length
            ? {}
            : {
                definitions: [
                  {
                    antonyms: [],
                    definition: word.en,
                    example: word.example || null,
                    partOfSpeech: word.pos,
                    source: CURATED_SOURCE,
                    synonyms: [],
                  },
                ],
              }),
        },
      }
    )
    notes.push(entry.definitions?.length ? 'marked ready' : 'curated def')
  }

  return { id: shell.id, note: notes.join(', ') || 'already ready' }
}

async function main() {
  const [slug, ...flags] = process.argv.slice(2)
  const dryRun = flags.includes('--dry-run')

  if (!slug) throw new Error('Usage: setIeltsTestVocab <slug> [--dry-run]')

  const file = path.join('scripts', 'data', 'ielts-vocab', `${slug}.json`)
  const words = z
    .array(wordSchema)
    .parse(JSON.parse(await readFile(file, 'utf8')))

  await connectDatabase()

  if (!(await IeltsTestModel.exists({ slug })))
    throw new Error(`${slug} not found`)

  const ids: string[] = []

  for (const word of words) {
    const result = await prepareEntry(word, dryRun)

    if (result.id) ids.push(result.id)
    console.info(
      `${word.part.padEnd(12)} ${word.term.padEnd(18)} ${result.note}`
    )
  }

  if (dryRun) console.info(`Dry run: ${words.length} words, nothing written.`)
  else {
    const saved = await saveIeltsTestVocab({
      entryIds: ids,
      slug,
      updatedBy: 'script:ielts-set-vocab',
    })

    console.info(`Saved ${saved.length} words for ${slug}.`)
  }

  await disconnect()
}

main().catch(async error => {
  console.error(error)
  await disconnect()
  process.exit(1)
})

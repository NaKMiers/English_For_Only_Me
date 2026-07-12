import 'server-only'

import { VocabEntryModel } from '@/models/vocabulary/VocabEntryModel'
import {
  NGSL_SEED_SOURCE,
  VOCAB_DEFAULT_LANGUAGE,
} from '@/modules/vocabulary/constants'
import { normalizeVocabTerm } from '@/modules/vocabulary/normalizeVocabTerm'

export const NGSL_STATS_CSV_URL =
  'https://www.newgeneralservicelist.com/s/NGSL_12_stats.csv'

export interface NgslSeedWord {
  rank: number
  term: string
}

export interface SeedVocabularyResult {
  insertedOrUpdated: number
  skipped: number
  sourceUrl: string
}

type FetchLike = (input: string) => Promise<{
  ok: boolean
  status: number
  text(): Promise<string>
}>

function parseCsvLine(line: string) {
  const columns: string[] = []
  let current = ''
  let inQuotes = false

  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes
      continue
    }
    if (char === ',' && !inQuotes) {
      columns.push(current)
      current = ''
      continue
    }
    current += char
  }

  columns.push(current)
  return columns.map(column => column.trim())
}

export function parseNgslStatsCsv(csv: string, limit = 1000): NgslSeedWord[] {
  const rows = csv
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
    .slice(1)

  const words: NgslSeedWord[] = []

  for (const row of rows) {
    const [lemma, rankValue] = parseCsvLine(row)
    const rank = Number(rankValue)
    const normalized = normalizeVocabTerm(lemma ?? '')

    if (!normalized || !Number.isInteger(rank) || rank < 1) continue

    words.push({
      rank,
      term: normalized.term,
    })

    if (words.length >= limit) break
  }

  return words
}

export async function seedVocabularyEntries({
  language = VOCAB_DEFAULT_LANGUAGE,
  words,
}: {
  language?: string
  words: NgslSeedWord[]
}): Promise<SeedVocabularyResult> {
  if (words.length === 0)
    return {
      insertedOrUpdated: 0,
      skipped: 0,
      sourceUrl: NGSL_SEED_SOURCE.url,
    }

  type SeedBulkOperation = Parameters<
    typeof VocabEntryModel.collection.bulkWrite
  >[0][number]
  const now = new Date()
  const operations = words.flatMap<SeedBulkOperation>(word => {
    const normalized = normalizeVocabTerm(word.term)

    if (!normalized) return []

    return [
      {
        updateOne: {
          filter: {
            language,
            normalizedTerm: normalized.normalizedTerm,
          },
          update: {
            $set: {
              difficultyLevel: word.rank <= 1000 ? 'core-1000' : 'core',
              entryType: normalized.entryType,
              frequencyRank: word.rank,
              language,
              license: NGSL_SEED_SOURCE.license,
              normalizedTerm: normalized.normalizedTerm,
              seedLicense: NGSL_SEED_SOURCE.license.name,
              seedRank: word.rank,
              seedSource: NGSL_SEED_SOURCE.name,
              sourceAttributions: [
                {
                  license: NGSL_SEED_SOURCE.license.name,
                  provider: NGSL_SEED_SOURCE.provider,
                  retrievedAt: now,
                  url: NGSL_SEED_SOURCE.url,
                },
              ],
              term: normalized.term,
              updatedAt: now,
            },
            $setOnInsert: {
              createdAt: now,
              enrichmentAttempts: 0,
              enrichmentStatus: 'seeded',
            },
          },
          upsert: true,
        },
      },
    ]
  })

  if (operations.length === 0)
    return {
      insertedOrUpdated: 0,
      skipped: words.length,
      sourceUrl: NGSL_SEED_SOURCE.url,
    }

  const result = await VocabEntryModel.collection.bulkWrite(operations, {
    ordered: false,
  })

  return {
    insertedOrUpdated:
      (result.upsertedCount ?? 0) + (result.modifiedCount ?? 0),
    skipped: words.length - operations.length,
    sourceUrl: NGSL_SEED_SOURCE.url,
  }
}

export async function seedVocabularyFromOfficialSource({
  fetcher = fetch,
  limit = 1000,
}: {
  fetcher?: FetchLike
  limit?: number
} = {}) {
  const response = await fetcher(NGSL_STATS_CSV_URL)

  if (!response.ok)
    throw new Error(`Failed to download NGSL seed CSV: ${response.status}`)

  const words = parseNgslStatsCsv(await response.text(), limit)

  return seedVocabularyEntries({ words })
}

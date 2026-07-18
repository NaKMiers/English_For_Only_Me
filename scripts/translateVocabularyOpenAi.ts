import { disconnect, type Types } from 'mongoose'

import { getOpenAiApiKey } from '@/constants/environments'
import { connectDatabase } from '@/lib/db/connectDatabase'
import { VocabEntryModel } from '@/models/vocabulary/VocabEntryModel'
import { VOCAB_DEFAULT_LOCALIZED_LANGUAGE } from '@/modules/vocabulary/constants'
import { VOCAB_MISSING_VI_MEANING_FILTER } from '@/modules/vocabulary/vietnameseMeaning'

/**
 * Fill in Vietnamese meanings for vocabulary words that MyMemory could not
 * translate, using OpenAI. Words are sent in BATCHES (default 50 per request)
 * to keep the number of API calls - and therefore usage/cost - low: ~2500 words
 * become ~50 calls, not 2500. Only words that already have English definitions
 * are promoted to `ready`. Idempotent and resumable (targets missing-VI words).
 *
 *   pnpm vocab:translate-openai              # translate all missing-VI words
 *   pnpm vocab:translate-openai 200          # cap at ~200 words
 *   pnpm vocab:translate-openai --batch=40   # 40 words per request
 */
const MODEL =
  process.env.OPENAI_TRANSLATION_MODEL ??
  process.env.OPENAI_DEBRIEF_MODEL ??
  'gpt-5.4-nano'
const SOURCE = `openai:${MODEL}`

const SCHEMA = {
  additionalProperties: false,
  properties: {
    items: {
      type: 'array',
      items: {
        additionalProperties: false,
        properties: {
          term: { type: 'string' },
          vi: { type: 'string' },
        },
        required: ['term', 'vi'],
        type: 'object',
      },
    },
  },
  required: ['items'],
  type: 'object',
}

function getMax() {
  const raw = process.argv.find(arg => /^\d+$/.test(arg))
  const value = raw ? Number(raw) : Number.POSITIVE_INFINITY
  return Number.isFinite(value) ? Math.max(1, Math.floor(value)) : Infinity
}

function getBatchSize() {
  const raw = process.argv.find(arg => /^--batch=\d+$/.test(arg))?.split('=')[1]
  const value = raw ? Number(raw) : 50
  return Math.max(1, Math.min(80, value || 50))
}

function sleep(ms: number) {
  return new Promise<void>(resolve => setTimeout(resolve, ms))
}

async function translateBatch(
  terms: string[],
  apiKey: string
): Promise<Map<string, string>> {
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      max_output_tokens: 4000,
      input: [
        {
          role: 'system',
          content:
            'You are an English-to-Vietnamese dictionary. For each English term, ' +
            'return its common Vietnamese meaning as a short gloss (comma-separate ' +
            'multiple senses). Vietnamese only - no English, no explanations, no ' +
            'romanization. Return one item per input term, echoing the term.',
        },
        { role: 'user', content: JSON.stringify(terms) },
      ],
      text: {
        format: {
          name: 'vocab_translations',
          schema: SCHEMA,
          strict: true,
          type: 'json_schema',
        },
      },
    }),
    cache: 'no-store',
  })

  const body = await response.json()
  if (!response.ok)
    throw new Error(body?.error?.message ?? `OpenAI HTTP ${response.status}`)

  const text =
    body.output_text ??
    body.output
      ?.flatMap((o: { content?: { text?: string }[] }) => o.content ?? [])
      .map((c: { text?: string }) => c.text)
      .find((t: string | undefined) => typeof t === 'string') ??
    ''
  const parsed = JSON.parse(text) as { items: { term: string; vi: string }[] }

  const map = new Map<string, string>()
  for (const item of parsed.items ?? [])
    if (item.term && item.vi)
      map.set(item.term.trim().toLowerCase(), item.vi.trim())

  return map
}

async function main() {
  const apiKey = getOpenAiApiKey()
  if (!apiKey) {
    console.error('OPENAI_API_KEY is not set.')
    process.exit(1)
  }

  await connectDatabase()

  const max = getMax()
  const batchSize = getBatchSize()

  // Only words with English definitions - those can be promoted straight to
  // `ready` once they get a Vietnamese meaning.
  const entries = await VocabEntryModel.find({
    ...VOCAB_MISSING_VI_MEANING_FILTER,
    'definitions.0': { $exists: true },
  })
    .sort({ frequencyRank: 1, updatedAt: 1 })
    .limit(max === Infinity ? 100_000 : max)
    .select({ term: 1 })
    .lean<{ _id: Types.ObjectId; term: string }[]>()

  console.info(
    `Translating ${entries.length} words via ${MODEL}, ${batchSize} per request ` +
      `(~${Math.ceil(entries.length / batchSize)} API calls).`
  )

  let translated = 0
  let missed = 0
  let batchNo = 0

  for (let i = 0; i < entries.length; i += batchSize) {
    const batch = entries.slice(i, i + batchSize)
    batchNo += 1

    let map: Map<string, string>
    try {
      map = await translateBatch(
        batch.map(entry => entry.term),
        apiKey
      )
    } catch (error) {
      console.warn(
        `  batch ${batchNo} failed: ${error instanceof Error ? error.message : error} - skipping`
      )
      missed += batch.length
      await sleep(500)
      continue
    }

    type BulkOp = Parameters<
      typeof VocabEntryModel.collection.bulkWrite
    >[0][number]
    const ops: BulkOp[] = []
    for (const entry of batch) {
      const vi = map.get(entry.term.trim().toLowerCase())
      if (!vi) {
        missed += 1
        continue
      }
      ops.push({
        updateOne: {
          filter: { _id: entry._id, ...VOCAB_MISSING_VI_MEANING_FILTER },
          update: {
            $push: {
              localizedMeanings: {
                language: VOCAB_DEFAULT_LOCALIZED_LANGUAGE,
                license: null,
                meaning: vi,
                partOfSpeech: null,
                source: SOURCE,
              },
            },
            $set: { enrichmentStatus: 'ready', nextRetryAt: null },
          },
        },
      } as unknown as BulkOp)
    }

    if (ops.length > 0) {
      const result = await VocabEntryModel.collection.bulkWrite(ops, {
        ordered: false,
      })
      translated += result.modifiedCount ?? 0
    }

    if (batchNo % 5 === 0 || i + batchSize >= entries.length)
      console.info(
        `  batch ${batchNo}: ${translated} translated, ${missed} missed so far`
      )

    await sleep(350)
  }

  console.info(`\nDONE. ${translated} translated, ${missed} missed.`)
  await disconnect()
}

main().catch(error => {
  console.error('OpenAI translation failed', error)
  process.exit(1)
})

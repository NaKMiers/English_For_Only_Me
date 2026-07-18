import 'server-only'

import { createHash, randomUUID } from 'crypto'

import { UserVocabItemModel } from '@/models/vocabulary/UserVocabItemModel'
import { VocabEntryModel } from '@/models/vocabulary/VocabEntryModel'
import {
  VOCAB_RECALL_LISTENING_TASK_TYPES,
  VOCAB_RECALL_TASK_TYPES,
} from '@/modules/vocabulary/constants'
import type {
  VocabEntryApiRecord,
  VocabRecallOptionRecord,
  VocabRecallTaskRecord,
  VocabRecallTaskType,
} from '@/modules/vocabulary/types'
import {
  getEnglishDefinition,
  VOCAB_REQUIRES_VI_MEANING_FILTER,
} from '@/modules/vocabulary/vietnameseMeaning'

import { toUserVocabItemRecord } from '../services/userVocabItemRecords'
import { toVocabEntryRecord } from '../services/vocabEntryRecords'
import { createVocabRecallTaskToken } from './recallTaskToken'

const DISTRACTOR_POOL_MAX = 300

function getDefinition(entry: VocabEntryApiRecord) {
  return getEnglishDefinition(entry)
}

function getExampleSentence(entry: VocabEntryApiRecord) {
  return (
    entry.definitions.find(definition => definition.example)?.example ??
    entry.examples[0]?.text ??
    `I noticed the word ${entry.term} while studying English.`
  )
}

function getOptionSortKey(seed: string, optionId: string) {
  return createHash('sha1').update(`${seed}:${optionId}`).digest('hex')
}

function sortOptions(options: VocabRecallOptionRecord[], seed: string) {
  // Sort by a hash of seed+id so the seed actually mixes into the ordering.
  // A plain `${seed}:${id}` string compare sorts by id alone (the seed is a
  // shared prefix), which pins the correct answer to the same slot every time.
  return [...options]
    .map(option => ({ option, sortKey: getOptionSortKey(seed, option.id) }))
    .sort((left, right) => left.sortKey.localeCompare(right.sortKey))
    .map(entry => entry.option)
}

function buildWordOptions({
  correctEntry,
  distractors,
  seed,
}: {
  correctEntry: VocabEntryApiRecord
  distractors: VocabEntryApiRecord[]
  seed: string
}) {
  const options = [
    {
      definition: null,
      id: `word:${correctEntry.id}`,
      term: correctEntry.term,
    },
    ...distractors.slice(0, 3).map(entry => ({
      definition: null,
      id: `word:${entry.id}`,
      term: entry.term,
    })),
  ]

  return sortOptions(options, seed)
}

function buildDefinitionOptions({
  correctEntry,
  distractors,
  seed,
}: {
  correctEntry: VocabEntryApiRecord
  distractors: VocabEntryApiRecord[]
  seed: string
}) {
  const options = [
    {
      definition: getDefinition(correctEntry),
      id: `definition:${correctEntry.id}`,
      term: null,
    },
    ...distractors.slice(0, 3).map(entry => ({
      definition: getDefinition(entry),
      id: `definition:${entry.id}`,
      term: null,
    })),
  ]

  return sortOptions(options, seed)
}

function getAvailableTaskTypes(excludeListening: boolean) {
  return excludeListening
    ? VOCAB_RECALL_TASK_TYPES.filter(
        type => !VOCAB_RECALL_LISTENING_TASK_TYPES.includes(type)
      )
    : VOCAB_RECALL_TASK_TYPES
}

function shuffleTaskTypes(types: VocabRecallTaskType[]) {
  return [...types].sort(() => (randomUUID() < randomUUID() ? -1 : 1))
}

function createTaskTypeDeck({
  excludeListening,
  size,
}: {
  excludeListening: boolean
  size: number
}) {
  const availableTypes = getAvailableTaskTypes(excludeListening)
  const deck: VocabRecallTaskType[] = []

  while (deck.length < size) deck.push(...shuffleTaskTypes(availableTypes))

  return deck.slice(0, size)
}

function getCorrectOptionId({
  entry,
  type,
}: {
  entry: VocabEntryApiRecord
  type: VocabRecallTaskType
}) {
  if (type === 'listenChooseDefinition' || type === 'wordChooseDefinition')
    return `definition:${entry.id}`

  if (type === 'listenChooseWord' || type === 'definitionChooseWord')
    return `word:${entry.id}`

  return null
}

function buildOptions({
  distractors,
  entry,
  seed,
  type,
}: {
  distractors: VocabEntryApiRecord[]
  entry: VocabEntryApiRecord
  seed: string
  type: VocabRecallTaskType
}) {
  if (type === 'exampleRemember') return []

  if (type === 'listenChooseDefinition' || type === 'wordChooseDefinition')
    return buildDefinitionOptions({
      correctEntry: entry,
      distractors,
      seed,
    })

  return buildWordOptions({
    correctEntry: entry,
    distractors,
    seed,
  })
}

export async function listDueVocabRecallTasksForUser({
  excludeListening = false,
  limit,
  now = new Date(),
  userId,
}: {
  excludeListening?: boolean
  limit: number
  now?: Date
  userId: string
}): Promise<VocabRecallTaskRecord[]> {
  const items = await UserVocabItemModel.find({
    dueAt: { $lte: now },
    status: 'learning',
    userId,
  })
    .sort({ dueAt: 1, updatedAt: 1 })
    .limit(limit)
    .lean()

  if (items.length === 0) return []

  const entryIds = items.map(item => item.vocabEntryId)
  const [entries, distractorEntries] = await Promise.all([
    VocabEntryModel.find({
      _id: { $in: entryIds },
      ...VOCAB_REQUIRES_VI_MEANING_FILTER,
    }).lean(),
    VocabEntryModel.find({
      _id: { $nin: entryIds },
      enrichmentStatus: 'ready',
      ...VOCAB_REQUIRES_VI_MEANING_FILTER,
    })
      .sort({ frequencyRank: 1, normalizedTerm: 1 })
      // Distractors are a shared pool - each task only needs 3, so a few hundred
      // gives ample variety. Uncapped (limit * 8 = 8000 at limit=1000) this
      // loaded thousands of heavy docs and blew the sort memory cap in prod.
      .limit(Math.min(Math.max(24, limit * 8), DISTRACTOR_POOL_MAX))
      .allowDiskUse(true)
      .lean(),
  ])
  const entryById = new Map(
    entries.map(entry => [String(entry._id), toVocabEntryRecord(entry)])
  )
  const distractorRecords = distractorEntries.map(toVocabEntryRecord)
  const taskTypeDeck = createTaskTypeDeck({
    excludeListening,
    size: items.length,
  })

  return items.flatMap((item, index) => {
    const entry = entryById.get(String(item.vocabEntryId))
    if (!entry) return []

    const itemRecord = toUserVocabItemRecord(item)
    const type = taskTypeDeck[index] ?? 'wordChooseDefinition'
    const seed = `${itemRecord.id}:${itemRecord.reviewCount}:${type}`
    const taskId = randomUUID()
    const distractors = distractorRecords.filter(
      distractor => distractor.id !== entry.id
    )
    const correctOptionId = getCorrectOptionId({ entry, type })
    const token = createVocabRecallTaskToken(
      {
        correctAnswer:
          type === 'exampleRemember' ? 'remember' : (correctOptionId ?? ''),
        correctOptionId,
        entryId: entry.id,
        itemId: itemRecord.id,
        recallStage: itemRecord.recallStage,
        taskId,
        type,
        userId,
      },
      now
    )

    return [
      {
        entry,
        exampleSentence: getExampleSentence(entry),
        item: itemRecord,
        options: buildOptions({
          distractors,
          entry,
          seed,
          type,
        }),
        taskId,
        token,
        type,
      },
    ]
  })
}

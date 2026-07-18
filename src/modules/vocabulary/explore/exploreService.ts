import 'server-only'

import { UserVocabItemModel } from '@/models/vocabulary/UserVocabItemModel'
import { VocabEntryModel } from '@/models/vocabulary/VocabEntryModel'
import {
  VOCAB_DEFAULT_LANGUAGE,
  VOCAB_EXPLORE_DEFAULT_LIMIT,
  VOCAB_EXPLORE_MAX_LIMIT,
} from '@/modules/vocabulary/constants'
import type { VocabEntryWithUserStateRecord } from '@/modules/vocabulary/types'
import { VOCAB_REQUIRES_VI_MEANING_FILTER } from '@/modules/vocabulary/vietnameseMeaning'

import { toVocabEntryRecord } from '../services/vocabEntryRecords'

type AggregatedExploreEntry = Parameters<typeof toVocabEntryRecord>[0] & {
  userItems?: unknown[]
}

export async function listExploreVocabEntriesForUser({
  language = VOCAB_DEFAULT_LANGUAGE,
  limit = VOCAB_EXPLORE_DEFAULT_LIMIT,
  userId,
}: {
  language?: string
  limit?: number
  userId: string
}): Promise<VocabEntryWithUserStateRecord[]> {
  const finalLimit = Math.min(Math.max(limit, 1), VOCAB_EXPLORE_MAX_LIMIT)

  // VocabEntry -> UserVocabItem lookup keeps exclusion inside MongoDB:
  // unclassified global words in rank order, with no app-memory anti-join.
  const entries = await VocabEntryModel.aggregate<AggregatedExploreEntry>([
    {
      $match: {
        enrichmentStatus: 'ready',
        language,
        ...VOCAB_REQUIRES_VI_MEANING_FILTER,
        frequencyRank: { $ne: null },
      },
    },
    { $sort: { frequencyRank: 1, normalizedTerm: 1 } },
    {
      $lookup: {
        as: 'userItems',
        from: UserVocabItemModel.collection.name,
        let: { entryId: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$vocabEntryId', '$$entryId'] },
                  { $eq: ['$userId', userId] },
                ],
              },
            },
          },
          { $limit: 1 },
        ],
      },
    },
    { $match: { userItems: { $eq: [] } } },
    { $limit: finalLimit },
  ]).allowDiskUse(true)

  return entries.map(entry => ({
    entry: toVocabEntryRecord(entry),
    userItem: null,
  }))
}

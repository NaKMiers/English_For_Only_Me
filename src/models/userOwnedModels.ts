import 'server-only'

import type { Model } from 'mongoose'

import { DictationAttemptModel } from '@/models/dictation/DictationAttemptModel'
import { DictationDebriefModel } from '@/models/dictation/DictationDebriefModel'
import { DictationFavoriteModel } from '@/models/dictation/DictationFavoriteModel'
import { DictationReviewItemModel } from '@/models/dictation/DictationReviewItemModel'
import { DictationSessionModel } from '@/models/dictation/DictationSessionModel'
import { GrammarCardMissModel } from '@/models/grammar/GrammarCardMissModel'
import { GrammarLessonProgressModel } from '@/models/grammar/GrammarLessonProgressModel'
import { GrammarSessionModel } from '@/models/grammar/GrammarSessionModel'
import { GrammarUnitProgressModel } from '@/models/grammar/GrammarUnitProgressModel'
import { IeltsAttemptModel } from '@/models/ielts/IeltsAttemptModel'
import { IeltsGradingLedgerModel } from '@/models/ielts/IeltsGradingLedgerModel'
import { UserVocabItemModel } from '@/models/vocabulary/UserVocabItemModel'
import { VocabOccurrenceModel } from '@/models/vocabulary/VocabOccurrenceModel'
import { VocabRecallAttemptModel } from '@/models/vocabulary/VocabRecallAttemptModel'

export type OwnerField = 'ownerId' | 'userId'

export interface UserOwnedModel {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- models of different document types share only the owner field
  model: Model<any>
  ownerField: OwnerField
}

/**
 * Every collection that holds one learner's rows, with the field that names
 * the owner (a User ObjectId string). The one list for "delete this user's
 * data" (admin user management) and the guest cleanup script, so a new
 * per-user collection is added here once and both stay complete.
 */
export const USER_OWNED_MODELS: readonly UserOwnedModel[] = [
  { model: DictationSessionModel, ownerField: 'userId' },
  { model: DictationAttemptModel, ownerField: 'userId' },
  { model: DictationReviewItemModel, ownerField: 'userId' },
  { model: DictationDebriefModel, ownerField: 'userId' },
  { model: DictationFavoriteModel, ownerField: 'userId' },
  { model: GrammarLessonProgressModel, ownerField: 'userId' },
  { model: GrammarUnitProgressModel, ownerField: 'userId' },
  { model: GrammarCardMissModel, ownerField: 'userId' },
  { model: GrammarSessionModel, ownerField: 'userId' },
  { model: UserVocabItemModel, ownerField: 'userId' },
  { model: VocabOccurrenceModel, ownerField: 'userId' },
  { model: VocabRecallAttemptModel, ownerField: 'userId' },
  { model: IeltsAttemptModel, ownerField: 'ownerId' },
  { model: IeltsGradingLedgerModel, ownerField: 'ownerId' },
]

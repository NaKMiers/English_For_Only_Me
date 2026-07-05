import 'server-only'

import { Types } from 'mongoose'

import { DictationAttemptModel } from '@/models/dictation/DictationAttemptModel'
import { DictationSegmentModel } from '@/models/dictation/DictationSegmentModel'
import { DictationTranslationModel } from '@/models/dictation/DictationTranslationModel'
import { toDictationAttemptRecord } from '@/modules/dictation/services/dictationAttemptRecords'
import { toDictationTranslationRecord } from '@/modules/dictation/services/dictationTranslationRecords'
import type { DictationTranslationApiRecord } from '@/modules/dictation/types'
import { hasCompletedSegmentEffort } from '@/modules/dictation/translations/translationGate'

import {
  DEFAULT_TRANSLATION_LANGUAGE,
  type SupportedTranslationLanguage,
} from './languages'
import { createTranslationSourceHash } from './sourceHash'
import { translateSegmentText } from './translationProvider'

export type TranslationServiceResult =
  | {
      mode: 'cache' | 'created'
      ok: true
      translation: DictationTranslationApiRecord
    }
  | {
      message: string
      ok: false
      status: 404 | 409
    }

export async function getOrCreateSegmentTranslation({
  ownerId,
  segmentId,
  targetLanguage = DEFAULT_TRANSLATION_LANGUAGE,
}: {
  ownerId: string
  segmentId: string
  targetLanguage?: SupportedTranslationLanguage
}): Promise<TranslationServiceResult> {
  const segment = await DictationSegmentModel.findOne({
    _id: segmentId,
    ownerId,
  }).lean()

  if (!segment)
    return {
      ok: false,
      status: 404,
      message: 'This dictation segment was not found.',
    }

  const attempts = await DictationAttemptModel.find({
    ownerId,
    segmentId,
  })
    .sort({ createdAt: 1 })
    .lean()
  const hasEffort = hasCompletedSegmentEffort(
    attempts.map(toDictationAttemptRecord)
  )

  if (!hasEffort)
    return {
      ok: false,
      status: 409,
      message: 'Complete, reveal, or skip this segment before translation.',
    }

  const sourceHash = createTranslationSourceHash({
    segmentText: segment.text,
    targetLanguage,
  })
  const cachedTranslation = await DictationTranslationModel.findOne({
    ownerId,
    segmentId,
    targetLanguage,
    sourceHash,
  }).lean()

  if (cachedTranslation)
    return {
      ok: true,
      mode: 'cache',
      translation: toDictationTranslationRecord(cachedTranslation),
    }

  const providerResult = await translateSegmentText({
    segmentText: segment.text,
    targetLanguage,
  })
  const translation = await DictationTranslationModel.create({
    ownerId,
    segmentId: new Types.ObjectId(segmentId),
    targetLanguage,
    sourceHash,
    text: providerResult.text,
    provider: providerResult.provider,
    status: providerResult.status,
    unavailableReason: providerResult.unavailableReason,
  })

  return {
    ok: true,
    mode: 'created',
    translation: toDictationTranslationRecord(translation.toObject()),
  }
}

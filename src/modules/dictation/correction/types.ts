import type {
  DictationAttemptAction,
  DictationCorrectionStatsRecord,
  DictationCorrectionTokenRecord,
} from '@/modules/dictation/types'

export interface NormalizedAnswer {
  normalizedText: string
  tokens: string[]
  originalTokens: string[]
}

export interface CorrectionOptions {
  acceptBritishAmericanVariants?: boolean
  acceptMeasurementVariants?: boolean
  acceptNumberVariants?: boolean
  expandContractions?: boolean
  ignorePunctuation?: boolean
}

export interface DictationCorrectionResult {
  action: DictationAttemptAction
  feedbackTokens: DictationCorrectionTokenRecord[]
  isPassed: boolean
  normalizedExpected: NormalizedAnswer
  normalizedTyped: NormalizedAnswer
  stats: DictationCorrectionStatsRecord
}

export const DEFAULT_CORRECTION_OPTIONS: Required<CorrectionOptions> = {
  acceptBritishAmericanVariants: true,
  acceptMeasurementVariants: true,
  acceptNumberVariants: true,
  expandContractions: true,
  ignorePunctuation: true,
}

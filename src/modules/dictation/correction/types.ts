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
  /**
   * Drop punctuation that carries no grammar while KEEPING intra-word
   * apostrophes.
   *
   * Deliberately a second option rather than a mode of `ignorePunctuation`,
   * because the two are not variations of one idea. `ignorePunctuation`
   * replaces every non-alphanumeric character with a space, which tokenises
   * "he's" as ["he", "s"] and destroys contractions outright - correct for
   * transcription, fatal for a grammar drill on the present perfect. This one
   * keeps the apostrophe when it sits inside a word and drops it everywhere
   * else, so "don't" survives and 'quoted' does not become a token.
   *
   * `ignorePunctuation` wins when both are set, so dictation's defaults are
   * unaffected by this existing.
   */
  ignoreStructuralPunctuation?: boolean
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
  // Off by default, and `ignorePunctuation: true` above short-circuits it
  // anyway, so every existing caller keeps its exact behaviour.
  ignoreStructuralPunctuation: false,
}

import type {
  VocabAudioUrlRecord,
  VocabDefinitionRecord,
  VocabExampleRecord,
  VocabLicenseRecord,
  VocabLocalizedMeaningRecord,
  VocabPhoneticRecord,
  VocabProviderName,
  VocabRelatedWordRecord,
  VocabSourceAttributionRecord,
} from '@/modules/vocabulary/types'

export type { VocabProviderName }

export interface NormalizedProviderPayload {
  audioUrls: VocabAudioUrlRecord[]
  definitions: VocabDefinitionRecord[]
  examples: VocabExampleRecord[]
  license: VocabLicenseRecord | null
  localizedMeanings: VocabLocalizedMeaningRecord[]
  lemma: string | null
  partOfSpeech: string | null
  phonetics: VocabPhoneticRecord[]
  rawData: unknown
  relatedWords: VocabRelatedWordRecord[]
  sourceAttributions: VocabSourceAttributionRecord[]
  synonyms: string[]
  antonyms: string[]
}

export type VocabProviderResult =
  | {
      payload: NormalizedProviderPayload
      provider: VocabProviderName
      status: 'ready'
    }
  | { provider: VocabProviderName; status: 'notFound' }
  | { provider: VocabProviderName; retryAfter?: Date; status: 'rateLimited' }
  | { provider: VocabProviderName; status: 'timeout' }
  | { message: string; provider: VocabProviderName; status: 'malformed' }
  | { provider: VocabProviderName; status: 'emptyUsefulData' }

export interface VocabProviderInput {
  fetcher?: typeof fetch
  language: string
  now?: Date
  term: string
  timeoutMs?: number
}

export type VocabProviderAdapter = (
  input: VocabProviderInput
) => Promise<VocabProviderResult>

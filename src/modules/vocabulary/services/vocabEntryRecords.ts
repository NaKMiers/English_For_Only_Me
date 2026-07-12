import type {
  VocabEntryApiRecord,
  VocabLicenseRecord,
} from '@/modules/vocabulary/types'

interface PhoneticInput {
  source: string
  text: string
  type?: string | null
}

interface AudioUrlInput {
  accent?: string | null
  license?: string | null
  source: string
  url: string
}

interface DefinitionInput {
  antonyms?: string[] | null
  definition: string
  example?: string | null
  partOfSpeech?: string | null
  source: string
  synonyms?: string[] | null
}

interface LocalizedMeaningInput {
  language: string
  license?: string | null
  meaning: string
  partOfSpeech?: string | null
  source: string
}

interface ExampleInput {
  source: string
  text: string
}

interface RelatedWordInput {
  relation: string
  source: string
  term: string
}

interface SourceAttributionInput {
  license?: string | null
  provider: string
  retrievedAt: Date
  url: string
}

interface ProviderErrorInput {
  at: Date
  message: string
  provider: string
  status: string
}

function toDateOrNull(value: Date | null | undefined) {
  return value ?? null
}

function toStringArray(values: string[] | null | undefined) {
  return values ?? []
}

function toPhonetics(
  phonetics: ReadonlyArray<PhoneticInput> | null | undefined
): VocabEntryApiRecord['phonetics'] {
  return (phonetics ?? []).map(item => ({
    source: item.source,
    text: item.text,
    type: item.type ?? null,
  }))
}

function toAudioUrls(
  audioUrls: ReadonlyArray<AudioUrlInput> | null | undefined
): VocabEntryApiRecord['audioUrls'] {
  return (audioUrls ?? []).map(item => ({
    accent: item.accent ?? null,
    license: item.license ?? null,
    source: item.source,
    url: item.url,
  }))
}

function toDefinitions(
  definitions: ReadonlyArray<DefinitionInput> | null | undefined
): VocabEntryApiRecord['definitions'] {
  return (definitions ?? []).map(item => ({
    antonyms: toStringArray(item.antonyms),
    definition: item.definition,
    example: item.example ?? null,
    partOfSpeech: item.partOfSpeech ?? null,
    source: item.source,
    synonyms: toStringArray(item.synonyms),
  }))
}

function toLocalizedMeanings(
  meanings: ReadonlyArray<LocalizedMeaningInput> | null | undefined
): VocabEntryApiRecord['localizedMeanings'] {
  return (meanings ?? []).map(item => ({
    language: item.language,
    license: item.license ?? null,
    meaning: item.meaning,
    partOfSpeech: item.partOfSpeech ?? null,
    source: item.source,
  }))
}

function toExamples(
  examples: ReadonlyArray<ExampleInput> | null | undefined
): VocabEntryApiRecord['examples'] {
  return (examples ?? []).map(item => ({
    source: item.source,
    text: item.text,
  }))
}

function toRelatedWords(
  words: ReadonlyArray<RelatedWordInput> | null | undefined
): VocabEntryApiRecord['relatedWords'] {
  return (words ?? []).map(item => ({
    relation: item.relation,
    source: item.source,
    term: item.term,
  }))
}

function toAttributions(
  attributions: ReadonlyArray<SourceAttributionInput> | null | undefined
): VocabEntryApiRecord['sourceAttributions'] {
  return (attributions ?? []).map(item => ({
    license: item.license ?? null,
    provider: item.provider,
    retrievedAt: item.retrievedAt,
    url: item.url,
  }))
}

function toLicense(
  license: VocabLicenseRecord | null | undefined
): VocabLicenseRecord | null {
  if (!license) return null

  return {
    attributionRequired: license.attributionRequired,
    name: license.name,
    url: license.url,
  }
}

function toProviderErrors(
  errors: ReadonlyArray<ProviderErrorInput> | null | undefined
): VocabEntryApiRecord['providerErrors'] {
  return (errors ?? []).map(error => ({
    at: error.at,
    message: error.message,
    provider: error.provider,
    status: error.status,
  }))
}

export function toVocabEntryRecord(entry: {
  _id: unknown
  audioUrls?: ReadonlyArray<AudioUrlInput> | null
  definitions?: ReadonlyArray<DefinitionInput> | null
  difficultyLevel?: string | null
  enrichmentAttempts?: number | null
  enrichmentStatus: VocabEntryApiRecord['enrichmentStatus']
  entryType?: VocabEntryApiRecord['entryType'] | null
  examples?: ReadonlyArray<ExampleInput> | null
  frequencyRank?: number | null
  language?: string | null
  lastEnrichedAt?: Date | null
  lemma?: string | null
  license?: VocabLicenseRecord | null
  localizedMeanings?: ReadonlyArray<LocalizedMeaningInput> | null
  normalizedTerm: string
  partOfSpeech?: string | null
  phonetics?: ReadonlyArray<PhoneticInput> | null
  providerErrors?: ReadonlyArray<ProviderErrorInput> | null
  relatedWords?: ReadonlyArray<RelatedWordInput> | null
  sourceAttributions?: ReadonlyArray<SourceAttributionInput> | null
  synonyms?: string[] | null
  antonyms?: string[] | null
  term: string
  createdAt: Date
  updatedAt: Date
}): VocabEntryApiRecord {
  return {
    id: String(entry._id),
    audioUrls: toAudioUrls(entry.audioUrls),
    definitions: toDefinitions(entry.definitions),
    difficultyLevel: entry.difficultyLevel ?? null,
    enrichmentAttempts: entry.enrichmentAttempts ?? 0,
    enrichmentStatus: entry.enrichmentStatus,
    entryType: entry.entryType ?? 'word',
    examples: toExamples(entry.examples),
    frequencyRank: entry.frequencyRank ?? null,
    language: entry.language ?? 'en',
    lastEnrichedAt: toDateOrNull(entry.lastEnrichedAt),
    lemma: entry.lemma ?? null,
    license: toLicense(entry.license),
    localizedMeanings: toLocalizedMeanings(entry.localizedMeanings),
    normalizedTerm: entry.normalizedTerm,
    partOfSpeech: entry.partOfSpeech ?? null,
    phonetics: toPhonetics(entry.phonetics),
    providerErrors: toProviderErrors(entry.providerErrors),
    relatedWords: toRelatedWords(entry.relatedWords),
    sourceAttributions: toAttributions(entry.sourceAttributions),
    synonyms: toStringArray(entry.synonyms),
    antonyms: toStringArray(entry.antonyms),
    term: entry.term,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
  }
}

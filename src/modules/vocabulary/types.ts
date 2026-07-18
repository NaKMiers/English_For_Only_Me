export type VocabEntryType = 'word' | 'phrase'

export type VocabEntryEnrichmentStatus =
  'seeded' | 'pending' | 'enriching' | 'ready' | 'failed' | 'notFound'

export type VocabUserItemStatus =
  'learning' | 'alreadyKnow' | 'mastered' | 'ignored'

export type VocabWordListView =
  'learning' | 'dueToday' | 'alreadyKnow' | 'mastered' | 'knownTotal'

export type VocabLearningSource = 'search' | 'explore' | 'dictionary' | 'manual'

export type VocabKnownReason = 'manual' | 'recallMastery'

export type VocabOccurrenceReason =
  | 'manualSearch'
  | 'dictionaryLookup'
  | 'explore'
  | 'clickedInAnswer'
  | 'missedWord'
  | 'aiDebrief'

export type VocabProviderName =
  'dictionaryapi.dev' | 'freedictionaryapi.com' | 'datamuse'

export type VocabRecallStage = 1 | 2 | 3 | 4 | 5 | 6 | 7

export type VocabRecallTaskType =
  | 'listenChooseWord'
  | 'listenChooseDefinition'
  | 'exampleRemember'
  | 'definitionChooseWord'
  | 'wordChooseDefinition'

export type VocabRecallAnswerAction = 'lookup' | 'notSure' | 'remember'

export interface VocabPhoneticRecord {
  source: string
  text: string
  type: string | null
}

export interface VocabAudioUrlRecord {
  accent: string | null
  license: string | null
  source: string
  url: string
}

export interface VocabDefinitionRecord {
  antonyms: string[]
  definition: string
  example: string | null
  partOfSpeech: string | null
  source: string
  synonyms: string[]
}

export interface VocabLocalizedMeaningRecord {
  language: string
  license: string | null
  meaning: string
  partOfSpeech: string | null
  source: string
}

export interface VocabExampleRecord {
  source: string
  text: string
}

export interface VocabRelatedWordRecord {
  relation: string
  source: string
  term: string
}

export interface VocabSourceAttributionRecord {
  license: string | null
  provider: string
  retrievedAt: Date
  url: string
}

export interface VocabLicenseRecord {
  attributionRequired: boolean
  name: string
  url: string
}

export interface VocabProviderErrorRecord {
  at: Date
  message: string
  provider: VocabProviderName | string
  status: string
}

export interface VocabEntryApiRecord {
  id: string
  audioUrls: VocabAudioUrlRecord[]
  definitions: VocabDefinitionRecord[]
  difficultyLevel: string | null
  enrichmentAttempts: number
  enrichmentStatus: VocabEntryEnrichmentStatus
  entryType: VocabEntryType
  examples: VocabExampleRecord[]
  frequencyRank: number | null
  language: string
  lastEnrichedAt: Date | null
  lemma: string | null
  license: VocabLicenseRecord | null
  localizedMeanings: VocabLocalizedMeaningRecord[]
  normalizedTerm: string
  partOfSpeech: string | null
  phonetics: VocabPhoneticRecord[]
  providerErrors: VocabProviderErrorRecord[]
  relatedWords: VocabRelatedWordRecord[]
  sourceAttributions: VocabSourceAttributionRecord[]
  synonyms: string[]
  antonyms: string[]
  term: string
  createdAt: Date
  updatedAt: Date
}

export interface UserVocabItemApiRecord {
  id: string
  userId: string
  vocabEntryId: string
  status: VocabUserItemStatus
  source: VocabLearningSource
  recallStage: VocabRecallStage
  dueAt: Date | null
  reviewCount: number
  correctCount: number
  wrongCount: number
  lastReviewedAt: Date | null
  knownAt: Date | null
  knownReason: VocabKnownReason | null
  masteredAt: Date | null
  masteredReason: VocabKnownReason | null
  firstSeenAt: Date
  notes: string | null
  createdAt: Date
  updatedAt: Date
}

export interface VocabOccurrenceApiRecord {
  id: string
  userId: string
  vocabEntryId: string
  reason: VocabOccurrenceReason
  attemptId: string | null
  contextSentence: string | null
  segmentId: string | null
  selectedText: string | null
  videoId: string | null
  createdAt: Date
  updatedAt: Date
}

export interface VocabEntryWithUserStateRecord {
  entry: VocabEntryApiRecord
  userItem: UserVocabItemApiRecord | null
}

export interface VocabRecallCardRecord {
  entry: VocabEntryApiRecord
  item: UserVocabItemApiRecord
}

export interface VocabRecallOptionRecord {
  definition: string | null
  id: string
  term: string | null
}

export interface VocabRecallTaskRecord {
  entry: VocabEntryApiRecord
  exampleSentence: string | null
  item: UserVocabItemApiRecord
  options: VocabRecallOptionRecord[]
  taskId: string
  token: string
  type: VocabRecallTaskType
}

export interface VocabWordSourceVideoRecord {
  id: string
  title: string
  youtubeUrl: string
}

export interface VocabWordListRecord {
  entry: VocabEntryApiRecord
  item: UserVocabItemApiRecord
  // The dictation video this word was saved from, resolved from the most recent
  // occurrence that carries a videoId. Null for words with no video source
  // (e.g. added from Explore/Dictionary).
  sourceVideo: VocabWordSourceVideoRecord | null
}

export interface VocabDailyGrowthRecord {
  count: number
  label: string
}

export interface VocabHardWordRecord {
  accuracyPercent: number
  reviewCount: number
  term: string
  vocabEntryId: string
  wrongCount: number
}

export interface VocabStatsRecord {
  alreadyKnowCount: number
  accuracyPercent: number
  activeStreakDays: number
  dailyGrowth: VocabDailyGrowthRecord[]
  dueTodayCount: number
  hardestWords: VocabHardWordRecord[]
  learnedTodayCount: number
  learningCount: number
  masteredCount: number
  overdueCount: number
  reviewsTodayCount: number
  totalKnownCount: number
  totalStartedCount: number
}

export interface VocabAdminQueueSummaryRecord {
  failedCount: number
  notFoundCount: number
  readyCount: number
  seededCount: number
  staleLeaseCount: number
}

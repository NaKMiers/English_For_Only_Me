import type {
  VocabEntryEnrichmentStatus,
  VocabEntryType,
  VocabKnownReason,
  VocabLearningSource,
  VocabOccurrenceReason,
  VocabProviderName,
  VocabRecallTaskType,
  VocabUserItemStatus,
} from './types'

export const VOCAB_DEFAULT_LANGUAGE = 'en'
export const VOCAB_DEFAULT_LOCALIZED_LANGUAGE = 'vi'
export const VOCAB_MAX_TERM_LENGTH = 80
export const VOCAB_LOOKUP_TIMEOUT_MS = 8000
export const VOCAB_ENRICHMENT_LEASE_MS = 60_000
export const VOCAB_ADMIN_ENRICH_DEFAULT_LIMIT = 5
export const VOCAB_ADMIN_ENRICH_MAX_LIMIT = 10
export const VOCAB_EXPLORE_DEFAULT_LIMIT = 20
export const VOCAB_EXPLORE_MAX_LIMIT = 50
export const VOCAB_RECALL_DEFAULT_LIMIT = 20
export const VOCAB_RECALL_MAX_LIMIT = 1000
export const VOCAB_SEARCH_DEFAULT_LIMIT = 12
export const VOCAB_SEARCH_MAX_LIMIT = 25
export const VOCAB_STATS_TREND_DAYS = 14

export const VOCAB_ENTRY_TYPES: VocabEntryType[] = ['word', 'phrase']

export const VOCAB_ENTRY_ENRICHMENT_STATUSES: VocabEntryEnrichmentStatus[] = [
  'seeded',
  'pending',
  'enriching',
  'ready',
  'failed',
  'notFound',
]

export const ENRICHABLE_ENTRY_STATUSES = [
  'seeded',
  'pending',
  'failed',
] as const satisfies readonly VocabEntryEnrichmentStatus[]

export const VOCAB_USER_ITEM_STATUSES: VocabUserItemStatus[] = [
  'learning',
  'alreadyKnow',
  'mastered',
  'ignored',
]

export const VOCAB_LEARNING_SOURCES: VocabLearningSource[] = [
  'search',
  'explore',
  'dictionary',
  'manual',
]

export const VOCAB_KNOWN_REASONS: VocabKnownReason[] = [
  'manual',
  'recallMastery',
]

export const VOCAB_OCCURRENCE_REASONS: VocabOccurrenceReason[] = [
  'manualSearch',
  'dictionaryLookup',
  'explore',
  'clickedInAnswer',
  'missedWord',
  'aiDebrief',
]

export const VOCAB_PROVIDER_NAMES: VocabProviderName[] = [
  'dictionaryapi.dev',
  'freedictionaryapi.com',
  'datamuse',
]

export const VOCAB_CORE_PROVIDER_NAMES: VocabProviderName[] = [
  'dictionaryapi.dev',
  'freedictionaryapi.com',
]

export const VOCAB_RECALL_STAGES = [1, 2, 3, 4, 5, 6, 7] as const

export const VOCAB_RECALL_TASK_TYPES: VocabRecallTaskType[] = [
  'listenChooseWord',
  'listenChooseDefinition',
  'exampleRemember',
  'definitionChooseWord',
  'wordChooseDefinition',
]

export const VOCAB_RECALL_LISTENING_TASK_TYPES: VocabRecallTaskType[] = [
  'listenChooseWord',
  'listenChooseDefinition',
]

export const VOCAB_RECALL_TASK_TOKEN_TTL_MS = 30 * 60_000

export const VOCAB_RECALL_STAGE_INTERVAL_DAYS: Record<
  1 | 2 | 3 | 4 | 5 | 6,
  number
> = {
  1: 1,
  2: 1,
  3: 4,
  4: 7,
  5: 14,
  6: 17,
}

export const VOCAB_ENTRY_LICENSE = {
  attributionRequired: true,
  name: 'Creative Commons Attribution-ShareAlike 4.0 International',
  url: 'https://creativecommons.org/licenses/by-sa/4.0/',
}

export const NGSL_SEED_SOURCE = {
  license: VOCAB_ENTRY_LICENSE,
  name: 'New General Service List 1.2',
  provider: 'NGSL',
  url: 'https://www.newgeneralservicelist.com/new-general-service-list',
}

/**
 * The NGSL family of frequency word lists (same authors, same CC BY-SA 4.0
 * license). Seeded in this priority order after NGSL to expand the catalog with
 * academic, TOEIC, and business vocabulary. `rankOffset` keeps each list's words
 * sorted after core NGSL (1..~2810) while preserving each list's internal order;
 * `difficultyLevel` tags the register for learners.
 */
export const VOCAB_FAMILY_SEED_SOURCES = [
  {
    csvUrl: 'https://www.newgeneralservicelist.com/s/NGSL_12_stats.csv',
    difficultyLevel: 'core',
    license: VOCAB_ENTRY_LICENSE,
    name: 'New General Service List 1.2',
    provider: 'NGSL',
    rankOffset: 0,
    url: 'https://www.newgeneralservicelist.com/new-general-service-list',
  },
  {
    csvUrl: 'https://www.newgeneralservicelist.com/s/NAWL_10_stats.csv',
    difficultyLevel: 'academic',
    license: VOCAB_ENTRY_LICENSE,
    name: 'New Academic Word List 1.0',
    provider: 'NAWL',
    rankOffset: 10_000,
    url: 'https://www.newgeneralservicelist.com/new-academic-word-list',
  },
  {
    csvUrl: 'https://www.newgeneralservicelist.com/s/TSL_12_stats.csv',
    difficultyLevel: 'toeic',
    license: VOCAB_ENTRY_LICENSE,
    name: 'TOEIC Service List 1.2',
    provider: 'TSL',
    rankOffset: 20_000,
    url: 'https://www.newgeneralservicelist.com/toeic-service-list',
  },
  {
    csvUrl: 'https://www.newgeneralservicelist.com/s/BSL_120_stats.csv',
    difficultyLevel: 'business',
    license: VOCAB_ENTRY_LICENSE,
    name: 'Business Service List 1.2',
    provider: 'BSL',
    rankOffset: 30_000,
    url: 'https://www.newgeneralservicelist.com/business-service-list',
  },
] as const

export const VOCAB_API_PATHS = {
  adminEnrich: '/api/admin/vocab/enrich',
  dueRecall: '/api/vocab/recall/due',
  explore: '/api/vocab/explore',
  items: '/api/vocab/items',
  lookup: '/api/vocab/entries/lookup',
  recallAnswer: '/api/vocab/recall/answer',
  search: '/api/vocab/search',
  stats: '/api/vocab/stats',
} as const

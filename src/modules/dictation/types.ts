import type { DictationLevel } from './levels'

export type DictationVideoStatus =
  | 'draft'
  | 'needsTranscript'
  | 'transcriptReady'
  | 'segmenting'
  | 'ready'
  | 'inProgress'
  | 'completed'
  | 'failed'
  | 'archived'

export type DictationTranscriptStatus = 'none' | 'manualNeeded' | 'manualAdded'

export type DictationImportStatus =
  | 'draft'
  | 'metadataReady'
  | 'metadataWarning'
  | 'metadataReadyEmbedBlocked'
  | 'metadataFailed'

export type DictationTranscriptSourceType =
  'manualText' | 'manualTimedText' | 'captionFile' | 'youtubeOwnedCaption'

export type DictationTranscriptQualityStatus = 'blocked' | 'warning' | 'ready'

export type DictationTranscriptQualityFlag =
  | 'empty'
  | 'untimed'
  | 'timed'
  | 'longSource'
  | 'shortSource'
  | 'captionFile'
  | 'manualText'
  | 'htmlStripped'

export type DictationSegmentQualityFlag =
  | 'tooLong'
  | 'tooShort'
  | 'untimed'
  | 'partialTiming'
  | 'missingPunctuation'
  | 'likelyNonEnglish'
  | 'overlappingTiming'
  | 'largeGap'
  | 'duplicateText'

export type DictationSegmentAttemptStatus =
  'notStarted' | 'attemptedIncorrect' | 'correct' | 'revealed' | 'skipped'

export type DictationSessionStatus = 'active' | 'completed' | 'abandoned'

export type DictationAttemptAction = 'check' | 'reveal' | 'skip'

export type DictationCorrectionTokenStatus =
  'correct' | 'extra' | 'missing' | 'spellingVariant' | 'wrong'

export type DictationReviewItemKind = 'pattern' | 'segment' | 'word'

export type DictationReviewItemReason =
  'highRetry' | 'lowAccuracy' | 'repeatedMistake' | 'revealed' | 'skipped'

export type DictationReviewItemStatus =
  'completed' | 'dismissed' | 'due' | 'scheduled'

export type DictationDebriefStatus = 'failed' | 'pending' | 'ready'

export interface DictationDebriefVocabularyRecord {
  example: string
  meaning: string
  term: string
}

export interface DictationCueRecord {
  index: number
  text: string
  startMs: number | null
  endMs: number | null
}

export interface DictationVideoApiRecord {
  id: string
  sourceType: 'youtube'
  title: string
  youtubeUrl: string
  youtubeVideoId: string | null
  sourceUrl: string | null
  channelTitle: string | null
  thumbnailUrl: string | null
  durationSeconds: number | null
  defaultLanguage: string
  purpose: 'ielts-listening' | 'general-listening' | 'shadowing'
  status: DictationVideoStatus
  transcriptStatus: DictationTranscriptStatus
  importStatus: DictationImportStatus
  importWarning: string | null
  activeTranscriptId: string | null
  sentenceCount: number
  completedSessionCount: number
  tags: string[]
  collections: string[]
  topicId: string | null
  sectionId: string | null
  level: DictationLevel | null
  order: number
  lastPracticedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface DictationTopicApiRecord {
  id: string
  slug: string
  title: string
  description: string | null
  thumbnailUrl: string | null
  hasVideoMedia: boolean
  order: number
  createdAt: Date
  updatedAt: Date
}

/** Topic plus the counts derived by aggregation for the browse grid. */
export interface DictationTopicSummaryRecord extends DictationTopicApiRecord {
  levelRange: string | null
  sectionCount: number
  lessonCount: number
}

export interface DictationSectionApiRecord {
  id: string
  topicId: string
  title: string
  order: number
  createdAt: Date
  updatedAt: Date
}

export interface DictationFavoriteApiRecord {
  id: string
  userId: string
  videoId: string
  createdAt: Date
}

export interface DictationTranscriptApiRecord {
  id: string
  videoId: string
  sourceType: DictationTranscriptSourceType
  language: string
  isActive: boolean
  rawText: string
  rawCues: DictationCueRecord[]
  sourceHash: string
  qualityStatus: DictationTranscriptQualityStatus
  qualityFlags: DictationTranscriptQualityFlag[]
  cueCount: number
  segmentCount: number
  createdBy: 'manual' | 'import' | 'system'
  createdAt: Date
  updatedAt: Date
}

export interface DictationSegmentApiRecord {
  id: string
  videoId: string
  transcriptId: string
  transcriptSourceHash: string
  order: number
  text: string
  normalizedText: string
  startMs: number | null
  endMs: number | null
  cueIndexes: number[]
  qualityFlags: DictationSegmentQualityFlag[]
  warningAccepted: boolean
  attemptStatus: DictationSegmentAttemptStatus
  attemptCount: number
  lastAttemptAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface DictationSessionApiRecord {
  id: string
  userId: string
  videoId: string
  transcriptId: string
  status: DictationSessionStatus
  currentSegmentId: string | null
  currentSegmentOrder: number
  playbackSpeed: number
  showShortcuts: boolean
  isVideoHidden: boolean
  startedAt: Date
  lastActiveAt: Date
  completedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface DictationCorrectionTokenRecord {
  actual: string | null
  actualOriginal: string | null
  expected: string | null
  expectedOriginal: string | null
  status: DictationCorrectionTokenStatus
}

export interface DictationCorrectionStatsRecord {
  accuracy: number
  correctCount: number
  extraCount: number
  missingCount: number
  spellingVariantCount: number
  totalExpected: number
  wrongCount: number
}

export interface DictationAttemptApiRecord {
  id: string
  userId: string
  videoId: string
  transcriptId: string
  sessionId: string
  segmentId: string
  action: DictationAttemptAction
  idempotencyKey: string
  typedAnswer: string
  expectedTextSnapshot: string
  replayCountDelta: number
  timeSpentMs: number
  isPassed: boolean
  feedbackTokens: DictationCorrectionTokenRecord[]
  stats: DictationCorrectionStatsRecord
  createdAt: Date
  updatedAt: Date
}

export interface DictationHardestSegmentRecord {
  accuracy: number
  attemptCount: number
  label: string
  segmentId: string
}

export interface DictationMissedWordRecord {
  count: number
  word: string
}

export interface DictationMistakeTaxonomyRecord {
  extra: number
  missing: number
  spellingVariant: number
  wrong: number
}

export interface DictationVideoStatsRecord {
  commonMissedWords: DictationMissedWordRecord[]
  completedSegmentCount: number
  completionPercentage: number
  firstTryWordAccuracy: number
  hardestSegments: DictationHardestSegmentRecord[]
  mistakeTaxonomy: DictationMistakeTaxonomyRecord
  overallWordAccuracy: number
  revealCount: number
  retryCount: number
  replayCount: number
  segmentCount: number
  skipCount: number
  timeSpentMs: number
}

export interface DictationAccuracyTrendPointRecord {
  accuracy: number
  label: string
}

export interface DictationMistakeTypeRecord {
  count: number
  label: string
  type: keyof DictationMistakeTaxonomyRecord
}

export interface DictationGlobalStatsRecord {
  activeStreakDays: number
  completedSegmentCount: number
  completedVideoCount: number
  dueReviewItemCount: number
  firstTryAccuracyTrend: DictationAccuracyTrendPointRecord[]
  monthlyPracticeTimeMs: number
  repeatedMistakeTypes: DictationMistakeTypeRecord[]
  totalVideoCount: number
  weakWords: DictationMissedWordRecord[]
  weeklyPracticeTimeMs: number
}

export interface DictationReviewStatsSnapshotRecord {
  accuracy: number
  attemptCount: number
  lastAction: DictationAttemptAction
  mistakeTaxonomy: DictationMistakeTaxonomyRecord
}

export interface DictationReviewItemApiRecord {
  id: string
  userId: string
  videoId: string
  segmentId: string
  kind: DictationReviewItemKind
  reason: DictationReviewItemReason
  label: string
  status: DictationReviewItemStatus
  priority: number
  dueAt: Date
  lastReviewedAt: Date | null
  statsSnapshot: DictationReviewStatsSnapshotRecord
  createdAt: Date
  updatedAt: Date
}

export interface DictationDebriefApiRecord {
  id: string
  userId: string
  videoId: string
  sessionId: string
  status: DictationDebriefStatus
  model: string
  promptVersion: string
  inputSnapshotHash: string
  contentSummary: string
  keyVocabulary: DictationDebriefVocabularyRecord[]
  listeningTraps: string[]
  weakPatterns: string[]
  nextActions: string[]
  confidence: number
  caveats: string[]
  failureReason: string | null
  createdAt: Date
  updatedAt: Date
}

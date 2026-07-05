export type DictationSceneKey = 'library' | 'practice' | 'stats' | 'review'

export interface DictationScene {
  key: DictationSceneKey
  label: string
  pageTag: string
  summary: string
}

export interface DictationVideo {
  id: string
  title: string
  meta: string
  status: string
}

export interface QualityGateItem {
  id: string
  title: string
  meta: string
  status: string
}

export interface CorrectionToken {
  id: string
  label: string
  state: 'correct' | 'missing' | 'extra'
}

export interface SentenceQueueItem {
  id: string
  number: string
  title: string
  status: string
}

export interface DictationMetric {
  id: string
  label: string
  value: string
  detail: string
  trend?: string
}

export interface WeakSpot {
  id: string
  label: string
  value: string
}

export const DICTATION_SCENES: DictationScene[] = [
  {
    key: 'library',
    label: 'Library',
    pageTag: 'Page 01',
    summary: 'Import a video and guard transcript quality before practice.',
  },
  {
    key: 'practice',
    label: 'Practice',
    pageTag: 'Page 02',
    summary: 'Listen, type, check, retry, and keep sentence stats visible.',
  },
  {
    key: 'stats',
    label: 'Stats',
    pageTag: 'Page 03',
    summary: 'Turn one video into a debrief and a review stack.',
  },
  {
    key: 'review',
    label: 'Review',
    pageTag: 'Page 04',
    summary: 'Bring weak sentences back as short drills.',
  },
]

export const DICTATION_RECENT_VIDEOS: DictationVideo[] = [
  {
    id: 'city-transport',
    title: 'IELTS Part 3: City Transport',
    meta: '18 sentences - 72% first try - ready',
    status: 'ready',
  },
  {
    id: 'study-habits',
    title: 'BBC Interview: Study Habits',
    meta: 'Needs transcript - saved today',
    status: 'needs transcript',
  },
  {
    id: 'memory-palace',
    title: 'TED-Ed: Memory Palace',
    meta: '31 sentences - review due',
    status: 'review due',
  },
]

export const DICTATION_QUALITY_GATE: QualityGateItem[] = [
  {
    id: 'metadata',
    title: 'Video metadata saved',
    meta: 'official API later',
    status: '1',
  },
  {
    id: 'transcript',
    title: 'English transcript added',
    meta: 'manual source now',
    status: '2',
  },
  {
    id: 'segments',
    title: 'Sentence segments built',
    meta: 'editable future',
    status: '3',
  },
  {
    id: 'timestamps',
    title: 'Timestamps checked',
    meta: 'optional',
    status: '4',
  },
]

export const DICTATION_CORRECTION_TOKENS: CorrectionToken[] = [
  { id: 'people', label: 'people', state: 'correct' },
  { id: 'often', label: 'often', state: 'correct' },
  { id: 'miss', label: 'miss', state: 'missing' },
  { id: 'the', label: 'the', state: 'correct' },
  { id: 'a', label: 'a', state: 'extra' },
  { id: 'final', label: 'final', state: 'correct' },
  { id: 'sound', label: 'sound', state: 'missing' },
]

export const DICTATION_SENTENCE_QUEUE: SentenceQueueItem[] = [
  {
    id: 's7',
    number: '7',
    title: 'Linked words quickly',
    status: 'retry 2',
  },
  {
    id: 's8',
    number: '8',
    title: 'Transport choices',
    status: 'locked',
  },
  {
    id: 's9',
    number: '9',
    title: 'Unexpected delay',
    status: 'locked',
  },
  {
    id: 's10',
    number: '10',
    title: 'Speaker contrast',
    status: 'locked',
  },
]

export const DICTATION_LIVE_STATS: WeakSpot[] = [
  { id: 'first-try', label: 'First try accuracy', value: '76%' },
  { id: 'replay', label: 'Replay count', value: '14' },
  { id: 'pattern', label: 'Weak pattern', value: 'final sounds' },
]

export const DICTATION_VIDEO_METRICS: DictationMetric[] = [
  {
    id: 'word-accuracy',
    label: 'Word accuracy',
    value: '82%',
    detail: 'Current video',
    trend: '+4% from last attempt',
  },
  {
    id: 'first-try',
    label: 'First try',
    value: '68%',
    detail: 'Sentences correct before reveal',
  },
  {
    id: 'weak-words',
    label: 'Weak words',
    value: '19',
    detail: 'Saved for later drills',
  },
  {
    id: 'review-due',
    label: 'Review due',
    value: '7',
    detail: 'Short drills waiting today',
  },
]

export const DICTATION_WEAK_SPOTS: WeakSpot[] = [
  { id: 'next', label: 'Practice next', value: 'sentence 7' },
  { id: 'type', label: 'Review type', value: 'missing words' },
  { id: 'focus', label: 'IELTS focus', value: 'detail accuracy' },
]

export const DICTATION_REVIEW_STACK: SentenceQueueItem[] = [
  { id: 'final-sound', number: '1', title: 'final sound', status: '4 misses' },
  { id: 'linking', number: '2', title: 'linking words', status: '3 misses' },
  { id: 'numbers', number: '3', title: 'numbers', status: '2 misses' },
  {
    id: 'contrast',
    number: '4',
    title: 'contrast marker',
    status: '2 misses',
  },
]

export const DICTATION_REVIEW_RULES: SentenceQueueItem[] = [
  { id: 'replay', number: '1', title: 'Replay once', status: 'listen' },
  { id: 'memory', number: '2', title: 'Type from memory', status: 'attempt' },
  { id: 'strict', number: '3', title: 'Check strictly', status: 'words' },
  { id: 'schedule', number: '4', title: 'Reschedule', status: 'review' },
]

export const DICTATION_DEFAULT_IMPORT = {
  transcript:
    'Human English captions first. Manual transcript when captions are missing or unreliable.',
  youtubeUrl: 'https://youtube.com/watch?v=ielts-listening-sample',
}

export const DICTATION_PRACTICE = {
  currentAnswer: 'People often miss a final...',
  currentSentence:
    'People often miss the final sound when the speaker links words quickly.',
  translation:
    'Translation unlocks after I make a serious attempt, so it supports learning without spoiling listening.',
}

export const DICTATION_REVIEW = {
  answer: 'The train was delay...',
  sentence:
    'The train was delayed because the previous service had not cleared the platform.',
  weakReason: [
    { id: 'pattern', label: 'Pattern', value: 'past participle' },
    { id: 'missed', label: 'Missed before', value: '3 times' },
    { id: 'last-seen', label: 'Last seen', value: '2 days ago' },
  ],
}

export const DICTATION_PROGRESS_POINTS = [42, 54, 48, 68, 62, 82, 76]

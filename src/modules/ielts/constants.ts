export const IELTS_SKILLS = ['listening', 'reading', 'writing'] as const
export type IeltsSkill = (typeof IELTS_SKILLS)[number]

export const IELTS_TRACKS = ['academic', 'general'] as const
export type IeltsTrack = (typeof IELTS_TRACKS)[number]

export const IELTS_TEST_STATUSES = ['draft', 'published', 'archived'] as const
export type IeltsTestStatus = (typeof IELTS_TEST_STATUSES)[number]

export const IELTS_TEST_SOURCES = ['ai', 'assisted', 'manual'] as const
export type IeltsTestSource = (typeof IELTS_TEST_SOURCES)[number]

export const IELTS_GEN_STATUSES = [
  'pending',
  'generating',
  'needsRepair',
  'ready',
  'failed',
  'manual',
] as const
export type IeltsGenStatus = (typeof IELTS_GEN_STATUSES)[number]

/**
 * Closed list: weakness stats group by it, the AI schemas enumerate it and
 * the runner picks a widget from it. Adding a type means a widget mapping in
 * `IELTS_QUESTION_WIDGETS` and, for generation, a prompt line.
 */
export const IELTS_QUESTION_TYPES = [
  'table-completion',
  'note-completion',
  'summary-completion',
  'sentence-completion',
  'flow-chart-completion',
  'form-completion',
  'short-answer',
  'multiple-choice',
  'multiple-choice-multi',
  'true-false-not-given',
  'yes-no-not-given',
  'matching-information',
  'matching-features',
  'matching-headings',
  'matching-sentence-endings',
  'plan-map-labelling',
] as const
export type IeltsQuestionType = (typeof IELTS_QUESTION_TYPES)[number]

export type IeltsQuestionWidget = 'slot' | 'radio' | 'checkbox' | 'dropdown'

export const IELTS_QUESTION_WIDGETS: Record<
  IeltsQuestionType,
  IeltsQuestionWidget
> = {
  'table-completion': 'slot',
  'note-completion': 'slot',
  'summary-completion': 'slot',
  'sentence-completion': 'slot',
  'flow-chart-completion': 'slot',
  'form-completion': 'slot',
  'short-answer': 'slot',
  'multiple-choice': 'radio',
  'multiple-choice-multi': 'checkbox',
  'true-false-not-given': 'radio',
  'yes-no-not-given': 'radio',
  'matching-information': 'dropdown',
  'matching-features': 'dropdown',
  'matching-headings': 'dropdown',
  'matching-sentence-endings': 'dropdown',
  'plan-map-labelling': 'dropdown',
}

export const IELTS_QUESTION_TYPE_LABELS: Record<IeltsQuestionType, string> = {
  'table-completion': 'Table completion',
  'note-completion': 'Note completion',
  'summary-completion': 'Summary completion',
  'sentence-completion': 'Sentence completion',
  'flow-chart-completion': 'Flow-chart completion',
  'form-completion': 'Form completion',
  'short-answer': 'Short answer',
  'multiple-choice': 'Multiple choice',
  'multiple-choice-multi': 'Multiple choice (more than one)',
  'true-false-not-given': 'TRUE / FALSE / NOT GIVEN',
  'yes-no-not-given': 'YES / NO / NOT GIVEN',
  'matching-information': 'Matching information',
  'matching-features': 'Matching features',
  'matching-headings': 'Matching headings',
  'matching-sentence-endings': 'Matching sentence endings',
  'plan-map-labelling': 'Plan / map labelling',
}

export const TFNG_OPTIONS = ['TRUE', 'FALSE', 'NOT GIVEN'] as const
export const YNNG_OPTIONS = ['YES', 'NO', 'NOT GIVEN'] as const
export const NOT_GIVEN = 'NOT GIVEN'

export const IELTS_SKILL_LABELS: Record<IeltsSkill, string> = {
  listening: 'Listening',
  reading: 'Reading',
  writing: 'Writing',
}

/** Section keys are stable ids: `<skill>-<order>`. */
export const IELTS_SECTION_KEYS = [
  'listening-1',
  'listening-2',
  'listening-3',
  'listening-4',
  'reading-1',
  'reading-2',
  'reading-3',
  'writing-1',
  'writing-2',
] as const
export type IeltsSectionKey = (typeof IELTS_SECTION_KEYS)[number]

export const IELTS_PART_COUNTS: Record<IeltsSkill, number> = {
  listening: 4,
  reading: 3,
  writing: 2,
}

export const IELTS_OBJECTIVE_TOTAL = 40

export const IELTS_ATTEMPT_MODES = ['practice', 'mock', 'drill'] as const
export type IeltsAttemptMode = (typeof IELTS_ATTEMPT_MODES)[number]

export const IELTS_ATTEMPT_STATUSES = [
  'in_progress',
  'submitted',
  'scored',
  'expired',
] as const
export type IeltsAttemptStatus = (typeof IELTS_ATTEMPT_STATUSES)[number]

/** Mock timing, in seconds. */
export const IELTS_TIMERS = {
  readingSkill: 60 * 60,
  readingPart: 20 * 60,
  writingSkill: 60 * 60,
  writingTask1: 20 * 60,
  writingTask2: 40 * 60,
  listeningTransfer: 120,
  listeningPartPreview: 30,
  listeningPartTransfer: 30,
  /** Late saves and submits are accepted for this long after the deadline. */
  graceSeconds: 60,
} as const

export const IELTS_MAX_AUDIO_INTERRUPTIONS = 2
export const IELTS_MAX_AUDIO_EVENTS = 10

/** A `generating` section older than this reads as failed (route max 300 s). */
export const IELTS_GENERATING_STALE_SECONDS = 320

export const IELTS_WEAKNESS_MIN_QUESTIONS = 5
export const IELTS_DRILL_MAX_GROUPS = 4
export const IELTS_GENERATION_LOG_LIMIT = 50

export const IELTS_WRITING_MIN_WORDS = { 1: 150, 2: 250 } as const

/** Target bands an author can pick for a test (schema allows 4-9). */
export const IELTS_TARGET_BANDS = [
  4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9,
] as const

export const IELTS_ANSWER_MAX_LENGTH = 300
export const IELTS_ESSAY_MAX_LENGTH = 20_000

/**
 * OpenAI TTS voices with a rough gender hint, so a generated listening script
 * can give each speaker a distinct, fitting voice.
 */
export const LISTENING_VOICES = [
  { id: 'alloy', hint: 'neutral' },
  { id: 'ash', hint: 'male' },
  { id: 'coral', hint: 'female' },
  { id: 'echo', hint: 'male' },
  { id: 'fable', hint: 'male' },
  { id: 'nova', hint: 'female' },
  { id: 'onyx', hint: 'male' },
  { id: 'sage', hint: 'female' },
  { id: 'shimmer', hint: 'female' },
] as const
export type ListeningVoice = (typeof LISTENING_VOICES)[number]['id']
export const LISTENING_VOICE_IDS = LISTENING_VOICES.map(voice => voice.id)

export const IELTS_API_PATHS = {
  attempts: '/api/ielts/attempts',
  drills: '/api/ielts/drills',
  attempt: (attemptId: string) => `/api/ielts/attempts/${attemptId}`,
  answers: (attemptId: string) => `/api/ielts/attempts/${attemptId}/answers`,
  audioEvents: (attemptId: string) =>
    `/api/ielts/attempts/${attemptId}/audio-events`,
  submit: (attemptId: string) => `/api/ielts/attempts/${attemptId}/submit`,
  evidence: (attemptId: string, number: number) =>
    `/api/ielts/attempts/${attemptId}/evidence?number=${number}`,
  grade: (attemptId: string) => `/api/ielts/attempts/${attemptId}/grade`,
  adminTests: '/api/admin/ielts/tests',
  adminTest: (testId: string) => `/api/admin/ielts/tests/${testId}`,
  adminSection: (testId: string, key: string) =>
    `/api/admin/ielts/tests/${testId}/sections/${key}`,
  adminGenerate: (testId: string, key: string) =>
    `/api/admin/ielts/tests/${testId}/sections/${key}/generate`,
  adminAudio: (testId: string, key: string) =>
    `/api/admin/ielts/tests/${testId}/sections/${key}/audio`,
  adminPublish: (testId: string) => `/api/admin/ielts/tests/${testId}/publish`,
  adminAssist: '/api/admin/ielts/assist',
  adminUploadSign: '/api/admin/ielts/uploads/sign',
} as const

export const IELTS_OUTBOX_LANE_PREFIX = 'ielts:'

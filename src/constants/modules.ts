export type AppModuleKey =
  | 'dictation'
  | 'vocabulary'
  | 'writing-notes'
  | 'ai-coach'
  | 'reading'
  | 'speaking'

export type AppModuleStatus = 'active' | 'future' | 'secondary'

export interface AppModule {
  key: AppModuleKey
  title: string
  shortTitle: string
  href: string
  pageTag: string
  skill:
    'Listening' | 'Vocabulary' | 'Writing' | 'Coaching' | 'Reading' | 'Speaking'
  status: AppModuleStatus
  description: string
}

export const APP_MODULES: AppModule[] = [
  {
    key: 'dictation',
    title: 'Dictation Lab',
    shortTitle: 'Dictation',
    href: '/dictation',
    pageTag: 'Active',
    skill: 'Listening',
    status: 'active',
    description:
      'YouTube sentence practice, correction, review, and IELTS listening memory.',
  },
  {
    key: 'vocabulary',
    title: 'Vocabulary',
    shortTitle: 'Vocab',
    href: '/vocabulary',
    pageTag: 'Active',
    skill: 'Vocabulary',
    status: 'active',
    description:
      'Personal word bank, spaced recall, collocations, and weak-word drills.',
  },
  {
    key: 'writing-notes',
    title: 'Writing Notes',
    shortTitle: 'Writing',
    href: '/writing-notes',
    pageTag: 'Future',
    skill: 'Writing',
    status: 'future',
    description:
      'Task 1 and Task 2 patterns, essay ideas, sentence upgrades, and feedback.',
  },
  {
    key: 'ai-coach',
    title: 'AI Coach',
    shortTitle: 'Coach',
    href: '/ai-coach',
    pageTag: 'Future',
    skill: 'Coaching',
    status: 'future',
    description:
      'Personal debriefs, study suggestions, and IELTS path planning.',
  },
  {
    key: 'reading',
    title: 'Reading',
    shortTitle: 'Reading',
    href: '/reading',
    pageTag: 'Secondary',
    skill: 'Reading',
    status: 'secondary',
    description:
      'Passage practice, question traps, timing notes, and evidence review.',
  },
  {
    key: 'speaking',
    title: 'Speaking',
    shortTitle: 'Speaking',
    href: '/speaking',
    pageTag: 'Secondary',
    skill: 'Speaking',
    status: 'secondary',
    description:
      'Cue-card ideas, fluency drills, pronunciation notes, and answer structure.',
  },
]

export const PRIMARY_NAV_ITEMS = [
  { label: 'Study Desk', href: '/' },
  ...APP_MODULES.map(module => ({
    label: module.shortTitle,
    href: module.href,
  })),
]

export type AppModuleKey =
  | 'dictation'
  | 'vocabulary'
  | 'grammar'
  | 'ielts'
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
    | 'Listening'
    | 'Vocabulary'
    | 'Grammar'
    | 'Testing'
    | 'Writing'
    | 'Coaching'
    | 'Reading'
    | 'Speaking'
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
    key: 'grammar',
    title: 'Grammar',
    shortTitle: 'Grammar',
    href: '/grammar',
    pageTag: 'Active',
    skill: 'Grammar',
    status: 'active',
    description:
      'A path of short grammar lessons from A1 to C1, with stars, checkpoints, and spaced review.',
  },
  {
    key: 'ielts',
    title: 'IELTS Tests',
    shortTitle: 'IELTS',
    href: '/ielts',
    pageTag: 'Active',
    skill: 'Testing',
    status: 'active',
    description:
      'Full Listening, Reading and Writing tests with practice and timed mock modes, bands and evidence review.',
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

// The IELTS module already covers these skills, so they get no header button.
const NAV_HIDDEN_MODULE_KEYS: AppModuleKey[] = [
  'writing-notes',
  'reading',
  'speaking',
]

export interface NavItem {
  disabled?: boolean
  href: string
  label: string
}

export const PRIMARY_NAV_ITEMS: NavItem[] = [
  { label: 'Study Desk', href: '/' },
  ...APP_MODULES.filter(
    module => !NAV_HIDDEN_MODULE_KEYS.includes(module.key)
  ).map(module => ({
    disabled: module.status !== 'active',
    label: module.shortTitle,
    href: module.href,
  })),
]

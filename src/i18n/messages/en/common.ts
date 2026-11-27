/**
 * English UI text shared by every module: the app chrome, navigation, module
 * names, generic actions and error boundaries. Source of truth for its keys.
 */
export const common = {
  app: {
    name: 'English For Only Me',
    description:
      'A private IELTS study desk for dictation, vocabulary, review, writing notes, and future English practice modules.',
    logoAlt: 'English For Only Me logo',
    tagline: 'Your private English study board',
  },
  nav: {
    primary: 'Primary',
    home: 'Study Desk',
    menu: 'Menu',
    menuDescription: 'Jump to a study module.',
    openMenu: 'Open menu',
    closeMenu: 'Close menu',
    soon: 'Soon',
  },
  modules: {
    dictation: {
      title: 'Dictation Lab',
      shortTitle: 'Dictation',
      skill: 'Listening',
      description:
        'YouTube sentence practice, correction, review, and IELTS listening memory.',
    },
    vocabulary: {
      title: 'Vocabulary',
      shortTitle: 'Vocab',
      skill: 'Vocabulary',
      description:
        'Personal word bank, spaced recall, collocations, and weak-word drills.',
    },
    grammar: {
      title: 'Grammar',
      shortTitle: 'Grammar',
      skill: 'Grammar',
      description:
        'A path of short grammar lessons from A1 to C1, with stars, checkpoints, and spaced review.',
    },
    ielts: {
      title: 'IELTS Tests',
      shortTitle: 'IELTS',
      skill: 'Testing',
      description:
        'Full Listening, Reading and Writing tests with practice and timed mock modes, bands and evidence review.',
    },
    'writing-notes': {
      title: 'Writing Notes',
      shortTitle: 'Writing',
      skill: 'Writing',
      description:
        'Task 1 and Task 2 patterns, essay ideas, sentence upgrades, and feedback.',
    },
    'ai-coach': {
      title: 'AI Coach',
      shortTitle: 'Coach',
      skill: 'Coaching',
      description:
        'Personal debriefs, study suggestions, and IELTS path planning.',
    },
    reading: {
      title: 'Reading',
      shortTitle: 'Reading',
      skill: 'Reading',
      description:
        'Passage practice, question traps, timing notes, and evidence review.',
    },
    speaking: {
      title: 'Speaking',
      shortTitle: 'Speaking',
      skill: 'Speaking',
      description:
        'Cue-card ideas, fluency drills, pronunciation notes, and answer structure.',
    },
  },
  moduleStatus: {
    active: 'Active',
    future: 'Future',
    secondary: 'Secondary',
  },
  theme: {
    toDay: 'Switch to day theme',
    toNight: 'Switch to night theme',
  },
  language: {
    label: 'Language',
    switchTo: 'Switch to {language}',
    names: {
      en: 'English',
      vi: 'Vietnamese',
    },
  },
  auth: {
    signIn: 'Sign in',
    signOut: 'Sign out',
    signOutTitle: 'Sign out?',
    signOutDescription: 'You will be signed out of English For Only Me.',
    account: 'Account',
    admin: 'Admin',
    favorites: 'Favorites',
  },
  actions: {
    cancel: 'Cancel',
    close: 'Close',
    save: 'Save',
    delete: 'Delete',
    edit: 'Edit',
    back: 'Back',
    retry: 'Try again',
    next: 'Next',
    previous: 'Previous',
    continue: 'Continue',
    done: 'Done',
    loading: 'Loading…',
    saving: 'Saving…',
  },
  audio: {
    play: 'Play',
    pause: 'Pause',
    previousLine: 'Previous line',
    nextLine: 'Next line',
    backSeconds: 'Back {seconds} seconds',
    forwardSeconds: 'Forward {seconds} seconds',
    backShort: 'Back {seconds} s',
    forwardShort: 'Forward {seconds} s',
    withShortcut: '{label} (Alt+{key})',
    speed: 'Playback speed {rate}x',
    changeSpeed: 'Change speed',
    seek: 'Seek',
    clockOf: '{time} of {total}',
  },
  footer: {
    rights: '© {year} English For Only Me. All rights reserved.',
    developedBy: 'Developed by {author}',
  },
  errors: {
    generic: 'Something went wrong.',
    network: 'Network error. Check your connection and try again.',
    notFound: 'Not found.',
    unauthorized: 'Please sign in to continue.',
    forbidden: 'You do not have access to this.',
    invalidRequest: 'The request was not valid.',
    serverError: 'Server error. Please try again.',
    requestFailed: 'Request failed ({status}).',
    guestSession: 'Could not start a guest session.',
    ownerMismatch:
      'This change was made for a different account. Reload the page.',
    writeKept: 'Not sent: the learner changed. It is kept for later.',
  },
}

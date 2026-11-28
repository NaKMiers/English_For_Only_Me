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
    accountMenu: 'Account',
    accountMenuDescription: 'Your account and the app language.',
    primary: 'Primary',
    home: 'Study Desk',
    menu: 'Menu',
    openMenu: 'Open menu',
    closeMenu: 'Close menu',
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
    loginMetaTitle: 'Sign in',
    loginTitle: 'English For Only Me',
    loginHeading: 'Welcome back',
    loginTagline:
      'Listen, write and remember a little more every day. Sign in to pick up right where you left off.',
    loginFootnote: 'Google is the only way in. No passwords to remember.',
    loginHeroNowPlaying: 'Dictation',
    loginModuleHints: {
      dictation: 'Listen and type',
      vocabulary: 'Words that stick',
      grammar: 'A 12-unit path',
      ielts: 'Mock tests for band 7+',
    },
    continueWithGoogle: 'Continue with Google',
    openingGoogle: 'Opening Google...',
    notConfigured:
      'Sign-in is not configured on this site yet, so nobody can sign in.',
    errorAccessDenied:
      'Google sign-in was cancelled or not allowed. Try again.',
    errorGeneric: 'Sign-in did not work. Please try again.',
    errorLocked: 'This account has been locked. Contact the site owner.',
    signOut: 'Sign out',
    signOutTitle: 'Sign out?',
    signOutDescription: 'You will be signed out of English For Only Me.',
    account: 'Account',
    admin: 'Admin',
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
  journey: {
    nextStop: 'Next stop',
    youAreHere: 'You are here',
    continue: 'Continue',
    showSide: 'Show history and weak spots',
    hideSide: 'Hide history and weak spots',
    allClear: 'All clear',
    stepOf: '{done} / {total}',
    stepOfLabel: 'Step {done} of {total}',
    stepTaken: '+1 step',
    details: 'Details',
    moreItems: {
      one: '{count} more',
      other: '{count} more',
    },
    retryPip: {
      one: '{count} to retry',
      other: '{count} to retry',
    },
    breadcrumb: 'Breadcrumb',
  },
  errors: {
    generic: 'Something went wrong.',
    network: 'Network error. Check your connection and try again.',
    notFound: 'Not found.',
    unauthorized: 'Please sign in to continue.',
    forbidden: 'You do not have access to this.',
    invalidRequest: 'The request was not valid.',
    requestFailed: 'Request failed ({status}).',
    ownerMismatch:
      'This change was made for a different account. Reload the page.',
    writeKept: 'Not sent: the learner changed. It is kept for later.',
  },
  errorBoundary: {
    eyebrow: 'Something went wrong',
    title: 'This page needs a retry',
    description: 'It failed to load. Try again; nothing you saved is lost.',
    retry: 'Try again',
    home: 'Back to the study desk',
  },
}

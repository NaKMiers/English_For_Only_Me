export const THEME_COLORS = {
  white: '#ffffff',
  black: '#050505',
  logoRed: '#e03020',
  brightRed: '#f03020',
  paleRed: '#fff0ef',
  paper: '#fff8f6',
  paperSoft: '#ffe7e4',
  inkSoft: '#343434',
} as const

export const MANGA_BORDER = {
  thin: 'border-2 border-manga-black',
  thick: 'border-3 border-manga-black',
} as const

export const MANGA_SHADOW = {
  sm: 'shadow-[3px_3px_0_var(--manga-black)]',
  md: 'shadow-[4px_4px_0_var(--manga-black)]',
  lg: 'shadow-[8px_8px_0_var(--manga-black),18px_18px_0_var(--manga-shadow)]',
} as const

export const PAGE_TAG_TONES = {
  default: 'bg-manga-white text-manga-black',
  red: 'bg-manga-paper-soft text-manga-black',
  ink: 'bg-manga-black text-manga-white',
  pale: 'bg-manga-pale-red text-manga-black',
  sky: 'bg-sky-100 text-sky-950',
  yellow: 'bg-yellow-100 text-yellow-950',
} as const

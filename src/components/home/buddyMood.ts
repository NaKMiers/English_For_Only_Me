/** How the study buddy feels, from the learner's numbers right now. */
export type BuddyMood =
  'ready' | 'fired' | 'happy' | 'proud' | 'worried' | 'sleepy'

export interface BuddyMoodInput {
  /** False when signed out or before any data: the buddy just waits. */
  hasStats: boolean
  learnedToday: number
  streakDays: number
  totalDue: number
  weeklyMinutes: number
}

/** Reviews waiting at which the buddy starts to worry. */
export const BUDDY_WORRY_DUE = 20
/** Streak length the buddy is proud of. */
export const BUDDY_PROUD_STREAK = 7
/** Streak length that fires the buddy up. */
export const BUDDY_FIRED_STREAK = 3

/**
 * Picks one mood, most urgent first: a pile of reviews beats a long streak,
 * a long streak beats a clear queue, and a quiet week puts the buddy to sleep.
 */
export function pickBuddyMood({
  hasStats,
  learnedToday,
  streakDays,
  totalDue,
  weeklyMinutes,
}: BuddyMoodInput): BuddyMood {
  if (!hasStats) return 'ready'
  if (totalDue >= BUDDY_WORRY_DUE) return 'worried'
  if (streakDays >= BUDDY_PROUD_STREAK) return 'proud'
  if (totalDue === 0 && (streakDays > 0 || learnedToday > 0)) return 'happy'
  if (streakDays >= BUDDY_FIRED_STREAK) return 'fired'
  if (streakDays === 0 && weeklyMinutes === 0 && learnedToday === 0)
    return 'sleepy'

  return 'ready'
}

/**
 * The colours of each mood: the cover colour of its illustration (the dot
 * beside the mood name) and the soft glow behind the buddy. The cover colours
 * match the art, so they stay fixed in both themes; the glow uses the
 * theme's pastel tokens.
 */
export const BUDDY_MOOD_STYLES: Record<
  BuddyMood,
  { cover: string; glow: string; text: string }
> = {
  ready: {
    cover: '#e5484d',
    glow: 'from-pastel-rose',
    text: 'text-accent-pink',
  },
  fired: {
    cover: '#f06a1d',
    glow: 'from-pastel-peach',
    text: 'text-accent-orange',
  },
  happy: {
    cover: '#2fa86a',
    glow: 'from-pastel-mint',
    text: 'text-accent-green',
  },
  proud: {
    cover: '#e0a516',
    glow: 'from-pastel-lemon',
    text: 'text-accent-orange',
  },
  worried: {
    cover: '#8b5cf6',
    glow: 'from-pastel-lilac',
    text: 'text-accent-purple',
  },
  sleepy: {
    cover: '#4f8fd9',
    glow: 'from-pastel-sky',
    text: 'text-accent-blue',
  },
}

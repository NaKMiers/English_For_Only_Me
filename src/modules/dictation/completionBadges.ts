export const COMPLETION_BADGE_TIERS = [
  'copper',
  'silver',
  'gold',
  'diamond',
] as const

export type CompletionBadgeTier = (typeof COMPLETION_BADGE_TIERS)[number]

export const COMPLETION_BADGE_LABELS: Record<CompletionBadgeTier, string> = {
  copper: 'Copper',
  silver: 'Silver',
  gold: 'Gold',
  diamond: 'Diamond',
}

/**
 * Completion count -> badge tier: 1st completion earns copper, 2nd silver,
 * 3rd (or more, up to 4) gold, 5th+ diamond. No badge below one completion.
 */
export function getCompletionBadgeTier(
  completions: number
): CompletionBadgeTier | null {
  if (completions >= 5) return 'diamond'
  if (completions >= 3) return 'gold'
  if (completions >= 2) return 'silver'
  if (completions >= 1) return 'copper'
  return null
}

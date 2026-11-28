import { Brain, Check, type LucideIcon } from 'lucide-react'

/**
 * One icon per learner state, used everywhere the state shows (frontend-ui.md).
 * "Due" (a review is waiting) is the brain; the rotate arrow is kept for real
 * replay / redo actions only (`styleGuards.test.ts` enforces it).
 */
export const DUE_ICON: LucideIcon = Brain

/** Done: the green tick on nodes, rows and chips. */
export const DONE_ICON: LucideIcon = Check

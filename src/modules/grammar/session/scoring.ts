import {
  THREE_STAR_ACCURACY,
  TWO_STAR_ACCURACY,
} from '@/modules/grammar/constants'

/** Stars for a finished lesson. Finishing always earns at least one. */
export function starsForAccuracy(accuracy: number) {
  if (accuracy >= THREE_STAR_ACCURACY) return 3
  if (accuracy >= TWO_STAR_ACCURACY) return 2

  return 1
}

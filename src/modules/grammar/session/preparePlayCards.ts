import type { GrammarCard } from '@/modules/grammar/course/types'
import { getOrderTiles } from '@/modules/grammar/grading/gradeCard'
import { shuffle, type Rng } from '@/modules/grammar/rng'

/**
 * A card plus its on-screen arrangement. Shuffling happens on the server so
 * the client renders exactly what the server rendered (no hydration drift),
 * and choice options keep their ORIGINAL index for grading.
 */
export interface PlayCard {
  card: GrammarCard
  /** Original option indexes in display order (choice cards). */
  optionOrder?: number[]
  /** Tiles in display order (order cards, and fill cards with a bank). */
  tiles?: string[]
}

export function preparePlayCards(cards: GrammarCard[], rng: Rng): PlayCard[] {
  return cards.map(card => {
    switch (card.kind) {
      case 'choice':
        return {
          card,
          optionOrder: shuffle(
            card.options.map((_, index) => index),
            rng
          ),
        }
      case 'fill':
        return card.bank ? { card, tiles: shuffle(card.bank, rng) } : { card }
      case 'order': {
        const tiles = getOrderTiles(card)
        let shuffled = shuffle(tiles, rng)

        // Never hand the learner the answer already in order.
        for (
          let tries = 0;
          tries < 5 && shuffled.join(' ') === tiles.join(' ');
          tries += 1
        )
          shuffled = shuffle(tiles, rng)

        return { card, tiles: shuffled }
      }
      default:
        return { card }
    }
  })
}

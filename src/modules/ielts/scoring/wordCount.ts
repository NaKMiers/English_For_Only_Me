import type { IeltsWordLimit } from '../schema'
import { normalizeIeltsAnswer } from './normalize'

const NUMBER_TOKEN = /^\d[\d,.:/]*$/

export interface IeltsWordCount {
  numbers: number
  words: number
}

/** A hyphenated token is one word; a token like 25, 3.5 or 9:30 is a number. */
export function countIeltsWords(value: string): IeltsWordCount {
  const normalized = normalizeIeltsAnswer(value)

  if (!normalized) return { numbers: 0, words: 0 }

  return normalized
    .split(' ')
    .reduce<IeltsWordCount>(
      (count, token) =>
        NUMBER_TOKEN.test(token)
          ? { ...count, numbers: count.numbers + 1 }
          : { ...count, words: count.words + 1 },
      { numbers: 0, words: 0 }
    )
}

/**
 * "NO MORE THAN TWO WORDS AND/OR A NUMBER" allows up to two words plus one
 * number. Without `allowNumber`, a number counts as a word.
 */
export function isWithinWordLimit(
  value: string,
  limit: IeltsWordLimit | null
): boolean {
  if (!limit) return true

  const { numbers, words } = countIeltsWords(value)

  if (!limit.allowNumber) return words + numbers <= limit.maxWords

  return words <= limit.maxWords && numbers <= 1
}

/** Essay word count as the writing editor shows it. */
export function countEssayWords(value: string): number {
  const trimmed = value.trim()

  return trimmed ? trimmed.split(/\s+/).length : 0
}

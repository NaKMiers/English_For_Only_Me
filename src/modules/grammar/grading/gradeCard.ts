import type {
  CardAnswer,
  FillCard,
  FixCard,
  OrderCard,
  PracticeCard,
} from '@/modules/grammar/course/types'

/**
 * Pure, deterministic grading shared by the browser (instant feedback) and the
 * session route (the verdict that is stored). The server re-grades every raw
 * answer with this same function, so a client bug can never write a wrong
 * result.
 *
 * Normalisation is deliberately small: case, whitespace, curly quotes, and
 * trailing sentence punctuation. Contractions are NOT expanded - "he's" can be
 * "he is" or "he has", and accepting either would pass a wrong perfect tense.
 * A card that genuinely accepts both spellings lists both.
 */

export interface CardGrade {
  correct: boolean
  /** The correct answer, ready to display. */
  expected: string
}

const CURLY_QUOTES = /[‘’ʼ]/g
const CURLY_DOUBLE_QUOTES = /[“”]/g
const TRAILING_PUNCTUATION = /[.!?]+$/

export function normalizeGrammarAnswer(value: string) {
  return value
    .replace(CURLY_QUOTES, "'")
    .replace(CURLY_DOUBLE_QUOTES, '"')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
    .replace(TRAILING_PUNCTUATION, '')
    .replace(/\s+([,;:])/g, '$1')
    .trim()
}

/** The tiles an order card offers, in canonical order (before shuffling). */
export function getOrderTiles(card: OrderCard) {
  return [...splitWords(card.sentence), ...(card.distractors ?? [])]
}

export function splitWords(sentence: string) {
  return sentence
    .trim()
    .replace(TRAILING_PUNCTUATION, '')
    .split(/\s+/)
    .filter(Boolean)
}

/** The sentence with the blank filled; a bracketed hint after it is dropped. */
export function fillSentence(card: FillCard, filler: string) {
  return card.sentence.replace(/___(\s*\([^)]*\))?/, filler)
}

export function correctedFixSentence(card: FixCard) {
  return card.tokens
    .map((token, index) =>
      index === card.wrongIndex ? card.correction : token
    )
    .filter(Boolean)
    .join(' ')
}

function gradeChoice(answer: number, correctIndex: number) {
  return Number.isInteger(answer) && answer === correctIndex
}

function matchesAny(value: string, accepted: string[]) {
  const normalized = normalizeGrammarAnswer(value)

  if (!normalized) return false

  return accepted.some(item => normalizeGrammarAnswer(item) === normalized)
}

export function gradeCard(card: PracticeCard, answer: CardAnswer): CardGrade {
  switch (card.kind) {
    case 'choice': {
      const option = card.options[card.answer] ?? ''

      return {
        correct:
          answer.kind === 'choice' && gradeChoice(answer.value, card.answer),
        // A gapped sentence reads better filled in than as a lone word.
        expected: card.sentence?.includes('___')
          ? card.sentence.replace('___', option)
          : option,
      }
    }
    case 'fill':
      return {
        correct:
          answer.kind === 'fill' && matchesAny(answer.value, card.answers),
        expected: fillSentence(card, card.answers[0] ?? ''),
      }
    case 'order':
      return {
        correct:
          answer.kind === 'order' &&
          matchesAny(answer.value.join(' '), [
            card.sentence,
            ...(card.alternatives ?? []),
          ]),
        expected: card.sentence,
      }
    case 'fix':
      return {
        correct:
          answer.kind === 'fix' && gradeChoice(answer.value, card.wrongIndex),
        expected: correctedFixSentence(card),
      }
  }
}

/**
 * Narrow an untrusted JSON value from a request body into a `CardAnswer` for
 * this card, or null when it has the wrong shape. Bounds keep a hostile body
 * from making the grader do unbounded work.
 */
export function parseCardAnswer(
  card: PracticeCard,
  value: unknown
): CardAnswer | null {
  switch (card.kind) {
    case 'choice':
    case 'fix':
      return typeof value === 'number' && Number.isInteger(value)
        ? { kind: card.kind, value }
        : null
    case 'fill':
      return typeof value === 'string' && value.length <= 200
        ? { kind: 'fill', value }
        : null
    case 'order':
      return Array.isArray(value) &&
        value.length <= 40 &&
        value.every(item => typeof item === 'string' && item.length <= 40)
        ? { kind: 'order', value: value as string[] }
        : null
  }
}

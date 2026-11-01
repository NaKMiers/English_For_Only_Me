import type { CardAnswer, PracticeCard } from '@/modules/grammar/course/types'
import { fillSentence } from '@/modules/grammar/grading/gradeCard'
import type { PlayCard } from '@/modules/grammar/session/preparePlayCards'

/**
 * What the learner has picked so far on one practice card, before "Kiểm tra".
 * Tiles are tracked by their DISPLAY index so duplicate words stay distinct.
 */
export type CardDraft =
  | { kind: 'choice'; option: number | null }
  | { kind: 'fill'; text: string }
  | { kind: 'order'; picked: number[] }
  | { kind: 'fix'; token: number | null }

export function emptyDraft(card: PracticeCard): CardDraft {
  switch (card.kind) {
    case 'choice':
      return { kind: 'choice', option: null }
    case 'fill':
      return { kind: 'fill', text: '' }
    case 'order':
      return { kind: 'order', picked: [] }
    case 'fix':
      return { kind: 'fix', token: null }
  }
}

export function isDraftReady(draft: CardDraft) {
  switch (draft.kind) {
    case 'choice':
      return draft.option !== null
    case 'fill':
      return draft.text.trim().length > 0
    case 'order':
      return draft.picked.length > 0
    case 'fix':
      return draft.token !== null
  }
}

/**
 * Puts a tile into the answer line at `position`, counted over the line as it
 * is shown (the tile itself included when it is already there), so dragging
 * a tile within the line and dragging one in from the bank share one rule.
 */
export function placeTile(
  picked: number[],
  tileIndex: number,
  position: number
) {
  const from = picked.indexOf(tileIndex)
  const rest = picked.filter(index => index !== tileIndex)
  const at = from !== -1 && from < position ? position - 1 : position

  rest.splice(Math.min(Math.max(at, 0), rest.length), 0, tileIndex)

  return rest
}

/** The raw answer the grader (and the server) understands. */
export function toCardAnswer(play: PlayCard, draft: CardDraft): CardAnswer {
  switch (draft.kind) {
    case 'choice':
      return { kind: 'choice', value: draft.option ?? -1 }
    case 'fill':
      return { kind: 'fill', value: draft.text }
    case 'order':
      return {
        kind: 'order',
        value: draft.picked.map(index => play.tiles?.[index] ?? ''),
      }
    case 'fix':
      return { kind: 'fix', value: draft.token ?? -1 }
  }
}

/** A readable version of what the learner answered, for the recap. */
export function describeAnswer(card: PracticeCard, answer: CardAnswer) {
  switch (answer.kind) {
    case 'choice':
      return card.kind === 'choice' ? (card.options[answer.value] ?? '') : ''
    case 'fill':
      return card.kind === 'fill'
        ? fillSentence(card, answer.value.trim() || '___')
        : ''
    case 'order':
      return answer.value.join(' ')
    case 'fix':
      return card.kind === 'fix'
        ? `"${card.tokens[answer.value] ?? ''}" là từ sai`
        : ''
  }
}

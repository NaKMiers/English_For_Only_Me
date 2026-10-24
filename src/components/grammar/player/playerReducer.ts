import {
  isPracticeCard,
  type CardAnswer,
  type PracticeCard,
} from '@/modules/grammar/course/types'
import { gradeCard, type CardGrade } from '@/modules/grammar/grading/gradeCard'
import type { PlayCard } from '@/modules/grammar/session/preparePlayCards'

import {
  emptyDraft,
  isDraftReady,
  toCardAnswer,
  type CardDraft,
} from './cardDraft'

/**
 * The lesson player as a pure state machine.
 *
 *   card ──(explain)──────────────────────────────▶ continue ─▶ next card
 *   card ──(practice) draft ─▶ check ─▶ feedback ─▶ continue ─▶ next card
 *                                  │
 *                                  └─ wrong on the first try: the card is
 *                                     appended to the queue ONCE; a second
 *                                     miss does not requeue it again.
 *   last card + continue ─▶ finished
 *
 * Only the FIRST answer to each practice card is recorded and sent; the replay
 * at the end is for learning, not for the score.
 */

export interface PlayerState {
  queue: number[]
  position: number
  requeued: number[]
  draft: CardDraft | null
  /** Verdict for the current card once checked, null while answering. */
  grade: CardGrade | null
  firstAnswers: Record<string, CardAnswer>
  firstCorrect: Record<string, boolean>
  combo: number
  bestCombo: number
  finished: boolean
}

export type PlayerAction =
  { type: 'draft'; draft: CardDraft } | { type: 'check' } | { type: 'continue' }

export function draftFor(play: PlayCard | undefined): CardDraft | null {
  return play && isPracticeCard(play.card) ? emptyDraft(play.card) : null
}

export function initialPlayerState(plays: PlayCard[]): PlayerState {
  return {
    bestCombo: 0,
    combo: 0,
    draft: draftFor(plays[0]),
    finished: plays.length === 0,
    firstAnswers: {},
    firstCorrect: {},
    grade: null,
    position: 0,
    queue: plays.map((_, index) => index),
    requeued: [],
  }
}

export function currentPlay(plays: PlayCard[], state: PlayerState) {
  const index = state.queue[state.position]

  return index === undefined ? undefined : plays[index]
}

export function createPlayerReducer(plays: PlayCard[]) {
  return function playerReducer(
    state: PlayerState,
    action: PlayerAction
  ): PlayerState {
    if (state.finished) return state

    const play = currentPlay(plays, state)

    switch (action.type) {
      case 'draft':
        return state.grade ? state : { ...state, draft: action.draft }

      case 'check': {
        if (!play || !isPracticeCard(play.card) || state.grade || !state.draft)
          return state
        if (!isDraftReady(state.draft)) return state

        const card: PracticeCard = play.card
        const answer = toCardAnswer(play, state.draft)
        const grade = gradeCard(card, answer)
        const isFirstTry = !(card.id in state.firstAnswers)
        const index = state.queue[state.position] as number
        const requeue = !grade.correct && !state.requeued.includes(index)
        const combo = isFirstTry
          ? grade.correct
            ? state.combo + 1
            : 0
          : state.combo

        return {
          ...state,
          bestCombo: Math.max(state.bestCombo, combo),
          combo,
          firstAnswers: isFirstTry
            ? { ...state.firstAnswers, [card.id]: answer }
            : state.firstAnswers,
          firstCorrect: isFirstTry
            ? { ...state.firstCorrect, [card.id]: grade.correct }
            : state.firstCorrect,
          grade,
          queue: requeue ? [...state.queue, index] : state.queue,
          requeued: requeue ? [...state.requeued, index] : state.requeued,
        }
      }

      case 'continue': {
        if (play && isPracticeCard(play.card) && !state.grade) return state

        const position = state.position + 1
        const finished = position >= state.queue.length
        const nextIndex = state.queue[position]

        return {
          ...state,
          draft: finished
            ? null
            : draftFor(nextIndex === undefined ? undefined : plays[nextIndex]),
          finished,
          grade: null,
          position: finished ? state.position : position,
        }
      }
    }
  }
}

/** First-try answers in card order, as the session API expects them. */
export function collectAnswers(plays: PlayCard[], state: PlayerState) {
  const seen = new Set<string>()
  const answers: { cardId: string; answer: unknown }[] = []

  for (const play of plays) {
    const card = play.card

    if (!isPracticeCard(card) || seen.has(card.id)) continue

    const answer = state.firstAnswers[card.id]

    seen.add(card.id)

    if (answer) answers.push({ answer: answer.value, cardId: card.id })
  }

  return answers
}

export function summarizePlayer(state: PlayerState) {
  const verdicts = Object.values(state.firstCorrect)
  const correctCount = verdicts.filter(Boolean).length
  const total = verdicts.length

  return {
    accuracy: total === 0 ? 0 : correctCount / total,
    correctCount,
    total,
  }
}

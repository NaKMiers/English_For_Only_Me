import { describe, expect, it } from 'vitest'

import type { GrammarCard } from '@/modules/grammar/course/types'
import type { PlayCard } from '@/modules/grammar/session/preparePlayCards'

import {
  collectAnswers,
  createPlayerReducer,
  currentPlay,
  initialPlayerState,
  summarizePlayer,
  type PlayerAction,
  type PlayerState,
} from './playerReducer'

const cards: GrammarCard[] = [
  { kind: 'explain', id: 'e1', title: 't', body: 'b', examples: [] },
  {
    kind: 'choice',
    id: 'q1',
    prompt: 'p',
    options: ['a', 'b'],
    answer: 0,
    explain: 'e',
  },
  {
    kind: 'choice',
    id: 'q2',
    prompt: 'p',
    options: ['a', 'b'],
    answer: 0,
    explain: 'e',
  },
  {
    kind: 'choice',
    id: 'q3',
    prompt: 'p',
    options: ['a', 'b'],
    answer: 0,
    explain: 'e',
  },
]
const plays: PlayCard[] = cards.map(card => ({ card }))
const reduce = createPlayerReducer(plays)

function run(actions: PlayerAction[], state = initialPlayerState(plays)) {
  return actions.reduce<PlayerState>(reduce, state)
}

const answer = (option: number): PlayerAction[] => [
  { draft: { kind: 'choice', option }, type: 'draft' },
  { type: 'check' },
  { type: 'continue' },
]

describe('playerReducer', () => {
  it('walks explain then practice cards and finishes', () => {
    const state = run([
      { type: 'continue' },
      ...answer(0),
      ...answer(0),
      ...answer(0),
    ])

    expect(state.finished).toBe(true)
    expect(summarizePlayer(state)).toEqual({
      accuracy: 1,
      correctCount: 3,
      total: 3,
    })
    expect(state.bestCombo).toBe(3)
  })

  it('does not advance a practice card before it is checked, or check an empty draft', () => {
    const atQuestion = run([{ type: 'continue' }])

    expect(run([{ type: 'continue' }], atQuestion).position).toBe(1)
    expect(run([{ type: 'check' }], atQuestion).grade).toBeNull()
  })

  it('requeues a wrong card once and records only the first answer', () => {
    let state = run([
      { type: 'continue' },
      ...answer(1),
      ...answer(0),
      ...answer(0),
    ])

    expect(state.finished).toBe(false)
    expect(currentPlay(plays, state)?.card.id).toBe('q1')

    // Missed again at the end: no second requeue, the lesson ends.
    state = run(answer(1), state)

    expect(state.finished).toBe(true)
    expect(state.queue).toHaveLength(5)
    expect(state.firstCorrect).toEqual({ q1: false, q2: true, q3: true })
    expect(collectAnswers(plays, state)).toEqual([
      { answer: 1, cardId: 'q1' },
      { answer: 0, cardId: 'q2' },
      { answer: 0, cardId: 'q3' },
    ])
    expect(summarizePlayer(state).correctCount).toBe(2)
  })

  it('resets the combo on a first-try miss but not on a replayed card', () => {
    const state = run([
      { type: 'continue' },
      ...answer(0),
      ...answer(1),
      ...answer(0),
    ])

    expect(state.combo).toBe(1)
    expect(state.bestCombo).toBe(1)

    const afterReplay = run(answer(0), state)

    expect(afterReplay.combo).toBe(1)
  })

  it('ignores drafts after checking and every action after finishing', () => {
    const checked = run([
      { type: 'continue' },
      { draft: { kind: 'choice', option: 0 }, type: 'draft' },
      { type: 'check' },
      { draft: { kind: 'choice', option: 1 }, type: 'draft' },
    ])

    expect(checked.draft).toEqual({ kind: 'choice', option: 0 })

    const done = run([
      { type: 'continue' },
      ...answer(0),
      ...answer(0),
      ...answer(0),
    ])

    expect(run([{ type: 'continue' }], done)).toBe(done)
  })
})

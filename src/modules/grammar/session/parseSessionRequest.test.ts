import { describe, expect, it } from 'vitest'

import { parseSessionRequest } from './parseSessionRequest'

const valid = {
  answers: [{ answer: 0, cardId: 'u01-l01-c02' }],
  idempotencyKey: 'key-12345678',
  mode: 'lesson',
  targetId: 'u01-l01',
}

describe('parseSessionRequest', () => {
  it('accepts a well-formed body', () => {
    expect(parseSessionRequest(valid)).toEqual({
      idempotencyKey: 'key-12345678',
      ok: true,
      submission: {
        answers: [{ answer: 0, cardId: 'u01-l01-c02' }],
        mode: 'lesson',
        targetId: 'u01-l01',
      },
    })
  })

  it.each([
    ['null', null],
    ['a string', 'x'],
    ['an unknown mode', { ...valid, mode: 'test' }],
    ['no answers', { ...valid, answers: [] }],
    [
      'too many answers',
      { ...valid, answers: Array.from({ length: 21 }, () => valid.answers[0]) },
    ],
    ['a short idempotency key', { ...valid, idempotencyKey: 'abc' }],
    ['a missing card id', { ...valid, answers: [{ answer: 0 }] }],
    ['a huge target id', { ...valid, targetId: 'x'.repeat(41) }],
  ])('rejects %s', (_, body) => {
    expect(parseSessionRequest(body)).toMatchObject({ ok: false })
  })
})

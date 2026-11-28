import { describe, expect, test } from 'vitest'

import { en } from '@/i18n/messages/en'

import { topicStepLine } from './topicStep'

const text = en.dictation.practice
const record = { done: 2, topicTitle: 'TED', total: 5 }

describe('topicStepLine', () => {
  test('a first finish adds one and says how many are left', () => {
    expect(
      topicStepLine(record, { finished: true, wasFinishedBefore: false }, text)
    ).toBe('+1 on TED, 2 to go')
  })

  test('a replay adds nothing', () => {
    expect(
      topicStepLine(record, { finished: true, wasFinishedBefore: true }, text)
    ).toBe('TED: 3 to go')
  })

  test('the last video turns the topic gold', () => {
    expect(
      topicStepLine(
        { ...record, done: 4 },
        { finished: true, wasFinishedBefore: false },
        text
      )
    ).toBe('TED is done')
  })
})

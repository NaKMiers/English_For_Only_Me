import { describe, expect, it } from 'vitest'

import { IELTS_SAMPLE_TEST } from './fixtures/sampleTest'
import { toPublicTest } from './publicView'

const FORBIDDEN = [
  'answers',
  'correctKeys',
  'evidence',
  'explanation',
  'sampleAnswer',
  'lineOffsetsSec',
  'publicId',
]

function keysDeep(value: unknown, into = new Set<string>()): Set<string> {
  if (Array.isArray(value)) value.forEach(item => keysDeep(item, into))
  else if (value && typeof value === 'object')
    for (const [key, child] of Object.entries(value)) {
      into.add(key)
      keysDeep(child, into)
    }

  return into
}

describe('toPublicTest', () => {
  it('never carries answer-key fields at any depth', () => {
    const keys = keysDeep(
      toPublicTest(IELTS_SAMPLE_TEST, { includeTranscript: true })
    )

    for (const key of FORBIDDEN) expect(keys.has(key)).toBe(false)
  })

  it('drops the listening transcript unless asked for it', () => {
    const mock = toPublicTest(IELTS_SAMPLE_TEST, { includeTranscript: false })
    const practice = toPublicTest(IELTS_SAMPLE_TEST, {
      includeTranscript: true,
    })
    const listening = (test: typeof mock) =>
      test.sections.filter(item => item.skill === 'listening')

    expect(listening(mock).every(item => item.listening?.lines === null)).toBe(
      true
    )
    expect(
      listening(practice).every(
        item => (item.listening?.lines?.length ?? 0) > 0
      )
    ).toBe(true)
  })

  it('keeps everything the runner needs', () => {
    const view = toPublicTest(IELTS_SAMPLE_TEST, { includeTranscript: false })
    const numbers = view.sections
      .filter(item => item.skill === 'reading')
      .flatMap(item => item.groups.flatMap(group => group.questions))
      .map(question => question.number)

    expect(numbers).toEqual(Array.from({ length: 40 }, (_, index) => index + 1))
    expect(
      view.sections.find(item => item.key === 'writing-1')?.writing?.visual
    ).not.toBeNull()
  })
})

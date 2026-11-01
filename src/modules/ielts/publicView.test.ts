import { describe, expect, it } from 'vitest'

import { IELTS_SAMPLE_TEST } from './fixtures/sampleTest'
import { optionsInBody, toPublicSection, toPublicTest } from './publicView'
import type { IeltsOption, IeltsQuestionGroup, IeltsSection } from './schema'

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

describe('pickLetter', () => {
  const sections = IELTS_SAMPLE_TEST.sections as IeltsSection[]
  const section = sections.find(item =>
    item.groups.some(group => group.type === 'summary-completion')
  )!
  const summary = section.groups.find(
    group => group.type === 'summary-completion'
  )!
  const body = 'Tehrani studied {{q24}} and {{q25}} and {{q26}}.'
  const list = '\n\n- **A** ending\n- **B** links\n- **C** plot'

  function viewOf(group: IeltsQuestionGroup) {
    return toPublicSection(
      { ...section, groups: [group] },
      {
        includeTranscript: true,
      }
    ).groups[0]
  }

  function lettered(answers: string[][], options: IeltsOption[]) {
    return {
      ...summary,
      body: body + list,
      options,
      questions: summary.questions.map((question, index) => ({
        ...question,
        answers: answers[index],
      })),
    }
  }

  it('is set when every answer is an option letter', () => {
    const view = viewOf(
      lettered([['B'], ['a'], ['long-term', 'C']], optionsInBody(list))
    )

    expect(view.pickLetter).toBe(true)
  })

  it('reads the options from the body list when the group has none', () => {
    const view = viewOf(lettered([['B'], ['A'], ['C']], []))

    expect(view.pickLetter).toBe(true)
    expect(view.options.map(option => option.key)).toEqual(['A', 'B', 'C'])
  })

  it('stays off when the answers are words from the list', () => {
    expect(
      viewOf(lettered([['links'], ['ending'], ['plot']], optionsInBody(list)))
        .pickLetter
    ).toBe(false)
    expect(viewOf(summary).pickLetter).toBe(false)
  })
})

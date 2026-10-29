import { describe, expect, it } from 'vitest'

import { IELTS_SAMPLE_TEST } from '../fixtures/sampleTest'
import type { IeltsSection, IeltsTestContent } from '../schema'
import { ieltsTestSchema } from '../schema'
import { checkSection, checkTest } from './checkTest'

function clone(): IeltsTestContent {
  return structuredClone(IELTS_SAMPLE_TEST)
}

function section(test: IeltsTestContent, key: string): IeltsSection {
  const found = test.sections.find(item => item.key === key)

  if (!found) throw new Error(`missing ${key}`)

  return found
}

function rules(test: IeltsTestContent) {
  return checkTest(test).errors.map(issue => issue.rule)
}

function firstSlotGroup(target: IeltsSection) {
  const group = target.groups.find(item => item.body.includes('{{q'))

  if (!group) throw new Error('no slot group')

  return group
}

describe('checkTest', () => {
  it('passes the sample fixture with no errors or warnings', () => {
    expect(ieltsTestSchema.safeParse(IELTS_SAMPLE_TEST).success).toBe(true)
    expect(checkTest(IELTS_SAMPLE_TEST)).toEqual({ errors: [], warnings: [] })
  })

  it('flags broken numbering', () => {
    const test = clone()

    section(test, 'reading-3').groups.at(-1)!.questions.pop()

    expect(rules(test)).toContain('numbering_contiguous')
    expect(rules(test)).toContain('group_range_matches')
  })

  it('flags slots without questions and questions without slots', () => {
    const test = clone()
    const group = firstSlotGroup(section(test, 'listening-1'))

    group.body = group.body.replace(/\{\{q\d+\}\}/, '') + ' {{q39}}'

    expect(rules(test)).toEqual(
      expect.arrayContaining(['slot_has_question', 'question_has_slot'])
    )
  })

  it('flags an answer over the word limit', () => {
    const test = clone()
    const group = firstSlotGroup(section(test, 'listening-1'))

    group.questions[0].answers = ['one two three four five six']

    expect(rules(test)).toContain('answer_within_limit')
  })

  it('flags an invented evidence quote but not a NOT GIVEN answer', () => {
    const test = clone()
    const target = section(test, 'reading-1')
    const question = target.groups
      .flatMap(group => group.questions)
      .find(item => item.evidence)!

    question.evidence = { quote: 'a sentence that is not there', blockIndex: 0 }

    expect(rules(test)).toContain('evidence_found')

    const notGiven = clone()
    const tfng = notGiven.sections
      .flatMap(item => item.groups)
      .find(group => group.type === 'true-false-not-given')!

    tfng.questions[0].answers = ['NOT GIVEN']
    tfng.questions[0].evidence = null

    expect(rules(notGiven)).not.toContain('evidence_found')
  })

  it('rejects HTML anywhere learner-facing', () => {
    const test = clone()

    section(test, 'reading-2').reading!.paragraphs[0].text +=
      ' <img src=x onerror=alert(1)>'

    expect(rules(test)).toContain('html_in_body')
  })

  it('checks audio offsets only when present', () => {
    const target = structuredClone(section(IELTS_SAMPLE_TEST, 'listening-1'))
    const lines = target.listening!.lines.length

    target.listening!.audio = {
      url: 'https://example.com/a.mp3',
      publicId: '',
      durationSec: 300,
      lineOffsetsSec: [],
    }
    expect(checkSection(target).errors).toEqual([])

    target.listening!.audio.lineOffsetsSec = [0, 5]
    expect(checkSection(target).errors.map(issue => issue.rule)).toContain(
      'audio_offsets'
    )

    target.listening!.audio.lineOffsetsSec = Array.from(
      { length: lines },
      (_, index) => index * 5
    )
    target.listening!.audio.durationSec = 0
    expect(checkSection(target).errors.map(issue => issue.rule)).toContain(
      'audio_duration'
    )
  })

  it('requires a visual on writing task 1', () => {
    const test = clone()

    section(test, 'writing-1').writing!.visual = null

    expect(rules(test)).toContain('writing_task')
  })
})

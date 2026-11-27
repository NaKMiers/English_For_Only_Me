import { describe, expect, it } from 'vitest'

import { format } from '@/i18n/format'
import { en } from '@/i18n/messages/en'

import { IELTS_SAMPLE_TEST } from '../fixtures/sampleTest'
import type {
  IeltsQuestionGroup,
  IeltsSection,
  IeltsTestContent,
} from '../schema'
import { ieltsTestSchema } from '../schema'
import { emptySections } from '../tests/emptySections'
import { checkSection, checkTest, isSectionReady } from './checkTest'

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
  it('passes the sample fixture with no errors, warning only on its imageless site plan', () => {
    expect(ieltsTestSchema.safeParse(IELTS_SAMPLE_TEST).success).toBe(true)

    const report = checkTest(IELTS_SAMPLE_TEST)

    expect(report.errors).toEqual([])
    // The sample's Hollin Mill plan ships without an image.
    expect(report.warnings).toEqual([
      expect.objectContaining({
        rule: 'visual_missing',
        sectionKey: 'listening-2',
      }),
    ])
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

describe('isSectionReady', () => {
  it('does not count a blank hand-written draft as ready', () => {
    for (const blank of emptySections('manual'))
      expect(isSectionReady(blank), blank.key).toBe(false)
  })

  it('counts a complete hand-written section as ready', () => {
    const test = clone()

    expect(isSectionReady(section(test, 'reading-1'))).toBe(true)
    expect(isSectionReady(section(test, 'writing-2'))).toBe(true)
  })

  it('needs audio before a listening part is ready', () => {
    const part = section(clone(), 'listening-1')

    expect(isSectionReady(part)).toBe(false)

    part.listening = {
      ...part.listening!,
      audio: {
        url: 'https://example.test/a.mp3',
        publicId: 'a',
        durationSec: 300,
        lineOffsetsSec: [],
      },
    }
    expect(isSectionReady(part)).toBe(true)
  })

  it('never counts a pending or failed section', () => {
    const part = section(clone(), 'reading-1')

    for (const genStatus of ['pending', 'generating', 'failed'] as const)
      expect(isSectionReady({ ...part, genStatus })).toBe(false)
  })
})

describe('visual_missing', () => {
  const group = (instruction: string, imageUrl = '') =>
    ({
      ...IELTS_SAMPLE_TEST.sections[0].groups[0],
      imageUrl,
      instruction,
    }) as IeltsQuestionGroup
  const warningsFor = (instruction: string, imageUrl = '') =>
    checkSection({
      ...IELTS_SAMPLE_TEST.sections[0],
      groups: [group(instruction, imageUrl)],
    } as IeltsSection).warnings.filter(item => item.rule === 'visual_missing')

  it('warns when the instruction points at a diagram the group lacks', () => {
    expect(warningsFor('Label the diagrams below.')).toHaveLength(1)
    expect(warningsFor('Label the map below.', 'https://x/map.png')).toEqual([])
  })

  it('leaves flow-charts and plain notes alone', () => {
    expect(warningsFor('Complete the flow-chart below.')).toEqual([])
    expect(warningsFor('Complete the notes below.')).toEqual([])
  })
})

describe('question_stem_missing', () => {
  const choice = () => {
    const owner = IELTS_SAMPLE_TEST.sections.find(item =>
      item.groups.some(group => group.type === 'multiple-choice')
    )!

    return {
      owner,
      group: structuredClone(
        owner.groups.find(group => group.type === 'multiple-choice')!
      ),
    }
  }
  const warningsFor = (owner: IeltsSection, group: IeltsQuestionGroup) =>
    checkSection({ ...owner, groups: [group] } as IeltsSection).warnings.filter(
      item => item.rule === 'question_stem_missing'
    )

  it('warns when a choice question shows options but no question', () => {
    const { owner, group } = choice()

    group.title = ''
    group.body = ''
    group.questions[0]!.prompt = ''

    expect(warningsFor(owner, group)).toHaveLength(1)
  })

  it('accepts a stem in the prompt, the title or the body', () => {
    const { owner, group } = choice()

    expect(warningsFor(owner, group)).toEqual([])
    group.questions[0]!.prompt = ''
    group.title = 'Which TWO points does the writer make?'
    expect(warningsFor(owner, group)).toEqual([])
    group.title = ''
    group.body = ''
    group.instruction =
      'Which THREE things can the public do? Choose THREE letters, A-G.'
    expect(warningsFor(owner, group)).toEqual([])
  })
})

describe('issue text', () => {
  it('matches the editor catalogue, so the editor can show it in any language', () => {
    const test = clone()

    section(test, 'reading-3').groups.at(-1)!.questions.pop()
    section(test, 'listening-1').listening!.lines = []
    section(test, 'writing-1').writing!.visual = null

    const { errors, warnings } = checkTest(test)
    const issues = [...errors, ...warnings]

    expect(issues.length).toBeGreaterThan(3)
    for (const issue of issues)
      expect(format(en.ieltsEditor.issues[issue.code], issue.values)).toBe(
        issue.message
      )
  })
})

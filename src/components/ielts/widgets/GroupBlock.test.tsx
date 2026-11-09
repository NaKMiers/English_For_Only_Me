import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import {
  IELTS_QUESTION_TYPES,
  IELTS_QUESTION_WIDGETS,
} from '@/modules/ielts/constants'
import { checkTest } from '@/modules/ielts/consistency/checkTest'
import { IELTS_SAMPLE_TEST } from '@/modules/ielts/fixtures/sampleTest'
import { toPublicSection } from '@/modules/ielts/publicView'
import type { IeltsQuestionGroup, IeltsSection } from '@/modules/ielts/schema'

import {
  IeltsAnswerContext,
  type IeltsAnswerContextValue,
  questionControlId,
} from './answerContext'
import { GroupBlock } from './GroupBlock'

afterEach(cleanup)

const sections = IELTS_SAMPLE_TEST.sections as IeltsSection[]
const groups = sections.flatMap(section =>
  section.groups.map(group => ({ section, group }))
)

/** The answer key, the way the admin preview's "Show answers" fills it. */
function keyFor(group: IeltsQuestionGroup): IeltsAnswerContextValue['answers'] {
  if (group.type === 'multiple-choice-multi')
    return { [String(group.from)]: group.correctKeys }

  return Object.fromEntries(
    group.questions.map(question => [
      String(question.number),
      question.answers[0] ?? '',
    ])
  )
}

function renderGroup(section: IeltsSection, group: IeltsQuestionGroup) {
  const publicGroup = toPublicSection(section, {
    includeTranscript: true,
  }).groups.find(item => item.id === group.id)!

  render(
    <IeltsAnswerContext.Provider
      value={{
        answers: keyFor(group),
        readOnly: true,
        review: null,
        setAnswer: () => undefined,
        currentNumber: null,
        onFocusQuestion: () => undefined,
        onShowEvidence: null,
      }}
    >
      <GroupBlock group={publicGroup} />
    </IeltsAnswerContext.Provider>
  )

  return screen.getByRole('region', {
    name:
      group.from === group.to
        ? `Question ${group.from}`
        : `Questions ${group.from}-${group.to}`,
  })
}

describe('GroupBlock covers every IELTS question type', () => {
  it('has a sample group for each type, and the sample passes the checks', () => {
    const used = new Set(groups.map(({ group }) => group.type))

    expect([...IELTS_QUESTION_TYPES].filter(type => !used.has(type))).toEqual(
      []
    )
    expect(checkTest(IELTS_SAMPLE_TEST).errors).toEqual([])
  })

  it.each(groups.map(({ section, group }) => [group.type, section, group]))(
    '%s renders one control per question with the key filled in',
    (_type, section, group) => {
      const region = renderGroup(section, group)
      const widget = IELTS_QUESTION_WIDGETS[group.type]

      if (widget === 'checkbox') {
        const checked = within(region)
          .getAllByRole('checkbox')
          .filter(box => box.getAttribute('aria-checked') === 'true')

        expect(checked).toHaveLength(group.correctKeys.length)
        expect(group.correctKeys).toHaveLength(group.questions.length)

        return
      }

      for (const question of group.questions) {
        const control = region.querySelector(
          `#${questionControlId(question.number)}`
        )
        const answer = question.answers[0]

        expect(control, `question ${question.number}`).not.toBeNull()

        if (widget === 'slot') expect(control).toHaveValue(answer)

        if (widget === 'dropdown')
          expect(control?.textContent).toContain(answer)

        // One radio picked per question, and its label's key is the answer.
        if (widget === 'radio') {
          const picked = within(
            control!.closest('[role="radiogroup"]') as HTMLElement
          ).getAllByRole('radio', { checked: true })

          expect(picked).toHaveLength(1)
          expect(
            picked[0].closest('label')?.querySelector('strong')
          ).toHaveTextContent(new RegExp(`^${answer}$`))
        }
      }
    }
  )
})

describe('GroupBlock picture multiple choice and intro', () => {
  const choice = groups.find(
    ({ group }) => group.type === 'multiple-choice'
  )!
  const renderVariant = (patch: Partial<IeltsQuestionGroup>) => {
    const group = { ...choice.group, ...patch }
    const section = {
      ...choice.section,
      groups: choice.section.groups.map(item =>
        item.id === group.id ? group : item
      ),
    }

    return { group, region: renderGroup(section, group) }
  }

  it('shows the picture and a letter dropdown, without the options box', () => {
    const { group, region } = renderVariant({
      imageUrl: 'https://example.com/a-d.png',
    })
    const first = group.questions[0]

    expect(within(region).getByRole('img')).toHaveAttribute(
      'src',
      'https://example.com/a-d.png'
    )
    expect(within(region).queryAllByRole('radio')).toHaveLength(0)
    expect(
      region.querySelector(`#${questionControlId(first.number)}`)?.textContent
    ).toContain(first.answers[0])
    expect(region).not.toHaveTextContent(group.options[0].text)
  })

  it('renders the worked example above text choices', () => {
    const { region } = renderVariant({
      body: '*(Example)*\n\nWhat has the woman lost? **A**',
    })

    expect(region).toHaveTextContent('(Example)')
    expect(region).toHaveTextContent('What has the woman lost? A')
    expect(within(region).getAllByRole('radio').length).toBeGreaterThan(0)
  })
})

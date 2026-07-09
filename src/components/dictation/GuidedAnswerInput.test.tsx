import { fireEvent, render } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'

import { buildCharCorrection } from '@/modules/dictation/correction'
import { setupDom } from '@/test/setupDom'

import {
  GuidedAnswerInput,
  answerLineCells,
  insertNextHint,
} from './GuidedAnswerInput'

setupDom()

const WALL = 'As years passed and the wall grew, few returned home.'

function correctionFor(typed: string, expected = WALL) {
  return buildCharCorrection({
    action: 'check',
    expectedText: expected,
    typedAnswer: typed,
  })
}

function renderInput(props: Partial<Parameters<typeof GuidedAnswerInput>[0]>) {
  const onChange = vi.fn()
  const onCheck = vi.fn()
  const onReveal = vi.fn()
  const view = render(
    <GuidedAnswerInput
      correction={null}
      onChange={onChange}
      onCheck={onCheck}
      onReveal={onReveal}
      showAnswerImmediately
      showFullAnswer={false}
      status="idle"
      value=""
      {...props}
    />
  )

  return { onchange: onChange, onChange, onCheck, onReveal, view }
}

describe('insertNextHint', () => {
  test('sets the first hint when the draft is empty', () => {
    expect(insertNextHint('', 'Mengs')).toBe('Mengs')
  })

  test('appends with a single space and trims trailing whitespace', () => {
    expect(insertNextHint('the ', 'Mengs')).toBe('the Mengs')
    expect(insertNextHint('the Mengs', 'Jiangs')).toBe('the Mengs Jiangs')
  })
})

describe('answerLineCells - dual-channel colour + underline', () => {
  test('missing char is dotted amber, wrong char is solid red', () => {
    const cells = answerLineCells(
      correctionFor('One particlar', 'One particular gourd'),
      false
    )
    const wrong = cells.find(cell => cell.char === 'u')

    // "particlar" vs "particular": the 'u' slot holds the learner's wrong 'l',
    // shown as the expected 'u' with a solid red underline.
    expect(wrong?.className).toContain('decoration-solid')
    expect(wrong?.className).toContain('red')
  })

  test('missing tail chars are dotted amber (order -> ordered)', () => {
    const cells = answerLineCells(
      correctionFor('He order', 'He ordered many'),
      false
    )
    const dotted = cells.filter(cell =>
      cell.className.includes('decoration-dotted')
    )

    expect(dotted.length).toBeGreaterThan(0)
    expect(dotted[0].className).toContain('amber')
  })

  test('masks remaining words with * when showFullAnswer is off', () => {
    const line = answerLineCells(correctionFor('As years', WALL), false)
      .map(cell => cell.char)
      .join('')

    expect(line).toBe('As years passed *** *** **** ***** *** ******** *****')
  })
})

describe('GuidedAnswerInput - display gating', () => {
  test('shows the answer line only after check when showAnswerImmediately is on', () => {
    const { view } = renderInput({
      correction: correctionFor('As years'),
      status: 'incorrect',
    })

    expect(view.queryByTestId('answer-line')).not.toBeNull()
  })

  test('hides the answer line when showAnswerImmediately is off', () => {
    const { view } = renderInput({
      correction: correctionFor('As years'),
      showAnswerImmediately: false,
      status: 'incorrect',
    })

    expect(view.queryByTestId('answer-line')).toBeNull()
    // still announces the status for screen readers
    expect(view.getByRole('status').textContent).toBe('Incorrect')
  })

  test('announces "You are correct!" on a pass', () => {
    const { view } = renderInput({ status: 'correct' })

    expect(view.getByRole('status').textContent).toBe('You are correct!')
  })
})

describe('GuidedAnswerInput - keyboard', () => {
  test('Enter checks, Escape reveals', () => {
    const { view, onCheck, onReveal } = renderInput({ value: 'as years' })
    const textarea = view.getByLabelText('Type what you hear')

    fireEvent.keyDown(textarea, { key: 'Enter' })
    expect(onCheck).toHaveBeenCalledTimes(1)

    fireEvent.keyDown(textarea, { key: 'Escape' })
    expect(onReveal).toHaveBeenCalledTimes(1)
  })

  test('Shift+Enter does not check (allows newline)', () => {
    const { view, onCheck } = renderInput({ value: 'as years' })

    fireEvent.keyDown(view.getByLabelText('Type what you hear'), {
      key: 'Enter',
      shiftKey: true,
    })
    expect(onCheck).not.toHaveBeenCalled()
  })

  test('Tab fills the next hint while hints remain', () => {
    const meng = "the Mengs and their neighbors, the Jiangs, hadn't yet worry"
    const { view, onChange } = renderInput({
      correction: correctionFor('the', meng),
      status: 'incorrect',
      value: 'the',
    })

    const event = fireEvent.keyDown(view.getByLabelText('Type what you hear'), {
      key: 'Tab',
    })

    expect(onChange).toHaveBeenCalledWith('the Mengs')
    // preventDefault ran, so the focus did not move out
    expect(event).toBe(false)
  })

  test('Tab with no hints does not fill (focus escapes normally)', () => {
    const { view, onChange } = renderInput({
      correction: correctionFor('As years'),
      status: 'incorrect',
      value: 'As years',
    })

    const event = fireEvent.keyDown(view.getByLabelText('Type what you hear'), {
      key: 'Tab',
    })

    expect(onChange).not.toHaveBeenCalled()
    expect(event).toBe(true)
  })

  test('Shift+Tab always escapes even with hints', () => {
    const meng = 'the Mengs and Jiangs worried'
    const { view, onChange } = renderInput({
      correction: correctionFor('the', meng),
      status: 'incorrect',
      value: 'the',
    })

    fireEvent.keyDown(view.getByLabelText('Type what you hear'), {
      key: 'Tab',
      shiftKey: true,
    })

    expect(onChange).not.toHaveBeenCalled()
  })
})

import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'

import type { VocabRecallCardResult } from './vocabRecallSession'
import {
  tallyRecallSession,
  VOCAB_RECALL_STALE_ERROR,
} from './vocabRecallSession'
import { VocabRecallEnd } from './VocabRecallEnd'

function result(
  id: string,
  extra: Partial<VocabRecallCardResult> & {
    stage?: number
    status?: string
  } = {}
): VocabRecallCardResult {
  const { stage = 2, status = 'learning', ...rest } = extra

  return {
    error: null,
    isCorrect: true,
    item: { recallStage: stage, status } as VocabRecallCardResult['item'],
    itemId: `item-${id}`,
    saveState: 'saved',
    taskId: `task-${id}`,
    term: `word${id}`,
    ...rest,
  }
}

describe('tallyRecallSession', () => {
  test('counts reviewed, right, moved up, mastered and not saved', () => {
    expect(
      tallyRecallSession([
        result('1'),
        result('2', { status: 'mastered', stage: 7 }),
        result('3', { isCorrect: false, stage: 1 }),
        result('4', {
          error: VOCAB_RECALL_STALE_ERROR,
          isCorrect: false,
          saveState: 'notSaved',
        }),
      ])
    ).toEqual({ correct: 2, mastered: 1, movedUp: 1, notSaved: 1, reviewed: 4 })
  })
})

describe('VocabRecallEnd', () => {
  test('wins and the garden step first, then one Done', () => {
    const onDone = vi.fn()
    const { container } = render(
      <VocabRecallEnd
        knownBefore={499}
        onDone={onDone}
        onPlant={vi.fn()}
        results={[result('1', { stage: 7, status: 'mastered' }), result('2')]}
      />
    )

    expect(screen.getByText('Session done')).toBeInTheDocument()
    expect(
      screen.getByText('2 right, 1 moved a step, 1 mastered')
    ).toBeInTheDocument()
    // 499 known + 1 mastered crosses into Sprout.
    expect(
      screen.getByText('Your garden grew into a Sprout.')
    ).toBeInTheDocument()
    expect(container.querySelectorAll('[data-next-stop]')).toHaveLength(1)

    fireEvent.click(screen.getByRole('button', { name: 'Done' }))
    expect(onDone).toHaveBeenCalledTimes(1)
  })

  test('without a stage change it counts the words to the next stage', () => {
    render(
      <VocabRecallEnd
        knownBefore={100}
        onDone={vi.fn()}
        onPlant={vi.fn()}
        results={[result('1')]}
      />
    )

    expect(screen.getByText('400 words to Sprout')).toBeInTheDocument()
  })
})

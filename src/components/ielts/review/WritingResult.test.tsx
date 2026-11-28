import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'

import type {
  IeltsAttemptRecord,
  IeltsWritingTaskFeedback,
} from '@/modules/ielts/attempts/attemptRecords'
import type { IeltsWritingReviewTask } from '@/modules/ielts/services/resultPageData'
import { gradeIeltsWritingApi } from '@/requests/ieltsApi'

import { WritingResult } from './WritingResult'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}))
vi.mock('@/requests/ieltsApi', async importOriginal => ({
  ...(await importOriginal<typeof import('@/requests/ieltsApi')>()),
  gradeIeltsWritingApi: vi.fn(),
}))

const gradeMock = gradeIeltsWritingApi as ReturnType<typeof vi.fn>

function task(
  number: 1 | 2,
  overrides: Partial<IeltsWritingReviewTask> = {}
): IeltsWritingReviewTask {
  return {
    essay: 'Cities grow fast because people move for work.',
    minWords: number === 1 ? 150 : 250,
    prompt: 'Write about cities.',
    sampleAnswer: '',
    task: number,
    visual: null,
    ...overrides,
  }
}

const doneFeedback: IeltsWritingTaskFeedback = {
  band: 6,
  corrections: [
    {
      grammarLessonId: 'u05-l02',
      grammarLessonTitle: 'Present perfect',
      quote: 'grow fast',
      reason: 'Tense.',
      suggestion: 'have grown fast',
    },
  ],
  criteria: { cc: 6, gra: 6, lr: 6, taskResponse: 6 },
  error: '',
  improved: '',
  model: 'm',
  status: 'done',
  summary: 'Clear.',
}

function attempt(
  feedback: IeltsAttemptRecord['writingFeedback'] = null
): IeltsAttemptRecord {
  return {
    id: 'a1',
    skill: 'writing',
    writingFeedback: feedback,
  } as unknown as IeltsAttemptRecord
}

describe('WritingResult', () => {
  test('a failed grade shows its error in that task card', async () => {
    gradeMock.mockRejectedValueOnce(new Error('limit'))

    render(
      <WritingResult
        attempt={attempt()}
        tasks={[task(1), task(2)]}
      />
    )

    fireEvent.click(screen.getAllByRole('button', { name: 'Grade with AI' })[1])

    const alert = await screen.findByRole('alert')
    // In Task 2's card, not above the tasks.
    expect(alert.closest('[class*="rounded-panel"]')?.textContent).toContain(
      'Task 2'
    )
    expect(
      alert.closest('[class*="rounded-panel"]')?.textContent
    ).not.toContain('Task 1')
    expect(alert.querySelector('svg')).not.toBeNull()
  })

  test('no sample answer: no Show sample button', () => {
    render(
      <WritingResult
        attempt={attempt()}
        tasks={[task(1)]}
      />
    )

    expect(screen.queryByRole('button', { name: /sample/i })).toBeNull()
  })

  test('a blank essay: no Grade, one "Nothing written"', () => {
    render(
      <WritingResult
        attempt={attempt()}
        tasks={[task(1, { essay: '   ' })]}
      />
    )

    expect(screen.queryByRole('button', { name: 'Grade with AI' })).toBeNull()
    expect(screen.getAllByText('Nothing written')).toHaveLength(1)
  })

  test('a locked grammar lesson shows its title without a link; passed links the notes', () => {
    const { rerender } = render(
      <WritingResult
        attempt={attempt({ '1': doneFeedback })}
        grammarLinks={{ 'u05-l02': 'locked' }}
        tasks={[task(1)]}
      />
    )

    expect(screen.getByText('Study: Present perfect').closest('a')).toBeNull()

    rerender(
      <WritingResult
        attempt={attempt({ '1': doneFeedback })}
        grammarLinks={{ 'u05-l02': 'notes' }}
        tasks={[task(1)]}
      />
    )

    expect(
      screen.getByRole('link', { name: 'Study: Present perfect' })
    ).toHaveAttribute('href', '/grammar/lessons/u05-l02/notes')
  })

  test('feedback in the app language: plain Grade again, no language note', () => {
    render(
      <WritingResult
        attempt={attempt({ '1': { ...doneFeedback, language: 'en' } })}
        tasks={[task(1)]}
      />
    )

    expect(screen.getByRole('button', { name: 'Grade again' })).toBeEnabled()
    expect(document.querySelector('[data-other-language]')).toBeNull()
  })

  test('older feedback (no language: Vietnamese) offers Grade again in English, and says it uses a grading', () => {
    render(
      <WritingResult
        attempt={attempt({ '1': doneFeedback })}
        tasks={[task(1)]}
      />
    )

    expect(
      screen.getByRole('button', { name: 'Grade again in English' })
    ).toBeEnabled()
    expect(
      document.querySelector('[data-other-language]')?.textContent
    ).toContain("Uses one of today's gradings.")
  })

  test('a failed grading shows its code in words, never the raw message', () => {
    render(
      <WritingResult
        attempt={attempt({
          '1': { ...doneFeedback, error: 'providerFailed', status: 'failed' },
          '2': {
            ...doneFeedback,
            error: 'Upstream 502 from provider',
            status: 'failed',
          },
        })}
        tasks={[task(1), task(2)]}
      />
    )

    expect(
      screen.getByText('Grading failed: The AI grader did not answer.')
    ).toBeInTheDocument()
    expect(screen.queryByText(/Upstream 502/)).toBeNull()
    expect(
      screen.getByText('Grading failed: unknown reason')
    ).toBeInTheDocument()
  })
})

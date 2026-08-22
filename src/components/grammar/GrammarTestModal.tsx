'use client'

import { useCallback, useMemo, useState } from 'react'

import { MangaPanel } from '@/components/common/MangaPanel'
import { MangaButton } from '@/components/ui/MangaButton'
import type {
  GrammarTestQuestionApiRecord,
  GrammarTestReportRecord,
} from '@/modules/grammar/test/types'

import { SenseiPortrait } from './cast/SenseiPortrait'
import { SpeechBubble } from './comic/SpeechBubble'
import { L1RiskTag } from './GrammarRiskBadges'
import { GrammarTestReport } from './GrammarTestReport'

/**
 * The test itself.
 *
 * NOTHING is graded until Submit. That is the decision that makes this a test
 * rather than a drill session with a counter: knowing you are four-for-four
 * changes how you answer the fifth question, and one submit means one atomic
 * ladder write that a double-tap cannot apply twice.
 *
 * The consequence is that answers live only in this component until submit, so
 * closing the tab loses them. That is stated plainly on the way out rather than
 * hidden - a test you can resume is a different feature.
 */
export function GrammarTestModal({
  notice,
  onClose,
  questions,
  sessionId,
}: {
  notice: string | null
  onClose: () => void
  questions: GrammarTestQuestionApiRecord[]
  sessionId: string
}) {
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [report, setReport] = useState<GrammarTestReportRecord | null>(null)
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [confirmingClose, setConfirmingClose] = useState(false)

  const question = questions[index] ?? null
  const answered = useMemo(
    () => questions.filter(entry => (answers[entry.id] ?? '').trim()).length,
    [answers, questions]
  )
  const isLast = index + 1 >= questions.length

  const submit = useCallback(async () => {
    if (pending) return

    setPending(true)
    setMessage(null)

    try {
      const response = await fetch('/api/grammar/test/submit', {
        body: JSON.stringify({
          answers: questions.map(entry => ({
            answer: answers[entry.id] ?? '',
            questionId: entry.id,
          })),
          sessionId,
        }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })

      if (!response.ok) {
        const body: unknown = await response.json().catch(() => null)

        setMessage(
          (body as { message?: string } | null)?.message ??
            'Could not submit the test.'
        )
        return
      }

      setReport((await response.json()) as GrammarTestReportRecord)
    } finally {
      setPending(false)
    }
  }, [answers, pending, questions, sessionId])

  if (report)
    return (
      <GrammarTestReport
        onClose={onClose}
        report={report}
      />
    )

  if (!question)
    return (
      <MangaPanel
        eyebrow="Test"
        title="Nothing to answer"
      >
        <p className="text-manga-ink-soft text-base leading-7 font-semibold">
          This test has no questions.
        </p>
        <MangaButton onClick={onClose}>Close</MangaButton>
      </MangaPanel>
    )

  if (confirmingClose)
    return (
      <MangaPanel
        eyebrow="Test"
        title="Abandon this test?"
      >
        <div className="flex items-start gap-3">
          <SenseiPortrait expression="severe" />
          <SpeechBubble speaker="Sensei">
            Walk out now and nothing is recorded. Not the {answered} you
            answered, not the ones you did not. Your ladder stays exactly where
            it is.
          </SpeechBubble>
        </div>
        <div className="flex flex-wrap gap-2">
          <MangaButton
            onClick={onClose}
            tone="ink"
            type="button"
          >
            Abandon It
          </MangaButton>
          <MangaButton
            onClick={() => setConfirmingClose(false)}
            type="button"
          >
            Keep Going
          </MangaButton>
        </div>
      </MangaPanel>
    )

  return (
    <MangaPanel
      action={
        <span className="border-manga-black bg-manga-white border-2 px-2 py-0.5 font-sans text-xs font-black uppercase">
          {answered}/{questions.length} answered
        </span>
      }
      eyebrow={`Question ${index + 1} of ${questions.length}`}
      title={question.pointTitle}
    >
      <div className="flex flex-wrap items-center gap-2">
        <L1RiskTag l1Risk={question.l1Risk} />
        <span className="border-manga-black border-2 px-2 py-0.5 font-sans text-xs font-black uppercase">
          {question.cefrLevel}
        </span>
        {question.generated ? (
          <span className="border-manga-black bg-manga-pale-red border-2 px-2 py-0.5 font-sans text-xs font-black uppercase">
            Written for you
          </span>
        ) : null}
      </div>

      <p className="text-base leading-7 font-semibold">{question.prompt}</p>

      {question.choices?.length ? (
        <div className="grid gap-2">
          {question.choices.map(choice => (
            <MangaButton
              key={choice}
              onClick={() =>
                setAnswers(previous => ({ ...previous, [question.id]: choice }))
              }
              tone={answers[question.id] === choice ? 'ink' : 'paper'}
              type="button"
            >
              {choice}
            </MangaButton>
          ))}
        </div>
      ) : (
        <textarea
          className="border-manga-black bg-manga-white text-manga-black min-h-24 border-3 p-3 font-mono text-sm font-semibold"
          onChange={event =>
            setAnswers(previous => ({
              ...previous,
              [question.id]: event.target.value,
            }))
          }
          placeholder="Type your answer"
          value={answers[question.id] ?? ''}
        />
      )}

      {message ? (
        <p className="border-manga-black bg-manga-red text-manga-white border-3 p-3 text-sm font-black uppercase">
          {message}
        </p>
      ) : null}

      {notice ? (
        <p className="text-manga-ink-soft text-xs leading-5 font-semibold">
          {notice}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {index > 0 ? (
          <MangaButton
            disabled={pending}
            onClick={() => setIndex(previous => previous - 1)}
            type="button"
          >
            Back
          </MangaButton>
        ) : null}
        {isLast ? (
          <MangaButton
            disabled={pending}
            onClick={() => void submit()}
            tone="ink"
            type="button"
          >
            {pending ? 'Marking...' : 'Submit Test'}
          </MangaButton>
        ) : (
          <MangaButton
            disabled={pending}
            onClick={() => setIndex(previous => previous + 1)}
            tone="ink"
            type="button"
          >
            Next
          </MangaButton>
        )}
        <MangaButton
          disabled={pending}
          onClick={() => setConfirmingClose(true)}
          type="button"
        >
          Abandon
        </MangaButton>
      </div>
    </MangaPanel>
  )
}

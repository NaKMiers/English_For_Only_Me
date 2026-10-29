'use client'

import Link from 'next/link'
import { useState } from 'react'

import type {
  IeltsAttemptRecord,
  IeltsWritingTaskFeedback,
} from '@/modules/ielts/attempts/attemptRecords'
import { countEssayWords } from '@/modules/ielts/scoring/wordCount'
import type { IeltsWritingReviewTask } from '@/modules/ielts/services/resultPageData'
import { gradeIeltsWritingApi } from '@/requests/ieltsApi'

import { TaskVisual } from '../visual/TaskVisual'
import { ExamButton, ExamCard, StatTile } from '@/components/ielts/ui'

interface Props {
  attempt: IeltsAttemptRecord
  tasks: IeltsWritingReviewTask[]
}

/** The essay with every corrected quote marked; marks never overlap. */
function MarkedEssay({
  corrections,
  essay,
}: {
  corrections: IeltsWritingTaskFeedback['corrections']
  essay: string
}) {
  const marks = corrections
    .map((item, index) => ({ index, start: essay.indexOf(item.quote), item }))
    .filter(mark => mark.start >= 0)
    .sort((left, right) => left.start - right.start)
  const parts: React.ReactNode[] = []
  let cursor = 0

  for (const mark of marks) {
    if (mark.start < cursor) continue

    parts.push(essay.slice(cursor, mark.start))
    parts.push(
      <mark
        className="bg-manga-pale-red text-manga-black decoration-manga-red rounded-tag px-0.5 underline decoration-wavy decoration-2"
        key={mark.index}
        title={`${mark.item.suggestion}: ${mark.item.reason}`}
      >
        {mark.item.quote}
        <sup className="font-sans text-[10px] font-black">{mark.index + 1}</sup>
      </mark>
    )
    cursor = mark.start + mark.item.quote.length
  }

  parts.push(essay.slice(cursor))

  return (
    <div className="font-body border-manga-black rounded-control bg-manga-white border-2 p-4 text-[17px] leading-[1.8] whitespace-pre-wrap">
      {parts}
    </div>
  )
}

const CRITERIA = (task: 1 | 2) =>
  [
    ['taskResponse', task === 1 ? 'Task Achievement' : 'Task Response'],
    ['cc', 'Coherence & Cohesion'],
    ['lr', 'Lexical Resource'],
    ['gra', 'Grammatical Range & Accuracy'],
  ] as const

function TaskFeedback({
  busy,
  feedback,
  onGrade,
  task,
}: {
  busy: boolean
  feedback: IeltsWritingTaskFeedback | undefined
  onGrade: () => void
  task: IeltsWritingReviewTask
}) {
  const [showSample, setShowSample] = useState(false)
  const words = countEssayWords(task.essay)
  const status = busy ? 'grading' : (feedback?.status ?? 'pending')

  return (
    <ExamCard
      eyebrow={`${words} words · minimum ${task.minWords}`}
      title={`Task ${task.task}${feedback?.band != null ? ` · Band ${feedback.band.toFixed(1)}` : ''}`}
    >
      <details>
        <summary className="cursor-pointer font-sans text-sm font-black">
          Prompt
        </summary>
        <div className="mt-2 grid gap-3">
          <p className="whitespace-pre-line">{task.prompt}</p>
          {task.visual ? (
            <TaskVisual
              className="border-manga-black rounded-control max-w-2xl border-2"
              visual={task.visual}
            />
          ) : null}
        </div>
      </details>

      {status === 'done' && feedback?.criteria ? (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {CRITERIA(task.task).map(([key, label]) => (
              <StatTile
                className="min-h-24"
                key={key}
                label={label}
                value={feedback.criteria![key].toFixed(1)}
              />
            ))}
          </div>
          <p className="leading-[1.7]">{feedback.summary}</p>
          <MarkedEssay
            corrections={feedback.corrections}
            essay={task.essay}
          />
          {feedback.corrections.length ? (
            <ol className="grid gap-3">
              {feedback.corrections.map((item, index) => (
                <li
                  className="border-manga-black/20 grid gap-1 border-b pb-2"
                  key={index}
                >
                  <p>
                    <span className="font-sans text-xs font-black">
                      {index + 1}.
                    </span>{' '}
                    <s className="text-manga-red">{item.quote}</s>{' '}
                    <span aria-hidden="true">→</span>{' '}
                    <strong className="text-lesson-correct">
                      {item.suggestion}
                    </strong>
                  </p>
                  <p className="text-sm">{item.reason}</p>
                  {item.grammarLessonId ? (
                    <Link
                      className="w-fit font-sans text-sm font-black underline"
                      href={`/grammar/lessons/${item.grammarLessonId}`}
                    >
                      Study: {item.grammarLessonTitle}
                    </Link>
                  ) : null}
                </li>
              ))}
            </ol>
          ) : null}
          {feedback.improved ? (
            <div className="grid gap-1">
              <p className="font-sans text-sm font-black">
                Rewritten paragraph (about 1 band higher)
              </p>
              <p className="font-body border-manga-black rounded-control bg-manga-white border-2 p-3 leading-[1.7]">
                {feedback.improved}
              </p>
            </div>
          ) : null}
        </>
      ) : (
        <>
          <p role="status">
            {status === 'grading'
              ? `AI is grading Task ${task.task}...`
              : status === 'failed'
                ? `Grading failed: ${feedback?.error || 'unknown reason'}`
                : 'Not graded yet.'}
          </p>
          <div className="font-body border-manga-black rounded-control bg-manga-white border-2 p-4 text-[17px] leading-[1.8] whitespace-pre-wrap">
            {task.essay || '(Blank)'}
          </div>
        </>
      )}

      <div className="flex flex-wrap gap-2">
        <ExamButton
          disabled={busy || !task.essay.trim()}
          onClick={onGrade}
          tone={status === 'done' ? 'paper' : 'ink'}
          type="button"
        >
          {busy
            ? 'Grading...'
            : status === 'done'
              ? 'Grade again'
              : status === 'failed'
                ? 'Grade again'
                : 'Grade with AI'}
        </ExamButton>
        <ExamButton
          onClick={() => setShowSample(current => !current)}
          tone="paper"
          type="button"
        >
          {showSample ? 'Hide sample answer' : 'Show sample answer'}
        </ExamButton>
      </div>
      {showSample && task.sampleAnswer ? (
        <div className="font-body border-manga-black rounded-control bg-manga-white border-2 p-4 text-[17px] leading-[1.8] whitespace-pre-wrap">
          {task.sampleAnswer}
        </div>
      ) : null}
    </ExamCard>
  )
}

/** Writing result: per task the essay, criteria, corrections and grading. */
export function WritingResult({ attempt: initial, tasks }: Props) {
  const [attempt, setAttempt] = useState(initial)
  const [busyTask, setBusyTask] = useState<1 | 2 | null>(null)
  const [error, setError] = useState('')

  const grade = async (task: 1 | 2) => {
    setBusyTask(task)
    setError('')

    try {
      const result = await gradeIeltsWritingApi(attempt.id, task)

      setAttempt(result.attempt)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not grade.')
    } finally {
      setBusyTask(null)
    }
  }

  return (
    <div className="grid gap-6">
      <section
        aria-label="Result"
        className="grid grid-cols-2 gap-3 md:grid-cols-4"
      >
        <StatTile
          detail={
            attempt.scope.kind === 'part'
              ? 'A single task does not give a Writing band'
              : 'Task 2 counts double Task 1'
          }
          label="Writing band"
          tone="ink"
          value={
            attempt.writingBand === null ? '-' : attempt.writingBand.toFixed(1)
          }
        />
        {tasks.map(task => {
          const band =
            attempt.writingFeedback?.[String(task.task) as '1' | '2']?.band

          return (
            <StatTile
              key={task.task}
              label={`Task ${task.task}`}
              value={band == null ? '-' : band.toFixed(1)}
            />
          )
        })}
      </section>
      {error ? (
        <p
          className="border-manga-black bg-manga-pale-red rounded-control border-2 px-3 py-2"
          role="alert"
        >
          {error}
        </p>
      ) : null}
      {tasks.map(task => (
        <TaskFeedback
          busy={busyTask === task.task}
          feedback={attempt.writingFeedback?.[String(task.task) as '1' | '2']}
          key={task.task}
          onGrade={() => void grade(task.task)}
          task={task}
        />
      ))}
    </div>
  )
}

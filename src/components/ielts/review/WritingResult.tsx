'use client'

import { GraduationCap } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import type {
  IeltsAttemptRecord,
  IeltsWritingTaskFeedback,
} from '@/modules/ielts/attempts/attemptRecords'
import { SampleAnswerBody } from '@/components/ielts/widgets/SampleAnswerBody'
import { countEssayWords } from '@/modules/ielts/scoring/wordCount'
import type { IeltsWritingReviewTask } from '@/modules/ielts/services/resultPageData'
import { useMessages } from '@/i18n/client'
import type { Messages } from '@/i18n/messages'
import { format } from '@/i18n/format'
import { gradeIeltsWritingApi, ieltsErrorMessage } from '@/requests/ieltsApi'

import { TaskVisual } from '../visual/TaskVisual'
import { WritingPrompt } from '../widgets/WritingPrompt'
import { StatChip, StatStrip } from '@/components/journey/StatChip'
import { ExamButton, ExamCard } from '@/components/ielts/ui'

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
        className="bg-tint-soft text-ink decoration-danger rounded-tag px-0.5 underline decoration-wavy decoration-2"
        key={mark.index}
        title={`${mark.item.suggestion}: ${mark.item.reason}`}
      >
        {mark.item.quote}
        <sup className="font-sans text-[10px] font-semibold">
          {mark.index + 1}
        </sup>
      </mark>
    )
    cursor = mark.start + mark.item.quote.length
  }

  parts.push(essay.slice(cursor))

  return (
    <div className="font-body border-line rounded-control bg-surface border p-4 text-[17px] leading-[1.8] whitespace-pre-wrap">
      {parts}
    </div>
  )
}

// The official criteria names come from the catalogue (kept in English in
// every language, like the exam itself).
const CRITERIA = (
  task: 1 | 2,
  names: Messages['ielts']['writingResult']['criteria']
) =>
  [
    ['taskResponse', task === 1 ? names.taskAchievement : names.taskResponse],
    ['cc', names.cc],
    ['lr', names.lr],
    ['gra', names.gra],
  ] as const

/**
 * A graded task's details: the four criteria, the summary, the essay with
 * its corrections marked, the correction list and the rewritten paragraph.
 * Shared by the result page and the practice runner's "check task".
 */
export function WritingFeedbackDetails({
  essay,
  feedback,
  task,
}: {
  essay: string
  feedback: IeltsWritingTaskFeedback
  task: 1 | 2
}) {
  const t = useMessages().ielts.writingResult
  const criteria = feedback.criteria

  if (!criteria) return null

  return (
    <>
      <StatStrip>
        {CRITERIA(task, t.criteria).map(([key, label]) => (
          <StatChip
            icon={GraduationCap}
            key={key}
            label={label}
            labelAlways
            tone="ielts"
            value={criteria[key].toFixed(1)}
          />
        ))}
      </StatStrip>
      <p className="leading-[1.7]">{feedback.summary}</p>
      <MarkedEssay
        corrections={feedback.corrections}
        essay={essay}
      />
      {feedback.corrections.length ? (
        <ol className="grid gap-3">
          {feedback.corrections.map((item, index) => (
            <li
              className="border-line/20 grid gap-1 border-b pb-2"
              key={index}
            >
              <p>
                <span className="font-sans text-xs font-semibold">
                  {index + 1}.
                </span>{' '}
                <s className="text-danger">{item.quote}</s>{' '}
                <span aria-hidden="true">→</span>{' '}
                <strong className="text-lesson-correct">
                  {item.suggestion}
                </strong>
              </p>
              <p className="text-sm">{item.reason}</p>
              {item.grammarLessonId ? (
                <Link
                  className="w-fit font-sans text-sm font-semibold underline"
                  href={`/grammar/lessons/${item.grammarLessonId}`}
                >
                  {format(t.study, { title: item.grammarLessonTitle ?? '' })}
                </Link>
              ) : null}
            </li>
          ))}
        </ol>
      ) : null}
      {feedback.improved ? (
        <div className="grid gap-1">
          <p className="font-sans text-sm font-semibold">{t.rewritten}</p>
          <p className="font-body border-line rounded-control bg-surface border p-3 leading-[1.7]">
            {feedback.improved}
          </p>
        </div>
      ) : null}
    </>
  )
}

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
  const messages = useMessages()
  const t = messages.ielts.writingResult
  const [showSample, setShowSample] = useState(false)
  const words = countEssayWords(task.essay)
  const status = busy ? 'grading' : (feedback?.status ?? 'pending')

  return (
    <ExamCard
      eyebrow={format(t.wordsMin, { min: task.minWords, words })}
      title={
        feedback?.band != null
          ? format(t.taskBand, {
              band: feedback.band.toFixed(1),
              task: task.task,
            })
          : format(messages.ielts.parts.task, { part: task.task })
      }
    >
      <details>
        <summary className="cursor-pointer font-sans text-sm font-semibold">
          {t.prompt}
        </summary>
        <div className="mt-2 grid gap-3">
          <WritingPrompt text={task.prompt} />
          {task.visual ? (
            <TaskVisual
              className="border-line rounded-control max-w-2xl border"
              visual={task.visual}
            />
          ) : null}
        </div>
      </details>

      {status === 'done' && feedback?.criteria ? (
        <WritingFeedbackDetails
          essay={task.essay}
          feedback={feedback}
          task={task.task}
        />
      ) : (
        <>
          <p role="status">
            {status === 'grading'
              ? format(t.grading, { task: task.task })
              : status === 'failed'
                ? format(t.gradingFailed, {
                    reason: feedback?.error || t.unknownReason,
                  })
                : t.notGraded}
          </p>
          <div className="font-body border-line rounded-control bg-surface border p-4 text-[17px] leading-[1.8] whitespace-pre-wrap">
            {task.essay || t.blank}
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
            ? t.gradingButton
            : status === 'done'
              ? t.gradeAgain
              : status === 'failed'
                ? t.gradeAgain
                : t.gradeWithAi}
        </ExamButton>
        <ExamButton
          onClick={() => setShowSample(current => !current)}
          tone="paper"
          type="button"
        >
          {showSample ? t.hideSample : t.showSample}
        </ExamButton>
      </div>
      {showSample && task.sampleAnswer ? (
        <div className="font-body border-line rounded-control bg-surface grid gap-3 border p-4 text-[17px] leading-[1.8]">
          <SampleAnswerBody text={task.sampleAnswer} />
        </div>
      ) : null}
    </ExamCard>
  )
}

/** Writing result: per task the essay, criteria, corrections and grading. */
export function WritingResult({ attempt: initial, tasks }: Props) {
  const t = useMessages().ielts
  const router = useRouter()
  const [attempt, setAttempt] = useState(initial)
  const [busyTask, setBusyTask] = useState<1 | 2 | null>(null)
  const [error, setError] = useState('')

  const grade = async (task: 1 | 2) => {
    setBusyTask(task)
    setError('')

    try {
      const result = await gradeIeltsWritingApi(attempt.id, task)

      setAttempt(result.attempt)
      // The Writing band lives in the server-rendered result head.
      router.refresh()
    } catch (caught) {
      setError(ieltsErrorMessage(caught, t.writingResult.gradeFailed))
    } finally {
      setBusyTask(null)
    }
  }

  return (
    <div className="grid gap-6">
      {/* The writing band sits in the result head; each task's band is
          in its card title, so no tiles repeat them here. */}
      {error ? (
        <p
          className="border-line bg-tint-soft rounded-control border px-3 py-2"
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

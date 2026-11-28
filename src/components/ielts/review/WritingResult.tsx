'use client'

import { ChevronDown, GraduationCap } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import type {
  IeltsAttemptRecord,
  IeltsGradingErrorCode,
  IeltsWritingTaskFeedback,
} from '@/modules/ielts/attempts/attemptRecords'
import { SampleAnswerBody } from '@/components/ielts/widgets/SampleAnswerBody'
import { countEssayWords } from '@/modules/ielts/scoring/wordCount'
import type {
  GrammarLessonLink,
  IeltsWritingReviewTask,
} from '@/modules/ielts/services/resultPageData'
import { useLocale, useMessages } from '@/i18n/client'
import type { Messages } from '@/i18n/messages'
import { format } from '@/i18n/format'
import { gradeIeltsWritingApi, ieltsErrorMessage } from '@/requests/ieltsApi'

import { TaskVisual } from '../visual/TaskVisual'
import { WritingPrompt } from '../widgets/WritingPrompt'
import { InlineNotice } from '@/components/common/InlineNotice'
import { StatChip, StatStrip } from '@/components/journey/StatChip'
import { ExamButton, ExamCard } from '@/components/ielts/ui'

interface Props {
  attempt: IeltsAttemptRecord
  /** Per grammar lesson: notes, the lesson, or no link while locked. */
  grammarLinks?: Record<string, GrammarLessonLink>
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
  grammarLinks,
  task,
}: {
  essay: string
  feedback: IeltsWritingTaskFeedback
  /** Without it (the practice runner) every lesson links to the lesson. */
  grammarLinks?: Record<string, GrammarLessonLink>
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
              <p className="text-ink-soft text-sm">{item.reason}</p>
              {item.grammarLessonId ? (
                <GrammarLessonLinkLine
                  link={grammarLinks?.[item.grammarLessonId] ?? 'lesson'}
                  lessonId={item.grammarLessonId}
                  title={format(t.study, {
                    title: item.grammarLessonTitle ?? '',
                  })}
                />
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

/**
 * A correction's grammar lesson: its notes once passed, the lesson while it
 * is open, the plain title while it is locked (its page would only send the
 * learner back to the path).
 */
function GrammarLessonLinkLine({
  link,
  lessonId,
  title,
}: {
  link: GrammarLessonLink
  lessonId: string
  title: string
}) {
  if (link === 'locked')
    return <span className="text-ink-soft font-sans text-sm">{title}</span>

  return (
    <Link
      className="soft-press hover-pop rounded-tag w-fit font-sans text-sm font-medium underline"
      href={
        link === 'notes'
          ? `/grammar/lessons/${lessonId}/notes`
          : `/grammar/lessons/${lessonId}`
      }
    >
      {title}
    </Link>
  )
}

/**
 * A failed grading's reason in the learner's language: the stored code's
 * catalogue text. Older feedback stored a raw (English) message, which is
 * not shown.
 */
function gradingErrorText(
  error: string | undefined,
  t: Messages['ielts']['writingResult']
) {
  return error && error in t.gradingErrors
    ? t.gradingErrors[error as IeltsGradingErrorCode]
    : t.unknownReason
}

function TaskFeedback({
  busy,
  error,
  feedback,
  grammarLinks,
  onGrade,
  task,
}: {
  busy: boolean
  /** Why the last Grade press failed, shown by its button. */
  error: string | null
  feedback: IeltsWritingTaskFeedback | undefined
  grammarLinks?: Record<string, GrammarLessonLink>
  onGrade: () => void
  task: IeltsWritingReviewTask
}) {
  const messages = useMessages()
  const t = messages.ielts.writingResult
  const [showSample, setShowSample] = useState(false)
  const words = countEssayWords(task.essay)
  const status = busy ? 'grading' : (feedback?.status ?? 'pending')
  const blank = !task.essay.trim()
  const hasSample = task.sampleAnswer.trim().length > 0
  const locale = useLocale()
  // Feedback keeps the language it was written in (older feedback has no
  // language: it was written in Vietnamese). In another language than the
  // app's, Grade again offers the app's language; never automatic, since
  // it spends one of today's gradings.
  const otherLanguage =
    status === 'done' && (feedback?.language ?? 'vi') !== locale
      ? (feedback?.language ?? 'vi')
      : null
  const languageNames = messages.common.language.names

  return (
    <ExamCard
      // Grade sits in the card's header; a blank essay has nothing to grade.
      action={
        blank ? null : (
          <ExamButton
            disabled={busy}
            onClick={onGrade}
            tone={status === 'done' ? 'paper' : 'ink'}
            type="button"
          >
            {busy
              ? t.gradingButton
              : otherLanguage
                ? format(t.gradeAgainIn, { language: languageNames[locale] })
                : status === 'done' || status === 'failed'
                  ? t.gradeAgain
                  : t.gradeWithAi}
          </ExamButton>
        )
      }
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
      {error ? <InlineNotice tone="error">{error}</InlineNotice> : null}
      {otherLanguage ? (
        <p
          className="text-ink-soft text-sm"
          data-other-language=""
        >
          {format(t.otherLanguage, {
            language: languageNames[otherLanguage],
          })}{' '}
          {t.usesGrading}
        </p>
      ) : null}

      <details className="group">
        <summary className="soft-press hover-pop text-ink-soft hover:text-ink rounded-control flex min-h-11 w-fit cursor-pointer list-none items-center gap-1.5 px-2 font-sans text-sm font-medium">
          <ChevronDown
            aria-hidden="true"
            className="size-4 transition-transform group-open:rotate-180"
          />
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

      {blank ? (
        <p className="text-ink-soft">{t.nothingWritten}</p>
      ) : status === 'done' && feedback?.criteria ? (
        <WritingFeedbackDetails
          essay={task.essay}
          feedback={feedback}
          grammarLinks={grammarLinks}
          task={task.task}
        />
      ) : (
        <>
          <p role="status">
            {status === 'grading'
              ? format(t.grading, { task: task.task })
              : status === 'failed'
                ? format(t.gradingFailed, {
                    reason: gradingErrorText(feedback?.error, t),
                  })
                : t.notGraded}
          </p>
          <div className="font-body border-line rounded-control bg-surface border p-4 text-[17px] leading-[1.8] whitespace-pre-wrap">
            {task.essay}
          </div>
        </>
      )}

      {hasSample ? (
        <div>
          <ExamButton
            onClick={() => setShowSample(current => !current)}
            tone="paper"
            type="button"
          >
            {showSample ? t.hideSample : t.showSample}
          </ExamButton>
        </div>
      ) : null}
      {showSample && task.sampleAnswer ? (
        <div className="font-body border-line rounded-control bg-surface grid gap-3 border p-4 text-[17px] leading-[1.8]">
          <SampleAnswerBody text={task.sampleAnswer} />
        </div>
      ) : null}
    </ExamCard>
  )
}

/** Writing result: per task the essay, criteria, corrections and grading. */
export function WritingResult({
  attempt: initial,
  grammarLinks,
  tasks,
}: Props) {
  const t = useMessages().ielts
  const router = useRouter()
  const [attempt, setAttempt] = useState(initial)
  const [busyTask, setBusyTask] = useState<1 | 2 | null>(null)
  // One error per task, shown in that task's card by its Grade button.
  const [errors, setErrors] = useState<Partial<Record<1 | 2, string>>>({})

  const grade = async (task: 1 | 2) => {
    setBusyTask(task)
    setErrors(({ [task]: _cleared, ...rest }) => rest)

    try {
      const result = await gradeIeltsWritingApi(attempt.id, task)

      setAttempt(result.attempt)
      // The Writing band lives in the server-rendered result head.
      router.refresh()
    } catch (caught) {
      setErrors(current => ({
        ...current,
        [task]: ieltsErrorMessage(caught, t.writingResult.gradeFailed),
      }))
    } finally {
      setBusyTask(null)
    }
  }

  return (
    <div className="grid gap-6">
      {/* The writing band sits in the result head; each task's band is
          in its card title, so no tiles repeat them here. */}
      {tasks.map(task => (
        <TaskFeedback
          busy={busyTask === task.task}
          error={errors[task.task] ?? null}
          feedback={attempt.writingFeedback?.[String(task.task) as '1' | '2']}
          grammarLinks={grammarLinks}
          key={task.task}
          onGrade={() => void grade(task.task)}
          task={task}
        />
      ))}
    </div>
  )
}

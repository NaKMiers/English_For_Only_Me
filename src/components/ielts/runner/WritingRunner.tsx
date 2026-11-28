'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { SampleAnswerPanel } from '@/components/ielts/widgets/SampleAnswerPanel'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { INTL_LOCALES } from '@/i18n/config'
import { useLocale, useMessages } from '@/i18n/client'
import { format, plural } from '@/i18n/format'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import type {
  IeltsAttemptRecord,
  IeltsWritingTaskFeedback,
} from '@/modules/ielts/attempts/attemptRecords'
import {
  IELTS_ESSAY_MAX_LENGTH,
  IELTS_SKILL_LABELS,
} from '@/modules/ielts/constants'
import type { IeltsPublicSection } from '@/modules/ielts/publicView'
import { countEssayWords } from '@/modules/ielts/scoring/wordCount'
import { checkIeltsTaskApi, ieltsErrorMessage } from '@/requests/ieltsApi'

import { WritingFeedbackDetails } from '../review/WritingResult'
import { TaskVisual } from '../visual/TaskVisual'
import { WritingPrompt } from '../widgets/WritingPrompt'
import { ExamButton, segmentClass } from '../ui'
import {
  PartSwitcher,
  RunnerFooter,
  type SkillLinkTarget,
} from './RunnerFooter'
import { CheckButton, ResetPartButton } from './PracticeActions'
import { useResizableSplit } from './ResizableSplit'
import { RunnerToolbar } from './RunnerToolbar'
import { useAttemptAnswers } from './useAttemptAnswers'
import { useMockDeadline } from './useMockDeadline'

interface Props {
  attempt: IeltsAttemptRecord
  backHref: string
  /** Practice only: the test's next and previous skills, for the bottom bar. */
  next?: SkillLinkTarget | null
  prev?: SkillLinkTarget | null
  sections: IeltsPublicSection[]
  /** Task to show first, from the test page's task links. */
  startPart?: number | null
  testTitle: string
}

/**
 * Writing runner: the task (prompt and Task 1 visual) on the left, the essay
 * editor on the right, and the bottom bar with the task switcher between the
 * skill links. Essays autosave like objective answers (keys "1" and
 * "2"); grading happens on the result page after submit. In practice the
 * learner can also ask the AI examiner about one task before submitting.
 */
export function WritingRunner({
  attempt,
  backHref,
  next = null,
  prev = null,
  sections,
  startPart = null,
  testTitle,
}: Props) {
  const messages = useMessages()
  const t = messages.ielts
  const locale = useLocale()
  const router = useRouter()
  const isMock = attempt.mode === 'mock'
  const isPractice = attempt.mode === 'practice'
  const open = attempt.status === 'in_progress'
  const [submitting, setSubmitting] = useState(false)
  const locked = !open || submitting
  // Filled in below once `finish` exists; the hook calls it on a late save.
  const finishRef = useRef<() => void>(() => undefined)
  const { answers, clearAnswers, saveState, setAnswer, submit } =
    useAttemptAnswers({
      attempt,
      enabled: !locked,
      onTimeUp: () => finishRef.current(),
    })
  const tasks = useMemo(
    () => sections.filter(section => section.writing),
    [sections]
  )
  const [taskIndex, setTaskIndex] = useState(() =>
    Math.max(
      0,
      sections.findIndex(section => section.order === startPart)
    )
  )
  const [mobileTab, setMobileTab] = useState<'task' | 'essay'>('task')
  const [spellCheck, setSpellCheck] = useState(false)
  const [notice, setNotice] = useState('')
  const [confirm, setConfirm] = useState<string | null>(null)
  const [exitOpen, setExitOpen] = useState(false)
  const split = useResizableSplit({
    defaultPercent: 50,
    storageKey: 'ielts-writing-split',
  })
  // Practice checks per task, with the essay as it was when checked: the
  // marked quotes point into that text, not the one being edited.
  const [checks, setChecks] = useState<
    Record<string, { essay: string; feedback: IeltsWritingTaskFeedback }>
  >({})
  const [checkingTask, setCheckingTask] = useState<string | null>(null)
  const current = tasks[taskIndex] ?? tasks[0]
  const writing = current?.writing
  const taskKey = String(writing?.task ?? 1)
  const essay = typeof answers[taskKey] === 'string' ? answers[taskKey] : ''
  const words = countEssayWords(essay)
  const canCheck = isPractice && !locked
  const check = checks[taskKey]
  const checkScore =
    check?.feedback.band != null
      ? format(t.writing.band, { band: check.feedback.band.toFixed(1) })
      : null

  const checkTask = async () => {
    const key = taskKey
    const text = essay

    if (!text.trim()) {
      setNotice(format(t.writing.writeFirst, { task: key }))
      return
    }

    setCheckingTask(key)

    try {
      const { feedback } = await checkIeltsTaskApi(
        attempt.id,
        Number(key) as 1 | 2,
        text
      )

      setChecks(current => ({ ...current, [key]: { essay: text, feedback } }))
      setNotice(
        feedback.band != null
          ? format(t.writing.checkedBand, {
              band: feedback.band.toFixed(1),
              task: key,
            })
          : format(t.writing.checked, { task: key })
      )
    } catch (error) {
      setNotice(
        format(t.writing.checkFailed, {
          message: ieltsErrorMessage(error, t.runner.tryAgain),
          task: key,
        })
      )
    } finally {
      setCheckingTask(null)
    }
  }

  const resetTask = () => {
    const key = taskKey

    clearAnswers([Number(key)])
    setChecks(({ [key]: _dropped, ...rest }) => rest)
    setNotice(format(t.writing.taskReset, { task: key }))
  }

  const finish = useCallback(async () => {
    setSubmitting(true)
    setConfirm(null)

    const outcome = await submit()

    if (outcome.ok) {
      router.push(`/ielts/attempts/${attempt.id}`)
      return
    }

    setSubmitting(false)
    setNotice(format(t.runner.submitFailed, { message: outcome.message }))
  }, [attempt.id, router, submit, t])

  useEffect(() => {
    finishRef.current = () => void finish()
  })

  const secondsLeft = useMockDeadline({
    deadlineAt: isMock && open ? attempt.deadlineAt : null,
    onExpire: () => {
      setNotice(t.runner.timeUpSubmitting)
      void finish()
    },
    onWarning: () => setNotice(t.runner.fiveMinutes),
  })

  useEffect(() => {
    if (!isMock || locked) return

    const onBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault()

    window.addEventListener('beforeunload', onBeforeUnload)

    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [isMock, locked])

  const requestSubmit = () => {
    const short = tasks
      .map(section => section.writing)
      .filter(item => item !== null)
      .filter(item => {
        const text = answers[String(item.task)]

        return (
          countEssayWords(typeof text === 'string' ? text : '') < item.minWords
        )
      })
      .map(item => format(t.parts.task, { part: item.task }))

    if (short.length)
      setConfirm(
        plural(t.writing.underMinimum, short.length, {
          tasks: new Intl.ListFormat(INTL_LOCALES[locale], {
            type: 'conjunction',
          }).format(short),
        })
      )
    else void finish()
  }

  if (!writing) return null

  return (
    <div className="flex h-full min-h-0 flex-col">
      <RunnerToolbar
        backHref={backHref}
        modeLabel={isMock ? t.modes.mock : t.modes.practice}
        onBack={isMock && open ? () => setExitOpen(true) : undefined}
        onSubmit={requestSubmit}
        saveState={open ? saveState : 'saved'}
        secondsLeft={secondsLeft}
        submitDisabled={!open}
        submitting={submitting}
        title={`${testTitle} · ${IELTS_SKILL_LABELS.writing}`}
        toggles={
          isMock ? null : (
            <div className="flex items-center gap-3">
              <ResetPartButton
                disabled={locked}
                name={format(t.parts.task, { part: writing.task })}
                onReset={resetTask}
              />
              <Label className="text-ink flex items-center gap-2 text-xs font-semibold">
                <Switch
                  checked={spellCheck}
                  onCheckedChange={setSpellCheck}
                />
                {t.writing.spellCheck}
              </Label>
            </div>
          )
        }
      />

      {notice ? (
        <p
          className="border-line text-ink bg-notice-soft flex shrink-0 items-center justify-between gap-3 border-b px-4 py-2 text-sm"
          role="status"
        >
          {notice}
          <button
            className="text-brand text-xs font-semibold underline"
            onClick={() => setNotice('')}
            type="button"
          >
            {messages.common.actions.close}
          </button>
        </p>
      ) : null}

      {/* Segmented toggles (aria-pressed): the documented raw-button exception. */}
      <div className="border-line bg-exam-surface flex shrink-0 justify-end gap-2 border-b px-3 py-2 lg:hidden">
        {(
          [
            ['task', t.writing.prompt],
            ['essay', t.writing.essay],
          ] as const
        ).map(([value, label]) => (
          <button
            aria-pressed={mobileTab === value}
            className={segmentClass(mobileTab === value, 'min-h-10')}
            key={value}
            onClick={() => setMobileTab(value)}
            type="button"
          >
            {label}
          </button>
        ))}
      </div>

      <div
        className={cn(
          'grid min-h-0 flex-1',
          split.gridClassName,
          split.dragging && 'select-none'
        )}
        style={split.style}
      >
        <section
          aria-label={t.writing.prompt}
          className={cn(
            'bg-exam-surface min-h-0 overflow-y-auto px-3 py-4 sm:px-3 lg:block',
            mobileTab === 'task' ? 'block' : 'hidden'
          )}
        >
          <div className="font-body grid w-full gap-4 text-[17px] leading-[1.7]">
            <h2 className="text-ink-soft font-sans text-lg leading-none font-semibold tracking-wide">
              {format(t.parts.task, { part: writing.task })}
            </h2>
            <WritingPrompt text={writing.prompt} />
            {writing.visual ? (
              <TaskVisual
                className="p-0"
                visual={writing.visual}
              />
            ) : null}
            {writing.sampleAnswer ? (
              <SampleAnswerPanel
                key={taskKey}
                text={writing.sampleAnswer}
              />
            ) : null}
          </div>
        </section>
        {split.divider}
        <section
          aria-label={t.writing.essay}
          className={cn(
            'bg-exam-surface in-data-[theme=lightup]:bg-tint-soft/60 min-h-0 overflow-y-auto px-3 py-4 sm:px-3 lg:flex',
            mobileTab === 'essay' ? 'flex' : 'hidden',
            'flex-col gap-2'
          )}
        >
          <Label
            className="text-ink text-sm font-semibold"
            htmlFor={`ielts-essay-${taskKey}`}
          >
            {format(t.writing.essayLabel, { task: writing.task })}
          </Label>
          <Textarea
            autoCapitalize="off"
            autoCorrect="off"
            className="font-body border-line text-ink focus-visible:border-brand rounded-control bg-surface h-[min(60vh,520px)] min-h-60 shrink-0 resize-y border p-4 text-[17px] leading-[1.75] shadow-none focus-visible:ring-0"
            id={`ielts-essay-${taskKey}`}
            maxLength={IELTS_ESSAY_MAX_LENGTH}
            onChange={event => setAnswer(Number(taskKey), event.target.value)}
            readOnly={locked}
            spellCheck={!isMock && spellCheck}
            value={essay}
          />
          {/* A thin bar toward the minimum: each sentence visibly counts. */}
          <Progress
            aria-label={format(t.writing.wordsMin, {
              min: writing.minWords,
              words,
            })}
            className="items-center"
            tone="ielts"
            trackClassName="h-1.5"
            value={Math.min(100, Math.round((words / writing.minWords) * 100))}
          >
            <span
              className={cn(
                'order-last w-full text-sm font-medium tabular-nums',
                words < writing.minWords
                  ? 'text-ink-soft'
                  : 'text-lesson-correct'
              )}
            >
              {format(t.writing.wordsMin, { min: writing.minWords, words })}
            </span>
          </Progress>
          {/* Phones and tablets: the footer has no room for it. */}
          {canCheck ? (
            <CheckButton
              busy={checkingTask === taskKey}
              className="w-full lg:hidden"
              label={format(t.writing.checkTask, { task: writing.task })}
              onCheck={() => void checkTask()}
              score={checkScore}
            />
          ) : null}
          {check ? (
            <div className="border-line rounded-control bg-tint mt-2 grid gap-3 border p-3">
              <p className="font-sans text-base font-semibold">
                {check.feedback.band != null
                  ? format(t.writing.aiCheckBand, {
                      band: check.feedback.band.toFixed(1),
                      task: writing.task,
                    })
                  : format(t.writing.aiCheck, { task: writing.task })}
              </p>
              {check.essay !== essay ? (
                <p className="text-ink-soft text-sm">
                  {t.writing.essayChanged}
                </p>
              ) : null}
              <WritingFeedbackDetails
                essay={check.essay}
                feedback={check.feedback}
                task={writing.task}
              />
            </div>
          ) : null}
        </section>
      </div>

      {tasks.length > 1 || (isPractice && (prev || next)) || canCheck ? (
        <RunnerFooter
          action={
            canCheck ? (
              <CheckButton
                busy={checkingTask === taskKey}
                label={format(t.writing.checkTask, { task: writing.task })}
                onCheck={() => void checkTask()}
                score={checkScore}
              />
            ) : null
          }
          next={isPractice ? next : null}
          prev={isPractice ? prev : null}
        >
          {tasks.length > 1 ? (
            <PartSwitcher
              current={taskIndex}
              items={tasks.map((section, index) => {
                const item = section.writing
                const text = item ? answers[String(item.task)] : ''
                const count = countEssayWords(
                  typeof text === 'string' ? text : ''
                )
                const name = format(t.parts.task, {
                  part: item?.task ?? index + 1,
                })

                return {
                  done: Boolean(item && count >= item.minWords),
                  label: format(t.writing.taskWordsLabel, {
                    count,
                    task: name,
                  }),
                  part: index,
                  text: name,
                  title: format(t.writing.taskWordsTitle, {
                    count,
                    task: name,
                  }),
                }
              })}
              onChange={setTaskIndex}
            />
          ) : null}
        </RunnerFooter>
      ) : null}

      <Dialog
        onOpenChange={next => (next ? null : setConfirm(null))}
        open={confirm !== null}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.writing.submitTitle}</DialogTitle>
            <DialogDescription>{confirm}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <ExamButton
              onClick={() => setConfirm(null)}
              tone="paper"
              type="button"
            >
              {t.writing.keepWriting}
            </ExamButton>
            <ExamButton
              onClick={() => void finish()}
              tone="ink"
              type="button"
            >
              {t.runner.submit}
            </ExamButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        onOpenChange={setExitOpen}
        open={exitOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.runner.leaveTitle}</DialogTitle>
            <DialogDescription>{t.runner.leaveBody}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <ExamButton
              onClick={() => setExitOpen(false)}
              tone="paper"
              type="button"
            >
              {t.runner.stay}
            </ExamButton>
            <ExamButton
              href={backHref}
              tone="ink"
            >
              {t.runner.leave}
            </ExamButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

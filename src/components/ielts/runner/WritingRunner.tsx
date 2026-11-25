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
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import type {
  IeltsAttemptRecord,
  IeltsWritingTaskFeedback,
} from '@/modules/ielts/attempts/attemptRecords'
import { IELTS_ESSAY_MAX_LENGTH } from '@/modules/ielts/constants'
import type { IeltsPublicSection } from '@/modules/ielts/publicView'
import { countEssayWords } from '@/modules/ielts/scoring/wordCount'
import { checkIeltsTaskApi } from '@/requests/ieltsApi'

import { WritingFeedbackDetails } from '../review/WritingResult'
import { TaskVisual } from '../visual/TaskVisual'
import { WritingPrompt } from '../widgets/WritingPrompt'
import { ExamButton, segmentClass } from '../ui'
import { CheckButton, ResetPartButton } from './PracticeActions'
import { useResizableSplit } from './ResizableSplit'
import { RunnerToolbar } from './RunnerToolbar'
import { useAttemptAnswers } from './useAttemptAnswers'
import { useMockDeadline } from './useMockDeadline'

interface Props {
  attempt: IeltsAttemptRecord
  backHref: string
  sections: IeltsPublicSection[]
  /** Task to show first, from the test page's task links. */
  startPart?: number | null
  testTitle: string
}

/**
 * Writing runner: the task (prompt and Task 1 visual) on the left, the essay
 * editor on the right. Essays autosave like objective answers (keys "1" and
 * "2"); grading happens on the result page after submit. In practice the
 * learner can also ask the AI examiner about one task before submitting.
 */
export function WritingRunner({
  attempt,
  backHref,
  sections,
  startPart = null,
  testTitle,
}: Props) {
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
  // Practice checks per task, with the essay as it was when checked: the
  // marked quotes point into that text, not the one being edited.
  const [checks, setChecks] = useState<
    Record<string, { essay: string; feedback: IeltsWritingTaskFeedback }>
  >({})
  const [checkingTask, setCheckingTask] = useState<string | null>(null)
  const split = useResizableSplit({
    defaultPercent: 50,
    storageKey: 'ielts-writing-split',
  })
  const current = tasks[taskIndex] ?? tasks[0]
  const writing = current?.writing
  const taskKey = String(writing?.task ?? 1)
  const essay = typeof answers[taskKey] === 'string' ? answers[taskKey] : ''
  const words = countEssayWords(essay)
  const canCheck = isPractice && !locked
  const check = checks[taskKey]
  const checkScore =
    check?.feedback.band != null
      ? `Band ${check.feedback.band.toFixed(1)}`
      : null

  const checkTask = async () => {
    const key = taskKey
    const text = essay

    if (!text.trim()) {
      setNotice(`Write Task ${key} before checking it.`)
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
          ? `Task ${key}: band ${feedback.band.toFixed(1)} (estimate).`
          : `Task ${key} checked.`
      )
    } catch (error) {
      setNotice(
        `Could not check Task ${key}: ${error instanceof Error ? error.message : 'try again.'}`
      )
    } finally {
      setCheckingTask(null)
    }
  }

  const resetTask = () => {
    const key = taskKey

    clearAnswers([Number(key)])
    setChecks(({ [key]: _dropped, ...rest }) => rest)
    setNotice(`Task ${key} reset.`)
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
    setNotice(`Could not submit: ${outcome.message}`)
  }, [attempt.id, router, submit])

  useEffect(() => {
    finishRef.current = () => void finish()
  })

  const secondsLeft = useMockDeadline({
    deadlineAt: isMock && open ? attempt.deadlineAt : null,
    onExpire: () => {
      setNotice('Time is up. Submitting...')
      void finish()
    },
    onWarning: () => setNotice('5 minutes remaining.'),
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
      .map(item => `Task ${item.task}`)

    if (short.length)
      setConfirm(
        `${short.join(' and ')} ${short.length > 1 ? 'are' : 'is'} under the minimum word count. Submit anyway?`
      )
    else void finish()
  }

  if (!writing) return null

  return (
    <div className="flex h-full min-h-0 flex-col">
      <RunnerToolbar
        backHref={backHref}
        modeLabel={isMock ? 'Mock' : 'Practice'}
        onBack={isMock && open ? () => setExitOpen(true) : undefined}
        onSubmit={requestSubmit}
        saveState={open ? saveState : 'saved'}
        secondsLeft={secondsLeft}
        submitDisabled={!open}
        submitting={submitting}
        title={`${testTitle} · Writing`}
        toggles={
          isMock ? null : (
            <div className="flex items-center gap-3">
              <ResetPartButton
                disabled={locked}
                name={`Task ${writing.task}`}
                onReset={resetTask}
              />
              <Label className="text-manga-black flex items-center gap-2 text-xs font-semibold">
                <Switch
                  checked={spellCheck}
                  onCheckedChange={setSpellCheck}
                />
                Spell check
              </Label>
            </div>
          )
        }
      />

      {notice ? (
        <p
          className="border-manga-black text-manga-black flex shrink-0 items-center justify-between gap-3 border-b-2 bg-yellow-100 px-4 py-2 text-sm"
          role="status"
        >
          {notice}
          <button
            className="text-manga-red text-xs font-semibold underline"
            onClick={() => setNotice('')}
            type="button"
          >
            Close
          </button>
        </p>
      ) : null}

      {/* Segmented toggles (aria-pressed): the documented raw-button exception. */}
      <div className="border-manga-black bg-manga-white flex shrink-0 flex-wrap gap-2 border-b-2 px-3 py-2">
        {tasks.length > 1
          ? tasks.map((section, index) => (
              <button
                aria-pressed={index === taskIndex}
                className={segmentClass(index === taskIndex, 'min-h-10')}
                key={section.key}
                onClick={() => setTaskIndex(index)}
                type="button"
              >
                Task {section.writing?.task}
              </button>
            ))
          : null}
        {canCheck ? (
          <div className="ml-auto flex items-center max-lg:hidden">
            <CheckButton
              busy={checkingTask === taskKey}
              label={`Check Task ${writing.task}`}
              onCheck={() => void checkTask()}
              score={checkScore}
            />
          </div>
        ) : null}
        <div className="ml-auto flex gap-2 lg:hidden">
          {(
            [
              ['task', 'Prompt'],
              ['essay', 'Essay'],
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
          aria-label="Prompt"
          className={cn(
            'bg-manga-white min-h-0 overflow-y-auto px-4 py-4 sm:px-6 lg:block',
            mobileTab === 'task' ? 'block' : 'hidden'
          )}
        >
          <div className="font-body mx-auto grid max-w-[68ch] gap-4 text-[17px] leading-[1.7]">
            <h2 className="font-sans text-[22px] font-black">
              Writing Task {writing.task}
            </h2>
            <WritingPrompt text={writing.prompt} />
            {writing.visual ? (
              <TaskVisual
                className="border-manga-black rounded-control border-2"
                visual={writing.visual}
              />
            ) : null}
          </div>
        </section>
        {split.divider}
        <section
          aria-label="Essay"
          className={cn(
            'bg-manga-pale-red/60 min-h-0 overflow-y-auto px-4 py-4 sm:px-6 lg:flex',
            mobileTab === 'essay' ? 'flex' : 'hidden',
            'flex-col gap-2'
          )}
        >
          <Label
            className="text-manga-black text-sm font-semibold"
            htmlFor={`ielts-essay-${taskKey}`}
          >
            Task {writing.task} essay
          </Label>
          <Textarea
            autoCapitalize="off"
            autoCorrect="off"
            className="font-body border-manga-black text-manga-black focus-visible:border-manga-red rounded-control bg-manga-white min-h-[50vh] flex-1 resize-none border-2 p-4 text-[17px] leading-[1.75] shadow-none focus-visible:ring-0"
            id={`ielts-essay-${taskKey}`}
            maxLength={IELTS_ESSAY_MAX_LENGTH}
            onChange={event => setAnswer(Number(taskKey), event.target.value)}
            readOnly={locked}
            spellCheck={!isMock && spellCheck}
            value={essay}
          />
          <p
            className={cn(
              'text-sm font-semibold tabular-nums',
              words < writing.minWords
                ? 'text-muted-foreground'
                : 'text-lesson-correct'
            )}
          >
            {words} words · minimum {writing.minWords}
          </p>
          {/* Phones and tablets: the task bar has no room for it. */}
          {canCheck ? (
            <CheckButton
              busy={checkingTask === taskKey}
              className="w-full lg:hidden"
              label={`Check Task ${writing.task}`}
              onCheck={() => void checkTask()}
              score={checkScore}
            />
          ) : null}
          {check ? (
            <div className="border-manga-black rounded-control bg-manga-paper-soft mt-2 grid gap-3 border-2 p-3">
              <p className="font-sans text-base font-black">
                AI check, Task {writing.task}
                {check.feedback.band != null
                  ? ` · Band ${check.feedback.band.toFixed(1)}`
                  : ''}
              </p>
              {check.essay !== essay ? (
                <p className="text-muted-foreground text-sm">
                  The essay changed since this check. Check again for fresh
                  feedback.
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

      <Dialog
        onOpenChange={next => (next ? null : setConfirm(null))}
        open={confirm !== null}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit?</DialogTitle>
            <DialogDescription>{confirm}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <ExamButton
              onClick={() => setConfirm(null)}
              tone="paper"
              type="button"
            >
              Keep writing
            </ExamButton>
            <ExamButton
              onClick={() => void finish()}
              tone="ink"
              type="button"
            >
              Submit
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
            <DialogTitle>Leave the mock test?</DialogTitle>
            <DialogDescription>
              The timer keeps running. Come back from the IELTS page.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <ExamButton
              onClick={() => setExitOpen(false)}
              tone="paper"
              type="button"
            >
              Stay
            </ExamButton>
            <ExamButton
              href={backHref}
              tone="ink"
            >
              Leave
            </ExamButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

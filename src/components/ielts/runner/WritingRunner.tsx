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
import type { IeltsAttemptRecord } from '@/modules/ielts/attempts/attemptRecords'
import { IELTS_ESSAY_MAX_LENGTH } from '@/modules/ielts/constants'
import type { IeltsPublicSection } from '@/modules/ielts/publicView'
import { countEssayWords } from '@/modules/ielts/scoring/wordCount'

import { TaskVisual } from '../visual/TaskVisual'
import { WritingPrompt } from '../widgets/WritingPrompt'
import { ExamButton, segmentClass } from '../ui'
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
 * "2"); grading happens on the result page after submit.
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
  const open = attempt.status === 'in_progress'
  const [submitting, setSubmitting] = useState(false)
  const locked = !open || submitting
  // Filled in below once `finish` exists; the hook calls it on a late save.
  const finishRef = useRef<() => void>(() => undefined)
  const { answers, saveState, setAnswer, submit } = useAttemptAnswers({
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
  const current = tasks[taskIndex] ?? tasks[0]
  const writing = current?.writing
  const taskKey = String(writing?.task ?? 1)
  const essay = typeof answers[taskKey] === 'string' ? answers[taskKey] : ''
  const words = countEssayWords(essay)

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
            <Label className="text-manga-black flex items-center gap-2 text-xs font-semibold">
              <Switch
                checked={spellCheck}
                onCheckedChange={setSpellCheck}
              />
              Spell check
            </Label>
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

      <div className="grid min-h-0 flex-1 lg:grid-cols-[1fr_1fr]">
        <section
          aria-label="Prompt"
          className={cn(
            'bg-manga-white min-h-0 overflow-y-auto px-4 py-6 sm:px-8 lg:block',
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
        <section
          aria-label="Essay"
          className={cn(
            'border-manga-black bg-manga-pale-red/60 min-h-0 overflow-y-auto px-4 py-6 sm:px-8 lg:flex lg:border-l-3',
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

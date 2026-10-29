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
import { ExamButton, segmentClass } from '../ui'
import { RunnerToolbar } from './RunnerToolbar'
import { useAttemptAnswers } from './useAttemptAnswers'
import { useMockDeadline } from './useMockDeadline'

interface Props {
  attempt: IeltsAttemptRecord
  backHref: string
  sections: IeltsPublicSection[]
  testTitle: string
}

function PromptText({ text }: { text: string }) {
  return (
    <div className="grid gap-3">
      {text
        .split(/\n{2,}/)
        .filter(Boolean)
        .map((paragraph, index) => (
          <p
            className="whitespace-pre-line"
            key={index}
          >
            {paragraph}
          </p>
        ))}
    </div>
  )
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
  const [taskIndex, setTaskIndex] = useState(0)
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
    setNotice(`Không nộp được bài: ${outcome.message}`)
  }, [attempt.id, router, submit])

  useEffect(() => {
    finishRef.current = () => void finish()
  })

  const secondsLeft = useMockDeadline({
    deadlineAt: isMock && open ? attempt.deadlineAt : null,
    onExpire: () => {
      setNotice('Hết giờ. Đang nộp bài...')
      void finish()
    },
    onWarning: () => setNotice('Còn 5 phút.'),
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
      setConfirm(`${short.join(' và ')} chưa đủ số từ tối thiểu. Vẫn nộp?`)
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
            <Label className="text-ex-ink flex items-center gap-2 text-xs font-semibold">
              <Switch
                checked={spellCheck}
                onCheckedChange={setSpellCheck}
              />
              Kiểm tra chính tả
            </Label>
          )
        }
      />

      {notice ? (
        <p
          className="border-ex-line text-ex-ink flex shrink-0 items-center justify-between gap-3 border-b bg-[#fff8db] px-4 py-2 text-sm"
          role="status"
        >
          {notice}
          <button
            className="text-ex-accent text-xs font-semibold underline"
            onClick={() => setNotice('')}
            type="button"
          >
            Đóng
          </button>
        </p>
      ) : null}

      {/* Segmented toggles (aria-pressed): the documented raw-button exception. */}
      <div className="border-ex-line flex shrink-0 flex-wrap gap-2 border-b bg-white px-3 py-2">
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
              ['task', 'Đề bài'],
              ['essay', 'Bài viết'],
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
          aria-label="Đề bài"
          className={cn(
            'min-h-0 overflow-y-auto bg-white px-4 py-6 sm:px-8 lg:block',
            mobileTab === 'task' ? 'block' : 'hidden'
          )}
        >
          <div className="font-body mx-auto grid max-w-[68ch] gap-4 text-[17px] leading-[1.7]">
            <h2 className="font-sans text-[22px] font-bold">
              Writing Task {writing.task}
            </h2>
            <PromptText text={writing.prompt} />
            {writing.visual ? (
              <TaskVisual
                className="border-ex-line rounded-lg border"
                visual={writing.visual}
              />
            ) : null}
          </div>
        </section>
        <section
          aria-label="Bài viết"
          className={cn(
            'border-ex-line bg-ex-soft/60 min-h-0 overflow-y-auto px-4 py-6 sm:px-8 lg:flex lg:border-l',
            mobileTab === 'essay' ? 'flex' : 'hidden',
            'flex-col gap-2'
          )}
        >
          <Label
            className="text-ex-ink text-sm font-semibold"
            htmlFor={`ielts-essay-${taskKey}`}
          >
            Bài viết Task {writing.task}
          </Label>
          <Textarea
            autoCapitalize="off"
            autoCorrect="off"
            className="font-body border-ex-line text-ex-ink focus-visible:border-ex-accent min-h-[50vh] flex-1 resize-none rounded-lg border bg-white p-4 text-[17px] leading-[1.75] shadow-none focus-visible:ring-0"
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
              words < writing.minWords ? 'text-ex-muted' : 'text-ex-correct'
            )}
          >
            {words} từ · tối thiểu {writing.minWords}
          </p>
        </section>
      </div>

      <Dialog
        onOpenChange={next => (next ? null : setConfirm(null))}
        open={confirm !== null}
      >
        <DialogContent className="ielts-exam">
          <DialogHeader>
            <DialogTitle>Nộp bài?</DialogTitle>
            <DialogDescription>{confirm}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <ExamButton
              onClick={() => setConfirm(null)}
              tone="paper"
              type="button"
            >
              Viết tiếp
            </ExamButton>
            <ExamButton
              onClick={() => void finish()}
              tone="ink"
              type="button"
            >
              Nộp bài
            </ExamButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        onOpenChange={setExitOpen}
        open={exitOpen}
      >
        <DialogContent className="ielts-exam">
          <DialogHeader>
            <DialogTitle>Thoát mock?</DialogTitle>
            <DialogDescription>
              Đồng hồ vẫn chạy. Quay lại từ trang IELTS.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <ExamButton
              onClick={() => setExitOpen(false)}
              tone="paper"
              type="button"
            >
              Ở lại
            </ExamButton>
            <ExamButton
              href={backHref}
              tone="ink"
            >
              Thoát
            </ExamButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

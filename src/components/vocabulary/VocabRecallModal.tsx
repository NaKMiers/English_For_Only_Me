'use client'

import { Check, Headphones, RotateCcw, Search, Volume2, X } from 'lucide-react'
import { useEffect, useState } from 'react'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ActionButton } from '@/components/ui/ActionButton'
import { PageTag } from '@/components/ui/PageTag'
import { useMessages } from '@/i18n/client'
import { format } from '@/i18n/format'
import { cn } from '@/lib/utils'
import type {
  VocabRecallAnswerAction,
  VocabRecallTaskRecord,
  VocabRecallTaskType,
} from '@/modules/vocabulary/types'
import {
  getEnglishDefinition,
  getRequiredVietnameseMeaning,
} from '@/modules/vocabulary/vietnameseMeaning'

import { VocabTermHeader } from './VocabTermHeader'
import type {
  VocabRecallAnswerInput,
  VocabRecallCardResult,
} from './vocabRecallSession'

interface Props {
  isLoading: boolean
  /** Why the next page of cards failed to load, if it did. */
  loadError?: string | null
  /** Move past an answered card. */
  onAdvance: (task: VocabRecallTaskRecord) => void
  /**
   * Record an answer and return its verdict right away (graded in the
   * browser). Returns the existing result when the card was already answered.
   */
  onAnswer: (input: VocabRecallAnswerInput) => VocabRecallCardResult
  onListeningSkip: () => void
  onOpenChange: (open: boolean) => void
  /** Try loading the next page of cards again after `loadError`. */
  onRetryLoad?: () => void
  open: boolean
  /** Per-card results by task id; the server's verdict replaces the local one. */
  results: Record<string, VocabRecallCardResult>
  task: VocabRecallTaskRecord | null
  taskNumber: number
  taskTotal: number
}

const LISTENING_TYPES: VocabRecallTaskType[] = [
  'listenChooseWord',
  'listenChooseDefinition',
]

interface FeedbackState {
  selectedOptionId: string | null
  taskId: string
}

function speakTerm(term: string) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return

  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(term)
  utterance.lang = 'en-US'
  window.speechSynthesis.speak(utterance)
}

function playFeedbackSound(isCorrect: boolean) {
  if (typeof window === 'undefined') return

  const AudioContextClass =
    window.AudioContext ??
    (
      window as typeof window & {
        webkitAudioContext?: typeof AudioContext
      }
    ).webkitAudioContext

  if (!AudioContextClass) return

  const context = new AudioContextClass()
  const gain = context.createGain()

  gain.connect(context.destination)
  gain.gain.setValueAtTime(0.0001, context.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.08, context.currentTime + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.45)

  const tones = isCorrect ? [523.25, 659.25, 783.99] : [220, 164.81]

  tones.forEach((frequency, index) => {
    const oscillator = context.createOscillator()
    const startAt = context.currentTime + index * 0.12

    oscillator.type = isCorrect ? 'sine' : 'sawtooth'
    oscillator.frequency.setValueAtTime(frequency, startAt)
    oscillator.connect(gain)
    oscillator.start(startAt)
    oscillator.stop(startAt + 0.16)
  })

  window.setTimeout(() => void context.close(), 700)
}

function getDefinition(task: VocabRecallTaskRecord) {
  return getEnglishDefinition(task.entry)
}

function getCorrectOptionId(task: VocabRecallTaskRecord) {
  if (
    task.type === 'listenChooseDefinition' ||
    task.type === 'wordChooseDefinition'
  )
    return `definition:${task.entry.id}`

  if (task.type === 'listenChooseWord' || task.type === 'definitionChooseWord')
    return `word:${task.entry.id}`

  return null
}

function getCorrectAnswerText(task: VocabRecallTaskRecord) {
  const correctOptionId = getCorrectOptionId(task)

  if (!correctOptionId) return task.entry.term

  const option = task.options.find(item => item.id === correctOptionId)

  return option?.term ?? option?.definition ?? task.entry.term
}

function getQuestionText(task: VocabRecallTaskRecord, tapPlay: string) {
  if (task.type === 'definitionChooseWord')
    return getEnglishDefinition(task.entry)

  if (task.type === 'wordChooseDefinition') return task.entry.term
  if (task.type === 'exampleRemember')
    return task.exampleSentence ?? `I saw ${task.entry.term} today.`

  return tapPlay
}

function formatExample(task: VocabRecallTaskRecord) {
  const sentence = task.exampleSentence ?? `I saw ${task.entry.term} today.`
  const parts = sentence.split(new RegExp(`(${task.entry.term})`, 'i'))

  return parts.map((part, index) =>
    part.toLowerCase() === task.entry.term.toLowerCase() ? (
      <strong
        key={`${part}-${index}`}
        className="text-brand"
      >
        {part}
      </strong>
    ) : (
      <span key={`${part}-${index}`}>{part}</span>
    )
  )
}

export function VocabRecallModal({
  isLoading,
  loadError = null,
  onAdvance,
  onAnswer,
  onListeningSkip,
  onOpenChange,
  onRetryLoad,
  open,
  results,
  task,
  taskNumber,
  taskTotal,
}: Props) {
  const messages = useMessages()
  const vocab = messages.vocabulary
  const t = vocab.modal
  const [selectedOption, setSelectedOption] = useState<{
    optionId: string
    taskId: string
  } | null>(null)
  const [feedback, setFeedback] = useState<FeedbackState | null>(null)
  const isListeningTask = task ? LISTENING_TYPES.includes(task.type) : false
  const taskResult = task ? (results[task.taskId] ?? null) : null
  // A wrong answer keeps the card on screen until Continue. If the server then
  // counts it as correct, the same panel flips to say so.
  const cardFeedback =
    feedback && taskResult && feedback.taskId === task?.taskId
      ? { ...feedback, isCorrect: taskResult.isCorrect }
      : null
  const wrongFeedback =
    cardFeedback && !cardFeedback.isCorrect ? cardFeedback : null
  const answered = Boolean(taskResult)
  const selectedOptionId =
    selectedOption && selectedOption.taskId === task?.taskId
      ? selectedOption.optionId
      : null

  const showingFeedback = Boolean(cardFeedback)

  useEffect(() => {
    if (!open || !task || !isListeningTask || showingFeedback) return

    const timeoutId = window.setTimeout(() => speakTerm(task.entry.term), 250)

    return () => window.clearTimeout(timeoutId)
  }, [isListeningTask, open, showingFeedback, task])

  function submitAnswer(
    action: VocabRecallAnswerAction | null = null,
    optionId: string | null = null
  ) {
    if (!task || answered) return

    const effectiveOptionId = optionId ?? selectedOptionId

    if (task.type !== 'exampleRemember' && !effectiveOptionId && !action) return

    const result = onAnswer({
      action,
      selectedOptionId: effectiveOptionId,
      task,
    })

    playFeedbackSound(result.isCorrect)

    if (result.isCorrect) {
      setFeedback(null)
      setSelectedOption(null)
      onAdvance(task)
      return
    }

    setFeedback({ selectedOptionId: effectiveOptionId, taskId: task.taskId })
  }

  function continueAfterFeedback() {
    if (!cardFeedback || !task) return

    setFeedback(null)
    setSelectedOption(null)
    onAdvance(task)
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen && cardFeedback) {
      continueAfterFeedback()
      return
    }

    onOpenChange(nextOpen)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={handleOpenChange}
    >
      <DialogContent className="day-palette border-line bg-ink text-surface h-auto max-h-[88vh] w-[min(1080px,92vw)] max-w-none overflow-y-auto border p-0 sm:max-w-none">
        {task ? (
          <div className="grid min-h-full grid-rows-[auto_1fr_auto]">
            <DialogHeader className="border-surface/20 border-b p-3 sm:p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <PageTag tone="red">
                  {format(t.review, { number: taskNumber, total: taskTotal })}
                </PageTag>
                <PageTag tone="ink">
                  {format(t.stage, { stage: task.item.recallStage })}
                </PageTag>
              </div>
              <DialogTitle className="sr-only">{t.srTitle}</DialogTitle>
              <DialogDescription className="text-tint text-base leading-6 font-semibold">
                {wrongFeedback
                  ? t.wrong
                  : cardFeedback
                    ? t.countedCorrect
                    : t.instructions[task.type]}
              </DialogDescription>
            </DialogHeader>

            <div className="grid content-center gap-5 p-4 sm:p-6 lg:p-7">
              {isListeningTask ? (
                <div className="grid place-items-center gap-4 py-5">
                  <button
                    aria-label={format(t.play, { term: task.entry.term })}
                    className="text-ink border-line soft-press grid size-24 place-items-center rounded-full border bg-cyan-300 sm:size-32"
                    onClick={() => speakTerm(task.entry.term)}
                    type="button"
                  >
                    <Volume2 className="size-12 sm:size-16" />
                  </button>
                </div>
              ) : (
                <div className="border-surface/20 bg-surface/10 rounded-control border p-4 text-center sm:p-5">
                  {task.type === 'wordChooseDefinition' ? (
                    <VocabTermHeader
                      buttonClassName="border-surface bg-cyan-300 text-ink hover:bg-cyan-200"
                      className="mx-auto max-w-3xl text-left"
                      entry={task.entry}
                      headingClassName="text-surface text-[clamp(2rem,5vw,4rem)]"
                      iconClassName="text-ink"
                      pronunciationClassName="text-tint"
                      size="xl"
                    />
                  ) : (
                    <div className="grid gap-4">
                      <p className="font-sans text-[clamp(1.45rem,3.4vw,3.25rem)] leading-snug font-medium wrap-break-word">
                        {task.type === 'exampleRemember'
                          ? formatExample(task)
                          : getQuestionText(task, t.tapPlay)}
                      </p>
                      {task.type === 'exampleRemember' ? (
                        <VocabTermHeader
                          buttonClassName="border-surface bg-cyan-300 text-ink hover:bg-cyan-200"
                          className="mx-auto max-w-xl text-left"
                          entry={task.entry}
                          headingClassName="text-surface text-2xl sm:text-3xl"
                          iconClassName="text-ink"
                          pronunciationClassName="text-tint"
                        />
                      ) : null}
                    </div>
                  )}
                </div>
              )}

              {!cardFeedback && task.type === 'exampleRemember' ? (
                <div className="grid grid-cols-2 gap-3">
                  <ActionButton
                    className="border-surface bg-surface text-ink"
                    disabled={isLoading || answered}
                    icon={<Search className="size-4" />}
                    onClick={() => submitAnswer('lookup')}
                    tone="paper"
                  >
                    {t.lookUp}
                  </ActionButton>
                  <ActionButton
                    className="border-surface bg-tint text-ink"
                    disabled={isLoading || answered}
                    icon={<Check className="size-4" />}
                    onClick={() => submitAnswer('remember')}
                  >
                    {t.remember}
                  </ActionButton>
                </div>
              ) : task.type !== 'exampleRemember' ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {task.options.map((option, index) => (
                    <button
                      key={option.id}
                      className={cn(
                        'border-surface bg-surface/15 text-surface rounded-control grid min-h-20 grid-cols-[auto_1fr] items-center gap-3 border p-4 text-left font-sans text-base leading-6 font-semibold transition-[background,transform,box-shadow] sm:min-h-24 sm:text-lg lg:min-h-28',
                        wrongFeedback &&
                          option.id === wrongFeedback.selectedOptionId &&
                          'border-danger bg-danger-soft text-danger',
                        wrongFeedback &&
                          option.id === getCorrectOptionId(task) &&
                          'text-ink border-emerald-300 bg-emerald-300',
                        selectedOptionId === option.id &&
                          !wrongFeedback &&
                          'text-ink bg-cyan-300'
                      )}
                      disabled={answered}
                      onClick={() => {
                        setSelectedOption({
                          optionId: option.id,
                          taskId: task.taskId,
                        })
                        void submitAnswer(null, option.id)
                      }}
                      type="button"
                    >
                      <span className="text-cyan-300">
                        {String.fromCharCode(65 + index)}
                      </span>
                      <span className="wrap-break-word">
                        {option.term ?? option.definition}
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}
              {wrongFeedback ? (
                <div className="border-danger bg-danger-soft text-ink rounded-control grid gap-3 border p-4">
                  <p className="text-danger text-sm font-semibold">
                    {format(t.correctAnswer, {
                      answer: getCorrectAnswerText(task),
                    })}
                  </p>
                  <VocabTermHeader
                    entry={task.entry}
                    size="lg"
                  />
                  <div className="border-line bg-tint rounded-tag border p-3 text-right text-sm leading-6 font-semibold sm:text-base">
                    {getRequiredVietnameseMeaning(
                      task.entry,
                      vocab.word.needsMeaning
                    )}
                  </div>
                  <div className="border-line bg-surface rounded-tag border p-3 text-sm leading-6 font-semibold sm:text-base">
                    {getDefinition(task)}
                  </div>
                  <p className="text-ink-soft text-sm leading-6 font-normal">
                    {task.exampleSentence ??
                      `I noticed the word ${task.entry.term} while studying English.`}
                  </p>
                </div>
              ) : null}
              {isListeningTask && !cardFeedback ? (
                <ActionButton
                  className="border-surface bg-ink text-surface hover:bg-ink"
                  icon={<Headphones className="size-4" />}
                  onClick={onListeningSkip}
                  tone="ink"
                >
                  {t.cannotListen}
                </ActionButton>
              ) : null}
            </div>

            <div className="border-surface/20 grid gap-3 border-t p-3 sm:p-4">
              {cardFeedback ? (
                <ActionButton
                  className="border-surface w-full"
                  icon={<Check className="size-4" />}
                  onClick={continueAfterFeedback}
                >
                  {messages.common.actions.continue}
                </ActionButton>
              ) : (
                <ActionButton
                  className="border-surface bg-ink text-surface hover:bg-ink w-full"
                  disabled={isLoading || answered}
                  icon={<X className="size-4" />}
                  onClick={() => submitAnswer('notSure')}
                  tone="ink"
                >
                  {t.notSure}
                </ActionButton>
              )}
            </div>
          </div>
        ) : loadError ? (
          <div className="grid place-items-center gap-3 p-8 text-center">
            <DialogTitle className="font-sans text-xl font-semibold">
              {t.loadFailed}
            </DialogTitle>
            <DialogDescription className="text-tint text-sm font-semibold">
              {loadError}
            </DialogDescription>
            {onRetryLoad ? (
              <ActionButton
                className="border-surface"
                icon={<RotateCcw className="size-4" />}
                onClick={onRetryLoad}
              >
                {messages.common.actions.retry}
              </ActionButton>
            ) : null}
          </div>
        ) : (
          // Between pages of the due queue: the next cards are on their way.
          <div className="grid place-items-center gap-2 p-8 text-center">
            <DialogTitle className="font-sans text-xl font-semibold">
              {t.loadingMore}
            </DialogTitle>
            <DialogDescription className="text-tint text-sm font-semibold">
              {t.oneMoment}
            </DialogDescription>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

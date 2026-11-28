'use client'

import {
  Check,
  CircleCheck,
  CircleX,
  Headphones,
  RotateCcw,
  Search,
  Trophy,
  Volume2,
  X,
} from 'lucide-react'
import { useEffect, useEffectEvent, useState, type ReactNode } from 'react'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { StepDots } from '@/components/journey/StepDots'
import { ActionButton } from '@/components/ui/ActionButton'
import { Progress } from '@/components/ui/progress'
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
  getVietnameseMeaning,
} from '@/modules/vocabulary/vietnameseMeaning'

import { VocabTermHeader } from './VocabTermHeader'
import type {
  VocabRecallAnswerInput,
  VocabRecallCardResult,
} from './vocabRecallSession'

interface Props {
  isLoading: boolean
  /** Why the next page of cards failed to load, if it did. */
  /** Shown when the queue is empty and the session is over. */
  endScreen?: ReactNode
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
        className="text-brand-ink"
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
  endScreen = null,
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
  // Every answer, right or wrong, keeps the card on screen with its verdict
  // and the Vietnamese meaning until Continue. If the server later disagrees
  // with the local grade, the same panel flips.
  const cardFeedback =
    feedback && taskResult && feedback.taskId === task?.taskId
      ? { ...feedback, isCorrect: taskResult.isCorrect }
      : null
  const answered = Boolean(taskResult)
  const selectedOptionId =
    selectedOption && selectedOption.taskId === task?.taskId
      ? selectedOption.optionId
      : null
  const correctOptionId = task ? getCorrectOptionId(task) : null
  const showingFeedback = Boolean(cardFeedback)
  const progress = taskTotal > 0 ? Math.min(1, taskNumber / taskTotal) : 0

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
    setFeedback({ selectedOptionId: effectiveOptionId, taskId: task.taskId })
  }

  function continueAfterFeedback() {
    if (!cardFeedback || !task) return

    setFeedback(null)
    setSelectedOption(null)
    onAdvance(task)
  }

  function chooseOption(optionId: string) {
    if (!task || answered) return

    setSelectedOption({ optionId, taskId: task.taskId })
    submitAnswer(null, optionId)
  }

  // Keyboard: 1-4 picks an option, Enter moves on after the verdict.
  const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (!task || event.altKey || event.ctrlKey || event.metaKey) return

    if (event.key === 'Enter' && cardFeedback) {
      event.preventDefault()
      continueAfterFeedback()
      return
    }

    const index = Number(event.key) - 1

    if (
      !answered &&
      task.type !== 'exampleRemember' &&
      Number.isInteger(index) &&
      index >= 0 &&
      index < task.options.length
    ) {
      event.preventDefault()
      chooseOption(task.options[index].id)
    }
  })

  useEffect(() => {
    if (!open) return

    const listener = (event: KeyboardEvent) => onKeyDown(event)

    window.addEventListener('keydown', listener)

    return () => window.removeEventListener('keydown', listener)
  }, [open])

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen && cardFeedback) {
      continueAfterFeedback()
      return
    }

    onOpenChange(nextOpen)
  }

  const meaning = task ? getVietnameseMeaning(task.entry) : null

  return (
    <Dialog
      open={open}
      onOpenChange={handleOpenChange}
    >
      <DialogContent className="border-line bg-surface text-ink rounded-panel h-auto max-h-[90vh] w-[min(960px,94vw)] max-w-none overflow-y-auto border p-0 sm:max-w-none">
        {task ? (
          <div className="grid min-h-full grid-rows-[auto_1fr_auto]">
            <DialogHeader className="grid gap-3 px-5 pt-5 pr-14 pb-3 sm:px-7 sm:pt-6 sm:pr-16">
              <div className="flex items-center gap-3">
                <Progress
                  aria-label={format(t.progress, {
                    number: taskNumber,
                    total: taskTotal,
                  })}
                  className="flex-1"
                  tone="vocabulary"
                  trackClassName="h-2"
                  value={Math.round(progress * 100)}
                />
                <StepDots
                  doneClassName="bg-accent-green"
                  done={task.item.recallStage}
                  label={format(vocab.recallEnd.stepLabel, {
                    stage: task.item.recallStage,
                  })}
                  total={7}
                />
              </div>
              <DialogTitle className="sr-only">{t.srTitle}</DialogTitle>
              <DialogDescription className="text-ink-soft text-sm sm:text-base">
                {t.instructions[task.type]}
              </DialogDescription>
            </DialogHeader>

            <div className="grid content-start gap-4 px-5 pb-5 sm:px-7">
              {isListeningTask && !cardFeedback ? (
                <div className="bg-pastel-mint/70 rounded-panel grid place-items-center gap-3 py-8">
                  <button
                    aria-label={format(t.play, { term: task.entry.term })}
                    className="soft-press bg-surface text-accent-green hover:shadow-float grid size-24 place-items-center rounded-full shadow-sm sm:size-28"
                    onClick={() => speakTerm(task.entry.term)}
                    type="button"
                  >
                    <Volume2 className="size-11 sm:size-12" />
                  </button>
                  <p className="text-ink-soft text-sm">{t.tapPlay}</p>
                </div>
              ) : (
                <div className="bg-pastel-mint/70 rounded-panel px-5 py-6 sm:px-8 sm:py-7">
                  {task.type === 'wordChooseDefinition' || isListeningTask ? (
                    <VocabTermHeader
                      buttonClassName="border-transparent bg-surface text-accent-green hover:bg-surface/80"
                      className="mx-auto max-w-3xl"
                      entry={task.entry}
                      headingClassName="text-[clamp(2rem,5vw,3.5rem)]"
                      iconClassName="text-accent-green"
                      pronunciationClassName="text-ink-soft"
                      size="xl"
                    />
                  ) : (
                    <div className="grid gap-4">
                      <p className="font-sans text-[clamp(1.25rem,2.8vw,2.25rem)] leading-snug font-medium wrap-break-word">
                        {task.type === 'exampleRemember'
                          ? formatExample(task)
                          : getQuestionText(task, t.tapPlay)}
                      </p>
                      {task.type === 'exampleRemember' ||
                      (cardFeedback && task.type === 'definitionChooseWord') ? (
                        <VocabTermHeader
                          buttonClassName="border-transparent bg-surface text-accent-green hover:bg-surface/80"
                          className="max-w-xl"
                          entry={task.entry}
                          headingClassName="text-2xl sm:text-3xl"
                          iconClassName="text-accent-green"
                          pronunciationClassName="text-ink-soft"
                        />
                      ) : null}
                    </div>
                  )}
                </div>
              )}

              {!cardFeedback && task.type === 'exampleRemember' ? (
                <div className="grid grid-cols-2 gap-3">
                  <ActionButton
                    disabled={isLoading || answered}
                    icon={<Search className="size-4" />}
                    onClick={() => submitAnswer('lookup')}
                    tone="paper"
                  >
                    {t.lookUp}
                  </ActionButton>
                  <ActionButton
                    disabled={isLoading || answered}
                    icon={<Check className="size-4" />}
                    onClick={() => submitAnswer('remember')}
                    tone="ink"
                  >
                    {t.remember}
                  </ActionButton>
                </div>
              ) : task.type !== 'exampleRemember' ? (
                <ol className="grid gap-2.5 sm:grid-cols-2">
                  {task.options.map((option, index) => {
                    const isCorrectOption = option.id === correctOptionId
                    const isPicked =
                      option.id ===
                      (cardFeedback?.selectedOptionId ?? selectedOptionId)
                    const state = !cardFeedback
                      ? 'idle'
                      : isCorrectOption
                        ? 'correct'
                        : isPicked
                          ? 'wrong'
                          : 'muted'

                    return (
                      <li key={option.id}>
                        <button
                          className={cn(
                            'soft-press group rounded-control flex min-h-16 w-full items-center gap-3 border p-3 text-left text-sm leading-6 font-medium transition-[background-color,border-color,opacity] duration-200 sm:min-h-20 sm:text-base',
                            state === 'idle' &&
                              'border-line bg-surface hover:border-brand/40 hover:bg-brand-soft/40',
                            state === 'correct' &&
                              'border-lesson-correct bg-lesson-correct/10',
                            state === 'wrong' && 'border-danger bg-danger-soft',
                            state === 'muted' && 'border-line opacity-55'
                          )}
                          disabled={answered}
                          onClick={() => chooseOption(option.id)}
                          type="button"
                        >
                          <span
                            className={cn(
                              'grid size-8 shrink-0 place-items-center rounded-full text-xs font-semibold',
                              state === 'idle' &&
                                'bg-tint text-ink-soft group-hover:bg-brand group-hover:text-cta-fg',
                              state === 'correct' &&
                                'bg-lesson-correct text-surface',
                              state === 'wrong' && 'bg-danger text-surface',
                              state === 'muted' && 'bg-tint text-ink-soft'
                            )}
                          >
                            {state === 'correct' ? (
                              <Check
                                aria-hidden
                                className="size-4 stroke-3"
                              />
                            ) : state === 'wrong' ? (
                              <X
                                aria-hidden
                                className="size-4 stroke-3"
                              />
                            ) : (
                              index + 1
                            )}
                          </span>
                          <span className="min-w-0 flex-1 wrap-break-word">
                            {option.term ?? option.definition}
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ol>
              ) : null}

              {cardFeedback ? (
                <section
                  aria-live="polite"
                  className={cn(
                    'motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 rounded-panel grid gap-3 border p-4 sm:p-5',
                    cardFeedback.isCorrect
                      ? 'border-lesson-correct/40 bg-lesson-correct/5'
                      : 'border-danger/40 bg-danger-soft/60'
                  )}
                >
                  <p
                    className={cn(
                      'flex items-center gap-2 font-sans text-lg font-medium',
                      cardFeedback.isCorrect
                        ? 'text-lesson-correct'
                        : 'text-danger'
                    )}
                  >
                    {cardFeedback.isCorrect ? (
                      <CircleCheck
                        aria-hidden
                        className="size-6"
                      />
                    ) : (
                      <CircleX
                        aria-hidden
                        className="size-6"
                      />
                    )}
                    {/* The icon says it; the word stays for screen readers. */}
                    <span className="sr-only">
                      {cardFeedback.isCorrect ? t.correct : t.notQuite}
                    </span>
                    <span className="sr-only">
                      {cardFeedback.isCorrect ? t.countedCorrect : t.wrong}
                    </span>
                  </p>
                  {taskResult && taskResult.saveState !== 'notSaved' ? (
                    // The word's step moving, the small win of the card.
                    <p className="flex flex-wrap items-center gap-2 text-sm">
                      {taskResult.item.status === 'mastered' ? (
                        <Trophy
                          aria-hidden
                          className="text-accent-green size-4"
                        />
                      ) : (
                        <StepDots
                          doneClassName="bg-accent-green"
                          done={taskResult.item.recallStage}
                          label={format(vocab.recallEnd.stepLabel, {
                            stage: taskResult.item.recallStage,
                          })}
                          total={7}
                        />
                      )}
                      <span className="text-ink-soft">
                        {taskResult.item.status === 'mastered'
                          ? format(vocab.dashboard.mastered, {
                              term: taskResult.term,
                            })
                          : taskResult.isCorrect
                            ? format(vocab.dashboard.movedStage, {
                                stage: taskResult.item.recallStage,
                                term: taskResult.term,
                              })
                            : format(vocab.dashboard.resetStage, {
                                term: taskResult.term,
                              })}
                      </span>
                    </p>
                  ) : null}
                  {!cardFeedback.isCorrect ? (
                    <p className="text-sm">
                      {format(t.correctAnswer, {
                        answer: getCorrectAnswerText(task),
                      })}
                    </p>
                  ) : null}
                  <div className="bg-surface rounded-control grid gap-3 p-4">
                    <div className="grid gap-1">
                      <span className="text-ink-soft text-xs font-medium">
                        {t.meaning} · {task.entry.term}
                      </span>
                      <p
                        className={cn(
                          'font-sans text-lg leading-snug font-medium sm:text-xl',
                          !meaning && 'text-ink-soft text-base'
                        )}
                        lang="vi"
                      >
                        {meaning ?? vocab.word.needsMeaning}
                      </p>
                    </div>
                    <div className="border-line grid gap-1 border-t pt-3">
                      <span className="text-ink-soft text-xs font-medium">
                        {t.definition}
                      </span>
                      <p className="text-sm leading-6">
                        {getEnglishDefinition(task.entry)}
                      </p>
                    </div>
                    {task.exampleSentence ? (
                      <div className="border-line grid gap-1 border-t pt-3">
                        <span className="text-ink-soft text-xs font-medium">
                          {t.example}
                        </span>
                        <p className="text-ink-soft text-sm leading-6 italic">
                          {formatExample(task)}
                        </p>
                      </div>
                    ) : null}
                  </div>
                </section>
              ) : null}

              {isListeningTask && !cardFeedback ? (
                <ActionButton
                  className="w-fit justify-self-center"
                  icon={<Headphones className="size-4" />}
                  onClick={onListeningSkip}
                  tone="paper"
                >
                  {t.cannotListen}
                </ActionButton>
              ) : null}
            </div>

            <div className="border-line bg-surface sticky bottom-0 flex flex-wrap items-center justify-between gap-3 border-t px-5 py-3 sm:px-7">
              <span className="text-ink-soft hidden text-xs sm:inline">
                {cardFeedback
                  ? t.pressEnter
                  : task.type !== 'exampleRemember'
                    ? t.keysHint
                    : null}
              </span>
              {cardFeedback ? (
                <ActionButton
                  className="w-full sm:w-auto"
                  icon={<Check className="size-4" />}
                  onClick={continueAfterFeedback}
                  tone="ink"
                >
                  {messages.common.actions.continue}
                </ActionButton>
              ) : (
                <ActionButton
                  className="w-full sm:w-auto"
                  disabled={isLoading || answered}
                  icon={<X className="size-4" />}
                  onClick={() => submitAnswer('notSure')}
                  tone="paper"
                >
                  {t.notSure}
                </ActionButton>
              )}
            </div>
          </div>
        ) : endScreen && !loadError ? (
          <div className="grid gap-4 p-5 sm:p-7">
            <DialogTitle className="sr-only">{t.srTitle}</DialogTitle>
            {endScreen}
          </div>
        ) : loadError ? (
          <div className="grid place-items-center gap-3 p-8 text-center">
            <DialogTitle className="font-sans text-xl font-medium">
              {t.loadFailed}
            </DialogTitle>
            <DialogDescription className="text-ink-soft text-sm">
              {loadError}
            </DialogDescription>
            {onRetryLoad ? (
              <ActionButton
                icon={<RotateCcw className="size-4" />}
                onClick={onRetryLoad}
                tone="ink"
              >
                {messages.common.actions.retry}
              </ActionButton>
            ) : null}
          </div>
        ) : (
          // Between pages of the due queue: the next cards are on their way.
          <div className="grid place-items-center gap-2 p-8 text-center">
            <DialogTitle className="font-sans text-xl font-medium">
              {t.loadingMore}
            </DialogTitle>
            <DialogDescription className="text-ink-soft text-sm">
              {t.oneMoment}
            </DialogDescription>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

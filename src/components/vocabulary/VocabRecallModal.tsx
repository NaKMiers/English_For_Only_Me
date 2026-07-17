'use client'

import { Check, Headphones, Search, Volume2, X } from 'lucide-react'
import { useEffect, useState } from 'react'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { MangaButton } from '@/components/ui/MangaButton'
import { PageTag } from '@/components/ui/PageTag'
import { cn } from '@/lib/utils'
import type {
  UserVocabItemApiRecord,
  VocabRecallAnswerAction,
  VocabRecallTaskRecord,
  VocabRecallTaskType,
} from '@/modules/vocabulary/types'
import {
  getEnglishDefinition,
  getRequiredVietnameseMeaning,
} from '@/modules/vocabulary/vietnameseMeaning'
import { answerVocabRecallApi } from '@/requests/vocabularyApi'

import { VocabTermHeader } from './VocabTermHeader'

interface Props {
  isLoading: boolean
  onAnswered: (result: {
    isCorrect: boolean
    item: UserVocabItemApiRecord
    task: VocabRecallTaskRecord
  }) => Promise<void> | void
  onError: (message: string) => void
  onListeningSkip: () => void
  onOpenChange: (open: boolean) => void
  open: boolean
  task: VocabRecallTaskRecord | null
  taskNumber: number
  taskTotal: number
}

const LISTENING_TYPES: VocabRecallTaskType[] = [
  'listenChooseWord',
  'listenChooseDefinition',
]

interface FeedbackState {
  isCorrect: boolean
  item: UserVocabItemApiRecord
  selectedOptionId: string | null
  task: VocabRecallTaskRecord
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

function createRecallIdempotencyKey(taskId: string) {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
    return crypto.randomUUID()

  return `${taskId}:${Date.now()}`
}

function getInstruction(type: VocabRecallTaskType) {
  if (type === 'listenChooseWord') return 'Listen, then choose the word.'
  if (type === 'listenChooseDefinition')
    return 'Listen, then choose the matching definition.'
  if (type === 'exampleRemember')
    return 'Read the sentence and decide whether you remember the highlighted word.'
  if (type === 'definitionChooseWord')
    return 'Choose the word that matches this definition.'

  return 'Choose the definition that matches this word.'
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

function getQuestionText(task: VocabRecallTaskRecord) {
  if (task.type === 'definitionChooseWord')
    return getEnglishDefinition(task.entry)

  if (task.type === 'wordChooseDefinition') return task.entry.term
  if (task.type === 'exampleRemember')
    return task.exampleSentence ?? `I saw ${task.entry.term} today.`

  return 'Tap play when you are ready.'
}

function formatExample(task: VocabRecallTaskRecord) {
  const sentence = task.exampleSentence ?? `I saw ${task.entry.term} today.`
  const parts = sentence.split(new RegExp(`(${task.entry.term})`, 'i'))

  return parts.map((part, index) =>
    part.toLowerCase() === task.entry.term.toLowerCase() ? (
      <strong
        key={`${part}-${index}`}
        className="text-manga-red"
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
  onAnswered,
  onError,
  onListeningSkip,
  onOpenChange,
  open,
  task,
  taskNumber,
  taskTotal,
}: Props) {
  const [selectedOption, setSelectedOption] = useState<{
    optionId: string
    taskId: string
  } | null>(null)
  const [feedback, setFeedback] = useState<FeedbackState | null>(null)
  const [pendingAnswer, setPendingAnswer] = useState(false)
  const isListeningTask = task ? LISTENING_TYPES.includes(task.type) : false
  const wrongFeedback =
    feedback && feedback.task.taskId === task?.taskId && !feedback.isCorrect
      ? feedback
      : null
  const selectedOptionId =
    selectedOption && selectedOption.taskId === task?.taskId
      ? selectedOption.optionId
      : null

  useEffect(() => {
    if (!open || !task || !isListeningTask || wrongFeedback) return

    const timeoutId = window.setTimeout(() => speakTerm(task.entry.term), 250)

    return () => window.clearTimeout(timeoutId)
  }, [isListeningTask, open, task, wrongFeedback])

  async function submitAnswer(
    action: VocabRecallAnswerAction | null = null,
    optionId: string | null = null
  ) {
    if (!task || pendingAnswer) return

    const effectiveOptionId = optionId ?? selectedOptionId

    if (task.type !== 'exampleRemember' && !effectiveOptionId && !action) return

    setPendingAnswer(true)

    try {
      const response = await answerVocabRecallApi({
        action,
        idempotencyKey: createRecallIdempotencyKey(task.taskId),
        selectedOptionId: effectiveOptionId,
        token: task.token,
      })

      const nextFeedback = {
        isCorrect: response.isCorrect,
        item: response.item,
        selectedOptionId: effectiveOptionId,
        task,
      }

      playFeedbackSound(response.isCorrect)

      if (response.isCorrect) {
        setFeedback(null)
        setSelectedOption(null)
        await onAnswered({
          isCorrect: response.isCorrect,
          item: response.item,
          task,
        })
        return
      }

      setFeedback(nextFeedback)
    } catch (error) {
      onError(
        error instanceof Error ? error.message : 'Could not answer flashcard.'
      )
    } finally {
      setPendingAnswer(false)
    }
  }

  async function continueAfterFeedback() {
    if (!wrongFeedback || pendingAnswer) return

    setPendingAnswer(true)

    try {
      setFeedback(null)
      setSelectedOption(null)
      await onAnswered({
        isCorrect: wrongFeedback.isCorrect,
        item: wrongFeedback.item,
        task: wrongFeedback.task,
      })
    } finally {
      setPendingAnswer(false)
    }
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen && wrongFeedback) {
      void continueAfterFeedback()
      return
    }

    onOpenChange(nextOpen)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={handleOpenChange}
    >
      <DialogContent className="border-manga-black bg-manga-black text-manga-white h-auto max-h-[88vh] w-[min(1080px,92vw)] max-w-none overflow-y-auto rounded-none border-3 p-0 shadow-[6px_6px_0_var(--manga-red)] sm:max-w-none">
        {task ? (
          <div className="grid min-h-full grid-rows-[auto_1fr_auto]">
            <DialogHeader className="border-manga-white/20 border-b-2 p-3 sm:p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <PageTag tone="red">
                  Review {taskNumber}/{taskTotal}
                </PageTag>
                <PageTag tone="ink">Stage {task.item.recallStage}/7</PageTag>
              </div>
              <DialogTitle className="sr-only">
                Vocabulary flashcard review
              </DialogTitle>
              <DialogDescription className="text-manga-paper-soft text-base leading-6 font-semibold">
                {wrongFeedback
                  ? 'Not quite. Check the correct answer, then continue.'
                  : getInstruction(task.type)}
              </DialogDescription>
            </DialogHeader>

            <div className="grid content-center gap-5 p-4 sm:p-6 lg:p-7">
              {isListeningTask ? (
                <div className="grid place-items-center gap-4 py-5">
                  <button
                    aria-label={`Play ${task.entry.term}`}
                    className="text-manga-black border-manga-black grid size-24 place-items-center rounded-full border-3 bg-cyan-300 shadow-[4px_4px_0_var(--manga-white)] transition-transform active:translate-x-[4px] active:translate-y-[4px] active:shadow-none sm:size-32"
                    onClick={() => speakTerm(task.entry.term)}
                    type="button"
                  >
                    <Volume2 className="size-12 sm:size-16" />
                  </button>
                </div>
              ) : (
                <div className="border-manga-white/20 bg-manga-white/10 border-2 p-4 text-center shadow-[4px_4px_0_rgba(255,255,255,0.22)] sm:p-5">
                  {task.type === 'wordChooseDefinition' ? (
                    <VocabTermHeader
                      buttonClassName="border-manga-white bg-cyan-300 text-manga-black hover:bg-cyan-200 shadow-[3px_3px_0_var(--manga-white)]"
                      className="mx-auto max-w-3xl text-left"
                      entry={task.entry}
                      headingClassName="text-manga-white text-[clamp(2rem,5vw,4rem)]"
                      iconClassName="text-manga-black"
                      pronunciationClassName="text-manga-paper-soft"
                      size="xl"
                    />
                  ) : (
                    <div className="grid gap-4">
                      <p className="font-sans text-[clamp(1.45rem,3.4vw,3.25rem)] leading-snug font-black wrap-break-word">
                        {task.type === 'exampleRemember'
                          ? formatExample(task)
                          : getQuestionText(task)}
                      </p>
                      {task.type === 'exampleRemember' ? (
                        <VocabTermHeader
                          buttonClassName="border-manga-white bg-cyan-300 text-manga-black hover:bg-cyan-200 shadow-[3px_3px_0_var(--manga-white)]"
                          className="mx-auto max-w-xl text-left"
                          entry={task.entry}
                          headingClassName="text-manga-white text-2xl sm:text-3xl"
                          iconClassName="text-manga-black"
                          pronunciationClassName="text-manga-paper-soft"
                        />
                      ) : null}
                    </div>
                  )}
                </div>
              )}

              {!wrongFeedback && task.type === 'exampleRemember' ? (
                <div className="grid grid-cols-2 gap-3">
                  <MangaButton
                    className="border-manga-white bg-manga-white text-manga-black"
                    disabled={isLoading || pendingAnswer}
                    icon={<Search className="size-4" />}
                    onClick={() => submitAnswer('lookup')}
                    tone="paper"
                  >
                    Look Up
                  </MangaButton>
                  <MangaButton
                    className="border-manga-white bg-manga-paper-soft text-manga-black"
                    disabled={isLoading || pendingAnswer}
                    icon={<Check className="size-4" />}
                    onClick={() => submitAnswer('remember')}
                  >
                    I Remember
                  </MangaButton>
                </div>
              ) : task.type !== 'exampleRemember' ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {task.options.map((option, index) => (
                    <button
                      key={option.id}
                      className={cn(
                        'border-manga-white bg-manga-white/15 text-manga-white grid min-h-20 grid-cols-[auto_1fr] items-center gap-3 border-2 p-4 text-left font-sans text-base leading-6 font-black shadow-[3px_3px_0_rgba(255,255,255,0.22)] transition-[background,transform,box-shadow] sm:min-h-24 sm:text-lg lg:min-h-28',
                        wrongFeedback &&
                          option.id === wrongFeedback.selectedOptionId &&
                          'border-manga-red bg-manga-pale-red text-manga-red',
                        wrongFeedback &&
                          option.id === getCorrectOptionId(task) &&
                          'text-manga-black border-emerald-300 bg-emerald-300',
                        selectedOptionId === option.id &&
                          !wrongFeedback &&
                          'text-manga-black bg-cyan-300'
                      )}
                      disabled={pendingAnswer || Boolean(wrongFeedback)}
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
                <div className="border-manga-red bg-manga-pale-red text-manga-black grid gap-3 border-3 p-4 shadow-[4px_4px_0_var(--manga-red)]">
                  <p className="text-manga-red text-sm font-black uppercase">
                    Correct answer: {getCorrectAnswerText(task)}
                  </p>
                  <VocabTermHeader
                    entry={task.entry}
                    size="lg"
                  />
                  <div className="border-manga-black bg-manga-paper-soft border-2 p-3 text-right text-sm leading-6 font-black sm:text-base">
                    {getRequiredVietnameseMeaning(task.entry)}
                  </div>
                  <div className="border-manga-black bg-manga-white border-2 p-3 text-sm leading-6 font-semibold sm:text-base">
                    {getDefinition(task)}
                  </div>
                  <p className="text-manga-ink-soft text-sm leading-6 font-semibold">
                    {task.exampleSentence ??
                      `I noticed the word ${task.entry.term} while studying English.`}
                  </p>
                </div>
              ) : null}
              {isListeningTask && !wrongFeedback ? (
                <MangaButton
                  className="border-manga-white bg-manga-black text-manga-white hover:bg-manga-black"
                  icon={<Headphones className="size-4" />}
                  onClick={onListeningSkip}
                  tone="ink"
                >
                  I cannot listen now
                </MangaButton>
              ) : null}
            </div>

            <div className="border-manga-white/20 grid gap-3 border-t-2 p-3 sm:p-4">
              {wrongFeedback ? (
                <MangaButton
                  className="border-manga-white w-full"
                  disabled={pendingAnswer}
                  icon={<Check className="size-4" />}
                  onClick={continueAfterFeedback}
                >
                  Continue
                </MangaButton>
              ) : (
                <MangaButton
                  className="border-manga-white bg-manga-black text-manga-white hover:bg-manga-black w-full"
                  disabled={isLoading || pendingAnswer}
                  icon={<X className="size-4" />}
                  onClick={() => submitAnswer('notSure')}
                  tone="ink"
                >
                  Not Sure
                </MangaButton>
              )}
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

'use client'

import {
  Check,
  Eye,
  Play,
  RotateCcw,
  SkipForward,
  StepBack,
} from 'lucide-react'
import { useEffect, useState } from 'react'

import { ContentPanel } from '@/components/common/ContentPanel'
import { MetricTile } from '@/components/common/MetricTile'
import { QueueRow } from '@/components/common/QueueRow'
import { IconButton } from '@/components/ui/IconButton'
import { ActionButton } from '@/components/ui/ActionButton'
import { Progress } from '@/components/ui/progress'
import { Textarea } from '@/components/ui/textarea'
import {
  DICTATION_CORRECTION_TOKENS,
  DICTATION_LIVE_STATS,
  DICTATION_PRACTICE,
  DICTATION_SENTENCE_QUEUE,
} from '@/constants/dictation'
import { cn } from '@/lib/utils'

const STATIC_PRACTICE_DRAFT_STORAGE_KEY =
  'english-for-only-me:static-practice-draft'

function readStaticPracticeDraft() {
  if (typeof window === 'undefined') return DICTATION_PRACTICE.currentAnswer

  try {
    return (
      window.sessionStorage.getItem(STATIC_PRACTICE_DRAFT_STORAGE_KEY) ??
      DICTATION_PRACTICE.currentAnswer
    )
  } catch {
    return DICTATION_PRACTICE.currentAnswer
  }
}

function writeStaticPracticeDraft(answer: string) {
  if (typeof window === 'undefined') return

  try {
    window.sessionStorage.setItem(STATIC_PRACTICE_DRAFT_STORAGE_KEY, answer)
  } catch {
    return
  }
}

const tokenClassName = {
  correct: 'bg-surface',
  missing: 'bg-danger-soft text-danger',
  extra: 'bg-ink text-surface line-through',
} as const

function PracticePlayerSketch() {
  return (
    <div className="border-line bg-tint-soft rounded-panel grid min-w-0 gap-3 border p-3">
      <div
        aria-label="Video practice player"
        className="border-line bg-surface rounded-control min-h-56 overflow-hidden border"
      >
        <svg
          role="img"
          aria-label="Hand drawn video frame"
          viewBox="0 0 760 430"
          className="text-ink h-full min-h-56 w-full"
        >
          <rect
            x="35"
            y="28"
            width="690"
            height="320"
            fill="#ffffff"
            stroke="currentColor"
            strokeWidth="8"
          />
          <path
            d="M92 282 C190 154 276 248 352 146 C450 20 572 168 678 80"
            stroke="currentColor"
            strokeWidth="6"
            fill="none"
          />
          <circle
            cx="188"
            cy="116"
            r="34"
            fill="#fff0ef"
            stroke="currentColor"
            strokeWidth="6"
          />
          <path
            d="M357 159 L357 268 L460 213 Z"
            fill="#e03020"
            stroke="currentColor"
            strokeWidth="8"
          />
          <rect
            x="52"
            y="370"
            width="650"
            height="24"
            fill="#ffffff"
            stroke="currentColor"
            strokeWidth="5"
          />
          <rect
            x="52"
            y="370"
            width="278"
            height="24"
            fill="#e03020"
            stroke="currentColor"
            strokeWidth="5"
          />
        </svg>
      </div>
      <div className="flex min-w-0 flex-wrap items-center gap-3">
        <IconButton label="Replay sentence">
          <RotateCcw
            aria-hidden="true"
            className="size-5"
          />
        </IconButton>
        <IconButton label="Play sentence">
          <Play
            aria-hidden="true"
            className="size-5"
          />
        </IconButton>
        <Progress
          value={43}
          aria-label="Sentence playback progress"
          className="min-w-32 flex-1"
        />
        <span className="border-line bg-surface rounded-control min-h-10 border px-3 py-2 text-sm font-semibold">
          07 / 18
        </span>
      </div>
    </div>
  )
}

export function DictationPracticeScene() {
  const [answer, setAnswer] = useState(readStaticPracticeDraft)

  useEffect(() => {
    writeStaticPracticeDraft(answer)
  }, [answer])

  return (
    <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.18fr)_minmax(320px,0.82fr)]">
      <ContentPanel
        eyebrow="Page 02"
        title="Listen. Type. Check. Retry."
      >
        <p className="text-ink-soft text-base leading-7 font-normal">
          DailyDictation-style speed, with IELTS stats saved behind every
          sentence.
        </p>

        <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
          <PracticePlayerSketch />

          <ContentPanel eyebrow="Correction">
            <div
              aria-label="Token correction example"
              className="flex flex-wrap gap-2"
            >
              {DICTATION_CORRECTION_TOKENS.map(token => (
                <span
                  key={token.id}
                  className={cn(
                    'border-line rounded-tag inline-flex min-h-9 items-center border px-3 py-1 text-base font-semibold',
                    tokenClassName[token.state]
                  )}
                >
                  {token.label}
                </span>
              ))}
            </div>
            <div className="border-line bg-tint-soft rounded-control grid gap-2 border p-3">
              <strong className="font-sans text-sm font-semibold">
                Translation after effort
              </strong>
              <p className="text-ink-soft text-sm leading-6 font-normal">
                {DICTATION_PRACTICE.translation}
              </p>
            </div>
          </ContentPanel>
        </div>

        <ContentPanel
          eyebrow="Answer"
          title="Sentence typing"
        >
          <div className="border-line bg-tint-soft rounded-control border p-3 text-base leading-7 font-semibold">
            {DICTATION_PRACTICE.currentSentence}
          </div>
          <Textarea
            aria-label="Sentence answer"
            spellCheck={false}
            autoCorrect="off"
            autoCapitalize="off"
            value={answer}
            onChange={event => setAnswer(event.target.value)}
            className="border-line bg-surface rounded-control min-h-28 border text-base leading-7 font-semibold"
          />
          <div className="flex flex-wrap gap-3">
            <ActionButton
              icon={
                <Check
                  aria-hidden="true"
                  className="size-5"
                />
              }
            >
              Check
            </ActionButton>
            <ActionButton
              tone="paper"
              icon={
                <RotateCcw
                  aria-hidden="true"
                  className="size-5"
                />
              }
            >
              Retry
            </ActionButton>
            <ActionButton
              tone="paper"
              icon={
                <Eye
                  aria-hidden="true"
                  className="size-5"
                />
              }
            >
              Reveal
            </ActionButton>
            <ActionButton
              tone="paper"
              icon={
                <SkipForward
                  aria-hidden="true"
                  className="size-5"
                />
              }
            >
              Skip
            </ActionButton>
          </div>
        </ContentPanel>
      </ContentPanel>

      <aside className="grid content-start gap-5">
        <ContentPanel
          eyebrow="Now"
          title="Session queue"
        >
          <p className="text-ink-soft text-base leading-7 font-normal">
            Each sentence is a panel. Progress is visible without turning
            practice into a spreadsheet.
          </p>
          <div className="grid gap-3">
            {DICTATION_SENTENCE_QUEUE.map(item => (
              <QueueRow
                key={item.id}
                title={item.title}
                meta={`Sentence ${item.number}`}
                status={item.status}
              />
            ))}
          </div>
        </ContentPanel>

        <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
          {DICTATION_LIVE_STATS.map((item, index) => (
            <MetricTile
              key={item.id}
              label={item.label}
              value={item.value}
              detail="Live session"
              tone={index === 0 ? 'red' : 'paper'}
              icon={
                index === 0 ? (
                  <StepBack
                    aria-hidden="true"
                    className="size-5"
                  />
                ) : undefined
              }
            />
          ))}
        </div>
      </aside>
    </div>
  )
}

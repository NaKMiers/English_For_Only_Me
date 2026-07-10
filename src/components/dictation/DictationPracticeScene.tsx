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

import { MangaPanel } from '@/components/common/MangaPanel'
import { MetricTile } from '@/components/common/MetricTile'
import { QueueRow } from '@/components/common/QueueRow'
import { IconButton } from '@/components/ui/IconButton'
import { MangaButton } from '@/components/ui/MangaButton'
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
  correct: 'bg-manga-white',
  missing: 'bg-manga-paper-soft text-manga-red',
  extra: 'bg-manga-black text-manga-white line-through',
} as const

function PracticePlayerSketch() {
  return (
    <div className="border-manga-black bg-manga-pale-red grid min-w-0 gap-3 border-3 p-3 shadow-[4px_4px_0_var(--manga-black)]">
      <div
        aria-label="Video practice player"
        className="border-manga-black bg-manga-white min-h-56 overflow-hidden border-3"
      >
        <svg
          role="img"
          aria-label="Hand drawn video frame"
          viewBox="0 0 760 430"
          className="text-manga-black h-full min-h-56 w-full"
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
        <span className="border-manga-black bg-manga-white min-h-10 border-2 px-3 py-2 text-sm font-black shadow-[2px_2px_0_var(--manga-black)]">
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
      <MangaPanel
        eyebrow="Page 02"
        title="Listen. Type. Check. Retry."
      >
        <p className="text-manga-ink-soft text-base leading-7 font-semibold">
          DailyDictation-style speed, with IELTS stats saved behind every
          sentence.
        </p>

        <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
          <PracticePlayerSketch />

          <MangaPanel
            eyebrow="Correction"
            className="shadow-[3px_3px_0_var(--manga-black)]"
          >
            <div
              aria-label="Token correction example"
              className="flex flex-wrap gap-2"
            >
              {DICTATION_CORRECTION_TOKENS.map(token => (
                <span
                  key={token.id}
                  className={cn(
                    'border-manga-black inline-flex min-h-9 items-center border-2 px-3 py-1 text-base font-black shadow-[2px_2px_0_var(--manga-black)]',
                    tokenClassName[token.state]
                  )}
                >
                  {token.label}
                </span>
              ))}
            </div>
            <div className="border-manga-black bg-manga-pale-red grid gap-2 border-2 p-3">
              <strong className="font-sans text-sm font-black uppercase">
                Translation after effort
              </strong>
              <p className="text-manga-ink-soft text-sm leading-6 font-semibold">
                {DICTATION_PRACTICE.translation}
              </p>
            </div>
          </MangaPanel>
        </div>

        <MangaPanel
          eyebrow="Answer"
          title="Sentence typing"
          className="shadow-[3px_3px_0_var(--manga-black)]"
        >
          <div className="border-manga-black bg-manga-pale-red border-2 p-3 text-base leading-7 font-black">
            {DICTATION_PRACTICE.currentSentence}
          </div>
          <Textarea
            aria-label="Sentence answer"
            spellCheck={false}
            autoCorrect="off"
            autoCapitalize="off"
            value={answer}
            onChange={event => setAnswer(event.target.value)}
            className="border-manga-black bg-manga-white min-h-28 rounded-none border-3 text-base leading-7 font-semibold shadow-[3px_3px_0_var(--manga-black)]"
          />
          <div className="flex flex-wrap gap-3">
            <MangaButton
              icon={
                <Check
                  aria-hidden="true"
                  className="size-5"
                />
              }
            >
              Check
            </MangaButton>
            <MangaButton
              tone="paper"
              icon={
                <RotateCcw
                  aria-hidden="true"
                  className="size-5"
                />
              }
            >
              Retry
            </MangaButton>
            <MangaButton
              tone="paper"
              icon={
                <Eye
                  aria-hidden="true"
                  className="size-5"
                />
              }
            >
              Reveal
            </MangaButton>
            <MangaButton
              tone="paper"
              icon={
                <SkipForward
                  aria-hidden="true"
                  className="size-5"
                />
              }
            >
              Skip
            </MangaButton>
          </div>
        </MangaPanel>
      </MangaPanel>

      <aside className="grid content-start gap-5">
        <MangaPanel
          eyebrow="Now"
          title="Session queue"
        >
          <p className="text-manga-ink-soft text-base leading-7 font-semibold">
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
        </MangaPanel>

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

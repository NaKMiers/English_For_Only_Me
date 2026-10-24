'use client'

import { Check, CloudOff, Loader2, Lock, Star, Unlock, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { useClientOutbox } from '@/components/common/OutboxOwnerProvider'
import { MangaButton } from '@/components/ui/MangaButton'
import { cn } from '@/lib/utils'
import type { GrammarSessionMode } from '@/modules/grammar/constants'
import {
  isPracticeCard,
  type PracticeCard,
} from '@/modules/grammar/course/types'
import { gradeCard } from '@/modules/grammar/grading/gradeCard'
import type { GrammarSessionResult } from '@/modules/grammar/session/planGrammarSessionWrite'
import type { PlayCard } from '@/modules/grammar/session/preparePlayCards'
import { starsForAccuracy } from '@/modules/grammar/session/scoring'
import { PASS_ACCURACY } from '@/modules/grammar/constants'
import {
  buildGrammarSessionWrite,
  type GrammarSessionRequestBody,
} from '@/requests/grammarSessionsApi'

import { SpeakButton } from '../SpeakButton'

import { describeAnswer } from './cardDraft'
import {
  collectAnswers,
  summarizePlayer,
  type PlayerState,
} from './playerReducer'

// Past this the save is most likely waiting for the network: say so, while
// the outbox keeps delivering in the background.
const SLOW_SAVE_MS = 6000

type SaveState =
  | { kind: 'saving' }
  | { kind: 'queued' }
  | { kind: 'saved'; result: GrammarSessionResult }
  | { kind: 'retryable'; message: string }
  | { kind: 'rejected'; message: string }
  | { kind: 'offline' }

interface Props {
  mode: GrammarSessionMode
  targetId: string
  title: string
  plays: PlayCard[]
  state: PlayerState
  durationMs: number
  exitHref: string
  canSave: boolean
  onComplete: () => void
}

function createKey() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function formatDuration(ms: number) {
  const seconds = Math.max(0, Math.round(ms / 1000))

  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

function StarRow({ stars }: { stars: number }) {
  return (
    <div
      aria-label={`${stars} trên 3 sao`}
      className="flex justify-center gap-2"
      role="img"
    >
      {[1, 2, 3].map(index => (
        <Star
          aria-hidden
          className={cn(
            'size-12 stroke-[2.5] sm:size-14',
            index <= stars
              ? 'fill-manga-red text-manga-black motion-safe:animate-in motion-safe:zoom-in-50 motion-safe:fill-mode-both'
              : 'text-manga-ink-soft fill-transparent'
          )}
          key={index}
          style={{ animationDelay: `${index * 160}ms` }}
        />
      ))}
    </div>
  )
}

function headline(mode: GrammarSessionMode, passed: boolean, testOut: boolean) {
  switch (mode) {
    case 'lesson':
      return 'Xong bài!'
    case 'review':
      return passed ? 'Ôn xong, vẫn nhớ tốt!' : 'Cần ôn thêm một chút'
    case 'checkpoint':
      if (testOut)
        return passed ? 'Vượt cấp thành công!' : 'Chưa vượt được lần này'

      return passed ? 'Qua checkpoint!' : 'Chưa qua checkpoint'
    case 'weak':
      return 'Luyện xong!'
  }
}

export function PlayerResult({
  canSave,
  durationMs,
  exitHref,
  mode,
  onComplete,
  plays,
  state,
  targetId,
  title,
}: Props) {
  const summary = summarizePlayer(state)
  const localPassed =
    mode === 'lesson' || mode === 'weak' || summary.accuracy >= PASS_ACCURACY
  const [save, setSave] = useState<SaveState>(
    canSave ? { kind: 'saving' } : { kind: 'offline' }
  )
  const outbox = useClientOutbox()
  const bodyRef = useRef<GrammarSessionRequestBody | null>(null)
  const startedRef = useRef(false)

  /**
   * Hand the session to the shared outbox. It stores the write before
   * sending, retries network and server failures with the same idempotency
   * key, and replays it on the next load if this tab closes first. The
   * promise settles only once the server answered (or the outbox gave up).
   */
  function send() {
    const body = bodyRef.current

    if (!body) return

    setSave({ kind: 'saving' })

    const slowTimer = window.setTimeout(() => {
      setSave(current =>
        current.kind === 'saving' ? { kind: 'queued' } : current
      )
    }, SLOW_SAVE_MS)

    void outbox.enqueue(buildGrammarSessionWrite(body)).then(result => {
      window.clearTimeout(slowTimer)

      if (result.ok) {
        setSave({ kind: 'saved', result: result.data as GrammarSessionResult })
        return
      }

      // 0 = this outbox stopped before delivering (the write stays stored);
      // 408 / 429 / 5xx = the outbox ran out of retries. Both may succeed
      // later. Any other 4xx is final: the same body will never be accepted.
      const retryable =
        result.status === 0 ||
        result.status === 408 ||
        result.status === 429 ||
        result.status >= 500

      setSave({
        kind: retryable ? 'retryable' : 'rejected',
        message: result.error,
      })
    })
  }

  // Runs once per finished session.
  useEffect(() => {
    if (startedRef.current) return

    startedRef.current = true
    onComplete()

    if (!canSave) return

    const body: GrammarSessionRequestBody = {
      answers: collectAnswers(plays, state),
      idempotencyKey: createKey(),
      mode,
      targetId,
    }

    bodyRef.current = body
    send()
    // The session is final once this screen mounts: run exactly once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const result = save.kind === 'saved' ? save.result : null
  const passed = result?.passed ?? localPassed
  const stars =
    mode === 'lesson'
      ? (result?.stars ?? starsForAccuracy(summary.accuracy))
      : null
  const testOut = result?.testOut ?? false
  const misses = plays
    .map(play => play.card)
    .filter((card): card is PracticeCard => isPracticeCard(card))
    .filter(
      (card, index, list) =>
        list.findIndex(item => item.id === card.id) === index
    )
    .filter(card => state.firstCorrect[card.id] === false)

  const unlocked = result?.unlocked ?? null
  let nextHref = exitHref
  let nextLabel = 'Về lộ trình'

  if (unlocked?.kind === 'lesson') {
    nextHref = `/grammar/lessons/${unlocked.lessonId}`
    nextLabel = 'Bài tiếp theo'
  } else if (unlocked?.kind === 'checkpoint') {
    nextHref = `/grammar/units/${unlocked.unitId}/checkpoint`
    nextLabel = 'Làm checkpoint'
  }

  return (
    <div className="mx-auto w-full max-w-2xl p-4 sm:p-8">
      {/* page-hero: bare in day mode, a lit card under the lamp. */}
      <div className="page-hero grid gap-5">
        <div className="grid gap-3 text-center">
          {stars !== null ? <StarRow stars={stars} /> : null}
          {stars === null ? (
            <div
              className={cn(
                'border-manga-black mx-auto grid size-16 place-items-center rounded-full border-3',
                passed
                  ? 'bg-lesson-correct text-manga-white'
                  : 'bg-manga-red text-manga-white'
              )}
            >
              {passed ? (
                <Check
                  aria-hidden
                  className="size-8"
                />
              ) : (
                <X
                  aria-hidden
                  className="size-8"
                />
              )}
            </div>
          ) : null}
          <h1 className="font-sans text-3xl leading-tight font-black">
            {headline(mode, passed, testOut)}
          </h1>
          <p className="text-manga-ink-soft font-bold">{title}</p>
        </div>

        <dl className="grid grid-cols-3 gap-3">
          {[
            {
              label: 'Chính xác',
              value: `${Math.round(summary.accuracy * 100)}%`,
            },
            { label: 'Chuỗi dài nhất', value: `x${state.bestCombo}` },
            { label: 'Thời gian', value: formatDuration(durationMs) },
          ].map(item => (
            <div
              className="border-manga-black bg-manga-white rounded-control grid gap-1 border-3 p-3 text-center shadow-[3px_3px_0_var(--manga-black)]"
              key={item.label}
            >
              <dt className="text-manga-ink-soft text-xs font-black uppercase">
                {item.label}
              </dt>
              <dd className="font-sans text-2xl font-black">{item.value}</dd>
            </div>
          ))}
        </dl>

        <div aria-live="polite">
          {save.kind === 'saving' ? (
            <p className="text-manga-ink-soft flex items-center justify-center gap-2 text-sm font-bold">
              <Loader2
                aria-hidden
                className="size-4 motion-safe:animate-spin"
              />
              Đang lưu...
            </p>
          ) : null}
          {save.kind === 'queued' ? (
            <p className="text-manga-ink-soft flex items-center justify-center gap-2 text-center text-sm font-bold">
              <CloudOff
                aria-hidden
                className="size-4 shrink-0"
              />
              Đang chờ mạng. Kết quả đã được giữ trên máy này và sẽ tự gửi khi
              có kết nối.
            </p>
          ) : null}
          {save.kind === 'retryable' ? (
            <div className="border-manga-red rounded-control grid gap-2 border-2 border-dashed p-3 text-sm">
              <p className="flex items-center gap-2 font-bold">
                <CloudOff
                  aria-hidden
                  className="size-4"
                />
                Chưa lưu được ({save.message}).
              </p>
              <MangaButton
                className="w-fit"
                onClick={send}
                tone="paper"
              >
                Thử lại
              </MangaButton>
            </div>
          ) : null}
          {save.kind === 'rejected' ? (
            <p className="border-manga-red rounded-control border-2 border-dashed p-3 text-sm font-bold">
              {save.message}
            </p>
          ) : null}
          {save.kind === 'offline' ? (
            <p className="text-manga-ink-soft text-center text-sm">
              Chưa có cơ sở dữ liệu nên kết quả không được lưu.
            </p>
          ) : null}
          {unlocked ? (
            <p className="border-manga-black bg-manga-paper-soft rounded-control motion-safe:animate-in motion-safe:slide-in-from-bottom-2 flex items-center gap-2 border-3 p-3 font-bold shadow-[3px_3px_0_var(--manga-black)]">
              <Unlock
                aria-hidden
                className="size-5 shrink-0"
              />
              Mở khóa: {unlocked.title}
            </p>
          ) : null}
          {mode === 'checkpoint' && !passed ? (
            <p className="flex items-center gap-2 text-sm font-bold">
              <Lock
                aria-hidden
                className="size-4"
              />
              Cần đúng ít nhất {Math.round(PASS_ACCURACY * 100)}% để qua.
            </p>
          ) : null}
        </div>

        {misses.length > 0 ? (
          <section className="grid gap-3">
            <h2 className="font-sans text-lg font-black">
              Xem lại {misses.length} câu sai
              {/* Only once the server confirmed the save; a test-out never
                  records misses. */}
              {result && !result.testOut ? (
                <span className="text-manga-ink-soft block text-sm font-bold">
                  Đã thêm vào Luyện điểm yếu.
                </span>
              ) : null}
            </h2>
            <ul className="grid gap-3">
              {misses.map(card => {
                const answer = state.firstAnswers[card.id]
                const expected = gradeCard(
                  card,
                  answer ?? { kind: 'fill', value: '' }
                ).expected

                return (
                  <li
                    className="border-manga-black bg-manga-white rounded-control grid gap-1.5 border-3 p-3"
                    key={card.id}
                  >
                    {answer ? (
                      <p className="text-manga-red flex items-start gap-2 text-sm font-bold">
                        <X
                          aria-hidden
                          className="mt-0.5 size-4 shrink-0"
                        />
                        <span className="sr-only">Bạn trả lời:</span>
                        {describeAnswer(card, answer)}
                      </p>
                    ) : null}
                    <p className="flex items-start gap-2 font-bold">
                      <Check
                        aria-hidden
                        className="text-lesson-correct mt-1 size-4 shrink-0"
                      />
                      <span className="sr-only">Đáp án:</span>
                      <span className="min-w-0 flex-1">{expected}</span>
                      <SpeakButton text={expected} />
                    </p>
                    <p className="text-manga-ink-soft text-sm">
                      {card.explain}
                    </p>
                  </li>
                )
              })}
            </ul>
          </section>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2">
          <MangaButton
            href={nextHref}
            tone="ink"
          >
            {nextLabel}
          </MangaButton>
          {mode === 'lesson' && stars !== null && stars < 3 ? (
            <MangaButton
              onClick={() => window.location.reload()}
              tone="paper"
            >
              Làm lại để lấy 3 sao
            </MangaButton>
          ) : null}
          {mode !== 'lesson' && !passed ? (
            <MangaButton
              onClick={() => window.location.reload()}
              tone="paper"
            >
              Thử lại
            </MangaButton>
          ) : null}
          {nextHref !== exitHref ? (
            <MangaButton
              href={exitHref}
              tone="paper"
            >
              Về lộ trình
            </MangaButton>
          ) : null}
        </div>
      </div>
    </div>
  )
}

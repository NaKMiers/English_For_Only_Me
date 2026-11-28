'use client'

import { CircleCheck, Eye, Lightbulb, TriangleAlert } from 'lucide-react'
import {
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
  type RefObject,
} from 'react'

import { useMessages } from '@/i18n/client'
import type { Messages } from '@/i18n/messages'
import { cn } from '@/lib/utils'
import {
  buildCharCorrection,
  computeHints,
  type CharBoundary,
  type CharCell,
  type CharCorrectionResult,
  type WordSegment,
} from '@/modules/dictation/correction'
import {
  ANSWER_TEXT_STYLE,
  type AnswerTextSize,
} from '@/modules/dictation/preferences/dictationPreferences'

/**
 * Guided answer input (DailyDictation parity, eng review F2).
 *
 * A controlled textarea for free typing plus a correction display that appears
 * after Check. The display reveals matched words, marks the first diverging word
 * character-by-character, and masks the rest with `*` when "Show full answer" is
 * off. Wrong vs missing characters are distinguished by BOTH colour AND underline
 * style so the signal survives colour-blindness (design review D1):
 *
 *   wrong char   → solid red underline   (substitution the learner typed)
 *   missing char → dotted amber underline (expected char not yet typed)
 *
 * In the draft itself, a wrong word is underlined in place, while a skipped word
 * gets an amber insertion wedge (‸) in the gap where it belongs - the correct
 * words around it stay unmarked.
 *
 * Keyboard (design review D2): Enter checks, Esc reveals, Tab fills the next
 * proper-noun hint WHILE hints remain (else Tab releases focus normally), and
 * Shift+Tab always moves focus out so keyboard users are never trapped.
 */

export type GuidedStatus = 'idle' | 'correct' | 'incorrect' | 'revealed'

interface Props {
  answerTextSize: AnswerTextSize
  correction: CharCorrectionResult | null
  disabled?: boolean
  expectedText: string
  /** Manual per-sentence hint override. When defined (even if empty), these are
   * used verbatim; when undefined, hints are auto-computed from the sentence. */
  hintWords?: string[]
  inputRef?: RefObject<HTMLTextAreaElement | null>
  onChange: (value: string) => void
  onCheck: () => void
  onReveal: () => void
  renderCorrectionWord?: (input: {
    children: ReactNode
    className: string
    term: string
  }) => ReactNode
  revealAnswerWords?: boolean
  showAnswerImmediately: boolean
  showFullAnswer: boolean
  status: GuidedStatus
  statusAction?: ReactNode
  value: string
}

/** Append the next hint word to the current draft, keeping clean spacing. When
 * the sentence still has words after that hint, leave one trailing space so the
 * learner can continue typing immediately. */
export function insertNextHint(
  value: string,
  hint: string,
  hasWordsAfterHint = false
): string {
  const trimmed = value.replace(/\s+$/, '')
  const suffix = hasWordsAfterHint ? ' ' : ''

  if (trimmed.length === 0) return `${hint}${suffix}`

  return `${trimmed} ${hint}${suffix}`
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** True once the hint's word sits in the draft as its own whitespace-delimited
 * token. Clicking (or Tab-filling) any hint chip appends it to the end of the
 * draft, which may be out of its grammatical slot - this presence check hides
 * it immediately regardless, while `computeHints` still decides when it
 * should reappear (deleting the word un-hides it). */
function isHintTyped(value: string, hint: string): boolean {
  return new RegExp(`(?:^|\\s)${escapeRegExp(hint)}(?:$|\\s)`, 'i').test(value)
}

function hasWordsAfterHint(expectedText: string, hint: string): boolean {
  const wordPattern = /[A-Za-z][A-Za-z'-]*/g
  const words = Array.from(expectedText.matchAll(wordPattern))
  const hintIndex = words.findIndex(
    match => match[0].toLowerCase() === hint.toLowerCase()
  )

  return hintIndex >= 0 && hintIndex < words.length - 1
}

interface DisplayCell {
  char: string
  className: string
  key: string
}

const CELL_CLASS: Record<CharCell['status'], string> = {
  // solid red = a character the learner typed in the wrong slot
  wrong:
    'text-danger underline decoration-solid decoration-2 decoration-danger',
  // dotted amber = an expected character not yet typed
  missing:
    'text-accent-orange underline decoration-dotted decoration-2 decoration-accent-orange',
  correct: 'text-lesson-correct',
  extra: 'text-danger line-through',
}

function segmentCells(
  segment: WordSegment,
  segmentIndex: number,
  showFullAnswer: boolean
): DisplayCell[] {
  if (segment.kind === 'matched')
    return [...segment.expected].map((char, index) => ({
      char,
      className: 'text-lesson-correct',
      key: `${segmentIndex}-${index}`,
    }))

  if (segment.kind === 'remaining') {
    if (showFullAnswer)
      return [...segment.expected].map((char, index) => ({
        char,
        className: 'text-ink-soft',
        key: `${segmentIndex}-${index}`,
      }))

    return [...segment.expected].map((char, index) => ({
      char: /\s/.test(char) ? char : '*',
      className: 'text-ink-soft',
      key: `${segmentIndex}-${index}`,
    }))
  }

  // boundaryReveal / boundaryPartial: colour each character by its status.
  return segment.chars.map((cell, index) => ({
    char: cell.expectedChar ?? cell.typedChar ?? '',
    className: CELL_CLASS[cell.status],
    key: `${segmentIndex}-${index}`,
  }))
}

function statusMessage(
  text: Messages['dictation']['answer'],
  status: GuidedStatus,
  isMissingWord: boolean
): string {
  if (status === 'correct') return text.correct
  if (status === 'incorrect')
    return isMissingWord ? text.incorrectMissingWord : text.incorrect
  if (status === 'revealed') return text.revealed

  return ''
}

/** The transparent mirror behind the textarea: the draft verbatim, with the
 * checked boundary marked in place. A wrong word gets an amber underline (red
 * under its exact wrong characters); a skipped word gets an amber wedge in the
 * gap before the word that follows it. */
function renderBoundaryMirror(
  value: string,
  boundary: CharBoundary | null
): ReactNode {
  if (!boundary) return value

  if (boundary.kind === 'missing')
    return (
      <>
        {value.slice(0, boundary.start)}
        {/* Empty inline anchor + absolute wedge: zero layout width, so the
            mirrored text stays aligned with the textarea. */}
        <span className="relative">
          <span
            data-testid="missing-word-mark"
            className="border-b-notice absolute bottom-0 left-0 size-0 -translate-x-1/2 border-x-[0.22em] border-b-[0.32em] border-x-transparent"
          />
        </span>
        {value.slice(boundary.start)}
      </>
    )

  return (
    <>
      {value.slice(0, boundary.start)}
      <span className="decoration-accent-orange underline decoration-solid decoration-[3px] underline-offset-2">
        {[...value.slice(boundary.start, boundary.end)].map((char, index) => {
          const offset = boundary.start + index

          return boundary.wrongOffsets.includes(offset) ? (
            <span
              key={offset}
              className="decoration-danger underline decoration-solid decoration-[3px] underline-offset-2"
            >
              {char}
            </span>
          ) : (
            char
          )
        })}
      </span>
      {value.slice(boundary.end)}
    </>
  )
}

export function GuidedAnswerInput({
  answerTextSize,
  correction,
  disabled = false,
  expectedText,
  hintWords,
  inputRef,
  onChange,
  onCheck,
  onReveal,
  renderCorrectionWord,
  revealAnswerWords = false,
  showAnswerImmediately,
  showFullAnswer,
  status,
  statusAction,
  value,
}: Props) {
  const text = useMessages().dictation.answer
  const localTextareaRef = useRef<HTMLTextAreaElement>(null)
  const textareaRef = inputRef ?? localTextareaRef
  const inputTextStyle = ANSWER_TEXT_STYLE[answerTextSize]

  // Live from the current draft, no Check required - recomputes the matched
  // prefix on every keystroke, so a hint reappears the moment the learner
  // deletes its word. The extra presence filter hides a hint the instant it's
  // typed/clicked even if it landed out of its grammatical slot.
  // A manual override (hintWords defined) wins - even an empty list, which means
  // "this sentence has no hints". Otherwise fall back to the automatic logic.
  const structuralHints = useMemo(
    () => hintWords ?? computeHints(expectedText, value),
    [hintWords, expectedText, value]
  )
  const visibleHints = useMemo(
    () => structuralHints.filter(hint => !isHintTyped(value, hint)),
    [structuralHints, value]
  )
  const displayCorrection = useMemo(() => {
    if (correction) return correction
    if (!revealAnswerWords || status !== 'correct') return null

    return buildCharCorrection({
      action: 'check',
      expectedText,
      typedAnswer: expectedText,
    })
  }, [correction, expectedText, revealAnswerWords, status])

  // The boundary word (the first mistake) marked IN PLACE inside the draft:
  // amber under the whole wrong word, red under the exact wrong characters, or
  // a wedge where a skipped word belongs. Only while the draft still equals what
  // was checked - editing it hides the marks until the next Check. A transparent
  // mirror layer draws the marks so the real text, caret, and IME stay native.
  const boundary =
    correction && status === 'incorrect' && value === correction.typedValue
      ? correction.boundary
      : null
  const isMissingWord = correction?.boundary?.kind === 'missing'

  // After a wrong Check, drop the caret just past the boundary word ONCE so the
  // learner fixes the mistake without losing the text they typed after it. Keyed
  // on `correction` (a fresh object per Check) so it fires once, not on every
  // keystroke - the caret is then free to move as they edit.
  useEffect(() => {
    if (status !== 'incorrect' || !correction) return

    const textarea = textareaRef.current

    if (!textarea) return

    textarea.focus()
    const caret = Math.min(correction.caretOffset, textarea.value.length)
    textarea.setSelectionRange(caret, caret)
  }, [correction, status, textareaRef])

  // Shared by Tab and clicking a hint chip: insert the word AT THE CURSOR (so a
  // hint filled while fixing a mistake lands where the learner is working, not at
  // the end of the line), then drop the caret right after it so typing continues.
  function fillHint(hint: string) {
    const textarea = textareaRef.current
    const caretStart = textarea?.selectionStart ?? value.length
    const caretEnd = textarea?.selectionEnd ?? value.length

    const before = value.slice(0, caretStart).replace(/\s+$/, '')
    const after = value.slice(caretEnd).replace(/^\s+/, '')
    const leadingSpace = before.length > 0 ? ' ' : ''

    let nextValue: string
    let caretPosition: number

    if (after.length === 0) {
      // Caret at the end: append, keeping the trailing-space convenience so the
      // learner can type the next word immediately.
      nextValue = insertNextHint(
        value.slice(0, caretStart),
        hint,
        hasWordsAfterHint(expectedText, hint)
      )
      caretPosition = nextValue.length
    } else {
      // Caret mid-line: splice the hint in, caret just after it, one space to the
      // text that follows.
      const head = `${before}${leadingSpace}${hint}`

      nextValue = `${head} ${after}`
      caretPosition = head.length
    }

    onChange(nextValue)

    if (!textarea) return

    textarea.focus()
    requestAnimationFrame(() => {
      const clamped = Math.min(caretPosition, textarea.value.length)

      textarea.setSelectionRange(clamped, clamped)
    })
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    // stopPropagation keeps the window-level dictation shortcuts (which also map
    // Enter -> check) from firing a second time for the keys this input owns.
    // Alt-replay / Ctrl-navigation are left alone so they still work while typing.
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      event.stopPropagation()
      onCheck()
      return
    }

    if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      onReveal()
      return
    }

    // Tab fills the next hint ONLY while hints remain and Shift isn't held, so
    // keyboard/screen-reader users can always Tab (or Shift+Tab) out of the field.
    if (event.key === 'Tab' && !event.shiftKey && visibleHints.length > 0) {
      event.preventDefault()
      event.stopPropagation()
      fillHint(visibleHints[0])
    }
  }

  const showCorrection =
    displayCorrection !== null &&
    ((showAnswerImmediately &&
      (status === 'incorrect' || status === 'revealed')) ||
      revealAnswerWords)

  function renderCorrectionSegment(segment: WordSegment, index: number) {
    const children = segmentCells(segment, index, showFullAnswer).map(cell => (
      <span
        key={cell.key}
        className={cell.className}
      >
        {cell.char}
      </span>
    ))
    const className =
      'inline bg-transparent p-0 text-left align-baseline font-inherit text-inherit underline-offset-4 hover:bg-surface hover:outline-2 hover:outline-line disabled:opacity-60'
    const isMaskedWord = segment.kind === 'remaining' && !showFullAnswer

    if (renderCorrectionWord && !isMaskedWord)
      return renderCorrectionWord({
        children,
        className,
        term: segment.expected,
      })

    return children
  }

  return (
    <section
      aria-label={text.label}
      className="border-line bg-surface rounded-panel grid min-w-0 gap-2 border p-2"
    >
      {visibleHints.length > 0 && status !== 'correct' ? (
        <p className="flex flex-wrap items-center gap-1.5 text-sm font-semibold">
          <Lightbulb
            aria-hidden="true"
            className="text-accent-orange size-5 shrink-0"
          />
          <span className="text-ink-soft">{text.hint}</span>
          {visibleHints.map(hint => (
            <button
              key={hint}
              type="button"
              onClick={() => fillHint(hint)}
              className="rounded-tag border-accent-orange bg-pastel-peach text-accent-orange soft-press hover-pop hover:bg-surface border px-2 py-0.5"
            >
              {hint}
            </button>
          ))}
          <span className="text-ink-soft text-xs">{text.tabToFill}</span>
        </p>
      ) : null}

      {/* The visible typing field around the transparent overlay input:
          `keep-frame` keeps its border when nested boxes flatten on a phone. */}
      <div className="keep-frame border-line bg-surface focus-within:border-brand/70 focus-within:ring-brand/15 rounded-control relative border transition-[border-color,box-shadow] duration-200 focus-within:ring-4">
        <div
          aria-hidden="true"
          style={inputTextStyle}
          className="pointer-events-none absolute inset-0 px-3.5 py-3 font-medium wrap-break-word whitespace-pre-wrap text-transparent"
        >
          {renderBoundaryMirror(value, boundary)}
        </div>
        <textarea
          ref={textareaRef}
          aria-label={text.inputLabel}
          data-dictation-shortcuts="allow"
          disabled={disabled}
          spellCheck={false}
          autoCorrect="off"
          autoCapitalize="off"
          value={value}
          onChange={event => onChange(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={text.placeholder}
          style={inputTextStyle}
          className={cn(
            // field-sizing-content grows the box with the answer, so the floor
            // only has to fit a short sentence - not reserve six empty lines.
            'placeholder:text-ink-soft/70 ring-owned-focus rounded-control relative z-10 block field-sizing-content min-h-20 w-full resize-y overflow-hidden border-0 bg-transparent px-3.5 py-3 font-medium wrap-break-word whitespace-pre-wrap outline-none',
            status === 'correct' ? 'text-lesson-correct' : 'text-ink'
          )}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p
          aria-live="polite"
          className={cn(
            'flex items-center gap-1.5 text-sm font-medium',
            status === 'correct' && 'text-lesson-correct',
            status === 'incorrect' && 'text-accent-orange'
          )}
          role="status"
        >
          {status === 'correct' ? (
            <CircleCheck
              aria-hidden="true"
              className="size-5 shrink-0"
            />
          ) : status === 'incorrect' ? (
            <TriangleAlert
              aria-hidden="true"
              className="size-5 shrink-0"
            />
          ) : status === 'revealed' ? (
            <Eye
              aria-hidden="true"
              className="size-5 shrink-0"
            />
          ) : null}
          {/* The icon says it; the words stay for screen readers. */}
          <span
            className={
              status === 'correct' ||
              status === 'incorrect' ||
              status === 'revealed'
                ? 'sr-only'
                : undefined
            }
          >
            {statusMessage(text, status, isMissingWord)}
          </span>
        </p>
        {statusAction ? (
          <div className="flex flex-wrap items-center gap-2">
            {statusAction}
          </div>
        ) : null}
      </div>

      {showCorrection ? (
        <p
          style={inputTextStyle}
          className="border-line bg-tint rounded-control border p-2 font-semibold wrap-break-word"
          data-testid="answer-line"
        >
          {displayCorrection.segments.map((segment, index) => (
            <span key={`${segment.expected}-${index}`}>
              {index > 0 ? ' ' : null}
              {renderCorrectionSegment(segment, index)}
            </span>
          ))}
        </p>
      ) : null}
    </section>
  )
}

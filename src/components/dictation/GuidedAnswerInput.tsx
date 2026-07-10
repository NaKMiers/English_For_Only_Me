'use client'

import { CircleCheck, Eye, Lightbulb, TriangleAlert } from 'lucide-react'
import { useEffect, useMemo, useRef, type RefObject } from 'react'

import { cn } from '@/lib/utils'
import {
  computeHints,
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
  inputRef?: RefObject<HTMLTextAreaElement | null>
  onChange: (value: string) => void
  onCheck: () => void
  onReveal: () => void
  showAnswerImmediately: boolean
  showFullAnswer: boolean
  status: GuidedStatus
  value: string
}

/** Append the next hint word to the current draft, keeping a single trailing
 * space between words. Pure so the Tab behaviour is unit-testable. */
export function insertNextHint(value: string, hint: string): string {
  const trimmed = value.replace(/\s+$/, '')

  if (trimmed.length === 0) return hint

  return `${trimmed} ${hint}`
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

interface DisplayCell {
  char: string
  className: string
  key: string
}

const CELL_CLASS: Record<CharCell['status'], string> = {
  // solid red = a character the learner typed in the wrong slot
  wrong:
    'text-red-700 underline decoration-solid decoration-2 decoration-red-700',
  // dotted amber = an expected character not yet typed
  missing:
    'text-amber-600 underline decoration-dotted decoration-2 decoration-amber-600',
  correct: 'text-emerald-700',
  extra: 'text-red-700 line-through',
}

function segmentCells(
  segment: WordSegment,
  segmentIndex: number,
  showFullAnswer: boolean
): DisplayCell[] {
  if (segment.kind === 'matched')
    return [...segment.expected].map((char, index) => ({
      char,
      className: 'text-emerald-700',
      key: `${segmentIndex}-${index}`,
    }))

  if (segment.kind === 'remaining') {
    if (showFullAnswer)
      return [...segment.expected].map((char, index) => ({
        char,
        className: 'text-manga-ink-soft',
        key: `${segmentIndex}-${index}`,
      }))

    return [...segment.expected].map((char, index) => ({
      char: /\s/.test(char) ? char : '*',
      className: 'text-manga-ink-soft',
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

/** Flatten the correction into coloured cells for the answer line. Exposed for
 * tests so the dual-channel mapping can be asserted without the DOM. */
export function answerLineCells(
  correction: CharCorrectionResult,
  showFullAnswer: boolean
): DisplayCell[] {
  return correction.segments.flatMap((segment, index) => {
    const cells = segmentCells(segment, index, showFullAnswer)

    if (index === 0) return cells

    return [{ char: ' ', className: '', key: `space-${index}` }, ...cells]
  })
}

function statusMessage(status: GuidedStatus): string {
  if (status === 'correct') return 'You are correct!'
  if (status === 'incorrect') return 'Incorrect'
  if (status === 'revealed') return 'Answer revealed'

  return ''
}

export function GuidedAnswerInput({
  answerTextSize,
  correction,
  disabled = false,
  expectedText,
  inputRef,
  onChange,
  onCheck,
  onReveal,
  showAnswerImmediately,
  showFullAnswer,
  status,
  value,
}: Props) {
  const localTextareaRef = useRef<HTMLTextAreaElement>(null)
  const textareaRef = inputRef ?? localTextareaRef
  const inputTextStyle = ANSWER_TEXT_STYLE[answerTextSize]

  // Live from the current draft, no Check required - recomputes the matched
  // prefix on every keystroke, so a hint reappears the moment the learner
  // deletes its word. The extra presence filter hides a hint the instant it's
  // typed/clicked even if it landed out of its grammatical slot.
  const structuralHints = useMemo(
    () => computeHints(expectedText, value),
    [expectedText, value]
  )
  const visibleHints = useMemo(
    () => structuralHints.filter(hint => !isHintTyped(value, hint)),
    [structuralHints, value]
  )

  // The boundary word (the first mistake) underlined IN PLACE inside the draft:
  // amber under the whole wrong word, red under the exact wrong characters. Only
  // while the draft still equals what was checked - editing it hides the marks
  // until the next Check. A transparent mirror layer draws the underline so the
  // real text, caret, and IME stay native.
  const boundary =
    correction && status === 'incorrect' && value === correction.typedValue
      ? correction.boundary
      : null

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

  // Shared by Tab and clicking a hint chip: insert the word, then keep focus
  // and the caret in the textarea so typing continues right after it.
  function fillHint(hint: string) {
    onChange(insertNextHint(value, hint))

    const textarea = textareaRef.current

    if (!textarea) return

    textarea.focus()
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
    correction !== null &&
    showAnswerImmediately &&
    (status === 'incorrect' || status === 'revealed')

  return (
    <section
      aria-label="Dictation answer"
      className="border-manga-black bg-manga-white grid min-w-0 gap-3 border-2 p-3 shadow-[3px_3px_0_var(--manga-black)]"
    >
      {visibleHints.length > 0 && status !== 'correct' ? (
        <p className="flex flex-wrap items-center gap-2 text-base font-black">
          <Lightbulb
            aria-hidden="true"
            className="size-5 shrink-0 text-amber-600"
          />
          <span className="text-manga-ink-soft uppercase">Hint</span>
          {visibleHints.map(hint => (
            <button
              key={hint}
              type="button"
              onClick={() => fillHint(hint)}
              className="border border-amber-600 bg-amber-100 px-2 py-0.5 text-amber-900 hover:bg-amber-200"
            >
              {hint}
            </button>
          ))}
          <span className="text-manga-ink-soft text-xs">(Tab to fill)</span>
        </p>
      ) : null}

      <div className="border-manga-black bg-manga-white relative border-2 shadow-[2px_2px_0_var(--manga-black)]">
        <div
          aria-hidden="true"
          style={inputTextStyle}
          className="pointer-events-none absolute inset-0 px-2.5 py-2 font-semibold wrap-break-word whitespace-pre-wrap text-transparent"
        >
          {boundary ? (
            <>
              {value.slice(0, boundary.start)}
              <span className="underline decoration-amber-600 decoration-solid decoration-[3px] underline-offset-2">
                {[...value.slice(boundary.start, boundary.end)].map(
                  (char, index) => {
                    const offset = boundary.start + index

                    return boundary.wrongOffsets.includes(offset) ? (
                      <span
                        key={offset}
                        className="underline decoration-red-700 decoration-solid decoration-[3px] underline-offset-2"
                      >
                        {char}
                      </span>
                    ) : (
                      char
                    )
                  }
                )}
              </span>
              {value.slice(boundary.end)}
            </>
          ) : (
            value
          )}
        </div>
        <textarea
          ref={textareaRef}
          aria-label="Type what you hear"
          data-dictation-shortcuts="allow"
          disabled={disabled}
          spellCheck={false}
          autoCorrect="off"
          autoCapitalize="off"
          value={value}
          onChange={event => onChange(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type what you hear..."
          style={inputTextStyle}
          className={cn(
            'placeholder:text-manga-ink-soft relative z-10 block field-sizing-content min-h-40 w-full resize-y overflow-hidden border-0 bg-transparent px-2.5 py-2 font-semibold wrap-break-word whitespace-pre-wrap outline-none',
            status === 'correct' ? 'text-emerald-700' : 'text-manga-black'
          )}
        />
      </div>

      <p
        aria-live="polite"
        className={cn(
          'flex items-center gap-2 text-base font-black',
          status === 'correct' && 'text-emerald-700',
          status === 'incorrect' && 'text-amber-600'
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
        {statusMessage(status)}
      </p>

      {showCorrection ? (
        <p
          aria-hidden="true"
          style={inputTextStyle}
          className="border-manga-black bg-manga-paper-soft border-2 p-3 font-semibold wrap-break-word shadow-[2px_2px_0_var(--manga-black)]"
          data-testid="answer-line"
        >
          {answerLineCells(correction, showFullAnswer).map(cell => (
            <span
              key={cell.key}
              className={cell.className}
            >
              {cell.char}
            </span>
          ))}
        </p>
      ) : null}
    </section>
  )
}

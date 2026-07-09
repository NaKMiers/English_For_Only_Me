'use client'

import { useEffect, useRef } from 'react'

import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import type {
  CharCell,
  CharCorrectionResult,
  WordSegment,
} from '@/modules/dictation/correction'

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
  correction: CharCorrectionResult | null
  disabled?: boolean
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
  correction,
  disabled = false,
  onChange,
  onCheck,
  onReveal,
  showAnswerImmediately,
  showFullAnswer,
  status,
  value,
}: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const hints = correction?.hints ?? []

  // After an incorrect check the parent rewrites the draft to the corrected
  // prefix (caretValue). Move the caret to the end so the learner continues from
  // the exact fix point, matching DailyDictation's cursor jump.
  useEffect(() => {
    if (status !== 'incorrect') return

    const textarea = textareaRef.current

    if (!textarea) return

    textarea.focus()
    const end = textarea.value.length
    textarea.setSelectionRange(end, end)
  }, [status, value])

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    // stopPropagation keeps the window-level dictation shortcuts (which also map
    // Enter -> check) from firing a second time for the keys this input owns.
    // Ctrl-replay / Alt-navigation are left alone so they still work while typing.
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
    if (event.key === 'Tab' && !event.shiftKey && hints.length > 0) {
      event.preventDefault()
      event.stopPropagation()
      onChange(insertNextHint(value, hints[0]))
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
      <Textarea
        ref={textareaRef}
        aria-label="Type what you hear"
        data-dictation-shortcuts="allow"
        disabled={disabled}
        value={value}
        onChange={event => onChange(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type what you hear..."
        className="border-manga-black bg-manga-white min-h-28 rounded-none border-2 text-xl leading-8 font-semibold shadow-[2px_2px_0_var(--manga-black)]"
      />

      {/* Screen readers hear status changes without relying on colour. */}
      <p
        aria-live="polite"
        className={cn(
          'text-sm font-black',
          status === 'correct' && 'text-emerald-700',
          status === 'incorrect' && 'text-manga-red'
        )}
        role="status"
      >
        {statusMessage(status)}
      </p>

      {hints.length > 0 && status !== 'correct' ? (
        <p className="flex flex-wrap items-center gap-2 text-sm font-black">
          <span className="text-manga-ink-soft uppercase">Hint</span>
          {hints.map(hint => (
            <span
              key={hint}
              className="border border-amber-600 bg-amber-100 px-2 py-0.5 text-amber-900"
            >
              {hint}
            </span>
          ))}
          <span className="text-manga-ink-soft text-xs">(Tab to fill)</span>
        </p>
      ) : null}

      {showCorrection ? (
        <p
          aria-hidden="true"
          className="border-manga-black bg-manga-paper-soft border-2 p-3 text-lg leading-8 font-semibold break-words shadow-[2px_2px_0_var(--manga-black)]"
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

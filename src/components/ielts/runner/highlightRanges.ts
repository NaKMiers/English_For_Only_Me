/** A highlighted span as [start, end) character offsets inside one scope. */
export type HighlightSpan = [number, number]

const WORD_CHAR = /[\p{L}\p{N}'’-]/u

/**
 * Grow [start, end) outward to whole words, so selecting "nvironmen" marks
 * "environment". Leading and trailing spaces are trimmed first, so a
 * selection that ends on a space does not swallow the next word. Growth also
 * stops at `breaks`, offsets where one block of text ends and the next starts
 * with no space between them.
 */
export function expandToWords(
  text: string,
  start: number,
  end: number,
  breaks: ReadonlySet<number> = new Set()
): HighlightSpan | null {
  let from = Math.max(0, Math.min(start, end))
  let to = Math.min(text.length, Math.max(start, end))

  while (from < to && !WORD_CHAR.test(text[from])) from += 1
  while (to > from && !WORD_CHAR.test(text[to - 1])) to -= 1

  if (from >= to) return null

  while (from > 0 && !breaks.has(from) && WORD_CHAR.test(text[from - 1]))
    from -= 1
  while (to < text.length && !breaks.has(to) && WORD_CHAR.test(text[to]))
    to += 1

  return [from, to]
}

/** Spans sorted, with overlapping or touching ones merged. */
export function mergeSpans(spans: HighlightSpan[]): HighlightSpan[] {
  const sorted = [...spans].sort((left, right) => left[0] - right[0])
  const merged: HighlightSpan[] = []

  for (const [start, end] of sorted) {
    const last = merged.at(-1)

    if (last && start <= last[1]) last[1] = Math.max(last[1], end)
    else merged.push([start, end])
  }

  return merged
}

export function spansOverlap(left: HighlightSpan, right: HighlightSpan) {
  return left[0] < right[1] && right[0] < left[1]
}

/** Drop every highlight the span touches (Clear removes whole highlights). */
export function removeOverlapping(
  spans: HighlightSpan[],
  span: HighlightSpan
): HighlightSpan[] {
  return spans.filter(item => !spansOverlap(item, span))
}

/**
 * The span's text when it is exactly one word with at least one letter
 * ("well-being", "they're"), else null. A block break inside the span means
 * two words that only look glued together.
 */
export function singleWordAt(
  text: string,
  [start, end]: HighlightSpan,
  breaks: ReadonlySet<number> = new Set()
): string | null {
  const word = text.slice(start, end)

  if (!word || /\s/.test(word) || !/\p{L}/u.test(word)) return null

  for (let offset = start + 1; offset < end; offset += 1)
    if (breaks.has(offset)) return null

  return word.replace(/’/g, "'")
}

const SENTENCE_END = /[.!?]/
const SENTENCE_MAX = 3000

/**
 * The sentence holding the span: from the previous sentence end (a `.`, `!`
 * or `?` before whitespace), line break or block break, up to and including
 * the next one. Whitespace is collapsed.
 */
export function sentenceAround(
  text: string,
  [start, end]: HighlightSpan,
  breaks: ReadonlySet<number> = new Set()
): string {
  const endsBefore = (offset: number) =>
    breaks.has(offset) ||
    text[offset - 1] === '\n' ||
    (SENTENCE_END.test(text[offset - 1]) && /\s/.test(text[offset] ?? ' '))

  let from = start
  let to = end

  while (from > 0 && !endsBefore(from)) from -= 1
  while (to < text.length && !endsBefore(to)) to += 1

  return text
    .slice(from, to)
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, SENTENCE_MAX)
}

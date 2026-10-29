/** A highlighted span as [start, end) character offsets inside one scope. */
export type HighlightSpan = [number, number]

const WORD_CHAR = /[\p{L}\p{N}'’-]/u

/**
 * Grow [start, end) outward to whole words, so selecting "nvironmen" marks
 * "environment". Leading and trailing spaces are trimmed first, so a
 * selection that ends on a space does not swallow the next word.
 */
export function expandToWords(
  text: string,
  start: number,
  end: number
): HighlightSpan | null {
  let from = Math.max(0, Math.min(start, end))
  let to = Math.min(text.length, Math.max(start, end))

  while (from < to && !WORD_CHAR.test(text[from])) from += 1
  while (to > from && !WORD_CHAR.test(text[to - 1])) to -= 1

  if (from >= to) return null

  while (from > 0 && WORD_CHAR.test(text[from - 1])) from -= 1
  while (to < text.length && WORD_CHAR.test(text[to])) to += 1

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

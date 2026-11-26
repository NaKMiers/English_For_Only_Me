/** One piece of an instruction sentence; `bold` marks the paper's caps. */
export interface IeltsInstructionPart {
  text: string
  bold: boolean
}

// A run of capitalised words as the paper prints them: "ONE WORD ONLY",
// "NO MORE THAN TWO WORDS AND/OR A NUMBER", "TWO". A lone "A" joins a run
// ("AND/OR A NUMBER") but never starts one, so the letter "A" in
// "letters A-E" stays plain.
const CAPS_WORD = String.raw`[A-Z]{2,}(?:\/[A-Z]{2,})?`
const CAPS_RUN = new RegExp(
  String.raw`\b${CAPS_WORD}\b(?:\s+(?:A\s+)?${CAPS_WORD}\b)*`,
  'g'
)

function boldCaps(sentence: string): IeltsInstructionPart[] {
  const parts: IeltsInstructionPart[] = []
  let cursor = 0

  for (const match of sentence.matchAll(CAPS_RUN)) {
    const start = match.index ?? 0

    if (start > cursor)
      parts.push({ text: sentence.slice(cursor, start), bold: false })

    parts.push({ text: match[0], bold: true })
    cursor = start + match[0].length
  }

  if (cursor < sentence.length)
    parts.push({ text: sentence.slice(cursor), bold: false })

  return parts
}

/**
 * A group instruction the way the paper sets it: one sentence per line
 * ("Complete the notes below." / "Write ONE WORD ONLY for each answer."),
 * with the capitalised word limit in bold. The stored text is one line of
 * prose; this only splits and marks it.
 */
export function formatInstruction(
  instruction: string
): IeltsInstructionPart[][] {
  return instruction
    .trim()
    .split(/(?<=[.?!])\s+(?=[A-Z])/)
    .filter(Boolean)
    .map(boldCaps)
}

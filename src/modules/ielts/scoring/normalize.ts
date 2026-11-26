/*
 * IELTS answer normalisation. Deliberately NOT the dictation normaliser: that
 * one expands contractions (he's -> he is) which would accept wrong answers
 * here. Numbers and words are never converted ("10" vs "ten"): a test lists
 * both spellings in `answers` when both are acceptable.
 */

const LEADING_TRAILING_PUNCTUATION = /^[\s.,;:!?"'()[\]]+|[\s.,;:!?"'()[\]]+$/g
// The paper prints the currency before the blank ("$ ____"), so a candidate
// who writes "$199" or "£ 50" still gives the number the key holds.
const LEADING_CURRENCY = /^[$£€¥]\s*(?=\d)/

export function normalizeIeltsAnswer(value: string): string {
  return value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[‘’‛′]/g, "'")
    .replace(/[“”″]/g, '"')
    .replace(/[‐-―−­]/g, '-')
    .replace(/ /g, ' ')
    .replace(LEADING_TRAILING_PUNCTUATION, '')
    .replace(LEADING_CURRENCY, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*([-/])\s*/g, '$1')
    .trim()
}

/** Letter-style answers (A, iv, TRUE, NOT GIVEN) compare uppercased. */
export function normalizeIeltsKey(value: string): string {
  return value.normalize('NFKC').trim().replace(/\s+/g, ' ').toUpperCase()
}

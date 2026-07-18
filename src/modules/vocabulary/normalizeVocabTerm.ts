import { VOCAB_MAX_TERM_LENGTH } from './constants'

export interface NormalizedVocabTerm {
  entryType: 'word' | 'phrase'
  normalizedTerm: string
  term: string
}

const EDGE_PUNCTUATION_REGEX =
  /^[\s"'`.,!?;:()[\]{}<>]+|[\s"'`.,!?;:()[\]{}<>]+$/g
const SAFE_TERM_REGEX = /^[\p{L}\p{M}' -]+$/u

export function normalizeVocabTerm(input: string): NormalizedVocabTerm | null {
  const term = input
    .normalize('NFKC')
    .replace(/[’‘`]/g, "'")
    .replace(/\s+/g, ' ')
    .replace(EDGE_PUNCTUATION_REGEX, '')
    .trim()
    .toLowerCase()

  if (!term) return null
  if (term.length > VOCAB_MAX_TERM_LENGTH) return null
  if (!SAFE_TERM_REGEX.test(term)) return null

  const normalizedTerm = term.replace(/\s+/g, ' ')
  const entryType = normalizedTerm.includes(' ') ? 'phrase' : 'word'

  return {
    entryType,
    normalizedTerm,
    term: normalizedTerm,
  }
}

// A candidate English word/phrase: ASCII Latin letters only, with optional
// internal hyphens, apostrophes, or single spaces (e.g. "co-op", "don't",
// "ice cream"). A cheap, API-free gate that rejects other scripts (Vietnamese,
// CJK, Cyrillic) before any dictionary call. Latin-but-not-English strings
// (e.g. "takuetsu") still pass here and are caught by the dictionary-result
// check downstream.
const ENGLISH_TERM_REGEX = /^[a-z]+(?:['\- ][a-z]+)*$/i

export function isEnglishTermCandidate(input: string): boolean {
  return ENGLISH_TERM_REGEX.test(input.trim())
}

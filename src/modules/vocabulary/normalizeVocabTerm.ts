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

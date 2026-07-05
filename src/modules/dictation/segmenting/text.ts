import type { DictationSegmentQualityFlag } from '@/modules/dictation/types'

const ABBREVIATIONS = new Set([
  'dr',
  'mr',
  'mrs',
  'ms',
  'prof',
  'sr',
  'jr',
  'st',
  'vs',
  'etc',
  'e.g',
  'i.e',
  'u.s',
  'u.k',
  'a.m',
  'p.m',
])
const ALWAYS_INLINE_ABBREVIATIONS = new Set([
  'dr',
  'mr',
  'mrs',
  'ms',
  'prof',
  'sr',
  'jr',
  'st',
  'vs',
  'e.g',
  'i.e',
  'u.s',
  'u.k',
])

const SENTENCE_END_PATTERN = /[.!?]["')\]]?$/
const LATIN_WORD_PATTERN = /[A-Za-z]+(?:'[A-Za-z]+)?/g

export function normalizeSegmentText(value: string) {
  return value
    .replace(/<[^>]*>/g, ' ')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

export function normalizeSegmentComparisonText(value: string) {
  return normalizeSegmentText(value)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}' ]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function hasSentenceEnding(value: string) {
  return SENTENCE_END_PATTERN.test(normalizeSegmentText(value))
}

function previousToken(value: string, index: number) {
  const before = value.slice(0, index).trim()
  const match = before.match(/([A-Za-z](?:[A-Za-z.]|')*)$/)

  return match?.[1].replace(/\.$/, '').toLowerCase() ?? ''
}

function isDecimalPoint(value: string, index: number) {
  return /\d/.test(value[index - 1] ?? '') && /\d/.test(value[index + 1] ?? '')
}

function isKnownAbbreviation(value: string, index: number) {
  const token = previousToken(value, index)

  if (!ABBREVIATIONS.has(token)) return false
  if (ALWAYS_INLINE_ABBREVIATIONS.has(token)) return true

  const nextNonSpace = value.slice(index + 1).match(/\S/)?.[0]

  return nextNonSpace ? nextNonSpace === nextNonSpace.toLowerCase() : false
}

function isInitialSequence(value: string, index: number) {
  const before = value.slice(Math.max(0, index - 6), index + 1)

  return /(?:\b[A-Z]\.){1,4}$/.test(before)
}

function findSentenceBoundary(value: string, startIndex: number) {
  for (let index = startIndex; index < value.length; index += 1) {
    const char = value[index]

    if (char !== '.' && char !== '!' && char !== '?') continue
    if (char === '.' && isDecimalPoint(value, index)) continue
    if (char === '.' && isKnownAbbreviation(value, index)) continue
    if (char === '.' && isInitialSequence(value, index)) continue

    let boundaryIndex = index + 1

    while (/["')\]]/.test(value[boundaryIndex] ?? '')) boundaryIndex += 1

    if (boundaryIndex >= value.length || /\s/.test(value[boundaryIndex]))
      return boundaryIndex
  }

  return -1
}

export function splitTextIntoSentences(value: string) {
  const normalized = normalizeSegmentText(value)
  const sentences: string[] = []
  let startIndex = 0

  while (startIndex < normalized.length) {
    const boundaryIndex = findSentenceBoundary(normalized, startIndex)

    if (boundaryIndex < 0) break

    const sentence = normalized.slice(startIndex, boundaryIndex).trim()

    if (sentence) sentences.push(sentence)

    startIndex = boundaryIndex

    while (/\s/.test(normalized[startIndex] ?? '')) startIndex += 1
  }

  const tail = normalized.slice(startIndex).trim()

  if (tail) sentences.push(tail)

  return sentences
}

function isLikelyNonEnglish(value: string) {
  const normalized = normalizeSegmentText(value)
  const latinWords = normalized.match(LATIN_WORD_PATTERN) ?? []
  const letters = normalized.match(/\p{L}/gu) ?? []
  const latinLetters = normalized.match(/[A-Za-z]/g) ?? []

  if (letters.length < 4) return true
  if (latinWords.length === 0) return true

  return latinLetters.length / letters.length < 0.65
}

export function getTextQualityFlags(
  value: string
): DictationSegmentQualityFlag[] {
  const normalized = normalizeSegmentText(value)
  const words = normalized.match(LATIN_WORD_PATTERN) ?? []
  const flags: DictationSegmentQualityFlag[] = []

  if (words.length < 3) flags.push('tooShort')
  if (words.length > 30 || normalized.length > 220) flags.push('tooLong')
  if (!hasSentenceEnding(normalized)) flags.push('missingPunctuation')
  if (isLikelyNonEnglish(normalized)) flags.push('likelyNonEnglish')

  return flags
}

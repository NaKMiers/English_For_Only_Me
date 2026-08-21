import { buildDictationCorrection } from '@/modules/dictation/correction'
import { normalizeAnswer } from '@/modules/dictation/correction/normalizeAnswer'
import type { CorrectionOptions } from '@/modules/dictation/correction/types'
import { GRAMMAR_PRODUCTION_DRILL_KINDS } from '@/modules/grammar/constants'
import type { GrammarDrillRecord } from '@/modules/grammar/types'

/**
 * Normalizer options for EVERY grammar grading call. Not a default - a
 * requirement.
 *
 * `expandContractions` must be false. The dictation default is true, and the
 * expansion table hardcodes ambiguous contractions to one reading:
 * `normalizeAnswer.ts:19` maps "he's" to "he is" when it is equally "he has",
 * and `:17` maps "he'd" to "he would" when it is equally "he had". Those are
 * present perfect and past perfect, two core taxonomy points. With the default
 * on, a target of "He's lived here" normalises to "he is lived here", so a
 * learner typing the ungrammatical "He is lived here" MATCHES and is told they
 * are right - and the diff panel then names "is" as the expected token. A
 * grammar module that teaches the wrong form is worse than no grammar module.
 *
 * `ignorePunctuation` must also be false, for a mechanical reason: that option
 * replaces every non-alphanumeric character with a space, so "he's" tokenises
 * as ["he", "s"]. It destroys contractions outright.
 *
 * Contraction variants therefore live in `acceptedAnswers`, decided by the
 * content author rather than guessed by a lookup table.
 */
export const GRAMMAR_CORRECTION_OPTIONS: CorrectionOptions = {
  expandContractions: false,
  ignorePunctuation: false,
}

/**
 * Keeping punctuation has one cost: a sentence-final period stays glued to the
 * last token, so "here." and "here" differ and an otherwise perfect answer
 * fails over a missing full stop.
 *
 * Terminal punctuation carries essentially no grammatical information - word
 * order already distinguishes a question from a statement - so it is trimmed
 * from BOTH sides. Both sides is not a detail: trimming only the learner's
 * answer is worse than trimming neither, because then a target ending in a
 * period can never be matched by any input at all. Internal apostrophes and
 * commas are untouched, which is the whole point - "the man, who left, waved"
 * and "the man who left waved" are different grammar, not different typing.
 */
export function trimTerminalPunctuation(value: string) {
  return value.trim().replace(/[.!?;:,]+$/u, '')
}

function normalizeForCompare(value: string) {
  return normalizeAnswer(
    trimTerminalPunctuation(value),
    GRAMMAR_CORRECTION_OPTIONS
  ).normalizedText
}

/**
 * Every wording treated as correct, canonical form first.
 *
 * `target` leads so that on a scoring tie the canonical phrasing is the one
 * shown back to the learner.
 */
export function getCandidateAnswers(drill: GrammarDrillRecord) {
  const seen = new Set<string>()
  const candidates: string[] = []

  for (const candidate of [drill.target, ...(drill.acceptedAnswers ?? [])]) {
    const trimmed = candidate?.trim()

    if (!trimmed) continue

    const key = normalizeForCompare(trimmed)

    if (seen.has(key)) continue

    seen.add(key)
    candidates.push(trimmed)
  }

  return candidates
}

export function isProductionDrill(kind: GrammarDrillRecord['kind']) {
  return (GRAMMAR_PRODUCTION_DRILL_KINDS as readonly string[]).includes(kind)
}

export interface GrammarGradeResult {
  /** Token-level diff against `matchedAnswer`, for production kinds only. */
  correction: ReturnType<typeof buildDictationCorrection> | null
  isCorrect: boolean
  /** The accepted wording matched, or the closest one on a near miss. */
  matchedAnswer: string | null
  /** wrong + missing + extra against `matchedAnswer`. Null when exact. */
  score: number | null
  verdict: 'correct' | 'wrong' | 'revealed'
}

/**
 * Grade one submitted answer.
 *
 * Objective kinds compare normalised strings. Production kinds run the
 * dictation correction engine against every accepted wording: any full match is
 * correct, otherwise the closest wording is chosen and its token diff becomes
 * the feedback.
 *
 * The comparator is defined rather than left to the implementation, because
 * "fewest wrong/missing/extra" is three numbers and an undefined tie-break
 * makes the feedback path untestable:
 *
 *     score      = wrong + missing + extra + spellingVariant
 *     lowest score wins
 *     tie        -> earliest candidate (target first, then authoring order)
 *
 * `spellingVariant` is in that sum for a grammar-specific reason. The dictation
 * engine classifies "live" against "lived" as a spelling variant rather than a
 * wrong token, which is right for transcription - you clearly heard the word.
 * For grammar it is precisely the error under test: a missing past participle
 * on a present perfect drill. Leaving it out scored a real inflection mistake
 * as distance zero, making it indistinguishable from a perfect answer when
 * ranking candidates. Such answers were already marked wrong (`isPassed`
 * requires every token to be exactly `correct`); this only fixes the ranking.
 */
export function resolveGrammarAnswer({
  answer,
  drill,
  revealed = false,
}: {
  answer: string
  drill: GrammarDrillRecord
  revealed?: boolean
}): GrammarGradeResult {
  if (revealed)
    return {
      correction: null,
      isCorrect: false,
      matchedAnswer: drill.target,
      score: null,
      verdict: 'revealed',
    }

  const candidates = getCandidateAnswers(drill)
  const submitted = trimTerminalPunctuation(answer)

  if (!isProductionDrill(drill.kind)) {
    const normalizedSubmitted = normalizeForCompare(submitted)
    const matched = candidates.find(
      candidate => normalizeForCompare(candidate) === normalizedSubmitted
    )

    return {
      correction: null,
      isCorrect: Boolean(matched),
      matchedAnswer: matched ?? candidates[0] ?? null,
      score: matched ? 0 : null,
      verdict: matched ? 'correct' : 'wrong',
    }
  }

  let best: {
    correction: ReturnType<typeof buildDictationCorrection>
    candidate: string
    score: number
  } | null = null

  for (const candidate of candidates) {
    const correction = buildDictationCorrection({
      action: 'check',
      // Trimmed, like `submitted` above. The learner's answer was already
      // stripped of its full stop, so leaving the candidate's on made the final
      // token "cousin" against "cousin." - graded a spelling variant, scored 1,
      // and every production drill whose target ends in punctuation became
      // impossible to pass by any input, including the target itself.
      //
      // The UNTRIMMED candidate is still what `matchedAnswer` returns, so the
      // sentence read back to the learner keeps its punctuation.
      expectedText: trimTerminalPunctuation(candidate),
      options: GRAMMAR_CORRECTION_OPTIONS,
      typedAnswer: submitted,
    })

    if (correction.isPassed)
      return {
        correction,
        isCorrect: true,
        matchedAnswer: candidate,
        score: 0,
        verdict: 'correct',
      }

    const score =
      correction.stats.wrongCount +
      correction.stats.missingCount +
      correction.stats.extraCount +
      correction.stats.spellingVariantCount

    // Strictly less-than keeps the earliest candidate on a tie.
    if (!best || score < best.score) best = { candidate, correction, score }
  }

  if (!best)
    return {
      correction: null,
      isCorrect: false,
      matchedAnswer: null,
      score: null,
      verdict: 'wrong',
    }

  return {
    correction: best.correction,
    isCorrect: false,
    matchedAnswer: best.candidate,
    score: best.score,
    verdict: 'wrong',
  }
}

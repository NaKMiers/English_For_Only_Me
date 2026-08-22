import { normalizeAnswer } from '@/modules/dictation/correction/normalizeAnswer'
import {
  findBlankScopeConflict,
  findUncuedAnswerWords,
  isAnswerableWithoutGuessing,
} from '@/modules/grammar/grading/answerability'
import type { GrammarDrillKind } from '@/modules/grammar/types'

import { GRAMMAR_DRILL_KINDS } from '../constants'

/** The shape OpenAI is asked to return, before anything trusts it. */
export interface GeneratedDrillDraft {
  acceptedAnswers?: unknown
  choices?: unknown
  difficulty?: unknown
  explanation?: unknown
  kind?: unknown
  prompt?: unknown
  punctuationSensitive?: unknown
  target?: unknown
}

export interface ValidatedGeneratedDrill {
  acceptedAnswers: string[]
  choices: string[] | null
  difficulty: 1 | 2 | 3
  explanation: string
  kind: GrammarDrillKind
  prompt: string
  punctuationSensitive: boolean
  target: string
}

export type ValidateGeneratedDrillResult =
  { drill: ValidatedGeneratedDrill; ok: true } | { ok: false; reason: string }

const MAX_PROMPT = 2000
const MAX_TARGET = 2000
const MAX_EXPLANATION = 2000

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function stringList(value: unknown) {
  if (!Array.isArray(value)) return []

  return value.map(entry => text(entry)).filter(Boolean)
}

/**
 * Compare two wordings EXACTLY as this drill will be graded.
 *
 * `punctuationSensitive` is a parameter and not a constant, and that is the
 * whole point. It was a constant (always tolerant) and that let a real hole
 * through, caught by running generation against the live taxonomy. The model
 * returned this choice drill on non-defining relative clauses:
 *
 *     target:  The book, which I borrowed from you, is on my desk.
 *     choices: The book which I borrowed from you is on my desk.     <- no commas
 *              The book, which I borrowed from you, is on my desk.
 *              The book that I borrowed from you is on my desk.
 *
 * Under tolerant comparison the first two options are the SAME STRING. So the
 * comma-less option was absorbed as "another spelling of the target" instead of
 * being seen as a distractor, no duplicate was detected, and the drill passed.
 * Then at grading time - if the model had not happened to set
 * `punctuationSensitive` - picking the comma-less option would have been marked
 * CORRECT on a lesson whose entire subject is that comma.
 *
 * Validating with a different comparison than the grader uses is how a gate
 * lets through exactly what it exists to stop. So both now agree, per drill.
 */
function sameAnswer(
  left: string,
  right: string,
  punctuationSensitive: boolean
) {
  const options = {
    expandContractions: false,
    ignorePunctuation: false,
    ignoreStructuralPunctuation: !punctuationSensitive,
  }

  return (
    normalizeAnswer(left, options).normalizedText ===
    normalizeAnswer(right, options).normalizedText
  )
}

/**
 * Decide whether one AI-authored question is fit to be asked.
 *
 * This is the load-bearing gate of the whole generated-question feature, and
 * the rules are chosen on one principle: FABRICATION MUST NOT BE ABLE TO SATISFY
 * THEM. `constants.ts:171-193` records what happens when a rule can be met by
 * inventing content - a quota on accepted answers was met by listing "Please
 * close door." as correct on a drill teaching the definite article, so the
 * learner was scored right for making exactly the mistake the lesson teaches
 * against. Accepting a wrong answer is worse than rejecting a right one,
 * because the learner never finds out.
 *
 * So every rule here is structural. Each one can only be satisfied by a
 * question that is internally consistent, and none of them can be satisfied by
 * writing more text:
 *
 *   target in acceptedAnswers      - otherwise the model's own answer is
 *                                    graded wrong, which is the single most
 *                                    trust-destroying outcome available
 *   choice kinds carry choices     - a multiple choice with no options is
 *                                    unanswerable
 *   choices contain the target     - otherwise no option is correct
 *   distractors are distinct       - two options that normalise equal means
 *                                    two correct answers, or two identical ones
 *   accepted != a distractor       - the wrong option would be marked right
 *   prompt/target/explanation set  - an empty prompt is not a question
 *
 * A rejected question is dropped and backfilled from the stored pool, so the
 * cost of strictness is a slightly less novel test - never a broken one.
 */
export function validateGeneratedDrill(
  draft: GeneratedDrillDraft
): ValidateGeneratedDrillResult {
  const kind = text(draft.kind) as GrammarDrillKind

  if (!(GRAMMAR_DRILL_KINDS as readonly string[]).includes(kind))
    return { ok: false, reason: `Unknown drill kind "${text(draft.kind)}".` }

  const prompt = text(draft.prompt)

  if (!prompt) return { ok: false, reason: 'Empty prompt.' }
  if (prompt.length > MAX_PROMPT)
    return { ok: false, reason: `Prompt longer than ${MAX_PROMPT} characters.` }

  const target = text(draft.target)

  if (!target) return { ok: false, reason: 'Empty target.' }
  if (target.length > MAX_TARGET)
    return { ok: false, reason: `Target longer than ${MAX_TARGET} characters.` }

  const explanation = text(draft.explanation)

  if (!explanation) return { ok: false, reason: 'Empty explanation.' }
  if (explanation.length > MAX_EXPLANATION)
    return {
      ok: false,
      reason: `Explanation longer than ${MAX_EXPLANATION} characters.`,
    }

  const punctuationSensitive = draft.punctuationSensitive === true
  const same = (left: string, right: string) =>
    sameAnswer(left, right, punctuationSensitive)
  const acceptedAnswers = stringList(draft.acceptedAnswers)
  const rawChoicesForAnswerability = stringList(draft.choices)

  /**
   * Can the learner actually work out the answer?
   *
   * The rule that was missing when a real test asked "I need ___ before I
   * decide." and expected "some advice". That question is not hard, it is
   * impossible: "some time", "more information" and "a moment" all fit, and
   * only the author knew which was wanted. The learner reads the verdict as the
   * grader being broken, which is exactly how trust in it dies.
   *
   * A blank answered purely by grammar needs no cue - "She ___ not drink tea"
   * has one answer. A blank answered by a verb or noun the question never
   * mentions needs the word cueing, the way a coursebook does it.
   */
  if (
    !isAnswerableWithoutGuessing({
      choices: rawChoicesForAnswerability,
      kind,
      prompt,
      target,
    })
  ) {
    const uncued = findUncuedAnswerWords({ prompt, target })

    return {
      ok: false,
      reason: `Unanswerable: nothing in the prompt points to ${uncued.map(word => `"${word}"`).join(', ')}. Cue the word in brackets or give choices.`,
    }
  }

  /**
   * Is the answer the size of the blank?
   *
   * Caught in a live run right after the cue rule went in: the model satisfied
   * "cue the noun" by putting it in the sentence AND keeping it in the answer.
   *
   *     prompt "I need ___ advice before I decide."   target "some advice"
   *     filled "I need some advice advice before I decide."
   *
   * The learner writes "some", which is the only thing that gap can hold, and
   * is marked wrong. Worse than the unanswerable version it replaced, because
   * the question now looks fair.
   */
  const scopeConflict = findBlankScopeConflict({ prompt, target })

  if (scopeConflict)
    return {
      ok: false,
      reason: `The answer repeats "${scopeConflict}", which is already beside the blank. The target must be only what replaces the blank.`,
    }

  /**
   * Is there anything to do?
   *
   * A "correct the sentence" drill whose prompt already contains the corrected
   * sentence has nothing wrong with it, and a "rewrite" drill that shows the
   * rewrite has given away its answer. Either way the learner is being asked to
   * copy, and the drill teaches nothing.
   */
  if (kind === 'correct' || kind === 'transform') {
    const promptWords = prompt.toLowerCase().replace(/\s+/gu, ' ')
    const targetWords = target.toLowerCase().replace(/\s+/gu, ' ')

    if (promptWords.includes(targetWords))
      return {
        ok: false,
        reason:
          'The prompt already contains the target, so there is nothing to correct or rewrite.',
      }
  }

  // The rule fabrication cannot satisfy. A model that pads this list still has
  // to include its own target, and if it does not, the question is unusable by
  // construction.
  if (!acceptedAnswers.some(answer => same(answer, target)))
    return {
      ok: false,
      reason: 'Target is not among its own accepted answers.',
    }

  const rawChoices = stringList(draft.choices)
  let choices: string[] | null = null

  if (kind === 'choice') {
    if (rawChoices.length < 2)
      return { ok: false, reason: 'Choice drill needs at least two options.' }

    if (!rawChoices.some(choice => same(choice, target)))
      return { ok: false, reason: 'Choice drill options exclude its target.' }

    /**
     * Options that are NOT the target under THIS drill's grading rules.
     *
     * On a tolerant drill, an option differing from the target only by a comma
     * is not a distractor - it is the target spelled differently, so the right
     * answer appears twice and either click scores correct. That is how a
     * comma-less option would have been marked right on a non-defining relative
     * clause question. Counting the target's spellings is what catches it.
     */
    const distractors = rawChoices.filter(choice => !same(choice, target))
    const targetSpellings = rawChoices.length - distractors.length

    if (distractors.length === 0)
      return { ok: false, reason: 'Choice drill has no distractor.' }

    if (targetSpellings > 1)
      return {
        ok: false,
        reason: `${targetSpellings} options grade as the target under this drill's own punctuation rules - either the drill should be punctuationSensitive, or two options are the same answer.`,
      }

    for (const [index, distractor] of distractors.entries()) {
      // Two distractors that normalise equal present the learner with the same
      // option twice, which silently shortens the question.
      if (distractors.slice(index + 1).some(other => same(distractor, other)))
        return { ok: false, reason: 'Duplicate distractor.' }

      // A distractor listed as an accepted answer marks the wrong option right.
      if (acceptedAnswers.some(answer => same(answer, distractor)))
        return {
          ok: false,
          reason: `Distractor "${distractor}" is also an accepted answer.`,
        }
    }

    choices = rawChoices
  } else if (rawChoices.length > 0)
    // Non-choice kinds are free text. Options served alongside a text box are
    // just a leaked answer key.
    return {
      ok: false,
      reason: `Kind "${kind}" must not carry choices.`,
    }

  const difficulty =
    draft.difficulty === 2 || draft.difficulty === 3 ? draft.difficulty : 1

  return {
    drill: {
      acceptedAnswers,
      choices,
      difficulty,
      explanation,
      kind,
      prompt,
      punctuationSensitive: draft.punctuationSensitive === true,
      target,
    },
    ok: true,
  }
}

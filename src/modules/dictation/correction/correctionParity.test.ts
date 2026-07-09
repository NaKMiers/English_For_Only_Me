import { describe, expect, test } from 'vitest'

import { buildCharCorrection } from './buildCharCorrection'
import { buildDictationCorrection } from './compareAnswer'
import type { DictationAttemptAction } from '@/modules/dictation/types'

/**
 * Client/server pass-fail parity (eng review IRON RULE, T4).
 *
 * The guided display runs on the client via buildCharCorrection; the server
 * recomputes buildDictationCorrection when it persists the attempt. If those two
 * ever disagree on isPassed, the learner sees "correct" but the sentence never
 * advances (or vice versa) — the worst failure mode. buildCharCorrection is
 * designed to DELEGATE pass/fail and the word-level feedbackTokens/stats to
 * buildDictationCorrection; this test locks that invariant so a future change to
 * the char engine cannot silently fork the two.
 */

const CASES: { expected: string; typed: string }[] = [
  { expected: 'We are ready now.', typed: 'we are ready now' },
  { expected: 'I am ready.', typed: "I'm ready" },
  { expected: 'The second color is gray', typed: 'The 2nd colour is grey' },
  {
    expected: 'As years passed and the wall grew, few returned home.',
    typed: 'As years passed and the wall grew few returned home',
  },
  {
    expected: 'As years passed and the wall grew, few returned home.',
    typed: 'As yers passed and',
  },
  { expected: 'He ordered many men across', typed: 'He order many men across' },
  { expected: 'I want coffee', typed: 'I want tea' },
  { expected: 'I want some coffee', typed: 'I want coffee' },
  { expected: 'One particular gourd', typed: '' },
]

const ACTIONS: DictationAttemptAction[] = ['check', 'reveal', 'skip']

describe('correction parity — buildCharCorrection delegates to buildDictationCorrection', () => {
  for (const action of ACTIONS)
    for (const { expected, typed } of CASES)
      test(`${action}: "${typed}" vs "${expected}"`, () => {
        const word = buildDictationCorrection({
          action,
          expectedText: expected,
          typedAnswer: typed,
        })
        const char = buildCharCorrection({
          action,
          expectedText: expected,
          typedAnswer: typed,
        })

        // The exact fields the server persists and analytics consume.
        expect(char.isPassed).toBe(word.isPassed)
        expect(char.feedbackTokens).toEqual(word.feedbackTokens)
        expect(char.stats).toEqual(word.stats)
      })
})

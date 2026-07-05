import type {
  DictationAttemptAction,
  DictationCorrectionStatsRecord,
  DictationCorrectionTokenRecord,
  DictationCorrectionTokenStatus,
} from '@/modules/dictation/types'

import { normalizeAnswer } from './normalizeAnswer'
import {
  DEFAULT_CORRECTION_OPTIONS,
  type CorrectionOptions,
  type DictationCorrectionResult,
  type NormalizedAnswer,
} from './types'

interface AlignmentStep {
  actualIndex: number | null
  expectedIndex: number | null
  status: DictationCorrectionTokenStatus
}

interface BuildCorrectionInput {
  action: DictationAttemptAction
  expectedText: string
  options?: CorrectionOptions
  typedAnswer: string
}

function fillEditDistanceRow({
  distances,
  left,
  leftIndex,
  right,
}: {
  distances: number[][]
  left: string
  leftIndex: number
  right: string
}) {
  for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
    const substitutionCost =
      left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1

    distances[leftIndex][rightIndex] = Math.min(
      distances[leftIndex - 1][rightIndex] + 1,
      distances[leftIndex][rightIndex - 1] + 1,
      distances[leftIndex - 1][rightIndex - 1] + substitutionCost
    )
  }
}

function getEditDistance(left: string, right: string) {
  const distances = Array.from({ length: left.length + 1 }, () =>
    Array.from({ length: right.length + 1 }, () => 0)
  )

  for (let index = 0; index <= left.length; index += 1)
    distances[index][0] = index
  for (let index = 0; index <= right.length; index += 1)
    distances[0][index] = index

  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1)
    fillEditDistanceRow({
      distances,
      left,
      leftIndex,
      right,
    })

  return distances[left.length][right.length]
}

function getTokenStatus(
  expectedToken: string,
  actualToken: string
): DictationCorrectionTokenStatus {
  if (expectedToken === actualToken) return 'correct'

  const editDistance = getEditDistance(expectedToken, actualToken)
  const nearMissLimit = expectedToken.length <= 4 ? 1 : 2

  if (editDistance > 0 && editDistance <= nearMissLimit)
    return 'spellingVariant'

  return 'wrong'
}

function getSubstitutionCost(expectedToken: string, actualToken: string) {
  const status = getTokenStatus(expectedToken, actualToken)

  if (status === 'correct') return 0
  if (status === 'spellingVariant') return 1.25

  return 1.5
}

function fillAlignmentCostRow({
  actualTokens,
  costs,
  expectedTokens,
  row,
}: {
  actualTokens: string[]
  costs: number[][]
  expectedTokens: string[]
  row: number
}) {
  for (let column = 1; column <= actualTokens.length; column += 1)
    costs[row][column] = Math.min(
      costs[row - 1][column] + 1,
      costs[row][column - 1] + 1,
      costs[row - 1][column - 1] +
        getSubstitutionCost(expectedTokens[row - 1], actualTokens[column - 1])
    )
}

function alignTokens(
  expectedTokens: string[],
  actualTokens: string[]
): AlignmentStep[] {
  const costs = Array.from({ length: expectedTokens.length + 1 }, () =>
    Array.from({ length: actualTokens.length + 1 }, () => 0)
  )

  for (let row = 1; row <= expectedTokens.length; row += 1) costs[row][0] = row
  for (let column = 1; column <= actualTokens.length; column += 1)
    costs[0][column] = column

  for (let row = 1; row <= expectedTokens.length; row += 1)
    fillAlignmentCostRow({
      actualTokens,
      costs,
      expectedTokens,
      row,
    })

  const steps: AlignmentStep[] = []
  let row = expectedTokens.length
  let column = actualTokens.length

  while (row > 0 || column > 0) {
    if (row > 0 && column > 0) {
      const substitutionCost = getSubstitutionCost(
        expectedTokens[row - 1],
        actualTokens[column - 1]
      )

      if (
        costs[row][column] ===
        costs[row - 1][column - 1] + substitutionCost
      ) {
        steps.unshift({
          actualIndex: column - 1,
          expectedIndex: row - 1,
          status: getTokenStatus(
            expectedTokens[row - 1],
            actualTokens[column - 1]
          ),
        })
        row -= 1
        column -= 1
        continue
      }
    }

    if (row > 0 && costs[row][column] === costs[row - 1][column] + 1) {
      steps.unshift({
        actualIndex: null,
        expectedIndex: row - 1,
        status: 'missing',
      })
      row -= 1
      continue
    }

    steps.unshift({
      actualIndex: column - 1,
      expectedIndex: null,
      status: 'extra',
    })
    column -= 1
  }

  return steps
}

function buildFeedbackTokens({
  actual,
  expected,
  steps,
}: {
  actual: NormalizedAnswer
  expected: NormalizedAnswer
  steps: AlignmentStep[]
}): DictationCorrectionTokenRecord[] {
  return steps.map(step => ({
    actual:
      step.actualIndex === null
        ? null
        : (actual.tokens[step.actualIndex] ?? null),
    actualOriginal:
      step.actualIndex === null
        ? null
        : (actual.originalTokens[step.actualIndex] ?? null),
    expected:
      step.expectedIndex === null
        ? null
        : (expected.tokens[step.expectedIndex] ?? null),
    expectedOriginal:
      step.expectedIndex === null
        ? null
        : (expected.originalTokens[step.expectedIndex] ?? null),
    status: step.status,
  }))
}

function getStats(
  feedbackTokens: DictationCorrectionTokenRecord[]
): DictationCorrectionStatsRecord {
  const stats = feedbackTokens.reduce(
    (currentStats, token) => {
      if (token.status === 'correct') currentStats.correctCount += 1
      if (token.status === 'extra') currentStats.extraCount += 1
      if (token.status === 'missing') currentStats.missingCount += 1
      if (token.status === 'spellingVariant')
        currentStats.spellingVariantCount += 1
      if (token.status === 'wrong') currentStats.wrongCount += 1
      if (token.expected !== null) currentStats.totalExpected += 1

      return currentStats
    },
    {
      correctCount: 0,
      extraCount: 0,
      missingCount: 0,
      spellingVariantCount: 0,
      totalExpected: 0,
      wrongCount: 0,
    }
  )
  const accuracy =
    stats.totalExpected === 0
      ? 0
      : Math.round((stats.correctCount / stats.totalExpected) * 100)

  return {
    ...stats,
    accuracy,
  }
}

function buildNonCheckResult({
  action,
  expected,
  typed,
}: {
  action: 'reveal' | 'skip'
  expected: NormalizedAnswer
  typed: NormalizedAnswer
}): DictationCorrectionResult {
  const feedbackTokens = expected.tokens.map((expectedToken, index) => ({
    actual: null,
    actualOriginal: null,
    expected: expectedToken,
    expectedOriginal: expected.originalTokens[index] ?? expectedToken,
    status: 'missing' as const,
  }))

  return {
    action,
    feedbackTokens,
    isPassed: false,
    normalizedExpected: expected,
    normalizedTyped: typed,
    stats: getStats(feedbackTokens),
  }
}

export function buildDictationCorrection({
  action,
  expectedText,
  options: optionsInput = {},
  typedAnswer,
}: BuildCorrectionInput): DictationCorrectionResult {
  const options = {
    ...DEFAULT_CORRECTION_OPTIONS,
    ...optionsInput,
  }
  const expected = normalizeAnswer(expectedText, options)
  const typed = normalizeAnswer(typedAnswer, options)

  if (action === 'reveal' || action === 'skip')
    return buildNonCheckResult({
      action,
      expected,
      typed,
    })

  const steps = alignTokens(expected.tokens, typed.tokens)
  const feedbackTokens = buildFeedbackTokens({
    actual: typed,
    expected,
    steps,
  })
  const stats = getStats(feedbackTokens)
  const isPassed =
    expected.tokens.length > 0 &&
    feedbackTokens.every(token => token.status === 'correct')

  return {
    action,
    feedbackTokens,
    isPassed,
    normalizedExpected: expected,
    normalizedTyped: typed,
    stats,
  }
}

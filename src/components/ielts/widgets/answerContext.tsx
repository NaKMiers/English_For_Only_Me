'use client'

import { createContext, useContext } from 'react'

import type { IeltsAnswerOutcome } from '@/modules/ielts/scoring/scoreObjective'

export type IeltsAnswerValue = string | string[]

export interface IeltsReviewMark {
  outcome: IeltsAnswerOutcome
  accepted: string[]
}

/**
 * What every answer widget reads: the learner's answers, a setter, and in
 * review the outcome per question. One context so a widget deep in the
 * Markdown tree never needs props threaded through the renderer.
 */
export interface IeltsAnswerContextValue {
  answers: Record<string, IeltsAnswerValue>
  readOnly: boolean
  review: Record<number, IeltsReviewMark> | null
  setAnswer: (number: number, value: IeltsAnswerValue) => void
  /** The question the learner is on (navigator and focus follow it). */
  currentNumber: number | null
  onFocusQuestion: (number: number) => void
  /** Guided mode: show the "where is it" button per question. */
  onShowEvidence: ((number: number) => void) | null
}

const noop = () => undefined

export const IeltsAnswerContext = createContext<IeltsAnswerContextValue>({
  answers: {},
  readOnly: true,
  review: null,
  setAnswer: noop,
  currentNumber: null,
  onFocusQuestion: noop,
  onShowEvidence: null,
})

export function useIeltsAnswers() {
  return useContext(IeltsAnswerContext)
}

export function answerText(value: IeltsAnswerValue | undefined): string {
  if (Array.isArray(value)) return value.join(', ')

  return value ?? ''
}

/** DOM id of the control for question N, for focus and labels. */
export const questionControlId = (number: number) => `ielts-q-${number}`
export const questionBlockId = (number: number) => `ielts-qb-${number}`

import {
  IELTS_WEAKNESS_MIN_QUESTIONS,
  type IeltsQuestionType,
} from '../constants'

export interface IeltsWeaknessRow {
  skill: 'listening' | 'reading'
  type: IeltsQuestionType
  correct: number
  total: number
  /** 0..1, or null under the minimum sample. */
  accuracy: number | null
}

export interface IeltsWeaknessStats {
  rows: IeltsWeaknessRow[]
  /** Weakest first, only rows with enough questions. */
  weakest: IeltsWeaknessRow[]
  totalQuestions: number
}

export interface IeltsWeaknessAggregate {
  skill: string
  type: string
  correct: number
  total: number
}

/** Pure: aggregate rows -> sorted stats with the sample threshold applied. */
export function shapeWeaknessStats(
  aggregates: IeltsWeaknessAggregate[]
): IeltsWeaknessStats {
  const rows: IeltsWeaknessRow[] = aggregates
    .filter(row => row.skill === 'listening' || row.skill === 'reading')
    .map(row => ({
      skill: row.skill as IeltsWeaknessRow['skill'],
      type: row.type as IeltsQuestionType,
      correct: row.correct,
      total: row.total,
      accuracy:
        row.total >= IELTS_WEAKNESS_MIN_QUESTIONS
          ? row.correct / row.total
          : null,
    }))
    .sort(
      (left, right) =>
        (left.accuracy ?? 2) - (right.accuracy ?? 2) || right.total - left.total
    )

  return {
    rows,
    weakest: rows.filter(row => row.accuracy !== null).slice(0, 3),
    totalQuestions: rows.reduce((sum, row) => sum + row.total, 0),
  }
}

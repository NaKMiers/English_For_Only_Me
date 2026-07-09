export { buildDictationCorrection } from './compareAnswer'
export {
  autoCorrectAnswer,
  buildCharCorrection,
  computeHints,
  renderAnswerLine,
  type CharBoundary,
  type CharCell,
  type CharCellStatus,
  type CharCorrectionResult,
  type WordSegment,
  type WordSegmentKind,
} from './buildCharCorrection'
export { createLocalDictationAttempt } from './createLocalAttempt'
export { normalizeAnswer } from './normalizeAnswer'
export type {
  CorrectionOptions,
  DictationCorrectionResult,
  NormalizedAnswer,
} from './types'

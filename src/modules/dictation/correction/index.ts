export { buildDictationCorrection } from './compareAnswer'
export {
  buildCharCorrection,
  renderAnswerLine,
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

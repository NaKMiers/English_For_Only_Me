/**
 * The six expressions, as a type only.
 *
 * Split out from the component so pure modules can name an expression without
 * importing anything that renders. `Sensei` re-exports it, so nothing else has
 * to know the split exists.
 */
export type SenseiExpression =
  'neutral' | 'unimpressed' | 'severe' | 'approving' | 'weary' | 'wary'

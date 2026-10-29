/**
 * Overall band rounding: a fraction below .25 rounds down, .25 up to .75
 * rounds to .5, and .75 or more rounds up to the next whole band.
 */
export function roundOverallBand(value: number): number {
  const whole = Math.floor(value)
  // Guard against float noise such as 6.249999 for a true 6.25.
  const fraction = Math.round((value - whole) * 1000) / 1000

  if (fraction < 0.25) return whole
  if (fraction < 0.75) return whole + 0.5

  return whole + 1
}

/** A writing task band: the mean of the four criteria, floored to a half band. */
export function roundTaskBand(criteria: number[]): number {
  if (criteria.length === 0) return 0

  const mean = criteria.reduce((sum, value) => sum + value, 0) / criteria.length

  return Math.floor(Math.round(mean * 1000) / 500) / 2
}

/** Writing band: Task 2 counts twice as much as Task 1. */
export function writingBand(task1: number, task2: number): number {
  return roundOverallBand((task1 + 2 * task2) / 3)
}

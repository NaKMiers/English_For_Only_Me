import type { IeltsSkill, IeltsTrack } from '../constants'

/** [lowest raw score, band], highest first. Raw scores are out of 40. */
type BandTable = ReadonlyArray<readonly [number, number]>

export const LISTENING_BANDS: BandTable = [
  [39, 9],
  [37, 8.5],
  [35, 8],
  [32, 7.5],
  [30, 7],
  [26, 6.5],
  [23, 6],
  [18, 5.5],
  [16, 5],
  [13, 4.5],
  [10, 4],
  [8, 3.5],
  [6, 3],
  [4, 2.5],
  [2, 2],
  [1, 1],
  [0, 0],
]

export const ACADEMIC_READING_BANDS: BandTable = [
  [39, 9],
  [37, 8.5],
  [35, 8],
  [33, 7.5],
  [30, 7],
  [27, 6.5],
  [23, 6],
  [19, 5.5],
  [15, 5],
  [13, 4.5],
  [10, 4],
  [8, 3.5],
  [6, 3],
  [4, 2.5],
  [2, 2],
  [1, 1],
  [0, 0],
]

export const GENERAL_READING_BANDS: BandTable = [
  [40, 9],
  [39, 8.5],
  [37, 8],
  [36, 7.5],
  [34, 7],
  [32, 6.5],
  [30, 6],
  [27, 5.5],
  [23, 5],
  [19, 4.5],
  [15, 4],
  [12, 3.5],
  [9, 3],
  [6, 2.5],
  [3, 2],
  [1, 1],
  [0, 0],
]

export function bandTableFor(
  skill: Exclude<IeltsSkill, 'writing'>,
  track: IeltsTrack
): BandTable {
  if (skill === 'listening') return LISTENING_BANDS

  return track === 'general' ? GENERAL_READING_BANDS : ACADEMIC_READING_BANDS
}

export function rawToBand(table: BandTable, raw: number): number {
  const clamped = Math.max(0, Math.min(40, Math.floor(raw)))

  return table.find(([minimum]) => clamped >= minimum)?.[1] ?? 0
}

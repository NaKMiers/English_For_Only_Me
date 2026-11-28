import 'server-only'

import { hasMongoDbUri } from '@/constants/environments'
import { requirePageUser } from '@/lib/auth/currentUser'
import { connectDatabase } from '@/lib/db/connectDatabase'

import {
  type IeltsAttemptSummary,
  listIeltsAttempts,
  readIeltsOverall,
  readIeltsTestBands,
} from '../attempts/attemptQueries'
import type { IeltsTestBands } from '../attempts/testBands'
import type { IeltsOverallEstimate } from '../scoring/overall'
import {
  type IeltsWeaknessStats,
  readWeaknessStats,
} from '../stats/weaknessStats'
import { type IeltsCatalogEntry, readIeltsCatalog } from '../tests/testReaders'

export interface IeltsHomeData {
  catalog: IeltsCatalogEntry[]
  attempts: IeltsAttemptSummary[]
  overall: IeltsOverallEstimate | null
  /** Best band per skill for tests the learner has done, keyed by test id. */
  testBands: IeltsTestBands
  weakness: IeltsWeaknessStats | null
  isAdmin: boolean
  /** Why the catalogue could not load, or null; the page names it. */
  error: 'notConfigured' | 'loadFailed' | null
}

/** Everything /ielts shows for the signed-in learner. */
export async function loadIeltsHomeData(): Promise<IeltsHomeData> {
  const empty: IeltsHomeData = {
    catalog: [],
    attempts: [],
    overall: null,
    testBands: {},
    weakness: null,
    isAdmin: false,
    error: null,
  }

  // Outside the try: the login redirect must not be caught as a load failure.
  const user = await requirePageUser()

  if (!hasMongoDbUri()) return { ...empty, error: 'notConfigured' }

  try {
    await connectDatabase()

    const [catalog, attempts, overall, testBands, weakness] = await Promise.all(
      [
        readIeltsCatalog(),
        listIeltsAttempts(user.id),
        readIeltsOverall(user.id),
        readIeltsTestBands(user.id),
        readWeaknessStats(user.id),
      ]
    )

    return {
      catalog,
      attempts,
      overall,
      testBands,
      weakness,
      isAdmin: user.role === 'admin',
      error: null,
    }
  } catch (error) {
    console.error('ielts home data failed', { error })

    return { ...empty, error: 'loadFailed' }
  }
}

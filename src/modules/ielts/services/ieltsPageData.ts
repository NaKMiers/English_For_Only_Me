import 'server-only'

import { hasMongoDbUri } from '@/constants/environments'
import { connectDatabaseWhen } from '@/lib/db/connectDatabase'
import {
  getOptionalUser,
  getPracticeActorId,
} from '@/modules/dictation/services/getCurrentUser'

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

/** Everything /ielts shows. Learner rows only when a practice actor exists. */
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

  if (!hasMongoDbUri()) return { ...empty, error: 'notConfigured' }

  try {
    const [user, actorId] = await Promise.all([
      getOptionalUser(),
      connectDatabaseWhen(getPracticeActorId()),
    ])
    const [catalog, attempts, overall, testBands, weakness] = await Promise.all(
      [
        readIeltsCatalog(),
        actorId ? listIeltsAttempts(actorId) : Promise.resolve([]),
        actorId ? readIeltsOverall(actorId) : Promise.resolve(null),
        actorId ? readIeltsTestBands(actorId) : Promise.resolve({}),
        actorId ? readWeaknessStats(actorId) : Promise.resolve(null),
      ]
    )

    return {
      catalog,
      attempts,
      overall,
      testBands,
      weakness,
      isAdmin: user?.role === 'admin',
      error: null,
    }
  } catch (error) {
    console.error('ielts home data failed', { error })

    return { ...empty, error: 'loadFailed' }
  }
}

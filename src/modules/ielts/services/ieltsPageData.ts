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
} from '../attempts/attemptQueries'
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
  weakness: IeltsWeaknessStats | null
  isAdmin: boolean
  error: string
}

/** Everything /ielts shows. Learner rows only when a practice actor exists. */
export async function loadIeltsHomeData(): Promise<IeltsHomeData> {
  const empty: IeltsHomeData = {
    catalog: [],
    attempts: [],
    overall: null,
    weakness: null,
    isAdmin: false,
    error: '',
  }

  if (!hasMongoDbUri())
    return { ...empty, error: 'Database is not configured.' }

  try {
    const [user, actorId] = await Promise.all([
      getOptionalUser(),
      connectDatabaseWhen(getPracticeActorId()),
    ])
    const [catalog, attempts, overall, weakness] = await Promise.all([
      readIeltsCatalog(),
      actorId ? listIeltsAttempts(actorId) : Promise.resolve([]),
      actorId ? readIeltsOverall(actorId) : Promise.resolve(null),
      actorId ? readWeaknessStats(actorId) : Promise.resolve(null),
    ])

    return {
      catalog,
      attempts,
      overall,
      weakness,
      isAdmin: user?.role === 'admin',
      error: '',
    }
  } catch (error) {
    console.error('ielts home data failed', { error })

    return { ...empty, error: 'Could not load tests.' }
  }
}

import 'server-only'

import { hasMongoDbUri } from '@/constants/environments'
import { requirePageUser } from '@/lib/auth/currentUser'
import { connectDatabase } from '@/lib/db/connectDatabase'
import { grammarCourse } from '@/modules/grammar/course'
import {
  buildGrammarPath,
  type GrammarPathView,
} from '@/modules/grammar/path/buildGrammarPath'
import type { ActorGrammarProgress } from '@/modules/grammar/session/planGrammarSessionWrite'

import { getGrammarProgressForActor } from './grammarProgressService'

const EMPTY_PROGRESS: ActorGrammarProgress = {
  lessonProgress: [],
  misses: [],
  unitProgress: [],
}

export interface GrammarPageData {
  progress: ActorGrammarProgress
  path: GrammarPathView
  /** False when the database is not configured: pages render, saving cannot. */
  canSave: boolean
}

/**
 * Progress + path for the signed-in learner, read-only. A learner with no
 * grammar rows yet gets an empty path with lesson 1 open.
 */
export async function loadGrammarPageData(
  now = new Date()
): Promise<GrammarPageData> {
  const canSave = hasMongoDbUri()
  const user = await requirePageUser()
  let progress = EMPTY_PROGRESS

  if (canSave) {
    await connectDatabase()
    progress = await getGrammarProgressForActor(user.id)
  }

  return {
    canSave,
    path: buildGrammarPath({ course: grammarCourse, now, ...progress }),
    progress,
  }
}

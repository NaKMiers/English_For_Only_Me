import 'server-only'

import { hasMongoDbUri } from '@/constants/environments'
import { connectDatabase } from '@/lib/db/connectDatabase'
import { getPracticeActorId } from '@/modules/dictation/services/getCurrentUser'
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
 * Progress + path for the current learner, read-only (never mints a guest
 * cookie). A first-time visitor has no id yet and simply gets an empty path
 * with lesson 1 open; their first save creates the guest identity.
 */
export async function loadGrammarPageData(
  now = new Date()
): Promise<GrammarPageData> {
  const canSave = hasMongoDbUri()
  const actorId = canSave ? await getPracticeActorId() : null
  let progress = EMPTY_PROGRESS

  if (actorId) {
    await connectDatabase()
    progress = await getGrammarProgressForActor(actorId)
  }

  return {
    canSave,
    path: buildGrammarPath({ course: grammarCourse, now, ...progress }),
    progress,
  }
}

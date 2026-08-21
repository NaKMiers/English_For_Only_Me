import 'server-only'

import { GrammarDrillAttemptModel } from '@/models/grammar/GrammarDrillAttemptModel'
import { GrammarPointModel } from '@/models/grammar/GrammarPointModel'
import { buildScarRecord } from '@/modules/grammar/presentation/buildScarRecord'
import type { ScarRecord } from '@/modules/grammar/presentation/types'
import type { GrammarDrillRecord } from '@/modules/grammar/types'

/**
 * How much of one learner's history on one point to read.
 *
 * One point's history is small - the ladder has seven rungs and a point is
 * answered a handful of times per rung - but a cap keeps a pathological case
 * bounded, and the four fields the archive reports are all stable well before
 * this many attempts.
 */
const SCAR_ATTEMPT_LIMIT = 200

/**
 * The Error Archive read path.
 *
 * Two queries, both served by indexes that already exist: the actor's history
 * on this point (`{actorId, pointSlug, at: -1}`) and the point's drills.
 *
 * The reason this is a service and not a widened API record: attempts store
 * `drillId`, not `prompt`, so recovering the question a learner answered means
 * touching `drills` - and `GrammarDrillRecord` carries `target` and
 * `acceptedAnswers`. Putting `drills` on `GrammarPointApiRecord` would have
 * shipped every answer to the browser on all 184 lesson pages, and NOTHING
 * would have looked broken: the grader would still work and every test would
 * still pass, while the drill system quietly became pointless. So the prompt is
 * resolved here, server-side, and only the prompt travels.
 *
 * Degrades to null rather than throwing. A missing archive is a defined state
 * with authored copy behind it; a lesson page that 500s because a history read
 * failed is not.
 */
export async function getPointScar({
  actorId,
  pointSlug,
}: {
  actorId: string | null
  pointSlug: string
}): Promise<ScarRecord | null> {
  if (!actorId) return null

  try {
    const [attempts, point] = await Promise.all([
      GrammarDrillAttemptModel.find({ actorId, pointSlug })
        .sort({ at: -1 })
        .limit(SCAR_ATTEMPT_LIMIT)
        .select('at drillId matchedAnswer stageAfter stageBefore userAnswer verdict')
        .lean(),
      GrammarPointModel.findOne({ slug: pointSlug }).select('drills').lean(),
    ])

    if (attempts.length === 0) return null

    // Prompts only. Deliberately not a map of drills: see the note above.
    const promptByDrillId = new Map(
      ((point?.drills ?? []) as GrammarDrillRecord[]).map(drill => [
        drill.id,
        drill.prompt,
      ])
    )

    return buildScarRecord({ attempts, promptByDrillId })
  } catch {
    return null
  }
}

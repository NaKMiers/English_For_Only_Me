import 'server-only'

import { GrammarDrillAttemptModel } from '@/models/grammar/GrammarDrillAttemptModel'
import { GRAMMAR_STREAK_LOOKBACK_ATTEMPTS } from '@/modules/grammar/constants'
import { countCorrectAnswerStreak } from '@/modules/grammar/presentation/countCorrectAnswerStreak'
import type { LearnerPresentationState } from '@/modules/grammar/presentation/types'
import type { UserGrammarItemApiRecord } from '@/modules/grammar/types'

/**
 * Assemble what the comic layer knows about the learner.
 *
 * Serializable throughout, because this crosses into client islands, and
 * complete for a signed-out visitor, because that is the first-impression path.
 *
 * Degrades rather than throws. A failed read here should cost the page its
 * sensei line, not its content - the lesson is the thing the visitor came for.
 */
export async function getLearnerPresentationState({
  actorId,
  item,
}: {
  actorId: string | null
  item: UserGrammarItemApiRecord | null
}): Promise<LearnerPresentationState> {
  const base: LearnerPresentationState = {
    actorId,
    correctAnswerStreak: 0,
    correctCount: item?.correctCount ?? 0,
    lastReviewedAt: item?.lastReviewedAt ?? null,
    recallStage: item?.recallStage ?? null,
    recentOutcome: null,
    reviewCount: item?.reviewCount ?? 0,
    revivalCount: 0,
    scar: null,
    status: item?.status ?? null,
    wrongCount: item?.wrongCount ?? 0,
  }

  if (!actorId) return base

  return {
    ...base,
    correctAnswerStreak: await getCorrectAnswerStreak(actorId),
  }
}

/**
 * The learner's current run of correct answers.
 *
 * A separate, bounded query rather than a widening of the stats trend read. That
 * read projects only `at` inside a 14-day window (`grammarStatsService.ts`), so
 * it carries no verdicts and cannot see a run that started a month ago -
 * widening it would pull a fortnight of verdicts to answer a question about the
 * last ten answers and STILL get older streaks wrong.
 *
 * Served by the existing `{actorId, at: -1}` index.
 *
 * The filter EXCLUDES diagnostics rather than including recalls. `origin` was
 * added with a Mongoose default, and a default applies on write only: matching
 * `origin: 'recall'` would drop every attempt written before the field existed
 * and report zero on real history.
 */
export async function getCorrectAnswerStreak(actorId: string): Promise<number> {
  try {
    const attempts = await GrammarDrillAttemptModel.find({
      actorId,
      origin: { $ne: 'diagnostic' },
    })
      .sort({ at: -1 })
      .limit(GRAMMAR_STREAK_LOOKBACK_ATTEMPTS)
      .select('verdict origin')
      .lean()

    return countCorrectAnswerStreak(attempts)
  } catch {
    // A missing streak is a defined state - the sensei simply has nothing to be
    // impressed by. Failing the lesson page over it would be worse.
    return 0
  }
}
